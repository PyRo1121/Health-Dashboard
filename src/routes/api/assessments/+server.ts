import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadAssessmentsPage,
  saveAssessmentsProgressPage,
  submitAssessmentsPage,
  type AssessmentsPageState,
} from '$lib/features/assessments/controller';

type AssessmentsRequest =
  | { action: 'load'; localDay: string; state: AssessmentsPageState }
  | { action: 'saveProgress'; state: AssessmentsPageState }
  | { action: 'submit'; state: AssessmentsPageState };

export const POST = createDbActionPostHandler<AssessmentsRequest, AssessmentsPageState>({
  load: (db, body) => loadAssessmentsPage(db, body.localDay, body.state),
  saveProgress: (db, body) => saveAssessmentsProgressPage(db, body.state),
  submit: (db, body) => submitAssessmentsPage(db, body.state),
});
