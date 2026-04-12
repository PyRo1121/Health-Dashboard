import type { FoodLookupResult } from '$lib/features/nutrition/types';
import type {
  DailyRecord,
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import {
  findFoodCatalogItemByBarcode,
  foodLookupResultFromCatalogItem,
  searchFoodData,
  searchLocalFoodCatalog,
  searchPackagedFoodCatalog,
} from '$lib/features/nutrition/lookup';
import { createNutritionPageState, type NutritionPageState } from '$lib/features/nutrition/state';
import {
  buildFavoriteMealRecord,
  buildFoodCatalogItemRecord,
  buildFoodEntryRecord,
  buildRecipeCatalogItemRecord,
} from '$lib/features/nutrition/store';
import {
  buildNutritionRecommendationContextFromData,
  buildDailyNutritionSummaryFromEntries,
} from '$lib/features/nutrition/summary';
import { resolveNutritionPlannedMeal } from '$lib/features/nutrition/planned-meal-resolution';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import {
  fetchOpenFoodFactsProductByBarcode,
  normalizeOpenFoodFactsBarcode,
  normalizeOpenFoodFactsProduct,
  searchOpenFoodFactsProducts,
} from '$lib/server/nutrition/open-food-facts';
import { searchUsdaFoods, fetchUsdaFoodDetail, normalizeUsdaFoodDetail } from '$lib/server/nutrition/usda';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';
import {
  deletePlanSlotServer,
  ensureWeeklyPlanServer,
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  listRecipeCatalogItemsServer,
  savePlanSlotServer,
} from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectAllMirrorRecords,
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
} from '$lib/server/db/drizzle/mirror';

export type SearchUsdaResponse = {
  matches: FoodLookupResult[];
  notice?: string;
};

function dedupeLookupResults(items: FoodLookupResult[]): FoodLookupResult[] {
  const deduped = new Map<string, FoodLookupResult>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

function dedupeRecipesById(items: RecipeCatalogItem[]): RecipeCatalogItem[] {
  const deduped = new Map<string, RecipeCatalogItem>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

async function listFavoriteMealsServer(): Promise<FavoriteMeal[]> {
  const { db } = getServerDrizzleClient();
  return (
    await selectAllMirrorRecords<FavoriteMeal>(db, drizzleSchema.favoriteMeals)
  ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function upsertFoodCatalogItemServer(input: FoodCatalogItem): Promise<FoodCatalogItem> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<FoodCatalogItem>(db, drizzleSchema.foodCatalogItems, input.id);
  const item = buildFoodCatalogItemRecord(input, existing);
  await upsertMirrorRecord(db, 'foodCatalogItems', drizzleSchema.foodCatalogItems, item);
  return item;
}

async function upsertRecipeCatalogItemServer(input: RecipeCatalogItem): Promise<RecipeCatalogItem> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<RecipeCatalogItem>(db, drizzleSchema.recipeCatalogItems, input.id);
  const item = buildRecipeCatalogItemRecord(input, existing);
  await upsertMirrorRecord(db, 'recipeCatalogItems', drizzleSchema.recipeCatalogItems, item);
  return item;
}

async function createFoodEntryServer(draft: Parameters<typeof buildFoodEntryRecord>[0]): Promise<FoodEntry> {
  const { db } = getServerDrizzleClient();
  const entry = buildFoodEntryRecord(draft);
  await upsertMirrorRecord(db, 'foodEntries', drizzleSchema.foodEntries, entry);
  return entry;
}

async function saveFavoriteMealServer(input: Parameters<typeof buildFavoriteMealRecord>[0]): Promise<FavoriteMeal> {
  const { db } = getServerDrizzleClient();
  const meal = buildFavoriteMealRecord(input);
  await upsertMirrorRecord(db, 'favoriteMeals', drizzleSchema.favoriteMeals, meal);
  return meal;
}

function createLoadedNutritionPageState(
  state: NutritionPageState,
  localDay: string,
  data: {
    summary: { calories: number; protein: number; fiber: number; carbs: number; fat: number; entries: FoodEntry[] };
    favoriteMeals: FavoriteMeal[];
    catalogItems: FoodCatalogItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    plannedMeal: ReturnType<typeof resolveNutritionPlannedMeal>;
    recommendationContext: { sleepHours?: number; sleepQuality?: number; anxietyCount: number; symptomCount: number };
  }
): NutritionPageState {
  return {
    ...state,
    loading: false,
    localDay,
    saveNotice: state.saveNotice,
    summary: data.summary,
    favoriteMeals: data.favoriteMeals,
    catalogItems: data.catalogItems,
    recipeCatalogItems: data.recipeCatalogItems,
    plannedMeal: data.plannedMeal.candidate?.meal ?? null,
    plannedMealIssue: data.plannedMeal.issue ?? '',
    plannedMealSlotId:
      data.plannedMeal.candidate?.kind === 'plan-slot-food'
        ? (data.plannedMeal.candidate.slotId ?? null)
        : null,
    recommendationContext: data.recommendationContext,
  };
}

export async function loadNutritionPageServer(
  localDay: string,
  state: NutritionPageState = createNutritionPageState()
): Promise<NutritionPageState> {
  const { db } = getServerDrizzleClient();
  const [
    dailyRecords,
    healthEvents,
    foodEntries,
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    planSlots,
  ] = await Promise.all([
    selectMirrorRecordsByField<DailyRecord>(db, drizzleSchema.dailyRecords, 'date', localDay),
    selectMirrorRecordsByField<HealthEvent>(db, drizzleSchema.healthEvents, 'localDay', localDay),
    selectMirrorRecordsByField<FoodEntry>(db, drizzleSchema.foodEntries, 'localDay', localDay),
    listFavoriteMealsServer(),
    listFoodCatalogItemsServer(),
    listRecipeCatalogItemsServer(),
    listPlanSlotsForDayServer(localDay),
  ]);

  return createLoadedNutritionPageState(state, localDay, {
    summary: buildDailyNutritionSummaryFromEntries(foodEntries),
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    plannedMeal: resolveNutritionPlannedMeal(planSlots, catalogItems),
    recommendationContext: buildNutritionRecommendationContextFromData(
      dailyRecords[0] ?? null,
      healthEvents
    ),
  });
}

async function reloadNutritionPageStateServer(
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {}
): Promise<NutritionPageState> {
  return {
    ...(await loadNutritionPageServer(state.localDay, state)),
    ...overrides,
  };
}

async function refreshNutritionPageAfterMutationServer(
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {},
  reviewLocalDay?: string
): Promise<NutritionPageState> {
  if (reviewLocalDay) {
    await refreshWeeklyReviewArtifactsServer(reviewLocalDay);
  }

  return await reloadNutritionPageStateServer(state, overrides);
}

async function resolveNutritionPlannedFoodIdServer(draft: {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  foodCatalogItemId?: string;
}): Promise<string> {
  if (draft.foodCatalogItemId) {
    const existing = (await listFoodCatalogItemsServer()).find((item) => item.id === draft.foodCatalogItemId);
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

export async function saveNutritionMealServer(
  state: NutritionPageState,
  draft: {
    localDay: string;
    mealType: string;
    name: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    notes: string;
    sourceName?: string;
  }
): Promise<NutritionPageState> {
  await createFoodEntryServer(draft);
  return await refreshNutritionPageAfterMutationServer(state, { saveNotice: 'Meal saved.' }, draft.localDay);
}

export async function saveNutritionRecurringMealServer(
  state: NutritionPageState,
  draft: {
    mealType: string;
    name: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    sourceName?: string;
  }
): Promise<NutritionPageState> {
  await saveFavoriteMealServer({
    name: draft.name || 'Quick oatmeal',
    mealType: draft.mealType,
    items: [{
      name: draft.name || 'Untitled meal',
      calories: draft.calories,
      protein: draft.protein,
      fiber: draft.fiber,
      carbs: draft.carbs,
      fat: draft.fat,
      sourceName: draft.sourceName,
    }],
  });

  return await refreshNutritionPageAfterMutationServer(state, { saveNotice: 'Recurring meal saved.' });
}

export async function saveNutritionCatalogItemServer(
  state: NutritionPageState,
  draft: { name: string; calories: number; protein: number; fiber: number; carbs: number; fat: number }
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return { ...state, saveNotice: 'Custom food name is required.' };
  }

  const timestamp = new Date().toISOString();
  await upsertFoodCatalogItemServer({
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

  return await refreshNutritionPageAfterMutationServer(state, { saveNotice: 'Saved to custom food catalog.' });
}

export async function planNutritionMealServer(
  state: NutritionPageState,
  draft: {
    name: string;
    mealType: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    notes: string;
    foodCatalogItemId?: string;
  }
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return { ...state, saveNotice: 'Plan needs a meal name.' };
  }

  const [catalogItems, planSlots] = await Promise.all([
    listFoodCatalogItemsServer(),
    listPlanSlotsForDayServer(state.localDay),
  ]);
  const resolution = resolveNutritionPlannedMeal(planSlots, catalogItems);
  if (resolution.candidate?.kind === 'plan-slot-food') {
    return { ...state, saveNotice: 'Today already has a planned meal from Plan. Update it there instead.' };
  }

  const weeklyPlan = await ensureWeeklyPlanServer(state.localDay);
  const foodCatalogItemId = await resolveNutritionPlannedFoodIdServer(draft);
  await savePlanSlotServer({
    weeklyPlanId: weeklyPlan.id,
    localDay: state.localDay,
    slotType: 'meal',
    itemType: 'food',
    itemId: foodCatalogItemId,
    mealType: draft.mealType,
    title: draft.name.trim(),
    notes: draft.notes.trim() || undefined,
  });

  return await refreshNutritionPageAfterMutationServer(state, { saveNotice: 'Planned next meal saved.' }, state.localDay);
}

export async function clearNutritionPlannedMealServer(state: NutritionPageState): Promise<NutritionPageState> {
  if (state.plannedMealSlotId) {
    await deletePlanSlotServer(state.plannedMealSlotId);
  }

  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Planned meal cleared.' },
    state.plannedMealSlotId ? state.localDay : undefined
  );
}

export async function reuseNutritionMealServer(
  state: NutritionPageState,
  favoriteMealId: string
): Promise<NutritionPageState> {
  const { db } = getServerDrizzleClient();
  const favorite = await selectMirrorRecordById<FavoriteMeal>(db, drizzleSchema.favoriteMeals, favoriteMealId);
  if (!favorite) {
    throw new Error('Favorite meal not found');
  }

  for (const item of favorite.items) {
    await createFoodEntryServer({
      localDay: state.localDay,
      mealType: favorite.mealType,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      fiber: item.fiber,
      carbs: item.carbs,
      fat: item.fat,
      sourceName: item.sourceName,
      favoriteMealId: favorite.id,
    });
  }

  return await refreshNutritionPageAfterMutationServer(state, { saveNotice: 'Recurring meal reused.' }, state.localDay);
}

export async function searchPackagedFoodsServer(query: string): Promise<FoodLookupResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchPackagedFoodCatalog(normalizedQuery, catalogItems);
  const remoteProducts = await searchOpenFoodFactsProducts(normalizedQuery);
  const remoteMatches: FoodLookupResult[] = [];

  for (const product of remoteProducts) {
    const normalized = normalizeOpenFoodFactsProduct(product);
    if (!normalized) continue;
    const cached = await upsertFoodCatalogItemServer(normalized);
    remoteMatches.push(foodLookupResultFromCatalogItem(cached));
  }

  return dedupeLookupResults([...localMatches, ...remoteMatches]);
}

export async function searchUsdaFoodsServer(query: string): Promise<SearchUsdaResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { matches: [] };
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchLocalFoodCatalog(normalizedQuery, catalogItems);
  const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;

  if (!apiKey) {
    return {
      matches: searchFoodData(normalizedQuery, catalogItems),
      notice: 'USDA live search unavailable, using local fallback foods.',
    };
  }

  const remoteMatches = await searchUsdaFoods(normalizedQuery, apiKey);
  return {
    matches: dedupeLookupResults([...localMatches, ...remoteMatches]),
    notice: remoteMatches.length ? '' : 'No USDA matches found, showing local results only.',
  };
}

export async function searchRecipesServer(query: string): Promise<RecipeCatalogItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const localMatches = (await listRecipeCatalogItemsServer()).filter((recipe) =>
    recipe.title.toLowerCase().includes(normalizedQuery.toLowerCase())
  );
  const remoteMatches = await searchThemealdbRecipes(normalizedQuery);
  const cachedRemoteMatches = await Promise.all(
    remoteMatches.map((recipe) => upsertRecipeCatalogItemServer(recipe))
  );

  return dedupeRecipesById([...localMatches, ...cachedRemoteMatches]);
}

export async function lookupNutritionBarcodeServer(code: string): Promise<FoodLookupResult | null> {
  const barcode = normalizeOpenFoodFactsBarcode(code);
  if (!barcode) {
    return null;
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const local = findFoodCatalogItemByBarcode(barcode, catalogItems);
  if (local) {
    return local;
  }

  const product = await fetchOpenFoodFactsProductByBarcode(barcode);
  if (!product) return null;

  const normalized = normalizeOpenFoodFactsProduct(product);
  if (!normalized) return null;

  return foodLookupResultFromCatalogItem(await upsertFoodCatalogItemServer(normalized));
}

export async function enrichNutritionFoodServer(fdcId: string): Promise<FoodLookupResult> {
  const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;
  if (!apiKey) {
    throw new Error('USDA API key is not configured.');
  }

  const detail = await fetchUsdaFoodDetail(fdcId, apiKey);
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<FoodCatalogItem>(db, drizzleSchema.foodCatalogItems, `usda:${fdcId}`);
  const normalized = normalizeUsdaFoodDetail(detail, existing);
  const item = await upsertFoodCatalogItemServer(normalized);
  return foodLookupResultFromCatalogItem(item);
}
