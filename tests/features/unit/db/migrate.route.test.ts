import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDbSnapshot } from '$lib/core/db/types';

describe('db migrate route', () => {
  afterEach(() => {
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

  it('ignores legacy plannedMeals data when importing a snapshot', async () => {
    const importHealthDbSnapshot = vi.fn(async () => undefined);
    const countMigratedRecords = vi.fn(() => 0);
    const snapshot = {
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
        body: JSON.stringify({ snapshot }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ migrated: 0 });
    expect(importHealthDbSnapshot).toHaveBeenCalledWith({ mocked: true }, snapshot);
    expect(countMigratedRecords).toHaveBeenCalledWith(snapshot);
  });
});
