import type { RequestHandler } from './$types';
import {
  commitImportBatchServer,
  listImportBatchesServer,
  previewImportServer,
} from '$lib/server/imports/service';
import { importsRequestSchema } from '$lib/features/imports/contracts';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid import request payload.', { status: 400 });
  }

  const parsed = importsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid import request payload.', { status: 400 });
  }

  try {
    switch (parsed.data.action) {
      case 'list':
        return Response.json(await listImportBatchesServer());
      case 'preview':
        return Response.json(await previewImportServer(parsed.data.input));
      case 'commit':
        return Response.json(await commitImportBatchServer(parsed.data.batchId));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import request failed.';
    return new Response(message, { status: 400 });
  }
};
