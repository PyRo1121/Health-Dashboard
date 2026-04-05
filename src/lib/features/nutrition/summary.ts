import type { HealthDatabase } from '$lib/core/db/types';
import type { FoodEntry } from '$lib/core/domain/types';
import type { NutritionRecommendationContextSnapshot } from './types';
import { listFoodEntriesForDay } from './store';

function sumFoodMetric(
  entries: FoodEntry[],
  key: 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat'
): number {
  return entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
}

export async function buildNutritionRecommendationContext(
  db: HealthDatabase,
  localDay: string
): Promise<NutritionRecommendationContextSnapshot> {
  const [dailyRecord, healthEvents] = await Promise.all([
    db.dailyRecords.where('date').equals(localDay).first(),
    db.healthEvents.where('localDay').equals(localDay).toArray(),
  ]);

  return {
    sleepHours: dailyRecord?.sleepHours,
    sleepQuality: dailyRecord?.sleepQuality,
    anxietyCount: healthEvents.filter((event) => event.eventType === 'anxiety-episode').length,
    symptomCount: healthEvents.filter((event) => event.eventType === 'symptom').length,
  };
}

export async function buildDailyNutritionSummary(
  db: HealthDatabase,
  localDay: string
): Promise<{
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
}> {
  const entries = await listFoodEntriesForDay(db, localDay);
  return {
    calories: sumFoodMetric(entries, 'calories'),
    protein: sumFoodMetric(entries, 'protein'),
    fiber: sumFoodMetric(entries, 'fiber'),
    carbs: sumFoodMetric(entries, 'carbs'),
    fat: sumFoodMetric(entries, 'fat'),
    entries,
  };
}
