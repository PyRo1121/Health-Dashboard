import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { AssessmentResult } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import {
  type AssessmentDefinition,
  classifyAssessmentBand,
  getAssessmentDefinition,
  handleHighRiskAssessmentState,
  scoreAssessment,
} from './definitions';

export type { AssessmentDefinition, AssessmentQuestion } from './definitions';
export {
  ASSESSMENTS,
  classifyAssessmentBand,
  handleHighRiskAssessmentState,
  renderAssessment,
  scoreAssessment,
} from './definitions';

async function getStoredAssessment(
  db: HealthDatabase,
  localDay: string,
  instrument: AssessmentResult['instrument']
): Promise<AssessmentResult | undefined> {
  return db.assessmentResults
    .where('localDay')
    .equals(localDay)
    .and((entry) => entry.instrument === instrument)
    .first();
}

function buildAssessmentRecord(input: {
  definition: AssessmentDefinition;
  existing?: AssessmentResult;
  localDay: string;
  instrument: AssessmentResult['instrument'];
  itemResponses: number[];
  isComplete: boolean;
  highRisk: boolean;
  totalScore?: number;
  band?: string;
}): AssessmentResult {
  const timestamp = nowIso();
  return {
    ...updateRecordMeta(
      input.existing,
      `assessment:${input.instrument}:${input.localDay}`,
      timestamp
    ),
    localDay: input.localDay,
    instrument: input.instrument,
    version: input.definition.version,
    recallWindow: input.definition.recallWindow,
    itemResponses: [...input.itemResponses],
    isComplete: input.isComplete,
    highRisk: input.highRisk,
    totalScore: input.totalScore,
    band: input.band,
  };
}

export async function saveAssessmentProgress(
  db: HealthDatabase,
  input: {
    localDay: string;
    instrument: AssessmentResult['instrument'];
    itemResponses: number[];
  }
): Promise<AssessmentResult> {
  const existing = await getStoredAssessment(db, input.localDay, input.instrument);
  const definition = getAssessmentDefinition(input.instrument);
  const highRisk = handleHighRiskAssessmentState(input.instrument, input.itemResponses).highRisk;

  const record = buildAssessmentRecord({
    definition,
    existing,
    localDay: input.localDay,
    instrument: input.instrument,
    itemResponses: input.itemResponses,
    isComplete: false,
    highRisk,
  });

  await db.assessmentResults.put(record);
  return record;
}

export async function submitAssessment(
  db: HealthDatabase,
  input: {
    localDay: string;
    instrument: AssessmentResult['instrument'];
    itemResponses: number[];
  }
): Promise<AssessmentResult> {
  const definition = getAssessmentDefinition(input.instrument);
  if (input.itemResponses.length !== definition.questions.length) {
    throw new Error('Incomplete assessment');
  }

  const existing = await getStoredAssessment(db, input.localDay, input.instrument);
  const totalScore = scoreAssessment(input.instrument, input.itemResponses);
  const highRiskState = handleHighRiskAssessmentState(input.instrument, input.itemResponses);

  const record = buildAssessmentRecord({
    definition,
    existing,
    localDay: input.localDay,
    instrument: input.instrument,
    itemResponses: input.itemResponses,
    isComplete: true,
    highRisk: highRiskState.highRisk,
    totalScore,
    band: classifyAssessmentBand(input.instrument, totalScore),
  });

  await db.assessmentResults.put(record);
  return record;
}

export async function getLatestAssessment(
  db: HealthDatabase,
  localDay: string,
  instrument: AssessmentResult['instrument']
): Promise<AssessmentResult | undefined> {
  return getStoredAssessment(db, localDay, instrument);
}
