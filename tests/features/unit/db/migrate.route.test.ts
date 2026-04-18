import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDbSnapshot } from '$lib/core/db/types';

describe('db migrate route', () => {
  afterEach(() => {
    delete process.env.HEALTH_CONTROL_PLANE_TOKEN;
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/import-snapshot');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(snapshotApi: {
    importHealthDbSnapshot: ReturnType<typeof vi.fn>;
    countMigratedRecords: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));

    vi.doMock('$lib/server/db/drizzle/import-snapshot', () => snapshotApi);

    return await import('../../../../src/routes/api/db/migrate/+server.ts');
  }

  function createSnapshot(): HealthDbSnapshot & { plannedMeals?: unknown[] } {
    return {
      dailyRecords: [],
      journalEntries: [],
      foodEntries: [],
      foodCatalogItems: [],
      recipeCatalogItems: [],
      weeklyPlans: [],
      planSlots: [],
      derivedGroceryItems: [],
      manualGroceryItems: [],
      workoutTemplates: [],
      exerciseCatalogItems: [],
      favoriteMeals: [],
      healthEvents: [],
      healthTemplates: [],
      sobrietyEvents: [],
      assessmentResults: [],
      importBatches: [],
      importArtifacts: [],
      reviewSnapshots: [],
      adherenceMatches: [],
    };
  }

  it('returns 400 for malformed JSON bodies', async () => {
    process.env.HEALTH_CONTROL_PLANE_TOKEN = 'control-token';
    const importHealthDbSnapshot = vi.fn(async () => undefined);
    const countMigratedRecords = vi.fn(() => 0);
    const { POST } = await importRoute({ importHealthDbSnapshot, countMigratedRecords });

    const response = await POST({
      request: new Request('http://health.test/api/db/migrate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-health-control-token': 'control-token',
        },
        body: '{',
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid migration request payload.');
    expect(importHealthDbSnapshot).not.toHaveBeenCalled();
    expect(countMigratedRecords).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid snapshot shapes', async () => {
    process.env.HEALTH_CONTROL_PLANE_TOKEN = 'control-token';
    const importHealthDbSnapshot = vi.fn(async () => undefined);
    const countMigratedRecords = vi.fn(() => 0);
    const { POST } = await importRoute({ importHealthDbSnapshot, countMigratedRecords });

    const response = await POST({
      request: new Request('http://health.test/api/db/migrate', {
        method: 'POST',
        headers: { 'x-health-control-token': 'control-token' },
        body: JSON.stringify({
          snapshot: {
            ...createSnapshot(),
            dailyRecords: {},
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid migration request payload.');
    expect(importHealthDbSnapshot).not.toHaveBeenCalled();
    expect(countMigratedRecords).not.toHaveBeenCalled();
  });

  it('ignores legacy plannedMeals data when importing a snapshot', async () => {
    process.env.HEALTH_CONTROL_PLANE_TOKEN = 'control-token';
    const importHealthDbSnapshot = vi.fn(async () => undefined);
    const countMigratedRecords = vi.fn(() => 0);
    const snapshot = {
      ...createSnapshot(),
      plannedMeals: [
        {
          id: 'planned-meal:next',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
          name: 'Legacy oats',
          mealType: 'breakfast',
        },
      ],
    } satisfies HealthDbSnapshot & { plannedMeals?: unknown[] };

    const { POST } = await importRoute({ importHealthDbSnapshot, countMigratedRecords });

    const response = await POST({
      request: new Request('http://health.test/api/db/migrate', {
        method: 'POST',
        headers: { 'x-health-control-token': 'control-token' },
        body: JSON.stringify({ snapshot }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ migrated: 0 });
    expect(importHealthDbSnapshot).toHaveBeenCalledWith({ mocked: true }, snapshot);
    expect(countMigratedRecords).toHaveBeenCalledWith(snapshot);
  });

  it('returns 403 when the control-plane token is missing', async () => {
    process.env.HEALTH_CONTROL_PLANE_TOKEN = 'control-token';
    const importHealthDbSnapshot = vi.fn(async () => undefined);
    const countMigratedRecords = vi.fn(() => 0);
    const { POST } = await importRoute({ importHealthDbSnapshot, countMigratedRecords });

    const response = await POST({
      request: new Request('http://health.test/api/db/migrate', {
        method: 'POST',
        body: JSON.stringify({ snapshot: createSnapshot() }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
    expect(importHealthDbSnapshot).not.toHaveBeenCalled();
    expect(countMigratedRecords).not.toHaveBeenCalled();
  });
});
