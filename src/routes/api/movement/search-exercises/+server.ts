import type { ExerciseCatalogItem } from '$lib/core/domain/types';
import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import {
  movementQueryRequestSchema,
  type MovementQueryRequest,
} from '$lib/features/movement/contracts';
import { upsertExerciseCatalogItems } from '$lib/features/movement/service';
import { searchWgerExercises } from '$lib/server/movement/wger';

export const POST = createDbQueryPostHandler<MovementQueryRequest, ExerciseCatalogItem[]>(
  async (db, query) => {
    const results = await searchWgerExercises(query);
    return await upsertExerciseCatalogItems(db, results);
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = movementQueryRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid exercise search request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid exercise search request payload.', { status: 400 }),
    emptyResult: [],
  }
);
