import { createDbActionPostHandler, type DbActionHandlers } from '$lib/server/http/action-route';
import {
  addManualPlanningGroceryItemPage,
  createPlanningPageState,
  deletePlanningSlotPage,
  loadPlanningPage,
  markPlanningSlotStatusPage,
  movePlanningSlotPage,
  removeManualPlanningGroceryItemPage,
  savePlanningSlotPage,
  saveWorkoutTemplatePage,
  togglePlanningGroceryStatePage,
  type PlanningPageState,
} from '$lib/features/planning/controller';
import { planningRequestSchema, type PlanningRequest } from '$lib/features/planning/contracts';

const handlers: DbActionHandlers<PlanningRequest, PlanningPageState> = {
  load: (db, body) => loadPlanningPage(db, body.localDay, body.state ?? createPlanningPageState()),
  saveSlot: (db, body) => savePlanningSlotPage(db, body.state),
  saveWorkoutTemplate: (db, body) => saveWorkoutTemplatePage(db, body.state),
  markSlotStatus: (db, body) =>
    markPlanningSlotStatusPage(db, body.state, body.slotId, body.status),
  moveSlot: (db, body) => movePlanningSlotPage(db, body.state, body.slotId, body.direction),
  deleteSlot: (db, body) => deletePlanningSlotPage(db, body.state, body.slotId),
  toggleGrocery: (db, body) =>
    togglePlanningGroceryStatePage(db, body.state, body.itemId, body.patch),
  addManualGrocery: (db, body) => addManualPlanningGroceryItemPage(db, body.state, body.draft),
  removeManualGrocery: (db, body) =>
    removeManualPlanningGroceryItemPage(db, body.state, body.itemId),
};

export const POST = createDbActionPostHandler(handlers, undefined, {
  parseBody: async (request) => {
    const parsed = planningRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new Error('Invalid planning request payload.');
    }
    return parsed.data;
  },
  onParseError: () => new Response('Invalid planning request payload.', { status: 400 }),
});
