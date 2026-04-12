import type { WeeklyReviewData } from '$lib/features/review/service';
import {
  buildWeeklySnapshot,
  resolveReviewAnchorDay,
  saveNextWeekExperiment,
  type ReviewStorage,
} from '$lib/features/review/service';

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
  store: ReviewStorage,
  localDay: string
): Promise<ReviewPageState> {
  const resolvedLocalDay = await resolveReviewAnchorDay(store, localDay);
  const weekly = await buildWeeklySnapshot(store, resolvedLocalDay);
  return {
    loading: false,
    localDay: resolvedLocalDay,
    weekly,
    selectedExperiment: weekly.experimentOptions[0] ?? '',
    loadNotice: '',
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
  store: ReviewStorage,
  state: ReviewPageState
): Promise<ReviewPageState> {
  if (!state.weekly || !state.selectedExperiment) {
    return state;
  }

  const snapshot = await saveNextWeekExperiment(store, state.localDay, state.selectedExperiment);
  return {
    ...state,
    weekly: {
      ...state.weekly,
      snapshot,
    },
    saveNotice: 'Experiment saved.',
  };
}
