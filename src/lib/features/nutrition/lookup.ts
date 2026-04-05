import type { FoodCatalogItem } from '$lib/core/domain/types';
import type { FoodEntryDraft, FoodLookupResult } from './types';

export const USDA_FALLBACK_FOODS: FoodLookupResult[] = [
  {
    id: 'fdc-oatmeal',
    name: 'Oatmeal with berries',
    calories: 320,
    protein: 12,
    fiber: 8,
    carbs: 52,
    fat: 7,
    sourceName: 'USDA fallback',
  },
  {
    id: 'fdc-chicken-salad',
    name: 'Grilled chicken salad',
    calories: 410,
    protein: 36,
    fiber: 7,
    carbs: 18,
    fat: 19,
    sourceName: 'USDA fallback',
  },
  {
    id: 'fdc-lentil-soup',
    name: 'Lentil soup',
    calories: 280,
    protein: 16,
    fiber: 11,
    carbs: 39,
    fat: 6,
    sourceName: 'USDA fallback',
  },
];

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
    isEnriched: true,
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

export function searchFoodData(
  query: string,
  catalogItems: FoodCatalogItem[] = []
): FoodLookupResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const localMatches = searchLocalFoodCatalog(query, catalogItems);
  const fallbackMatches = USDA_FALLBACK_FOODS.filter((food) =>
    food.name.toLowerCase().includes(normalized)
  );

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
    sourceName: match.sourceName,
  };
}
