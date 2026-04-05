import type { HealthDatabase } from '$lib/core/db/types';
import { migrateLegacyPlannedMealToPlanSlot } from '$lib/features/nutrition/migration';
import type { WeeklyReviewData } from '$lib/features/review/service';
import { buildWeeklySnapshot, saveNextWeekExperiment } from '$lib/features/review/service';

export interface ReviewPageState {
  loading: boolean;
  localDay: string;
  weekly: WeeklyReviewData | null;
  selectedExperiment: string;
  loadNotice: string;
  saveNotice: string;
}

export function createReviewPageState(): ReviewPageState {
  return {
    loading: true,
    localDay: '',
    weekly: null,
    selectedExperiment: '',
    loadNotice: '',
    saveNotice: '',
  };
}

export async function loadReviewPage(
  db: HealthDatabase,
  localDay: string
): Promise<ReviewPageState> {
  const migration = await migrateLegacyPlannedMealToPlanSlot(db, localDay);
  const weekly = await buildWeeklySnapshot(db, localDay);
  return {
    loading: false,
    localDay,
    weekly,
    selectedExperiment: weekly.experimentOptions[0] ?? '',
    loadNotice: migration.notice ?? '',
    saveNotice: '',
  };
}

export function setReviewExperiment(
  state: ReviewPageState,
  selectedExperiment: string
): ReviewPageState {
  return {
    ...state,
    selectedExperiment,
  };
}

export async function saveReviewExperimentPage(
  db: HealthDatabase,
  state: ReviewPageState
): Promise<ReviewPageState> {
  if (!state.weekly || !state.selectedExperiment) {
    return state;
  }

  const snapshot = await saveNextWeekExperiment(db, state.localDay, state.selectedExperiment);
  return {
    ...state,
    weekly: {
      ...state.weekly,
      snapshot,
    },
    saveNotice: 'Experiment saved.',
  };
}
