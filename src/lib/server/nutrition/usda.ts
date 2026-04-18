import { nowIso } from '$lib/core/domain/time';
import type { BaseRecord, FoodCatalogItem } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import { withTimeoutInit } from '$lib/server/http/fetch-timeout';

const USDA_SOURCE_NAME = 'USDA FoodData Central';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface UsdaSearchFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodCategory?: string;
  brandOwner?: string;
}

interface UsdaSearchResponse {
  foods?: UsdaSearchFood[];
}

interface UsdaFoodNutrient {
  nutrient?: {
    number?: string;
    name?: string;
    unitName?: string;
  };
  amount?: number;
}

interface UsdaFoodDetail {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients?: UsdaFoodNutrient[];
  householdServingFullText?: string;
}

export interface UsdaSearchResult {
  id: string;
  externalId: string;
  name: string;
  sourceName: string;
  sourceType: 'usda-fallback';
  brandName?: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  isEnriched: false;
}

function usdaHeaders(): HeadersInit {
  return {
    accept: 'application/json',
  };
}

function firstMatchingAmount(
  nutrients: UsdaFoodNutrient[] | undefined,
  matchers: Array<{ number?: string; name?: string }>
): number | undefined {
  if (!nutrients) return undefined;

  for (const matcher of matchers) {
    const hit = nutrients.find((nutrient) => {
      const nutrientNumber = nutrient.nutrient?.number?.trim();
      const nutrientName = nutrient.nutrient?.name?.trim().toLowerCase();
      return (
        (matcher.number !== undefined && nutrientNumber === matcher.number) ||
        (matcher.name !== undefined && nutrientName === matcher.name.toLowerCase())
      );
    });

    if (hit?.amount !== undefined) {
      return hit.amount;
    }
  }

  return undefined;
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function normalizeUsdaSearchResult(food: UsdaSearchFood): UsdaSearchResult {
  return {
    id: `usda-search:${food.fdcId}`,
    externalId: String(food.fdcId),
    name: food.description,
    sourceName: USDA_SOURCE_NAME,
    sourceType: 'usda-fallback',
    brandName: food.brandOwner,
    calories: 0,
    protein: 0,
    fiber: 0,
    carbs: 0,
    fat: 0,
    isEnriched: false,
  };
}

export function normalizeUsdaFoodDetail(
  food: UsdaFoodDetail,
  existing?: Pick<BaseRecord, 'id' | 'createdAt'> | null
): FoodCatalogItem {
  const timestamp = nowIso();
  const calories = firstMatchingAmount(food.foodNutrients, [
    { number: '1008' },
    { name: 'Energy' },
  ]);
  const protein = firstMatchingAmount(food.foodNutrients, [
    { number: '1003' },
    { name: 'Protein' },
  ]);
  const fiber = firstMatchingAmount(food.foodNutrients, [
    { number: '1079' },
    { name: 'Fiber, total dietary' },
  ]);
  const carbs = firstMatchingAmount(food.foodNutrients, [
    { number: '1005' },
    { name: 'Carbohydrate, by difference' },
  ]);
  const fat = firstMatchingAmount(food.foodNutrients, [
    { number: '1004' },
    { name: 'Total lipid (fat)' },
  ]);

  return {
    ...updateRecordMeta(existing, `usda:${food.fdcId}`, timestamp),
    name: food.description,
    sourceType: 'usda-fallback',
    sourceName: USDA_SOURCE_NAME,
    externalId: String(food.fdcId),
    brandName: food.brandOwner,
    calories: safeNumber(calories),
    protein: safeNumber(protein),
    fiber: safeNumber(fiber),
    carbs: safeNumber(carbs),
    fat: safeNumber(fat),
    servingUnit: food.householdServingFullText,
    lastVerifiedAt: timestamp,
  };
}

async function readJson<T>(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const response = await fetchImpl(url, withTimeoutInit(init));

  if (!response.ok) {
    throw new Error(`USDA request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function searchUsdaFoods(
  query: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<UsdaSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const url = `${USDA_BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`;
  const response = await readJson<UsdaSearchResponse>(
    url,
    {
      method: 'POST',
      headers: {
        ...usdaHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: normalized,
        pageSize: 10,
        dataType: ['Branded', 'Foundation', 'Survey (FNDDS)', 'SR Legacy'],
      }),
    },
    fetchImpl
  );

  return (response.foods ?? []).map((food) => normalizeUsdaSearchResult(food));
}

export async function fetchUsdaFoodDetail(
  fdcId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<UsdaFoodDetail> {
  const normalized = String(Number(fdcId));
  if (!normalized || normalized === 'NaN') {
    throw new Error('Invalid USDA food id.');
  }

  return await readJson<UsdaFoodDetail>(
    `${USDA_BASE_URL}/food/${normalized}?api_key=${encodeURIComponent(apiKey)}`,
    {
      headers: usdaHeaders(),
    },
    fetchImpl
  );
}
