import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
	clearTodayPlannedMealPage,
	loadTodayPage,
	logTodayPlannedMealPage,
	markTodayPlanSlotStatusPage,
	saveTodayPage,
	type TodayPageState
} from '$lib/features/today/controller';

type TodayRequest =
	| { action: 'load'; localDay: string }
	| { action: 'save'; state: TodayPageState }
	| { action: 'logPlannedMeal'; state: TodayPageState }
	| { action: 'clearPlannedMeal'; state: TodayPageState }
	| { action: 'markPlanSlotStatus'; state: TodayPageState; slotId: string; status: 'planned' | 'done' | 'skipped' };

export const POST = createDbActionPostHandler<TodayRequest, TodayPageState>({
	load: (db, body) => loadTodayPage(db, body.localDay),
	save: (db, body) => saveTodayPage(db, body.state),
	logPlannedMeal: (db, body) => logTodayPlannedMealPage(db, body.state),
	clearPlannedMeal: (db, body) => clearTodayPlannedMealPage(db, body.state),
	markPlanSlotStatus: (db, body) => markTodayPlanSlotStatusPage(db, body.state, body.slotId, body.status)
});
