# Issue 133 — No way to open the cart on a phone

Tracker row: Tuesday Spanish / Nayade Zubiarre, 2026-11-10 — "Basketful
was not showing anything in her cart once she selected it and would not
allow her to submit an order because of this."

Issue: https://github.com/ryanparrish/basketful_app/issues/133

## What the test showed

`MobileCartAccess.test.tsx` renders the participant layout at a mobile
viewport and asserts a cart entry point exists.

- On the pre-fix code (branch `fix/bug-hunt-2026-10-16`): FAILS at the
  mobile viewport, passes at desktop width.
- On `main` (ce329da, which contains the Oct 19 mobile cart bar fix,
  ba70376): PASSES at both widths.

Root cause: the header cart button rendered only at desktop widths and
was the cart drawer's only opener; the mobile sider returned null and
the promised bottom nav was never built. The cart itself held the
items fine.

## Open step

Confirm the production container is running a build that contains
ba70376; restart/redeploy if it is stale. If this test fails against
the deployed build, production is still on pre-fix code.

Workaround until then: desktop browser, direct /checkout link, or a
paper order.
