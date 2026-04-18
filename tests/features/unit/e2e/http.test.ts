import { describe, expect, it, vi } from 'vitest';
import { postMigrationSnapshot, resetDb } from '../../../support/e2e/http';

describe('e2e HTTP helpers', () => {
  it('uses the reset token when resetting the database', async () => {
    const response = { ok: () => true };
    const post = vi.fn(async () => response);
    const request = { post };

    const result = await resetDb(request as never);

    expect(result).toBe(response);
    expect(post).toHaveBeenCalledWith('/api/test/reset-db', {
      headers: { 'x-health-reset-token': 'codex-e2e' },
    });
  });

  it('adds the control-plane token when seeding a migration snapshot', async () => {
    const response = { ok: () => true };
    const post = vi.fn(async () => response);
    const request = { post };
    const options = {
      data: {
        snapshot: {
          dailyRecords: [],
        },
      },
    };

    const result = await postMigrationSnapshot(request as never, options);

    expect(result).toBe(response);
    expect(post).toHaveBeenCalledWith('/api/db/migrate', {
      ...options,
      headers: { 'x-health-control-token': 'codex-e2e' },
    });
  });

  it('preserves caller headers when seeding a migration snapshot', async () => {
    const post = vi.fn(async () => ({ ok: () => true }));
    const request = { post };

    await postMigrationSnapshot(request as never, {
      headers: {
        'x-test-header': 'present',
      },
      data: {
        snapshot: {
          dailyRecords: [],
        },
      },
    });

    expect(post).toHaveBeenCalledWith('/api/db/migrate', {
      headers: {
        'x-health-control-token': 'codex-e2e',
        'x-test-header': 'present',
      },
      data: {
        snapshot: {
          dailyRecords: [],
        },
      },
    });
  });
});
