import type { DailyCheckinInput } from '$lib/features/today/actions';
import type { TodaySnapshot } from '$lib/features/today/snapshot';

export const DEFAULT_TODAY_FORM = {
  mood: '3',
  energy: '3',
  stress: '2',
  focus: '4',
  sleepHours: '7.5',
  sleepQuality: '4',
  freeformNote: '',
} as const;

export type TodayFormState = { [Key in keyof typeof DEFAULT_TODAY_FORM]: string };

export type TodayMetricField = {
  key: keyof TodayFormState;
  label: string;
  type: 'number';
  min: string;
  max?: string;
  step?: string;
};

export const todayMetricFields = [
  { key: 'mood', label: 'Mood', type: 'number', min: '0', max: '5' },
  { key: 'energy', label: 'Energy', type: 'number', min: '0', max: '5' },
  { key: 'stress', label: 'Stress', type: 'number', min: '0', max: '5' },
  { key: 'focus', label: 'Focus', type: 'number', min: '0', max: '5' },
  { key: 'sleepHours', label: 'Sleep hours', type: 'number', min: '0', step: '0.5' },
  { key: 'sleepQuality', label: 'Sleep quality', type: 'number', min: '0', max: '5' },
] satisfies TodayMetricField[];

export function createTodayForm(): TodayFormState {
  return { ...DEFAULT_TODAY_FORM };
}

export function createTodayFormFromSnapshot(snapshot: TodaySnapshot | null): TodayFormState {
  if (!snapshot?.dailyRecord) {
    return createTodayForm();
  }

  return {
    mood: String(snapshot.dailyRecord.mood ?? DEFAULT_TODAY_FORM.mood),
    energy: String(snapshot.dailyRecord.energy ?? DEFAULT_TODAY_FORM.energy),
    stress: String(snapshot.dailyRecord.stress ?? DEFAULT_TODAY_FORM.stress),
    focus: String(snapshot.dailyRecord.focus ?? DEFAULT_TODAY_FORM.focus),
    sleepHours: String(snapshot.dailyRecord.sleepHours ?? DEFAULT_TODAY_FORM.sleepHours),
    sleepQuality: String(snapshot.dailyRecord.sleepQuality ?? DEFAULT_TODAY_FORM.sleepQuality),
    freeformNote: snapshot.dailyRecord.freeformNote ?? DEFAULT_TODAY_FORM.freeformNote,
  };
}

export function createDailyCheckinPayload(date: string, form: TodayFormState): DailyCheckinInput {
  return {
    date,
    mood: Number(form.mood),
    energy: Number(form.energy),
    stress: Number(form.stress),
    focus: Number(form.focus),
    sleepHours: Number(form.sleepHours),
    sleepQuality: Number(form.sleepQuality),
    freeformNote: form.freeformNote.trim(),
  };
}

export {
  createPlannedMealProjectionRows,
  createPlannedMealRows,
  createPlannedWorkoutRows,
  createTodayConfidenceLabel,
  createTodayEventRows,
  createTodayNutritionGuidance,
  createTodayNutritionPulseMetrics,
  createTodayNutritionRows,
  createTodayPlanRows,
  createTodayRecommendationRows,
  createTodayRecommendationSupportRows,
  createTodayRecordRows,
  isTodayRecommendationHrefAction,
  type TodayEventRow,
  type TodayNutritionPulseMetric,
  type TodayPlanRow,
} from '$lib/features/today/presentation';
