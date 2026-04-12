import type { RequestHandler } from './$types';
import { healthRequestSchema } from '$lib/features/health/contracts';
import {
  loadHealthPageServer,
  quickLogTemplatePageServer,
  saveAnxietyPageServer,
  saveSleepNotePageServer,
  saveSymptomPageServer,
  saveTemplatePageServer,
} from '$lib/server/health/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid health request payload.', { status: 400 });
  }

  const parsed = healthRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid health request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadHealthPageServer(parsed.data.localDay));
    case 'saveSymptom':
      return Response.json(await saveSymptomPageServer(parsed.data.state));
    case 'saveAnxiety':
      return Response.json(await saveAnxietyPageServer(parsed.data.state));
    case 'saveSleepNote':
      return Response.json(await saveSleepNotePageServer(parsed.data.state));
    case 'saveTemplate':
      return Response.json(await saveTemplatePageServer(parsed.data.state));
    case 'quickLogTemplate':
      return Response.json(await quickLogTemplatePageServer(parsed.data.state, parsed.data.templateId));
  }
};
