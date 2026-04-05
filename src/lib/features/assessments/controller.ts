import type { HealthDatabase } from '$lib/core/db/types';
import type { AssessmentResult } from '$lib/core/domain/types';
import { createAssessmentDraftResponses } from './model';
import {
  getLatestAssessment,
  handleHighRiskAssessmentState,
  renderAssessment,
  saveAssessmentProgress,
  submitAssessment,
} from '$lib/features/assessments/service';

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
  db: HealthDatabase,
  localDay: string,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  const latest = await getLatestAssessment(db, localDay, state.instrument);
  const definition = renderAssessment(state.instrument);

  return {
    ...state,
    loading: false,
    localDay,
    latest,
    draftResponses: createAssessmentDraftResponses(latest, definition),
  };
}

export async function saveAssessmentsProgressPage(
  db: HealthDatabase,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  await saveAssessmentProgress(db, {
    localDay: state.localDay,
    instrument: state.instrument,
    itemResponses: state.draftResponses.filter((value) => value >= 0),
  });

  return withClearedAssessmentValidation(state, {
    saveNotice: 'Progress saved.',
  });
}

export async function submitAssessmentsPage(
  db: HealthDatabase,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  try {
    const latest = await submitAssessment(db, {
      localDay: state.localDay,
      instrument: state.instrument,
      itemResponses: state.draftResponses,
    });

    return withClearedAssessmentValidation(state, {
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
