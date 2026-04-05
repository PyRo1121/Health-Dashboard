import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import { createDbActionPostHandler } from '$lib/server/http/action-route';
import { commitImportBatch, listImportBatches, previewImport } from '$lib/features/imports/service';

type ImportsRequest =
  | { action: 'list' }
  | {
      action: 'preview';
      input: {
        sourceType: ImportSourceType;
        rawText: string;
        ownerProfile?: OwnerProfile | null;
      };
    }
  | { action: 'commit'; batchId: string };

const handleImportsPost = createDbActionPostHandler<ImportsRequest, ImportBatch[] | ImportBatch>(
  {
    list: (db) => listImportBatches(db),
    preview: async (db, body) => (await previewImport(db, body.input)) satisfies ImportBatch,
    commit: (db, body) => commitImportBatch(db, body.batchId),
  },
  undefined,
  {
    onActionError: (error) => {
      const message = error instanceof Error ? error.message : 'Import request failed.';
      return new Response(message, { status: 400 });
    },
  }
);

export const POST = handleImportsPost;
