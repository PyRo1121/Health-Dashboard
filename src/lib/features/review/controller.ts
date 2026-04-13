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
    selectedExperiment:
      weekly.selectedExperimentId ??
      weekly.experimentCandidates?.[0]?.id ??
      weekly.experimentOptions[0] ??
      '',
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

function isAllowedReviewExperiment(
  state: Pick<ReviewPageState, 'weekly' | 'selectedExperiment'>
): boolean {
  return Boolean(
    state.weekly &&
    state.selectedExperiment &&
    state.weekly.experimentCandidates?.some(
      (candidate) => candidate.id === state.selectedExperiment
    )
  );
}

export async function saveReviewExperimentPage(
  store: ReviewStorage,
  state: ReviewPageState
): Promise<ReviewPageState> {
  if (!state.weekly || !state.selectedExperiment) {
    return state;
  }

  if (!isAllowedReviewExperiment(state)) {
    return {
      ...state,
      saveNotice: 'Choose one of the suggested experiments before saving.',
    };
  }

  const selectedCandidate = state.weekly.experimentCandidates?.find(
    (candidate) => candidate.id === state.selectedExperiment
  );
  if (!selectedCandidate) {
    return {
      ...state,
      saveNotice: 'Choose one of the suggested experiments before saving.',
    };
  }

  await saveNextWeekExperiment(
    store,
    state.localDay,
    selectedCandidate.label,
    selectedCandidate.id
  );
  const weekly = await buildWeeklySnapshot(store, state.localDay);
  return {
    ...state,
    weekly,
    saveNotice: 'Experiment saved.',
  };
}
