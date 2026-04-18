import type {
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import type { NutritionPlannedMealDraft } from '$lib/features/nutrition/actions';
import {
  buildFavoriteMealRecord,
  buildFoodCatalogItemRecord,
  buildFoodEntryRecord,
  buildRecipeCatalogItemRecord,
} from '$lib/features/nutrition/store';
import { listFoodCatalogItemsServer } from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById, upsertMirrorRecord } from '$lib/server/db/drizzle/mirror';

export async function upsertFoodCatalogItemServer(
  input: FoodCatalogItem
): Promise<FoodCatalogItem> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<FoodCatalogItem>(
    db,
    drizzleSchema.foodCatalogItems,
    input.id
  );
  const item = buildFoodCatalogItemRecord(input, existing);
  await upsertMirrorRecord(db, 'foodCatalogItems', drizzleSchema.foodCatalogItems, item);
  return item;
}

export async function upsertRecipeCatalogItemServer(
  input: RecipeCatalogItem
): Promise<RecipeCatalogItem> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<RecipeCatalogItem>(
    db,
    drizzleSchema.recipeCatalogItems,
    input.id
  );
  const item = buildRecipeCatalogItemRecord(input, existing);
  await upsertMirrorRecord(db, 'recipeCatalogItems', drizzleSchema.recipeCatalogItems, item);
  return item;
}

export async function createFoodEntryServer(
  draft: Parameters<typeof buildFoodEntryRecord>[0]
): Promise<FoodEntry> {
  const { db } = getServerDrizzleClient();
  const entry = buildFoodEntryRecord(draft);
  await upsertMirrorRecord(db, 'foodEntries', drizzleSchema.foodEntries, entry);
  return entry;
}

export async function saveFavoriteMealServer(
  input: Parameters<typeof buildFavoriteMealRecord>[0]
): Promise<FavoriteMeal> {
  const { db } = getServerDrizzleClient();
  const meal = buildFavoriteMealRecord(input);
  await upsertMirrorRecord(db, 'favoriteMeals', drizzleSchema.favoriteMeals, meal);
  return meal;
}

export async function resolveNutritionPlannedFoodIdServer(
  draft: Pick<
    NutritionPlannedMealDraft,
    'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'foodCatalogItemId'
  >
): Promise<string> {
  if (draft.foodCatalogItemId) {
    const existing = (await listFoodCatalogItemsServer()).find(
      (item) => item.id === draft.foodCatalogItemId
    );
    if (existing) {
      return existing.id;
    }
  }

  const timestamp = new Date().toISOString();
  const item = await upsertFoodCatalogItemServer({
    id: `food-catalog-${crypto.randomUUID()}`,
    name: draft.name.trim(),
    sourceType: 'custom',
    sourceName: 'Local catalog',
    externalId: undefined,
    brandName: undefined,
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
    imageUrl: undefined,
    ingredientsText: undefined,
    servingAmount: undefined,
    servingUnit: undefined,
    lastVerifiedAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return item.id;
}
