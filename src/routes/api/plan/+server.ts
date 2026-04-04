import { json } from '@sveltejs/kit';
import { dispatchDbAction, type DbActionHandlers } from '$lib/server/http/action-route';
import {
	createPlanningPageState,
	deletePlanningSlotPage,
	loadPlanningPage,
	markPlanningSlotStatusPage,
	movePlanningSlotPage,
	savePlanningSlotPage,
	saveWorkoutTemplatePage,
	togglePlanningGroceryStatePage,
	type PlanningPageState
} from '$lib/features/planning/controller';
import { planningRequestSchema, type PlanningRequest } from '$lib/features/planning/contracts';
import { withServerHealthDb } from '$lib/server/db/client';

const handlers: DbActionHandlers<PlanningRequest, PlanningPageState> = {
	load: (db, body) => loadPlanningPage(db, body.localDay, body.state ?? createPlanningPageState()),
	saveSlot: (db, body) => savePlanningSlotPage(db, body.state),
	saveWorkoutTemplate: (db, body) => saveWorkoutTemplatePage(db, body.state),
	markSlotStatus: (db, body) => markPlanningSlotStatusPage(db, body.state, body.slotId, body.status),
	moveSlot: (db, body) => movePlanningSlotPage(db, body.state, body.slotId, body.direction),
	deleteSlot: (db, body) => deletePlanningSlotPage(db, body.state, body.slotId),
	toggleGrocery: (db, body) => togglePlanningGroceryStatePage(db, body.state, body.itemId, body.patch)
};

export async function POST({ request }) {
	const parsed = planningRequestSchema.safeParse(await request.json());
	if (!parsed.success) {
		return new Response('Invalid planning request payload.', { status: 400 });
	}

	return json(await withServerHealthDb((db) => dispatchDbAction(db, parsed.data, handlers)));
}
