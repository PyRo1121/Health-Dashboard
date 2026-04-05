import { nowIso } from '$lib/core/domain/time';
import type { BaseRecord, RecipeCatalogItem } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';

const THEMEALDB_SOURCE_NAME = 'TheMealDB';
const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

interface ThemealdbMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  [key: `strIngredient${number}`]: string | undefined;
  [key: `strMeasure${number}`]: string | undefined;
}

interface ThemealdbSearchResponse {
  meals?: ThemealdbMeal[] | null;
}

function extractIngredients(meal: ThemealdbMeal): string[] {
  const ingredients: string[] = [];

  for (let index = 1; index <= 20; index += 1) {
    const ingredient = meal[`strIngredient${index}`]?.trim();
    const measure = meal[`strMeasure${index}`]?.trim();
    if (!ingredient) continue;
    ingredients.push(measure ? `${measure} ${ingredient}`.trim() : ingredient);
  }

  return ingredients;
}

function inferMealType(category?: string): string | undefined {
  const normalized = category?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('breakfast')) return 'breakfast';
  if (normalized.includes('starter') || normalized.includes('side')) return 'snack';
  if (normalized.includes('dessert')) return 'snack';
  return undefined;
}

export function normalizeThemealdbMeal(
  meal: ThemealdbMeal,
  existing?: Pick<BaseRecord, 'id' | 'createdAt'> | null
): RecipeCatalogItem {
  const timestamp = nowIso();
  return {
    ...updateRecordMeta(existing, `themealdb:${meal.idMeal}`, timestamp),
    title: meal.strMeal,
    sourceType: 'themealdb',
    sourceName: THEMEALDB_SOURCE_NAME,
    externalId: meal.idMeal,
    imageUrl: meal.strMealThumb,
    mealType: inferMealType(meal.strCategory),
    cuisine: meal.strArea,
    ingredients: extractIngredients(meal),
    instructions: meal.strInstructions?.trim() || undefined,
  };
}

export async function searchThemealdbRecipes(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<RecipeCatalogItem[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const response = await fetchImpl(
    `${THEMEALDB_BASE_URL}/search.php?s=${encodeURIComponent(normalized)}`,
    {
      headers: {
        accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TheMealDB request failed with ${response.status}`);
  }

  const payload = (await response.json()) as ThemealdbSearchResponse;
  return (payload.meals ?? []).map((meal) => normalizeThemealdbMeal(meal));
}
