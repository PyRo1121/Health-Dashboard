import type { RequestHandler } from './$types';
import {
  commitImportBatchServer,
  listImportBatchesServer,
  previewImportServer,
} from '$lib/server/imports/service';
import { importsRequestSchema } from '$lib/features/imports/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: importsRequestSchema,
  invalidMessage: 'Invalid import request payload.',
  handlers: {
    list: async () => await listImportBatchesServer(),
    preview: async (data) => await previewImportServer(data.input),
    commit: async (data) => await commitImportBatchServer(data.input),
  },
  onError: (error) => {
    const message = error instanceof Error ? error.message : 'Import request failed.';
    return new Response(message, { status: 400 });
  },
});
