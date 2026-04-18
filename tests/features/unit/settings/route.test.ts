import { afterEach, describe, expect, it, vi } from 'vitest';

describe('settings route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/settings/store');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides?: {
    getServerOwnerProfile?: ReturnType<typeof vi.fn>;
    saveServerOwnerProfile?: ReturnType<typeof vi.fn>;
    clearServerOwnerProfile?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/settings/store', () => ({
      getServerOwnerProfile:
        overrides?.getServerOwnerProfile ??
        vi.fn(async () => ({
          fullName: 'Pyro Example',
          birthDate: '1990-01-01',
        })),
      saveServerOwnerProfile:
        overrides?.saveServerOwnerProfile ??
        vi.fn(async (profile) => ({
          fullName: profile.fullName,
          birthDate: profile.birthDate,
        })),
      clearServerOwnerProfile: overrides?.clearServerOwnerProfile ?? vi.fn(async () => undefined),
    }));

    return await import('../../../../src/routes/api/settings/+server.ts');
  }

  it('loads the server-trusted owner profile', async () => {
    const { POST } = await importRoute();

    const response = await POST({
      request: new Request('http://health.test/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'load' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        fullName: 'Pyro Example',
        birthDate: '1990-01-01',
      },
    });
  });

  it('saves the server-trusted owner profile', async () => {
    const saveServerOwnerProfile = vi.fn(async (profile) => ({
      fullName: profile.fullName.trim(),
      birthDate: profile.birthDate,
    }));
    const { POST } = await importRoute({ saveServerOwnerProfile });

    const response = await POST({
      request: new Request('http://health.test/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveOwnerProfile',
          profile: {
            fullName: ' Pyro Example ',
            birthDate: '1990-01-01',
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(saveServerOwnerProfile).toHaveBeenCalledWith({
      fullName: ' Pyro Example ',
      birthDate: '1990-01-01',
    });
    expect(await response.json()).toEqual({
      profile: {
        fullName: 'Pyro Example',
        birthDate: '1990-01-01',
      },
    });
  });

  it('clears the server-trusted owner profile', async () => {
    const clearServerOwnerProfile = vi.fn(async () => undefined);
    const { POST } = await importRoute({ clearServerOwnerProfile });

    const response = await POST({
      request: new Request('http://health.test/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearOwnerProfile' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(clearServerOwnerProfile).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ ok: true });
  });
});
