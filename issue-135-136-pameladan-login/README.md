# Issue 135 / 136 — PamelaDan sign-in investigation (tracker 2026-11-18)

Tracker row: Thursday English, PamelaDan, "Cant get logged in. says session
is expired. logging in from the window open email." (2026-11-18)

GitHub issues:

- basketful_app #135 — a rejected sign-in is reported as "Session Expired"
  (frontend, `participant-frontend/src/shared/api/secureClient.ts`)
- basketful_app #136 — API sign-in failures crash the login logger, mask
  the real error, and write no UserLoginLog row (backend,
  `apps/account/api/auth_views.py` + `apps/log/signals.py`)

## Evidence from production logs (app="basketful", 2026-11-16)

One iPhone (199.249.0.154): clicked the password-reset link for account
156 at 10:40:39 ET, loaded the set-password page, and never submitted it
(no POST). Then two failed Django admin logins (Login Logs #1929/#1930,
attempted username `PamelaDan-family`) and two failed
`POST /api/v1/auth/login/` attempts (401, 10:42:26 and 10:44:05 ET). No
successful login from that device afterward. The other three password
resets that week all completed and were followed by a successful login
within ~30 seconds.

## Tests in this folder

### `secureClientLogin401.test.ts` (frontend, vitest)

Verified against basketful_app main @ ce329da:

- On current main: the login-401 test FAILS (SESSION_EXPIRED_EVENT fires
  once on a wrong-password sign-in); the control test (genuine
  token_expired refresh failure) passes.
- With the #135 fix applied in a throwaway worktree: both pass.

Run (from `participant-frontend/`):

```
npx vitest run src/shared/api/__tests__/secureClientLogin401.test.ts
```

(copy the file to that path first)

### `test_pameladan_login_form.py` (backend, pytest)

Verified against basketful_app main @ ce329da (sqlite harness):

- `test_pameladan_family_username_signs_in_with_correct_password` PASSES
  on current main. This eliminates the username-format hypothesis (the
  #112 family): an account named `PamelaDan-family` can sign in.
- `test_pameladan_family_wrong_password_is_invalid_password` FAILS on
  current main: a wrong password raises
  `AttributeError: 'NoneType' object has no attribute 'META'` from
  `apps/log/signals.py:113` instead of `AuthenticationFailed` with code
  `invalid_password`. Passes once #136 is fixed.

Run (from the repo root, with the project venv):

```
SECRET_KEY=test-secret HASHIDS_SALT=test-salt \
DATABASE_URL=sqlite:////tmp/basketful_test.db \
python -m pytest apps/account/tests/test_pameladan_login_form.py -q
```

(copy the file to that path first)

## Eliminated hypotheses

- Throttle lockout (#114 family): production responses were 401, never
  429; four attempts only.
- Token-rotation forced logout (#113): fixed in PR #115, on main since
  Nov 4; her session had no authenticated token use.
- Username format rejection (#112 family): eliminated by the passing
  sign-in test above.

## Conclusion

Her sign-ins were rejected because the password reset she started was
never completed, so the password she typed did not match. Two code bugs
made that look like a session problem: the frontend labels any login 401
as "session expired" (#135), and the backend masks the real error and
loses the login-log row (#136).
