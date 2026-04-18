import { afterEach, describe, expect, it, vi } from 'vitest';

describe('reset-db route', () => {
  afterEach(() => {
    delete process.env.HEALTH_RESET_TOKEN;
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides?: { resetServerDrizzleStorage?: ReturnType<typeof vi.fn> }) {
    class MockPlaywrightModeRequiredError extends Error {
      constructor() {
        super('Database reset is only available in Playwright mode.');
        this.name = 'PlaywrightModeRequiredError';
      }
    }

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      PlaywrightModeRequiredError: MockPlaywrightModeRequiredError,
      resetServerDrizzleStorage: overrides?.resetServerDrizzleStorage ?? vi.fn(() => undefined),
    }));

    const route = await import('../../../../src/routes/api/test/reset-db/+server.ts');
    return { ...route, MockPlaywrightModeRequiredError };
  }

  it('returns 403 when the reset token is missing or invalid', async () => {
    process.env.HEALTH_RESET_TOKEN = 'reset-token';
    const resetServerDrizzleStorage = vi.fn(() => undefined);
    const { POST } = await importRoute({ resetServerDrizzleStorage });

    const response = await POST({
      request: new Request('http://health.test/api/test/reset-db', {
        method: 'POST',
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
    expect(resetServerDrizzleStorage).not.toHaveBeenCalled();
  });

  it('returns 403 when the helper refuses outside playwright mode', async () => {
    process.env.HEALTH_RESET_TOKEN = 'reset-token';
    const { POST, MockPlaywrightModeRequiredError } = await importRoute({
      resetServerDrizzleStorage: vi.fn(() => {
        throw new MockPlaywrightModeRequiredError();
      }),
    });

    const response = await POST({
      request: new Request('http://health.test/api/test/reset-db', {
        method: 'POST',
        headers: { 'x-health-reset-token': 'reset-token' },
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('returns ok when the helper succeeds', async () => {
    process.env.HEALTH_RESET_TOKEN = 'reset-token';
    const resetServerDrizzleStorage = vi.fn(() => undefined);
    const { POST } = await importRoute({ resetServerDrizzleStorage });

    const response = await POST({
      request: new Request('http://health.test/api/test/reset-db', {
        method: 'POST',
        headers: { 'x-health-reset-token': 'reset-token' },
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(resetServerDrizzleStorage).toHaveBeenCalledTimes(1);
  });
});

describe('resetServerDrizzleStorage guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('refuses destructive reset outside playwright mode', async () => {
    const { PlaywrightModeRequiredError, assertPlaywrightModeForDbReset } =
      await import('../../../../src/lib/server/db/drizzle/reset-guard.ts');

    expect(() => assertPlaywrightModeForDbReset()).toThrow(PlaywrightModeRequiredError);
  });
});
