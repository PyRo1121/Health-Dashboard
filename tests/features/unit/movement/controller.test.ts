import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  addExerciseToWorkoutTemplate,
  createMovementPageState,
  loadMovementPage,
  saveMovementWorkoutTemplatePage,
} from '$lib/features/movement/controller';

describe('movement controller', () => {
  const getDb = useTestHealthDb('movement-page-controller');

  it('loads movement state and saves a workout template', async () => {
    const db = getDb();
    await db.exerciseCatalogItems.put({
      id: 'wger:1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'wger',
      externalId: '1',
      title: 'Goblet squat',
      muscleGroups: ['Quadriceps'],
      equipment: ['Dumbbell'],
    });

    let state = await loadMovementPage(db);
    expect(state.loading).toBe(false);
    expect(state.exerciseCatalogItems).toHaveLength(1);

    state = {
      ...state,
      workoutTemplateForm: {
        ...state.workoutTemplateForm,
        title: 'Full body reset',
        goal: 'Recovery',
      },
    };
    state = addExerciseToWorkoutTemplate(state, state.exerciseCatalogItems[0]!);
    state = await saveMovementWorkoutTemplatePage(db, state);

    expect(state.saveNotice).toBe('Workout template saved.');
    expect(state.workoutTemplates).toHaveLength(1);
    expect(createMovementPageState()).toMatchObject({
      loading: true,
      workoutTemplates: [],
    });
  });
});
