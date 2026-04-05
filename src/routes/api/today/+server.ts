import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  applyTodayRecoveryActionPage,
  clearTodayPlannedMealPage,
  loadTodayPage,
  logTodayPlannedMealPage,
  markTodayPlanSlotStatusPage,
  saveTodayPage,
  type TodayPageState,
} from '$lib/features/today/controller';
import { todayRequestSchema, type TodayRequest } from '$lib/features/today/contracts';

export const POST = createDbActionPostHandler<TodayRequest, TodayPageState>(
  {
    load: (db, body) => loadTodayPage(db, body.localDay),
    save: (db, body) => saveTodayPage(db, body.state),
    logPlannedMeal: (db, body) => logTodayPlannedMealPage(db, body.state),
    clearPlannedMeal: (db, body) => clearTodayPlannedMealPage(db, body.state),
    applyRecoveryAction: (db, body) => applyTodayRecoveryActionPage(db, body.state, body.actionId),
    markPlanSlotStatus: (db, body) =>
      markTodayPlanSlotStatusPage(db, body.state, body.slotId, body.status),
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = todayRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid today request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid today request payload.', { status: 400 }),
  }
);
