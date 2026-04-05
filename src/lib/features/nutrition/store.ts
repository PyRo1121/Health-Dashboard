import type {
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import type { FoodEntryDraft } from './types';

const LOCAL_CATALOG_SOURCE_NAME = 'Local catalog';
function buildFoodEntryRecord(draft: FoodEntryDraft): FoodEntry {
  const timestamp = nowIso();
  return {
    ...createRecordMeta(createRecordId('food'), timestamp),
    localDay: draft.localDay,
    mealType: draft.mealType,
    name: draft.name,
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
    sourceName: draft.sourceName,
    notes: draft.notes,
    favoriteMealId: draft.favoriteMealId,
  };
}

function normalizeFavoriteMealItem(
  item: Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'sourceName'>
): FavoriteMeal['items'][number] {
  return {
    name: item.name ?? 'Untitled meal',
    calories: item.calories,
    protein: item.protein,
    fiber: item.fiber,
    carbs: item.carbs,
    fat: item.fat,
    sourceName: item.sourceName,
  };
}

export async function createFoodEntry(
  db: HealthDatabase,
  draft: FoodEntryDraft
): Promise<FoodEntry> {
  const entry = buildFoodEntryRecord(draft);
  await db.foodEntries.put(entry);
  return entry;
}

export async function saveFavoriteMeal(
  db: HealthDatabase,
  input: {
    name: string;
    mealType: string;
    items: Array<
      Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'sourceName'>
    >;
  }
): Promise<FavoriteMeal> {
  const timestamp = nowIso();
  const meal: FavoriteMeal = {
    ...createRecordMeta(createRecordId('favorite-meal'), timestamp),
    name: input.name,
    mealType: input.mealType,
    items: input.items.map((item) => normalizeFavoriteMealItem(item)),
  };

  await db.favoriteMeals.put(meal);
  return meal;
}

export async function upsertFoodCatalogItem(
  db: HealthDatabase,
  input: FoodCatalogItem
): Promise<FoodCatalogItem> {
  const timestamp = nowIso();
  const existing = await db.foodCatalogItems.get(input.id);
  const item: FoodCatalogItem = {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };

  await db.foodCatalogItems.put(item);
  return item;
}

export async function saveFoodCatalogItem(
  db: HealthDatabase,
  input: {
    name: string;
    calories?: number;
    protein?: number;
    fiber?: number;
    carbs?: number;
    fat?: number;
    brandName?: string;
  }
): Promise<FoodCatalogItem> {
  const timestamp = nowIso();
  return await upsertFoodCatalogItem(db, {
    id: createRecordId('food-catalog'),
    name: input.name,
    sourceType: 'custom',
    sourceName: LOCAL_CATALOG_SOURCE_NAME,
    externalId: undefined,
    brandName: input.brandName,
    calories: input.calories,
    protein: input.protein,
    fiber: input.fiber,
    carbs: input.carbs,
    fat: input.fat,
    imageUrl: undefined,
    ingredientsText: undefined,
    servingAmount: undefined,
    servingUnit: undefined,
    lastVerifiedAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function listFoodCatalogItems(db: HealthDatabase): Promise<FoodCatalogItem[]> {
  return (await db.foodCatalogItems.toArray()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export async function upsertRecipeCatalogItem(
  db: HealthDatabase,
  input: RecipeCatalogItem
): Promise<RecipeCatalogItem> {
  const timestamp = nowIso();
  const existing = await db.recipeCatalogItems.get(input.id);
  const item: RecipeCatalogItem = {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };

  await db.recipeCatalogItems.put(item);
  return item;
}

export async function listRecipeCatalogItems(db: HealthDatabase): Promise<RecipeCatalogItem[]> {
  return (await db.recipeCatalogItems.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export async function listFavoriteMeals(db: HealthDatabase): Promise<FavoriteMeal[]> {
  return (await db.favoriteMeals.toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function reuseRecurringMeal(
  db: HealthDatabase,
  input: { favoriteMealId: string; localDay: string }
): Promise<FoodEntry[]> {
  const favorite = await db.favoriteMeals.get(input.favoriteMealId);
  if (!favorite) throw new Error('Favorite meal not found');

  return Promise.all(
    favorite.items.map((item) =>
      createFoodEntry(db, {
        localDay: input.localDay,
        mealType: favorite.mealType,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fiber: item.fiber,
        carbs: item.carbs,
        fat: item.fat,
        sourceName: item.sourceName,
        favoriteMealId: favorite.id,
      })
    )
  );
}

export async function listFoodEntriesForDay(
  db: HealthDatabase,
  localDay: string
): Promise<FoodEntry[]> {
  return await db.foodEntries.where('localDay').equals(localDay).sortBy('createdAt');
}
