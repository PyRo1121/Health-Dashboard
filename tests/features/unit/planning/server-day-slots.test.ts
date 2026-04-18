import { afterEach, describe, expect, it, vi } from 'vitest';

describe('listPlanSlotsForDayServer', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importStore(selectMirrorRecordsByField: ReturnType<typeof vi.fn>) {
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));

    vi.doMock('$lib/server/db/drizzle/mirror', async () => {
      const actual = await vi.importActual<object>(
        '../../../../src/lib/server/db/drizzle/mirror.ts'
      );
      return {
        ...actual,
        selectMirrorRecordsByField,
      };
    });

    return await import('../../../../src/lib/server/planning/store.ts');
  }

  it('falls back to same-day slots when no normalized weekStart plan exists', async () => {
    const slots = [
      {
        id: 'slot-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weeklyPlanId: 'weekly-plan-1',
        localDay: '2026-04-02',
        slotType: 'meal',
        itemType: 'food',
        itemId: 'food-1',
        mealType: 'breakfast',
        title: 'Greek yogurt bowl',
        status: 'planned',
        order: 0,
      },
    ];

    const selectMirrorRecordsByField = vi.fn(async (_db, _table, field: string, value: string) => {
      if (field === 'weekStart') {
        expect(value).toBe('2026-03-30');
        return [];
      }

      if (field === 'localDay') {
        expect(value).toBe('2026-04-02');
        return slots;
      }

      return [];
    });

    const { listPlanSlotsForDayServer } = await importStore(selectMirrorRecordsByField);

    await expect(listPlanSlotsForDayServer('2026-04-02')).resolves.toMatchObject([
      { id: 'slot-1', title: 'Greek yogurt bowl' },
    ]);
  });
});
