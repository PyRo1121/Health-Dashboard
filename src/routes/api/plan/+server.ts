import type { RequestHandler } from './$types';
import { planningRequestSchema } from '$lib/features/planning/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  addManualPlanningGroceryItemPageServer,
  deletePlanningSlotPageServer,
  loadPlanningPageServer,
  markPlanningSlotStatusPageServer,
  movePlanningSlotPageServer,
  removeManualPlanningGroceryItemPageServer,
  savePlanningSlotPageServer,
  saveWorkoutTemplatePageServer,
  togglePlanningGroceryStatePageServer,
} from '$lib/server/plan/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: planningRequestSchema,
  invalidMessage: 'Invalid planning request payload.',
  handlers: {
    load: async (data) => await loadPlanningPageServer(data.localDay, data.state),
    saveSlot: async (data) => await savePlanningSlotPageServer(data.state),
    saveWorkoutTemplate: async (data) => await saveWorkoutTemplatePageServer(data.state),
    markSlotStatus: async (data) =>
      await markPlanningSlotStatusPageServer(data.state, data.slotId, data.status),
    moveSlot: async (data) =>
      await movePlanningSlotPageServer(data.state, data.slotId, data.direction),
    deleteSlot: async (data) => await deletePlanningSlotPageServer(data.state, data.slotId),
    toggleGrocery: async (data) =>
      await togglePlanningGroceryStatePageServer(data.state, data.itemId, data.patch),
    addManualGrocery: async (data) =>
      await addManualPlanningGroceryItemPageServer(data.state, data.draft),
    removeManualGrocery: async (data) =>
      await removeManualPlanningGroceryItemPageServer(data.state, data.itemId),
  },
});
