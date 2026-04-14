import type {
  DailyRecord,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
} from '$lib/core/domain/types';
import { finalizeTodayIntelligence } from './fallback';
import {
  buildContextCaptureRecommendation,
  buildNutritionSupportRecommendation,
  buildPlannedMealRecommendation,
  buildPlannedWorkoutRecommendation,
  buildRecoveryRecommendation,
  buildStalePlanRecommendation,
} from './recommendation-builders';
export type TodayConfidence = 'high' | 'medium' | 'low';

export type TodayRecommendationKind =
  | 'recovery'
  | 'planned_meal'
  | 'planned_workout'
  | 'stale_plan_cleanup'
  | 'context_capture'
  | 'nutrition_support';

export interface TodayProvenanceRow {
  label: string;
  sourceKind: 'daily_record' | 'health_event' | 'plan_slot' | 'nutrition_summary' | 'journal';
  sourceId?: string;
}

export type TodayRecoveryActionId =
  | 'skip-workout'
  | 'clear-planned-meal'
  | 'apply-recovery-meal'
  | 'apply-recovery-workout';

export type TodayRecommendationHref = '/' | '/journal' | '/nutrition' | '/plan' | `#${string}`;

export type TodayRecommendationAction =
  | { kind: 'recovery-action'; label: string; actionId: TodayRecoveryActionId }
  | { kind: 'log-planned-meal'; label: string }
  | { kind: 'clear-planned-meal'; label: string }
  | { kind: 'plan-status'; label: string; slotId: string; status: PlanSlot['status'] }
  | { kind: 'open-journal-recovery-note'; label: string }
  | { kind: 'open-journal-context-capture'; label: string }
  | { kind: 'href'; label: string; href: TodayRecommendationHref };

export interface TodayRecommendation {
  id: string;
  kind: TodayRecommendationKind;
  title: string;
  summary: string;
  confidence: TodayConfidence;
  score: number;
  reasons: string[];
  provenance: TodayProvenanceRow[];
  primaryAction: TodayRecommendationAction;
  secondaryAction: TodayRecommendationAction | null;
  supportingAction: TodayRecommendationAction | null;
}

export interface TodayFallbackState {
  title: string;
  message: string;
  action: TodayRecommendationAction | null;
}

export interface TodayIntelligenceResult {
  primaryRecommendation: TodayRecommendation | null;
  fallbackState: TodayFallbackState | null;
}

export interface TodayRecoveryRecommendation {
  title: string;
  subtitle: string;
  reasons: string[];
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout';
  actionLabel: string;
}

export interface TodayRecoveryAdaptationInput {
  level: 'lighter-day' | 'recovery';
  headline: string;
  reasons: string[];
  mealFallback: string[];
  workoutFallback: string[];
  mealRecommendation: TodayRecoveryRecommendation | null;
  workoutRecommendation: TodayRecoveryRecommendation | null;
  actions: Array<{
    id: TodayRecoveryActionId;
    label: string;
  }>;
}

export { buildTodayRecoveryAdaptation } from './recovery';

export interface TodayPlannedWorkoutInput {
  id: string;
  title: string;
  subtitle: string;
  status: PlanSlot['status'];
}

export interface TodayIntelligenceInput {
  date: string;
  dailyRecord: DailyRecord | null;
  nutritionSummary: {
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
  };
  plannedMeal: PlannedMeal | null;
  plannedMealIssue: string | null;
  plannedWorkout: TodayPlannedWorkoutInput | null;
  plannedWorkoutIssue: string | null;
  recoveryAdaptation: TodayRecoveryAdaptationInput | null;
  latestJournalEntry: JournalEntry | null;
  events: HealthEvent[];
  planItemsCount: number;
}

export function buildTodayIntelligence(input: TodayIntelligenceInput): TodayIntelligenceResult {
  const primaryRecommendation =
    buildRecoveryRecommendation(input) ??
    buildPlannedWorkoutRecommendation(input) ??
    buildPlannedMealRecommendation(input) ??
    buildStalePlanRecommendation(input) ??
    buildContextCaptureRecommendation(input) ??
    buildNutritionSupportRecommendation(input) ??
    null;

  return finalizeTodayIntelligence(primaryRecommendation, input);
}
