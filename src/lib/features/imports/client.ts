import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import { commitImportBatch, listImportBatches, previewImport } from './service';

const importsClient = createFeatureActionClient('/api/imports');

export async function listImportBatchesClient(): Promise<ImportBatch[]> {
  return await importsClient.action('list', (db) => listImportBatches(db));
}

export async function previewImportClient(input: {
  sourceType: ImportSourceType;
  rawText: string;
  ownerProfile?: OwnerProfile | null;
}): Promise<ImportBatch> {
  return await importsClient.action('preview', (db) => previewImport(db, input), { input });
}

export async function commitImportBatchClient(batchId: string): Promise<ImportBatch> {
  return await importsClient.action('commit', (db) => commitImportBatch(db, batchId), { batchId });
}
