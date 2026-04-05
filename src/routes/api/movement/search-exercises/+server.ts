import type { ExerciseCatalogItem } from '$lib/core/domain/types';
import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import { upsertExerciseCatalogItems } from '$lib/features/movement/service';
import { searchWgerExercises } from '$lib/server/movement/wger';

type ExerciseSearchRequest = { query?: string };

export const POST = createDbQueryPostHandler<ExerciseSearchRequest, ExerciseCatalogItem[]>(
  async (db, query) => {
    const results = await searchWgerExercises(query);
    return await upsertExerciseCatalogItems(db, results);
  },
  undefined,
  {
    emptyResult: [],
  }
);
