import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
	FavoriteMeal,
	FoodCatalogItem,
	FoodEntry,
	PlannedMeal,
	RecipeCatalogItem
} from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';

export interface FoodLookupResult {
	id: string;
	name: string;
	calories: number;
	protein: number;
	fiber: number;
	carbs: number;
	fat: number;
	sourceName: string;
	sourceType?: FoodCatalogItem['sourceType'];
	brandName?: string;
	barcode?: string;
	externalId?: string;
	imageUrl?: string;
	isEnriched?: boolean;
}

export interface FoodEntryDraft {
	localDay: string;
	mealType: string;
	name: string;
	calories?: number;
	protein?: number;
	fiber?: number;
	carbs?: number;
	fat?: number;
	sourceName?: string;
	notes?: string;
	favoriteMealId?: string;
}

export interface NutritionRecommendationContextSnapshot {
	sleepHours?: number;
	sleepQuality?: number;
	anxietyCount: number;
	symptomCount: number;
}

export const USDA_FALLBACK_FOODS: FoodLookupResult[] = [
	{ id: 'fdc-oatmeal', name: 'Oatmeal with berries', calories: 320, protein: 12, fiber: 8, carbs: 52, fat: 7, sourceName: 'USDA fallback' },
	{ id: 'fdc-chicken-salad', name: 'Grilled chicken salad', calories: 410, protein: 36, fiber: 7, carbs: 18, fat: 19, sourceName: 'USDA fallback' },
	{ id: 'fdc-lentil-soup', name: 'Lentil soup', calories: 280, protein: 16, fiber: 11, carbs: 39, fat: 6, sourceName: 'USDA fallback' }
];

const LOCAL_CATALOG_SOURCE_NAME = 'Local catalog';
const NEXT_PLANNED_MEAL_ID = 'planned-meal:next';

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
		favoriteMealId: draft.favoriteMealId
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
		sourceName: item.sourceName
	};
}

function sumFoodMetric(entries: FoodEntry[], key: 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat'): number {
	return entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
}

export function foodLookupResultFromCatalogItem(item: FoodCatalogItem): FoodLookupResult {
	return {
		id: item.id,
		name: item.name,
		calories: item.calories ?? 0,
		protein: item.protein ?? 0,
		fiber: item.fiber ?? 0,
		carbs: item.carbs ?? 0,
		fat: item.fat ?? 0,
		sourceName: item.sourceName,
		sourceType: item.sourceType,
		brandName: item.brandName,
		barcode: item.barcode,
		externalId: item.externalId,
		imageUrl: item.imageUrl,
		isEnriched: true
	};
}

export function searchLocalFoodCatalog(
	query: string,
	catalogItems: FoodCatalogItem[] = []
): FoodLookupResult[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [];

	return catalogItems
		.filter((item) => item.name.toLowerCase().includes(normalized))
		.map((item) => foodLookupResultFromCatalogItem(item));
}

export function searchFoodData(query: string, catalogItems: FoodCatalogItem[] = []): FoodLookupResult[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [];
	const localMatches = searchLocalFoodCatalog(query, catalogItems);

	const fallbackMatches = USDA_FALLBACK_FOODS.filter((food) => food.name.toLowerCase().includes(normalized));
	return [...localMatches, ...fallbackMatches];
}

export function searchPackagedFoodCatalog(
	query: string,
	catalogItems: FoodCatalogItem[] = []
): FoodLookupResult[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [];

	return catalogItems
		.filter(
			(item) =>
				item.sourceType === 'open-food-facts' &&
				(item.name.toLowerCase().includes(normalized) ||
					item.brandName?.toLowerCase().includes(normalized) ||
					item.barcode?.includes(normalized))
		)
		.map((item) => foodLookupResultFromCatalogItem(item));
}

export function findFoodCatalogItemByBarcode(
	barcode: string,
	catalogItems: FoodCatalogItem[] = []
): FoodLookupResult | null {
	const normalized = barcode.replace(/\D+/g, '');
	if (!normalized) return null;

	const item = catalogItems.find((candidate) => candidate.barcode === normalized);
	return item ? foodLookupResultFromCatalogItem(item) : null;
}

export function attachNutrientsToFoodEntry(
	draft: FoodEntryDraft,
	match: FoodLookupResult
): FoodEntryDraft {
	return {
		...draft,
		name: match.name,
		calories: match.calories,
		protein: match.protein,
		fiber: match.fiber,
		carbs: match.carbs,
		fat: match.fat,
		sourceName: match.sourceName
	};
}

export async function createFoodEntry(db: HealthDatabase, draft: FoodEntryDraft): Promise<FoodEntry> {
	const entry = buildFoodEntryRecord(draft);

	await db.foodEntries.put(entry);
	return entry;
}

export async function saveFavoriteMeal(
	db: HealthDatabase,
	input: { name: string; mealType: string; items: Array<Pick<FoodEntry, 'name' | 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat' | 'sourceName'>> }
): Promise<FavoriteMeal> {
	const timestamp = nowIso();
	const meal: FavoriteMeal = {
		...createRecordMeta(createRecordId('favorite-meal'), timestamp),
		name: input.name,
		mealType: input.mealType,
		items: input.items.map((item) => normalizeFavoriteMealItem(item))
	};

	await db.favoriteMeals.put(meal);
	return meal;
}

export async function saveFoodCatalogItem(
	db: HealthDatabase,
	input: { name: string; calories?: number; protein?: number; fiber?: number; carbs?: number; fat?: number; brandName?: string }
): Promise<FoodCatalogItem> {
	const timestamp = nowIso();
	const item = await upsertFoodCatalogItem(db, {
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
		updatedAt: timestamp
	});
	return item;
}

export async function listFoodCatalogItems(db: HealthDatabase): Promise<FoodCatalogItem[]> {
	return (await db.foodCatalogItems.toArray()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function upsertRecipeCatalogItem(
	db: HealthDatabase,
	input: RecipeCatalogItem
): Promise<RecipeCatalogItem> {
	const timestamp = nowIso();
	const existing = await db.recipeCatalogItems.get(input.id);
	const item: RecipeCatalogItem = {
		...input,
		...updateRecordMeta(existing, input.id, timestamp)
	};

	await db.recipeCatalogItems.put(item);
	return item;
}

export async function listRecipeCatalogItems(db: HealthDatabase): Promise<RecipeCatalogItem[]> {
	return (await db.recipeCatalogItems.toArray()).sort((left, right) => left.title.localeCompare(right.title));
}

export async function getPlannedMeal(db: HealthDatabase): Promise<PlannedMeal | null> {
	return (await db.plannedMeals.get(NEXT_PLANNED_MEAL_ID)) ?? null;
}

export async function savePlannedMeal(
	db: HealthDatabase,
	input: Omit<PlannedMeal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlannedMeal> {
	const timestamp = nowIso();
	const existing = await getPlannedMeal(db);
	const meal: PlannedMeal = {
		...updateRecordMeta(existing, NEXT_PLANNED_MEAL_ID, timestamp),
		name: input.name,
		mealType: input.mealType,
		calories: input.calories,
		protein: input.protein,
		fiber: input.fiber,
		carbs: input.carbs,
		fat: input.fat,
		sourceName: input.sourceName,
		notes: input.notes
	};

	await db.plannedMeals.put(meal);
	return meal;
}

export async function clearPlannedMeal(db: HealthDatabase): Promise<void> {
	await db.plannedMeals.delete(NEXT_PLANNED_MEAL_ID);
}

export async function upsertFoodCatalogItem(
	db: HealthDatabase,
	input: FoodCatalogItem
): Promise<FoodCatalogItem> {
	const timestamp = nowIso();
	const existing = await db.foodCatalogItems.get(input.id);
	const item: FoodCatalogItem = {
		...input,
		...updateRecordMeta(existing, input.id, timestamp)
	};

	await db.foodCatalogItems.put(item);
	return item;
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
				favoriteMealId: favorite.id
			})
		)
	);
}

export async function listFoodEntriesForDay(db: HealthDatabase, localDay: string): Promise<FoodEntry[]> {
	return await db.foodEntries.where('localDay').equals(localDay).sortBy('createdAt');
}

export async function buildNutritionRecommendationContext(
	db: HealthDatabase,
	localDay: string
): Promise<NutritionRecommendationContextSnapshot> {
	const [dailyRecord, healthEvents] = await Promise.all([
		db.dailyRecords.where('date').equals(localDay).first(),
		db.healthEvents.where('localDay').equals(localDay).toArray()
	]);

	return {
		sleepHours: dailyRecord?.sleepHours,
		sleepQuality: dailyRecord?.sleepQuality,
		anxietyCount: healthEvents.filter((event) => event.eventType === 'anxiety-episode').length,
		symptomCount: healthEvents.filter((event) => event.eventType === 'symptom').length
	};
}

export async function buildDailyNutritionSummary(
	db: HealthDatabase,
	localDay: string
): Promise<{ calories: number; protein: number; fiber: number; carbs: number; fat: number; entries: FoodEntry[] }> {
	const entries = await listFoodEntriesForDay(db, localDay);
	return {
		calories: sumFoodMetric(entries, 'calories'),
		protein: sumFoodMetric(entries, 'protein'),
		fiber: sumFoodMetric(entries, 'fiber'),
		carbs: sumFoodMetric(entries, 'carbs'),
		fat: sumFoodMetric(entries, 'fat'),
		entries
	};
}
