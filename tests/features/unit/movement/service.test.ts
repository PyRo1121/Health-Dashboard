import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  saveWorkoutTemplate,
  searchExerciseCatalog,
  upsertExerciseCatalogItems,
} from '$lib/features/movement/service';

describe('movement service', () => {
  const getDb = useTestHealthDb();

  it('stores and searches cached exercise catalog items', async () => {
    const db = getDb();
    await upsertExerciseCatalogItems(db, [
      {
        id: 'wger:1',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        sourceType: 'wger',
        externalId: '1',
        title: 'Goblet squat',
        muscleGroups: ['Quadriceps'],
        equipment: ['Dumbbell'],
        instructions: 'Stand tall and squat deep.',
      },
    ]);

    const items = await db.exerciseCatalogItems.toArray();
    expect(searchExerciseCatalog('squat', items)).toEqual([
      expect.objectContaining({
        title: 'Goblet squat',
      }),
    ]);
  });

  it('normalizes separators and whitespace when searching the exercise catalog', async () => {
    const db = getDb();
    await upsertExerciseCatalogItems(db, [
      {
        id: 'wger:2',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        sourceType: 'wger',
        externalId: '2',
        title: 'Push-up',
        muscleGroups: ['Chest'],
        equipment: ['Bodyweight'],
        instructions: 'Press back to the top.',
      },
      {
        id: 'wger:3',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        sourceType: 'wger',
        externalId: '3',
        title: 'Lat pulldown',
        muscleGroups: ['Back'],
        equipment: ['Cable'],
        instructions: 'Pull the bar to your chest.',
      },
    ]);

    const items = await db.exerciseCatalogItems.toArray();
    expect(searchExerciseCatalog('push up', items)).toEqual([
      expect.objectContaining({ title: 'Push-up' }),
    ]);
    expect(searchExerciseCatalog('push-up', items)).toEqual([
      expect.objectContaining({ title: 'Push-up' }),
    ]);
    expect(searchExerciseCatalog('lat pull down', items)).toEqual([
      expect.objectContaining({ title: 'Lat pulldown' }),
    ]);
    expect(searchExerciseCatalog('pulldown', items)).toEqual([
      expect.objectContaining({ title: 'Lat pulldown' }),
    ]);
  });

  it('stores workout templates for later planning surfaces', async () => {
    const db = getDb();
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [
        { name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 },
        { name: 'Push-up', sets: 3, reps: '12', restSeconds: 45 },
      ],
    });

    expect(template.exerciseRefs).toEqual([
      { name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 },
      { name: 'Push-up', sets: 3, reps: '12', restSeconds: 45 },
    ]);
  });
});
