import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createAssessmentsPageState,
  loadAssessmentsPage as loadAssessmentsPageController,
  saveAssessmentsProgressPage as saveAssessmentsProgressPageController,
  setAssessmentsInstrument,
  submitAssessmentsPage as submitAssessmentsPageController,
  type AssessmentsPageState,
} from './controller';

export { createAssessmentsPageState, setAssessmentsInstrument };

const assessmentsClient =
  createFeatureActionClient<Parameters<typeof loadAssessmentsPageController>[0]>(
    '/api/assessments'
  );

export async function loadAssessmentsPage(
  state: AssessmentsPageState,
  localDay = currentLocalDay()
): Promise<AssessmentsPageState> {
  return await assessmentsClient.stateAction(
    'load',
    state,
    (db) => loadAssessmentsPageController(db, localDay, state),
    { localDay }
  );
}

export async function saveAssessmentsProgressPage(
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  return await assessmentsClient.stateAction('saveProgress', state, (db) =>
    saveAssessmentsProgressPageController(db, state)
  );
}

export async function submitAssessmentsPage(
  state: AssessmentsPageState
): Promise<AssessmentsPageState> {
  return await assessmentsClient.stateAction('submit', state, (db) =>
    submitAssessmentsPageController(db, state)
  );
}
