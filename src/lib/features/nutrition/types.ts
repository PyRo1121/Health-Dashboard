export interface FoodLookupResult {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  sourceName: string;
  sourceType?: import('$lib/core/domain/types').FoodCatalogItem['sourceType'];
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
