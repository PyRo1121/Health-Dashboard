import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('db migrate route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/db/client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(db: Partial<HealthDatabase>) {
    vi.doMock('$lib/server/db/client', () => ({
      getServerHealthDb: () => db,
    }));

    return await import('../../../../src/routes/api/db/migrate/+server.ts');
  }

  it('ignores legacy plannedMeals data when importing a snapshot', async () => {
    const bulkAdd = vi.fn(async () => undefined);
    const db = {
      dailyRecords: { bulkAdd },
      journalEntries: { bulkAdd },
      foodEntries: { bulkAdd },
      foodCatalogItems: { bulkAdd },
      recipeCatalogItems: { bulkAdd },
      weeklyPlans: { bulkAdd },
      planSlots: { bulkAdd },
      derivedGroceryItems: { bulkAdd },
      manualGroceryItems: { bulkAdd },
      workoutTemplates: { bulkAdd },
      exerciseCatalogItems: { bulkAdd },
      favoriteMeals: { bulkAdd },
      healthEvents: { bulkAdd },
      healthTemplates: { bulkAdd },
      sobrietyEvents: { bulkAdd },
      assessmentResults: { bulkAdd },
      importBatches: { bulkAdd },
      importArtifacts: { bulkAdd },
      reviewSnapshots: { bulkAdd },
      adherenceMatches: { bulkAdd },
    } as unknown as Partial<HealthDatabase>;

    const { POST } = await importRoute(db);

    const response = await POST({
      request: new Request('http://health.test/api/db/migrate', {
        method: 'POST',
        body: JSON.stringify({
          snapshot: {
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
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ migrated: 0 });
    expect(bulkAdd).toHaveBeenCalledTimes(20);
  });
});
