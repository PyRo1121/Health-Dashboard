import type {
  AdherenceMatch,
  DailyRecord,
  FoodEntry,
  ReviewSnapshot,
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';

export interface ReviewCorrelation {
  label: string;
  detail: string;
  sourceDays: string[];
}

export interface ReviewNutritionStrategyItem {
  kind: 'repeat' | 'rotate' | 'skip';
  recommendationKind: 'food' | 'recipe';
  recommendationId: string;
  title: string;
  detail: string;
}

export interface ReviewAdherenceScore {
  label: 'Overall' | 'Meals' | 'Workouts';
  score: number;
  completed: number;
  missed: number;
  pending: number;
  inferredCount: number;
  tone: 'steady' | 'mixed' | 'attention';
  detail: string;
}

export interface WeeklyReviewData {
  anchorDay: string;
  snapshot: ReviewSnapshot;
  averageMood: number;
  averageSleep: number;
  averageProtein: number;
  sobrietyStreak: number;
  nutritionHighlights: string[];
  nutritionStrategy: ReviewNutritionStrategyItem[];
  planningHighlights: string[];
  adherenceScores: ReviewAdherenceScore[];
  adherenceSignals: string[];
  adherenceMatches: AdherenceMatch[];
  grocerySignals: string[];
  deviceHighlights: string[];
  assessmentSummary: string[];
  healthHighlights: string[];
  contextSignals: string[];
  journalHighlights: string[];
  experimentOptions: string[];
}

export const MIN_SLEEP_HOURS = 7;
export const HIGH_PROTEIN_GRAMS = 80;
export const SIGNAL_DELTA_THRESHOLD = 0.5;
export const REVIEW_EXPERIMENT_OPTIONS = [
  'Try 10 min morning mindfulness',
  'Increase hydration tracking',
  'Increase protein at breakfast',
] as const;

export function createStrategyItem(
  kind: ReviewNutritionStrategyItem['kind'],
  recommendationKind: ReviewNutritionStrategyItem['recommendationKind'],
  recommendationId: string,
  title: string,
  detail: string
): ReviewNutritionStrategyItem {
  return {
    kind,
    recommendationKind,
    recommendationId,
    title,
    detail,
  };
}

export function round(value: number): number {
  return Number(value.toFixed(1));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function average(values: number[]): number {
  return round(values.reduce((sum, value) => sum + value, 0) / (values.length || 1));
}

export function averageRecordMetric(
  records: DailyRecord[],
  read: (record: DailyRecord) => number | undefined
): number {
  return average(records.map((record) => read(record) ?? 0));
}

export function weekRangeFromAnchorDay(anchorDay: string): {
  weekStart: string;
  days: string[];
} {
  const weekStart = startOfWeek(anchorDay);
  const date = new Date(`${weekStart}T00:00:00Z`);

  return {
    weekStart,
    days: Array.from({ length: 7 }, (_, index) => {
      const day = new Date(date);
      day.setUTCDate(date.getUTCDate() + index);
      return day.toISOString().slice(0, 10);
    }),
  };
}

export function filterByDays<T>(items: T[], readDay: (item: T) => string, days: string[]): T[] {
  return items.filter((item) => days.includes(readDay(item)));
}

export function groupProteinByDay(entries: FoodEntry[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const entry of entries) {
    result.set(entry.localDay, (result.get(entry.localDay) ?? 0) + (entry.protein ?? 0));
  }
  return result;
}
