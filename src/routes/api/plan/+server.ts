import type { RequestHandler } from './$types';
import { planningRequestSchema } from '$lib/features/planning/contracts';
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

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid planning request payload.', { status: 400 });
  }

  const parsed = planningRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid planning request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadPlanningPageServer(parsed.data.localDay, parsed.data.state));
    case 'saveSlot':
      return Response.json(await savePlanningSlotPageServer(parsed.data.state));
    case 'saveWorkoutTemplate':
      return Response.json(await saveWorkoutTemplatePageServer(parsed.data.state));
    case 'markSlotStatus':
      return Response.json(
        await markPlanningSlotStatusPageServer(
          parsed.data.state,
          parsed.data.slotId,
          parsed.data.status
        )
      );
    case 'moveSlot':
      return Response.json(
        await movePlanningSlotPageServer(
          parsed.data.state,
          parsed.data.slotId,
          parsed.data.direction
        )
      );
    case 'deleteSlot':
      return Response.json(
        await deletePlanningSlotPageServer(parsed.data.state, parsed.data.slotId)
      );
    case 'toggleGrocery':
      return Response.json(
        await togglePlanningGroceryStatePageServer(
          parsed.data.state,
          parsed.data.itemId,
          parsed.data.patch
        )
      );
    case 'addManualGrocery':
      return Response.json(
        await addManualPlanningGroceryItemPageServer(parsed.data.state, parsed.data.draft)
      );
    case 'removeManualGrocery':
      return Response.json(
        await removeManualPlanningGroceryItemPageServer(parsed.data.state, parsed.data.itemId)
      );
  }
};
