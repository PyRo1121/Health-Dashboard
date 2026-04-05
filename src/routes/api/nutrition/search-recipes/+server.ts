import type { RecipeCatalogItem } from '$lib/core/domain/types';
import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import { listRecipeCatalogItems, upsertRecipeCatalogItem } from '$lib/features/nutrition/service';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';

type RecipeSearchRequest = { query?: string };

function dedupeRecipesById(items: RecipeCatalogItem[]): RecipeCatalogItem[] {
  const deduped = new Map<string, RecipeCatalogItem>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

export const POST = createDbQueryPostHandler<RecipeSearchRequest, RecipeCatalogItem[]>(
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
    emptyResult: [],
  }
);
