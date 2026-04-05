import type { RecipeCatalogItem } from '$lib/core/domain/types';
import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import {
  nutritionQueryRequestSchema,
  type NutritionQueryRequest,
} from '$lib/features/nutrition/contracts';
import { listRecipeCatalogItems, upsertRecipeCatalogItem } from '$lib/features/nutrition/service';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';

function dedupeRecipesById(items: RecipeCatalogItem[]): RecipeCatalogItem[] {
  const deduped = new Map<string, RecipeCatalogItem>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

export const POST = createDbQueryPostHandler<NutritionQueryRequest, RecipeCatalogItem[]>(
  async (db, query) => {
    const localMatches = (await listRecipeCatalogItems(db)).filter((recipe) =>
      recipe.title.toLowerCase().includes(query.toLowerCase())
    );
    const remoteMatches = await searchThemealdbRecipes(query);
    const cachedRemoteMatches = await Promise.all(
      remoteMatches.map((recipe) => upsertRecipeCatalogItem(db, recipe))
    );

    return dedupeRecipesById([...localMatches, ...cachedRemoteMatches]);
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = nutritionQueryRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid recipe search request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid recipe search request payload.', { status: 400 }),
    emptyResult: [],
  }
);
