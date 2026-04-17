import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import { commitImportBatch, listImportBatches, previewImport } from './store';
import type { ImportPreviewResult } from '$lib/core/domain/types';

const importsClient =
  createFeatureActionClient<Parameters<typeof previewImport>[0]>('/api/imports');

export async function listImportBatchesClient(): Promise<ImportBatch[]> {
  return await importsClient.action('list', (db) => listImportBatches(db));
}

export async function previewImportClient(input: {
  sourceType: ImportSourceType;
  rawText: string;
  ownerProfile?: OwnerProfile | null;
}): Promise<ImportPreviewResult> {
  return await importsClient.action('preview', (db) => previewImport(db, input), { input });
}

export async function commitImportBatchClient(input: {
  sourceType: ImportSourceType;
  rawText: string;
  ownerProfile?: OwnerProfile | null;
}): Promise<ImportBatch> {
  return await importsClient.action('commit', (db) => commitImportBatch(db, input), { input });
}
