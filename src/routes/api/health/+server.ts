import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
	loadHealthPage,
	quickLogTemplatePage,
	saveAnxietyPage,
	saveSleepNotePage,
	saveSymptomPage,
	saveTemplatePage,
	type HealthPageState
} from '$lib/features/health/controller';

type HealthRequest =
	| { action: 'load'; localDay: string }
	| { action: 'saveSymptom'; state: HealthPageState }
	| { action: 'saveAnxiety'; state: HealthPageState }
	| { action: 'saveSleepNote'; state: HealthPageState }
	| { action: 'saveTemplate'; state: HealthPageState }
	| { action: 'quickLogTemplate'; state: HealthPageState; templateId: string };

export const POST = createDbActionPostHandler<HealthRequest, HealthPageState>({
	load: (db, body) => loadHealthPage(db, body.localDay),
	saveSymptom: (db, body) => saveSymptomPage(db, body.state),
	saveAnxiety: (db, body) => saveAnxietyPage(db, body.state),
	saveSleepNote: (db, body) => saveSleepNotePage(db, body.state),
	saveTemplate: (db, body) => saveTemplatePage(db, body.state),
	quickLogTemplate: (db, body) => quickLogTemplatePage(db, body.state, body.templateId)
});
