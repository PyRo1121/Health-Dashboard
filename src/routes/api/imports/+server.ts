import type { RequestHandler } from './$types';
import {
  commitImportBatchServer,
  listImportBatchesServer,
  previewImportServer,
} from '$lib/server/imports/service';
import { importsRequestSchema } from '$lib/features/imports/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import { getServerOwnerProfile } from '$lib/server/settings/store';

const MAX_IMPORT_REQUEST_BYTES = 2_000_000;
const MAX_IMPORT_RAW_TEXT_LENGTH = 1_000_000;

class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

const handler = createValidatedActionPostHandler({
  schema: importsRequestSchema,
  invalidMessage: 'Invalid import request payload.',
  handlers: {
    list: async () => await listImportBatchesServer(),
    preview: async (data) =>
      data.input.rawText.length > MAX_IMPORT_RAW_TEXT_LENGTH
        ? (() => {
            throw new PayloadTooLargeError('Import request payload is too large.');
          })()
        : await previewImportServer({
            sourceType: data.input.sourceType,
            rawText: data.input.rawText,
            ownerProfile: await getServerOwnerProfile(),
          }),
    commit: async (data) =>
      data.input.rawText.length > MAX_IMPORT_RAW_TEXT_LENGTH
        ? (() => {
            throw new PayloadTooLargeError('Import request payload is too large.');
          })()
        : await commitImportBatchServer({
            sourceType: data.input.sourceType,
            rawText: data.input.rawText,
            ownerProfile: await getServerOwnerProfile(),
          }),
  },
  onError: (error) => {
    if (error instanceof PayloadTooLargeError) {
      return new Response(error.message, { status: 413 });
    }
    const message = error instanceof Error ? error.message : 'Import request failed.';
    return new Response(message, { status: 400 });
  },
});

export const POST: RequestHandler = async (event) => {
  const contentLength = Number.parseInt(event.request.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_REQUEST_BYTES) {
    return new Response('Import request payload is too large.', { status: 413 });
  }

  return await handler(event);
};
