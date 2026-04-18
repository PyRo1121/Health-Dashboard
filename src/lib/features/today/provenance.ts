import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import type { HealthEvent } from '$lib/core/domain/types';
import type { TodayIntelligenceInput, TodayProvenanceRow } from './intelligence';

const DAILY_NUTRITION_TARGETS = {
  protein: 80,
  fiber: 25,
} as const;

export function buildDailyRecordProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];
  const record = input.dailyRecord;
  if (!record) {
    return rows;
  }

  if (typeof record.sleepHours === 'number') {
    rows.push({
      label: `Sleep hours: ${record.sleepHours}, daily check-in`,
      sourceKind: 'daily_record',
      sourceId: record.id,
    });
  }

  if (typeof record.sleepQuality === 'number' && record.sleepQuality <= 3) {
    rows.push({
      label: `Sleep quality: ${record.sleepQuality}/5, daily check-in`,
      sourceKind: 'daily_record',
      sourceId: record.id,
    });
  }

  return rows;
}

export function buildEventProvenance(events: HealthEvent[]): TodayProvenanceRow[] {
  return events.slice(0, 2).map((event) => {
    const display = buildHealthEventDisplay(event);
    return {
      label: `${display.label}: ${display.valueLabel}, ${display.sourceLabel.toLowerCase()}`,
      sourceKind: 'health_event',
      sourceId: event.id,
    };
  });
}

export function buildPlanProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];

  if (input.plannedWorkout) {
    rows.push({
      label: `Planned workout: ${input.plannedWorkout.title}, weekly plan`,
      sourceKind: 'plan_slot',
      sourceId: input.plannedWorkout.id,
    });
  }

  if (input.plannedMeal) {
    rows.push({
      label: `Planned meal: ${input.plannedMeal.name}, weekly plan`,
      sourceKind: 'plan_slot',
    });
  }

  return rows;
}

export function buildNutritionProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];

  if (input.nutritionSummaryUnknown?.protein) {
    rows.push({
      label: 'Protein pace is still unknown because one logged meal is missing nutrition totals.',
      sourceKind: 'nutrition_summary',
    });
  } else if (input.nutritionSummary.protein < DAILY_NUTRITION_TARGETS.protein) {
    rows.push({
      label: `Protein pace: ${input.nutritionSummary.protein} / ${DAILY_NUTRITION_TARGETS.protein}g`,
      sourceKind: 'nutrition_summary',
    });
  }

  if (input.nutritionSummaryUnknown?.fiber) {
    rows.push({
      label: 'Fiber pace is still unknown because one logged meal is missing nutrition totals.',
      sourceKind: 'nutrition_summary',
    });
  } else if (input.nutritionSummary.fiber < DAILY_NUTRITION_TARGETS.fiber) {
    rows.push({
      label: `Fiber pace: ${input.nutritionSummary.fiber} / ${DAILY_NUTRITION_TARGETS.fiber}g`,
      sourceKind: 'nutrition_summary',
    });
  }

  return rows;
}

export function dedupeProvenance(rows: TodayProvenanceRow[]): TodayProvenanceRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.sourceKind}:${row.sourceId ?? row.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
