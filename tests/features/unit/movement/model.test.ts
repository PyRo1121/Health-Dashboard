import { describe, expect, it } from 'vitest';
import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
import {
  addExerciseDraft,
  createExerciseSearchRows,
  createWorkoutTemplateForm,
  createWorkoutTemplateSummary,
  normalizeExerciseDrafts,
  removeExerciseDraft,
  updateExerciseDraftField,
} from '$lib/features/movement/model';

describe('movement model', () => {
  it('assembles workout template drafts and summaries', () => {
    const exercise: ExerciseCatalogItem = {
      id: 'wger:1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'wger',
      externalId: '1',
      title: 'Goblet squat',
      muscleGroups: ['Quadriceps'],
      equipment: ['Dumbbell'],
    };

    expect(createWorkoutTemplateForm()).toEqual({
      title: '',
      goal: '',
      exercises: [{ name: '', reps: '' }],
    });
    expect(createExerciseSearchRows([exercise])).toEqual([
      { id: 'wger:1', title: 'Goblet squat', detail: 'Quadriceps · Dumbbell' },
    ]);

    const withExercise = addExerciseDraft([{ name: '', reps: '' }], exercise);
    const withSets = updateExerciseDraftField(withExercise, 0, 'sets', '3');
    const withReps = updateExerciseDraftField(withSets, 0, 'reps', '8');
    const withRest = updateExerciseDraftField(withReps, 0, 'restSeconds', '60');

    expect(normalizeExerciseDrafts(withRest)).toEqual([
      { name: 'Goblet squat', exerciseCatalogId: 'wger:1', sets: 3, reps: '8', restSeconds: 60 },
    ]);
    expect(removeExerciseDraft([{ name: 'Only row', reps: '8' }], 0)).toEqual([
      { name: '', reps: '' },
    ]);

    const template: WorkoutTemplate = {
      id: 'workout-1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: normalizeExerciseDrafts(withRest),
    };
    expect(createWorkoutTemplateSummary(template)).toBe(
      'Recovery · 1 exercise · Goblet squat · 3x8 · 60s rest · Linked exercise'
    );
  });
});
