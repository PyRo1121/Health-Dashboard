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

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid today request payload.', { status: 400 });
  }

  const parsed = todayRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid today request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadTodayPageServer(parsed.data.localDay));
    case 'save':
      return Response.json(await saveTodayPageServer(parsed.data.state));
    case 'logPlannedMeal':
      return Response.json(await logTodayPlannedMealPageServer(parsed.data.state));
    case 'clearPlannedMeal':
      return Response.json(await clearTodayPlannedMealPageServer(parsed.data.state));
    case 'applyRecoveryAction':
      return Response.json(
        await applyTodayRecoveryActionPageServer(parsed.data.state, parsed.data.actionId)
      );
    case 'markPlanSlotStatus':
      return Response.json(
        await markTodayPlanSlotStatusPageServer(
          parsed.data.state,
          parsed.data.slotId,
          parsed.data.status
        )
      );
  }
};
