import type { AssessmentResult } from '$lib/core/domain/types';
import { createAssessmentDraftResponses } from './model';
import {
  getLatestAssessment,
  handleHighRiskAssessmentState,
  renderAssessment,
  saveAssessmentProgress,
  submitAssessment,
  type AssessmentResultsStore,
} from '$lib/features/assessments/service';
import {
  refreshWeeklyReviewArtifactsSafely,
  type ReviewStorage,
} from '$lib/features/review/service';

export interface AssessmentsPageStorage extends AssessmentResultsStore, ReviewStorage {}

export interface AssessmentsPageState {
  loading: boolean;
  localDay: string;
  instrument: AssessmentResult['instrument'];
  draftResponses: number[];
  latest: AssessmentResult | undefined;
  saveNotice: string;
  validationError: string;
  safetyMessage: string;
}

const EMPTY_ASSESSMENTS_FEEDBACK = {
  saveNotice: '',
  validationError: '',
  safetyMessage: '',
} as const;

function withClearedAssessmentsFeedback(
  state: AssessmentsPageState,
  overrides: Partial<AssessmentsPageState> = {}
): AssessmentsPageState {
  return {
    ...state,
    ...EMPTY_ASSESSMENTS_FEEDBACK,
    ...overrides,
  };
}

function withClearedAssessmentValidation(
  state: AssessmentsPageState,
  overrides: Partial<AssessmentsPageState> = {}
): AssessmentsPageState {
  return {
    ...state,
    validationError: '',
    ...overrides,
  };
}

function assessmentErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save assessment.';
}

export function createAssessmentsPageState(): AssessmentsPageState {
  return {
    loading: true,
    localDay: '',
    instrument: 'PHQ-9',
    draftResponses: [],
    latest: undefined,
    ...EMPTY_ASSESSMENTS_FEEDBACK,
  };
}

export function setAssessmentsInstrument(
  state: AssessmentsPageState,
  instrument: AssessmentResult['instrument']
): AssessmentsPageState {
  return withClearedAssessmentsFeedback(state, {
    instrument,
  });
}

export async function loadAssessmentsPage(
  store: AssessmentsPageStorage,
  localDay: string,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  const latest = await getLatestAssessment(store, localDay, state.instrument);
  const definition = renderAssessment(state.instrument);

  return {
    ...state,
    loading: false,
    localDay,
    latest,
    draftResponses: createAssessmentDraftResponses(latest, definition),
  };
}

async function refreshAssessmentsAfterMutation(
  store: AssessmentsPageStorage,
  state: AssessmentsPageState,
  overrides: Partial<AssessmentsPageState> = {}
): Promise<AssessmentsPageState> {
  await refreshWeeklyReviewArtifactsSafely(store, state.localDay);
  return withClearedAssessmentValidation(state, overrides);
}

export async function saveAssessmentsProgressPage(
  store: AssessmentsPageStorage,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  await saveAssessmentProgress(store, {
    localDay: state.localDay,
    instrument: state.instrument,
    itemResponses: state.draftResponses.filter((value) => value >= 0),
  });
  return await refreshAssessmentsAfterMutation(store, state, {
    saveNotice: 'Progress saved.',
  });
}

export async function submitAssessmentsPage(
  store: AssessmentsPageStorage,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  try {
    const latest = await submitAssessment(store, {
      localDay: state.localDay,
      instrument: state.instrument,
      itemResponses: state.draftResponses,
    });
    return await refreshAssessmentsAfterMutation(store, state, {
      latest,
      saveNotice: 'Assessment saved.',
      safetyMessage:
        handleHighRiskAssessmentState(state.instrument, state.draftResponses).message ?? '',
    });
  } catch (error) {
    return {
      ...state,
      validationError: assessmentErrorMessage(error),
    };
  }
}
