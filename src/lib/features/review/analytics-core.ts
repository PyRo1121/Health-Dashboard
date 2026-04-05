import type {
  AssessmentResult,
  DailyRecord,
  FoodEntry,
  SobrietyEvent,
} from '$lib/core/domain/types';
import type { ReviewCorrelation } from './analytics-shared';
import {
  average,
  averageRecordMetric,
  groupProteinByDay,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  round,
  SIGNAL_DELTA_THRESHOLD,
} from './analytics-shared';

export function computeTrendComparisonsFromData(
  weekStart: string,
  records: DailyRecord[],
  foodEntries: FoodEntry[]
): {
  weekStart: string;
  daysTracked: number;
  averageMood: number;
  averageSleep: number;
  averageProtein: number;
} {
  const proteinByDay = groupProteinByDay(foodEntries);

  return {
    weekStart,
    daysTracked: records.length,
    averageMood: averageRecordMetric(records, (record) => record.mood),
    averageSleep: averageRecordMetric(records, (record) => record.sleepHours),
    averageProtein: average([...proteinByDay.values()]),
  };
}

export function computeCorrelations(
  records: DailyRecord[],
  foodEntries: FoodEntry[]
): ReviewCorrelation[] {
  const correlations: ReviewCorrelation[] = [];
  const proteinByDay = groupProteinByDay(foodEntries);

  const highSleep = records.filter((record) => (record.sleepHours ?? 0) >= MIN_SLEEP_HOURS);
  const lowSleep = records.filter(
    (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
  );
  if (highSleep.length && lowSleep.length) {
    const highMood = averageRecordMetric(highSleep, (record) => record.mood);
    const lowMood = averageRecordMetric(lowSleep, (record) => record.mood);

    if (highMood - lowMood >= SIGNAL_DELTA_THRESHOLD) {
      correlations.push({
        label: 'Higher sleep tracked with better mood',
        detail: `Days with 7+ hours sleep averaged ${round(highMood)} mood vs ${round(lowMood)} on shorter-sleep days.`,
        sourceDays: [...highSleep, ...lowSleep].map((record) => record.date),
      });
    }
  }

  const highProteinDays = records.filter(
    (record) => (proteinByDay.get(record.date) ?? 0) >= HIGH_PROTEIN_GRAMS
  );
  const lowProteinDays = records.filter(
    (record) =>
      (proteinByDay.get(record.date) ?? 0) > 0 &&
      (proteinByDay.get(record.date) ?? 0) < HIGH_PROTEIN_GRAMS
  );
  if (highProteinDays.length && lowProteinDays.length) {
    const highEnergy = averageRecordMetric(highProteinDays, (record) => record.energy);
    const lowEnergy = averageRecordMetric(lowProteinDays, (record) => record.energy);

    if (highEnergy - lowEnergy >= SIGNAL_DELTA_THRESHOLD) {
      correlations.push({
        label: 'Higher protein tracked with steadier energy',
        detail: `Days at 80g+ protein averaged ${round(highEnergy)} energy vs ${round(lowEnergy)} on lower-protein days.`,
        sourceDays: [...highProteinDays, ...lowProteinDays].map((record) => record.date),
      });
    }
  }

  return correlations;
}

export function generateReviewFlags(
  records: DailyRecord[],
  sobrietyEvents: SobrietyEvent[],
  assessments: AssessmentResult[]
): string[] {
  const flags: string[] = [];

  if (!records.length) {
    flags.push('Need more tracked days before weekly trends can become meaningful.');
    return flags;
  }

  const lowSleepDays = records.filter(
    (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
  );
  if (lowSleepDays.length >= 2) {
    flags.push('Sleep dipped below 7 hours on multiple tracked days.');
  }

  if (sobrietyEvents.some((event) => event.eventType === 'lapse')) {
    flags.push('A lapse was logged this week, so recovery context deserves special attention.');
  }

  const highRiskAssessment = assessments.find((assessment) => assessment.highRisk);
  if (highRiskAssessment) {
    flags.push(`${highRiskAssessment.instrument} entered a high-risk state this week.`);
  }

  return flags;
}

export function computeSobrietyStreak(records: DailyRecord[]): number {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index]?.sobrietyStatus === 'sober') {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function buildHeadline(records: DailyRecord[], flags: string[]): string {
  if (!records.length) return 'Need more data to build your first weekly briefing';
  if (flags.some((flag) => flag.includes('high-risk'))) return 'Support first, metrics second';
  if (flags.some((flag) => flag.includes('lapse'))) return 'Recovery needs a calmer reset';
  return 'Mindful reset';
}

export function buildNutritionHighlights(
  records: DailyRecord[],
  foodEntries: FoodEntry[]
): string[] {
  const proteinByDay = groupProteinByDay(foodEntries);
  return records
    .filter((record) => proteinByDay.has(record.date))
    .map((record) => `${record.date}: ${round(proteinByDay.get(record.date) ?? 0)}g protein logged`)
    .slice(0, 3);
}
