import type { ExerciseCatalogItem } from '$lib/core/domain/types';
import { createWorkoutTemplateForm, normalizeExerciseDrafts } from '$lib/features/movement/model';
import { createMovementPageState, type MovementPageState } from '$lib/features/movement/controller';
import { searchWgerExercises } from '$lib/server/movement/wger';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { upsertMirrorRecord } from '$lib/server/db/drizzle/mirror';
import {
  listExerciseCatalogItemsServer,
  listWorkoutTemplatesServer,
  saveWorkoutTemplateServer,
} from '$lib/server/planning/store';

export async function loadMovementPageServer(): Promise<MovementPageState> {
  const [workoutTemplates, exerciseCatalogItems] = await Promise.all([
    listWorkoutTemplatesServer(),
    listExerciseCatalogItemsServer(),
  ]);

  return {
    ...createMovementPageState(),
    loading: false,
    workoutTemplates,
    exerciseCatalogItems,
  };
}

export async function saveMovementWorkoutTemplatePageServer(
  state: MovementPageState
): Promise<MovementPageState> {
  await saveWorkoutTemplateServer({
    title: state.workoutTemplateForm.title,
    goal: state.workoutTemplateForm.goal,
    exerciseRefs: normalizeExerciseDrafts(state.workoutTemplateForm.exercises),
  });

  return {
    ...(await loadMovementPageServer()),
    saveNotice: 'Workout template saved.',
    workoutTemplateForm: createWorkoutTemplateForm(),
  };
}

export async function searchMovementExercisesServer(
  query: string
): Promise<ExerciseCatalogItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const results = await searchWgerExercises(normalizedQuery);
  const { db } = getServerDrizzleClient();

  for (const item of results) {
    await upsertMirrorRecord(db, 'exerciseCatalogItems', drizzleSchema.exerciseCatalogItems, item);
  }

  return results;
}
