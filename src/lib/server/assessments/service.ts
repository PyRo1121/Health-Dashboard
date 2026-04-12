import type { AssessmentResult } from '$lib/core/domain/types';
import {
  buildAssessmentRecord,
  classifyAssessmentBand,
  handleHighRiskAssessmentState,
  scoreAssessment,
} from '$lib/features/assessments/service';
import { createAssessmentDraftResponses } from '$lib/features/assessments/model';
import { getAssessmentDefinition, renderAssessment } from '$lib/features/assessments/definitions';
import type { AssessmentsPageState } from '$lib/features/assessments/controller';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordsByField, upsertMirrorRecord } from '$lib/server/db/drizzle/mirror';

async function getStoredAssessmentServer(
  localDay: string,
  instrument: AssessmentResult['instrument']
): Promise<AssessmentResult | undefined> {
  const { db } = getServerDrizzleClient();
  return (
    await selectMirrorRecordsByField<AssessmentResult>(
      db,
      drizzleSchema.assessmentResults,
      'localDay',
      localDay
    )
  ).find((entry) => entry.instrument === instrument);
}

export async function loadAssessmentsPageServer(
  localDay: string,
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  const latest = await getStoredAssessmentServer(localDay, state.instrument);
  const definition = renderAssessment(state.instrument);

  return {
    ...state,
    loading: false,
    localDay,
    latest,
    draftResponses: createAssessmentDraftResponses(latest, definition),
  };
}

async function refreshAssessmentsAfterMutationServer(
  state: AssessmentsPageState,
  overrides: Partial<AssessmentsPageState> = {}
): Promise<AssessmentsPageState> {
  await refreshWeeklyReviewArtifactsServer(state.localDay);
  return {
    ...state,
    validationError: '',
    ...overrides,
  };
}

export async function saveAssessmentsProgressPageServer(
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  const existing = await getStoredAssessmentServer(state.localDay, state.instrument);
  const definition = getAssessmentDefinition(state.instrument);
  const highRisk = handleHighRiskAssessmentState(
    state.instrument,
    state.draftResponses.filter((value) => value >= 0)
  ).highRisk;
  const record = buildAssessmentRecord({
    definition,
    existing,
    localDay: state.localDay,
    instrument: state.instrument,
    itemResponses: state.draftResponses.filter((value) => value >= 0),
    isComplete: false,
    highRisk,
  });
  const { db } = getServerDrizzleClient();
  await upsertMirrorRecord(db, 'assessmentResults', drizzleSchema.assessmentResults, record);
  return await refreshAssessmentsAfterMutationServer(state, { saveNotice: 'Progress saved.' });
}

export async function submitAssessmentsPageServer(
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  try {
    const definition = getAssessmentDefinition(state.instrument);
    if (state.draftResponses.length !== definition.questions.length) {
      throw new Error('Incomplete assessment');
    }

    const existing = await getStoredAssessmentServer(state.localDay, state.instrument);
    const totalScore = scoreAssessment(state.instrument, state.draftResponses);
    const highRiskState = handleHighRiskAssessmentState(state.instrument, state.draftResponses);
    const latest = buildAssessmentRecord({
      definition,
      existing,
      localDay: state.localDay,
      instrument: state.instrument,
      itemResponses: state.draftResponses,
      isComplete: true,
      highRisk: highRiskState.highRisk,
      totalScore,
      band: classifyAssessmentBand(state.instrument, totalScore),
    });
    const { db } = getServerDrizzleClient();
    await upsertMirrorRecord(db, 'assessmentResults', drizzleSchema.assessmentResults, latest);
    return await refreshAssessmentsAfterMutationServer(state, {
      latest,
      saveNotice: 'Assessment saved.',
      safetyMessage: highRiskState.message ?? '',
    });
  } catch (error) {
    return {
      ...state,
      validationError: error instanceof Error ? error.message : 'Unable to save assessment.',
    };
  }
}
