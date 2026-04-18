import { afterEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../../../../src/hooks.server';
import {
  authorizeSessionRequest,
  HEALTH_SESSION_COOKIE_NAME,
} from '../../../../src/lib/server/http/session-guard';

function createEvent(
  pathname: string,
  headers: HeadersInit = {},
  seedCookies?: Record<string, string>
) {
  const cookieJar = new Map(Object.entries(seedCookies ?? {}));
  const event = {
    request: new Request(`http://health.test${pathname}`, { headers }),
    url: new URL(`http://health.test${pathname}`),
    cookies: {
      get: (name: string) => cookieJar.get(name),
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
    },
  };

  return {
    event: event as unknown as Parameters<typeof authorizeSessionRequest>[0],
    cookieJar,
  };
}

describe('api session auth', () => {
  afterEach(() => {
    delete process.env.HEALTH_AUTH_TOKEN;
    delete process.env.HEALTH_AUTH_USERNAME;
    delete process.env.HEALTH_AUTH_PASSWORD;
    delete process.env.HEALTH_AUTH_TEST_MODE;
    vi.restoreAllMocks();
  });

  it('allows requests when session auth is not configured', () => {
    const { event } = createEvent('/api/today');
    expect(authorizeSessionRequest(event)).toBeNull();
  });

  it('accepts basic auth and persists a session cookie', () => {
    process.env.HEALTH_AUTH_TEST_MODE = 'enabled';
    process.env.HEALTH_AUTH_USERNAME = 'demo';
    process.env.HEALTH_AUTH_PASSWORD = 'secret';

    const authorization = `Basic ${Buffer.from('demo:secret').toString('base64')}`;
    const { event, cookieJar } = createEvent('/api/today', { authorization });

    expect(authorizeSessionRequest(event)).toBeNull();
    const sessionCookie = cookieJar.get(HEALTH_SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeTruthy();

    const followUp = createEvent(
      '/api/today',
      {},
      {
        [HEALTH_SESSION_COOKIE_NAME]: sessionCookie!,
      }
    );
    expect(authorizeSessionRequest(followUp.event)).toBeNull();
  });

  it('returns 401 for protected requests without credentials', () => {
    process.env.HEALTH_AUTH_TEST_MODE = 'enabled';
    process.env.HEALTH_AUTH_USERNAME = 'demo';
    process.env.HEALTH_AUTH_PASSWORD = 'secret';

    const { event } = createEvent('/api/today');
    const response = authorizeSessionRequest(event);

    expect(response?.status).toBe(401);
    expect(response?.headers.get('www-authenticate')).toMatch(/Basic realm=/i);
  });

  it('keeps the status route public even when auth is configured', async () => {
    process.env.HEALTH_AUTH_TEST_MODE = 'enabled';
    process.env.HEALTH_AUTH_USERNAME = 'demo';
    process.env.HEALTH_AUTH_PASSWORD = 'secret';

    const resolve = vi.fn(async () => new Response('ok'));
    const { event } = createEvent('/api/status');

    const response = await handle({
      event: event as Parameters<typeof handle>[0]['event'],
      resolve,
    });

    expect(await response.text()).toBe('ok');
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
