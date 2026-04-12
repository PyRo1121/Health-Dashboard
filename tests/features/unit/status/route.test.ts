import { describe, expect, it } from 'vitest';
import { GET } from '../../../../src/routes/api/status/+server';

describe('status route', () => {
  it('returns a no-store operational payload', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: 'personal-health-cockpit',
    });
  });
});
