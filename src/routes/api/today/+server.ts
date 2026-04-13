import type { RequestHandler } from './$types';
import {
  applyTodayRecoveryActionPageServer,
  clearTodayPlannedMealPageServer,
  loadTodayPageServer,
  logTodayPlannedMealPageServer,
  markTodayPlanSlotStatusPageServer,
  saveTodayPageServer,
} from '$lib/server/today/service';
import { todayRequestSchema } from '$lib/features/today/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: todayRequestSchema,
  invalidMessage: 'Invalid today request payload.',
  handlers: {
    load: async (data) => await loadTodayPageServer(data.localDay),
    save: async (data) => await saveTodayPageServer(data.state),
    logPlannedMeal: async (data) => await logTodayPlannedMealPageServer(data.state),
    clearPlannedMeal: async (data) => await clearTodayPlannedMealPageServer(data.state),
    applyRecoveryAction: async (data) =>
      await applyTodayRecoveryActionPageServer(data.state, data.actionId),
    markPlanSlotStatus: async (data) =>
      await markTodayPlanSlotStatusPageServer(data.state, data.slotId, data.status),
  },
});
