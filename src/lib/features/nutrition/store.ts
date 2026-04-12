import type {
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import type { HealthDbFavoriteMealsStore, HealthDbFoodCatalogItemsStore, HealthDbFoodEntriesStore, HealthDbRecipeCatalogItemsStore } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import type { FoodEntryDraft } from './types';

const LOCAL_CATALOG_SOURCE_NAME = 'Local catalog';

export type FoodEntriesStore = HealthDbFoodEntriesStore;

export type FoodCatalogItemsStore = HealthDbFoodCatalogItemsStore;

export type RecipeCatalogItemsStore = HealthDbRecipeCatalogItemsStore;

export type FavoriteMealsStore = HealthDbFavoriteMealsStore;

export interface NutritionStore
  extends FoodEntriesStore,
    FoodCatalogItemsStore,
    RecipeCatalogItemsStore,
    FavoriteMealsStore {}

export function buildFoodEntryRecord(draft: FoodEntryDraft, timestamp: string = nowIso()): FoodEntry {
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
  store: FoodEntriesStore,
  draft: FoodEntryDraft
): Promise<FoodEntry> {
  const entry = buildFoodEntryRecord(draft);
  await store.foodEntries.put(entry);
  return entry;
}

export function buildFavoriteMealRecord(input: {
  name: string;
  mealType: string;
  items: Array<
    Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'sourceName'>
  >;
}, timestamp: string = nowIso()): FavoriteMeal {
  return {
    ...createRecordMeta(createRecordId('favorite-meal'), timestamp),
    name: input.name,
    mealType: input.mealType,
    items: input.items.map((item) => normalizeFavoriteMealItem(item)),
  };
}

export async function saveFavoriteMeal(
  store: FavoriteMealsStore,
  input: {
    name: string;
    mealType: string;
    items: Array<
      Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'sourceName'>
    >;
  }
): Promise<FavoriteMeal> {
  const meal = buildFavoriteMealRecord(input);

  await store.favoriteMeals.put(meal);
  return meal;
}

export function buildFoodCatalogItemRecord(
  input: FoodCatalogItem,
  existing: FoodCatalogItem | undefined,
  timestamp: string = nowIso()
): FoodCatalogItem {
  return {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };
}

export async function upsertFoodCatalogItem(
  store: FoodCatalogItemsStore,
  input: FoodCatalogItem
): Promise<FoodCatalogItem> {
  const existing = await store.foodCatalogItems.get(input.id);
  const item = buildFoodCatalogItemRecord(input, existing);

  await store.foodCatalogItems.put(item);
  return item;
}

export async function saveFoodCatalogItem(
  store: FoodCatalogItemsStore,
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
  return await upsertFoodCatalogItem(store, {
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

export async function listFoodCatalogItems(store: FoodCatalogItemsStore): Promise<FoodCatalogItem[]> {
  return (await store.foodCatalogItems.toArray()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function buildRecipeCatalogItemRecord(
  input: RecipeCatalogItem,
  existing: RecipeCatalogItem | undefined,
  timestamp: string = nowIso()
): RecipeCatalogItem {
  return {
    ...input,
    ...updateRecordMeta(existing, input.id, timestamp),
  };
}

export async function upsertRecipeCatalogItem(
  store: RecipeCatalogItemsStore,
  input: RecipeCatalogItem
): Promise<RecipeCatalogItem> {
  const existing = await store.recipeCatalogItems.get(input.id);
  const item = buildRecipeCatalogItemRecord(input, existing);

  await store.recipeCatalogItems.put(item);
  return item;
}

export async function listRecipeCatalogItems(store: RecipeCatalogItemsStore): Promise<RecipeCatalogItem[]> {
  return (await store.recipeCatalogItems.toArray()).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
}

export async function listFavoriteMeals(store: FavoriteMealsStore): Promise<FavoriteMeal[]> {
  return (await store.favoriteMeals.toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function reuseRecurringMeal(
  store: FavoriteMealsStore & FoodEntriesStore,
  input: { favoriteMealId: string; localDay: string }
): Promise<FoodEntry[]> {
  const favorite = await store.favoriteMeals.get(input.favoriteMealId);
  if (!favorite) throw new Error('Favorite meal not found');

  return Promise.all(
    favorite.items.map((item) =>
      createFoodEntry(store, {
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
  store: FoodEntriesStore,
  localDay: string
): Promise<FoodEntry[]> {
  return await store.foodEntries.where('localDay').equals(localDay).sortBy('createdAt');
}
