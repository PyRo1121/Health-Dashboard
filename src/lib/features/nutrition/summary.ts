import { countHealthMetricEvents } from '$lib/core/domain/health-metrics';
import type { HealthDbDailyRecordsStore, HealthDbHealthEventsStore } from '$lib/core/db/types';
import type { FoodEntry } from '$lib/core/domain/types';
import type { NutritionRecommendationContextSnapshot } from './types';
import { listFoodEntriesForDay, type FoodEntriesStore } from './store';

export interface NutritionRecommendationContextStore
  extends FoodEntriesStore, HealthDbDailyRecordsStore, HealthDbHealthEventsStore {}

function sumFoodMetric(
  entries: FoodEntry[],
  key: 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat'
): number {
  return entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
}

export function buildDailyNutritionSummaryFromEntries(entries: FoodEntry[]): {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
} {
  return {
    calories: sumFoodMetric(entries, 'calories'),
    protein: sumFoodMetric(entries, 'protein'),
    fiber: sumFoodMetric(entries, 'fiber'),
    carbs: sumFoodMetric(entries, 'carbs'),
    fat: sumFoodMetric(entries, 'fat'),
    entries,
  };
}

export function buildNutritionRecommendationContextFromData(
  dailyRecord: { sleepHours?: number; sleepQuality?: number } | null | undefined,
  healthEvents: Array<{ eventType: string }>
): NutritionRecommendationContextSnapshot {
  return {
    sleepHours: dailyRecord?.sleepHours,
    sleepQuality: dailyRecord?.sleepQuality,
    anxietyCount: countHealthMetricEvents(healthEvents, 'anxiety-episode'),
    symptomCount: countHealthMetricEvents(healthEvents, 'symptom'),
  };
}

export async function buildNutritionRecommendationContext(
  store: NutritionRecommendationContextStore,
  localDay: string
): Promise<NutritionRecommendationContextSnapshot> {
  const [dailyRecord, healthEvents] = await Promise.all([
    store.dailyRecords.where('date').equals(localDay).first(),
    store.healthEvents.where('localDay').equals(localDay).toArray(),
  ]);

  return buildNutritionRecommendationContextFromData(dailyRecord, healthEvents);
}

export async function buildDailyNutritionSummary(
  store: NutritionRecommendationContextStore,
  localDay: string
): Promise<{
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
}> {
  const entries = await listFoodEntriesForDay(store, localDay);
  return buildDailyNutritionSummaryFromEntries(entries);
}
