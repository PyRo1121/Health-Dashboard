import type { RequestHandler } from './$types';
import { sobrietyRequestSchema } from '$lib/features/sobriety/contracts';
import {
  loadSobrietyPageServer,
  markSobrietyStatusServer,
  saveSobrietyCravingServer,
  saveSobrietyLapseServer,
} from '$lib/server/sobriety/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid sobriety request payload.', { status: 400 });
  }

  const parsed = sobrietyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid sobriety request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadSobrietyPageServer(parsed.data.localDay, parsed.data.state));
    case 'markStatus':
      return Response.json(
        await markSobrietyStatusServer(parsed.data.state, parsed.data.status, parsed.data.notice)
      );
    case 'saveCraving':
      return Response.json(await saveSobrietyCravingServer(parsed.data.state));
    case 'saveLapse':
      return Response.json(await saveSobrietyLapseServer(parsed.data.state));
  }
};
