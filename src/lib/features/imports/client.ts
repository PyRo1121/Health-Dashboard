import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import { commitImportBatch, listImportBatches, previewImport } from './service';

export async function listImportBatchesClient(): Promise<ImportBatch[]> {
	return await postFeatureRequest(
		'/api/imports',
		{ action: 'list' },
		(db) => listImportBatches(db)
	);
}

export async function previewImportClient(input: {
	sourceType: ImportSourceType;
	rawText: string;
	ownerProfile?: OwnerProfile | null;
}): Promise<ImportBatch> {
	return await postFeatureRequest(
		'/api/imports',
		{
			action: 'preview',
			input
		},
		(db) => previewImport(db, input)
	);
}

export async function commitImportBatchClient(batchId: string): Promise<ImportBatch> {
	return await postFeatureRequest(
		'/api/imports',
		{
			action: 'commit',
			batchId
		},
		(db) => commitImportBatch(db, batchId)
	);
}
