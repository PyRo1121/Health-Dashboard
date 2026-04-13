import type {
  AssessmentResult,
  DailyRecord,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  SobrietyEvent,
} from '$lib/core/domain/types';
import { matchesHealthMetric } from '$lib/core/domain/health-metrics';
import type {
  ReviewAdherenceScore,
  ReviewCorrelation,
  ReviewWeeklyRecommendation,
} from './analytics-shared';
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

type ReviewHeadlineDecision = ReviewWeeklyRecommendation['decision'] | 'observe';
type ReviewHeadlineTheme =
  | 'support'
  | 'recovery'
  | 'sleep'
  | 'nutrition'
  | 'plan'
  | 'context'
  | 'mixed';

function toHeadlineDecision(
  recommendation: Pick<ReviewWeeklyRecommendation, 'decision'> | null
): ReviewHeadlineDecision {
  return recommendation?.decision ?? 'observe';
}

function deriveHeadlineTheme(input: {
  records: DailyRecord[];
  assessments: AssessmentResult[];
  sobrietyEvents: SobrietyEvent[];
  healthEvents: HealthEvent[];
  journalEntries: JournalEntry[];
  averageProtein: number;
  adherenceScores: ReviewAdherenceScore[];
  recommendation: Pick<ReviewWeeklyRecommendation, 'decision' | 'target'> | null;
}): ReviewHeadlineTheme {
  const {
    records,
    assessments,
    sobrietyEvents,
    healthEvents,
    journalEntries,
    averageProtein,
    adherenceScores,
    recommendation,
  } = input;

  if (assessments.some((assessment) => assessment.highRisk)) {
    return 'support';
  }

  if (sobrietyEvents.some((event) => event.eventType === 'lapse')) {
    return 'recovery';
  }

  const lowSleepDays = new Set(
    records
      .filter(
        (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
      )
      .map((record) => record.date)
  );
  const hasAnxietyOnLowSleep = healthEvents.some(
    (event) =>
      matchesHealthMetric(event.eventType, 'anxiety-episode') && lowSleepDays.has(event.localDay)
  );
  const hasStrongSymptom = healthEvents.some(
    (event) =>
      matchesHealthMetric(event.eventType, 'symptom') &&
      typeof event.value === 'number' &&
      event.value >= 4
  );
  if (hasAnxietyOnLowSleep || hasStrongSymptom) {
    return 'recovery';
  }

  if (lowSleepDays.size >= 2) {
    return 'sleep';
  }

  if (
    recommendation?.target.kind === 'food' ||
    recommendation?.target.kind === 'recipe' ||
    averageProtein >= HIGH_PROTEIN_GRAMS
  ) {
    return 'nutrition';
  }

  const overallAdherence = adherenceScores.find((score) => score.label === 'Overall');
  if (
    recommendation?.target.kind === 'plan' ||
    (overallAdherence !== undefined && overallAdherence.score < 60)
  ) {
    return 'plan';
  }

  const hasLinkedContext = journalEntries.some((entry) => entry.linkedEventIds.length > 0);
  if (hasLinkedContext || journalEntries.length >= 2) {
    return 'context';
  }

  return 'mixed';
}

function buildHeadlineFromTheme(
  theme: ReviewHeadlineTheme,
  decision: ReviewHeadlineDecision,
  recordCount: number
): string {
  if (recordCount === 0) {
    return 'Need more data to build your first weekly briefing';
  }

  switch (theme) {
    case 'support':
      return 'Support first, metrics second';
    case 'recovery':
      if (decision === 'continue') return 'Protect the recovery basics that helped';
      if (decision === 'stop') return 'Recovery needs a calmer reset';
      if (decision === 'observe') return 'Recovery is the first signal to watch';
      return 'Recovery needs a lighter next week';
    case 'sleep':
      if (decision === 'continue') return 'Sleep is the habit worth protecting';
      if (decision === 'stop') return 'Stop letting short sleep steer the week';
      if (decision === 'observe') return 'Sleep is the first lever showing up';
      return 'Sleep consistency is the next lever';
    case 'nutrition':
      if (decision === 'continue') return 'Keep the nutrition win in rotation';
      if (decision === 'stop') return 'The food experiment did not earn another week';
      if (decision === 'observe') return 'Nutrition is the first clear signal';
      return 'Nutrition needs a tighter next pass';
    case 'plan':
      if (decision === 'continue') return 'The plan held, now keep it realistic';
      if (decision === 'stop') return 'This plan shape did not survive the week';
      if (decision === 'observe')
        return recordCount === 1
          ? 'First signal logged, keep the streak going'
          : 'The plan needs more real-world signal';
      return 'Tighten the plan before next week';
    case 'context':
      if (decision === 'continue') return 'The context clues are finally repeating';
      if (decision === 'stop') return 'One repeating pattern is no longer worth carrying';
      if (decision === 'observe') return 'Context is giving the first useful read';
      return 'Context explained what the week was missing';
    case 'mixed':
      if (decision === 'continue') return 'One pattern is worth carrying forward';
      if (decision === 'stop') return 'The week ruled one pattern out';
      if (decision === 'observe')
        return recordCount === 1
          ? 'First signal logged, keep the streak going'
          : 'A few more days will sharpen the read';
      return 'The week is mixed, but the next step is clear';
  }
}

export function buildHeadline(input: {
  records: DailyRecord[];
  assessments: AssessmentResult[];
  sobrietyEvents: SobrietyEvent[];
  healthEvents: HealthEvent[];
  journalEntries: JournalEntry[];
  averageProtein: number;
  adherenceScores: ReviewAdherenceScore[];
  recommendation: Pick<ReviewWeeklyRecommendation, 'decision' | 'target'> | null;
}): string {
  const theme = deriveHeadlineTheme(input);
  return buildHeadlineFromTheme(
    theme,
    toHeadlineDecision(input.recommendation),
    input.records.length
  );
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
