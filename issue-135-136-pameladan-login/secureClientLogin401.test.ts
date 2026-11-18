/**
 * Tracker 2026-11-18 (Thursday English, PamelaDan) — a failed sign-in is
 * reported to the participant as "Session Expired".
 *
 * Root cause under test: the apiClient response interceptor in
 * secureClient.ts dispatches SESSION_EXPIRED_EVENT for ANY 401, including
 * the 401 returned by POST /auth/login/ itself when the credentials are
 * wrong. A wrong password is not an expired session: the login page needs
 * the rejection so it can show the invalid-credentials error, and the
 * session-expired dialog/banner must stay out of it.
 *
 * This test FAILS on the current code (the event fires on a login 401)
 * and PASSES once the interceptor stops dispatching session-expired for
 * the login endpoint. The control test proves the harness can observe
 * the event, and that a genuine token expiry still dispatches it.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient, auth, SESSION_EXPIRED_EVENT } from '../secureClient';

const originalAdapter = apiClient.defaults.adapter;

function unauthorized(config: InternalAxiosRequestConfig, data: unknown = {}) {
  return new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, {
    status: 401,
    statusText: 'Unauthorized',
    data,
    headers: {},
    config,
  });
}

function adapterReturning401() {
  return async (config: InternalAxiosRequestConfig) => {
    throw unauthorized(config);
  };
}

describe('secureClient — login 401 handling', () => {
  let expiredEvents: number;
  const onExpired = () => {
    expiredEvents += 1;
  };

  beforeEach(() => {
    expiredEvents = 0;
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  afterEach(() => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('does not dispatch session-expired when the login itself is rejected (wrong password)', async () => {
    apiClient.defaults.adapter = adapterReturning401();

    await expect(auth.login('PamelaDan-family', 'not-the-password', 'recaptcha-token')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(expiredEvents).toBe(0);
  });

  it('control: still dispatches session-expired when a data request 401s and refresh reports token_expired', async () => {
    apiClient.defaults.adapter = adapterReturning401();
    vi.spyOn(axios, 'post').mockRejectedValue(
      unauthorized({ url: '/api/v1/auth/refresh/' } as InternalAxiosRequestConfig, { code: 'token_expired' })
    );

    await expect(apiClient.get('/orders/')).rejects.toMatchObject({ response: { status: 401 } });

    expect(expiredEvents).toBe(1);
  });
});
