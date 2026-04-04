import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import type { ImportPayloadSummary } from './service';
import {
	applyCommitErrorState,
	applyCommitSuccessState,
	applyFileLoadErrorState,
	applyLoadedPayloadState,
	applyLoadErrorState,
	applyManualPayloadEditState,
	applyPreviewErrorState,
	applyPreviewSuccessState,
	clearLoadedPayloadState,
	createImportIntakeState,
	finalizeManualPayloadAnalysisState,
	type ImportIntakeState
} from './intake-state';
import type { ImportSourceConfig } from './source-config';

export interface ImportsPageState {
	loading: boolean;
	batches: ImportBatch[];
	intake: ImportIntakeState;
	isDragActive: boolean;
}

type DescribeImportPayload = (rawText: string, filename?: string) => ImportPayloadSummary;

export interface ImportsPreviewDeps {
	getOwnerProfile: () => OwnerProfile | null;
	listImportBatches: () => Promise<ImportBatch[]>;
	previewImport: (input: {
		sourceType: ImportSourceType;
		rawText: string;
		ownerProfile?: OwnerProfile | null;
	}) => Promise<ImportBatch>;
}

export interface ImportsCommitDeps {
	listImportBatches: () => Promise<ImportBatch[]>;
	commitImportBatch: (batchId: string) => Promise<ImportBatch>;
}

function withUpdatedIntake(
	state: ImportsPageState,
	intake: ImportIntakeState
): ImportsPageState {
	return {
		...state,
		intake
	};
}

function withLoadedBatches(
	state: ImportsPageState,
	batches: ImportBatch[]
): ImportsPageState {
	return {
		...state,
		loading: false,
		batches
	};
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

export function createImportsPageState(
	sourceType: ImportSourceType = 'healthkit-companion'
): ImportsPageState {
	return {
		loading: true,
		batches: [],
		intake: createImportIntakeState(sourceType),
		isDragActive: false
	};
}

export function setImportsPageSourceType(
	state: ImportsPageState,
	sourceType: ImportSourceType
): ImportsPageState {
	return {
		...state,
		intake: {
			...state.intake,
			sourceType
		}
	};
}

export function setImportsPageDragState(
	state: ImportsPageState,
	isDragActive: boolean
): ImportsPageState {
	return {
		...state,
		isDragActive
	};
}

export function applyImportsManualPayloadEdit(
	state: ImportsPageState,
	payload: string
): ImportsPageState {
	return withUpdatedIntake(state, applyManualPayloadEditState(state.intake, payload));
}

export function finalizeImportsManualPayload(
	state: ImportsPageState,
	summary: ImportPayloadSummary | null
): ImportsPageState {
	return withUpdatedIntake(state, finalizeManualPayloadAnalysisState(state.intake, summary));
}

export function clearImportsLoadedPayload(state: ImportsPageState): ImportsPageState {
	return withUpdatedIntake(state, clearLoadedPayloadState(state.intake));
}

export function loadImportsSamplePayload(
	state: ImportsPageState,
	sampleBundle: NonNullable<ImportSourceConfig['sampleBundle']>,
	describeImportPayload: DescribeImportPayload
): ImportsPageState {
	const text = JSON.stringify(sampleBundle.build(), null, 2);

	return withUpdatedIntake(
		state,
		applyLoadedPayloadState(state.intake, {
			text,
			filename: sampleBundle.filename,
			notice: sampleBundle.notice,
			origin: 'sample',
			summary: describeImportPayload(text, sampleBundle.filename)
		})
	);
}

export async function loadImportsFilePayload(
	state: ImportsPageState,
	file: File,
	describeImportPayload: DescribeImportPayload
): Promise<ImportsPageState> {
	try {
		const text = await file.text();
		return withUpdatedIntake(
			state,
			applyLoadedPayloadState(state.intake, {
				text,
				filename: file.name,
				notice: `Loaded ${file.name} into the import payload.`,
				origin: 'file',
				summary: describeImportPayload(text, file.name)
			})
		);
	} catch (error) {
		return withUpdatedIntake(
			state,
			applyFileLoadErrorState(state.intake, errorMessage(error, 'File upload failed.'))
		);
	}
}

export async function refreshImportsPage(
	state: ImportsPageState,
	listImportBatches: () => Promise<ImportBatch[]>
): Promise<ImportsPageState> {
	try {
		const batches = await listImportBatches();
		return withLoadedBatches(state, batches);
	} catch (error) {
		return withUpdatedIntake(
			{
				...state,
				loading: false
			},
			applyLoadErrorState(state.intake, errorMessage(error, 'Import center failed to load.'))
		);
	}
}

export async function previewImportsPage(
	state: ImportsPageState,
	deps: ImportsPreviewDeps
): Promise<ImportsPageState> {
	try {
		const latestPreview = await deps.previewImport({
			sourceType: state.intake.sourceType,
			rawText: state.intake.payload,
			ownerProfile: deps.getOwnerProfile()
		});
		const batches = await deps.listImportBatches();

		return withUpdatedIntake(
			{
				...state,
				batches
			},
			applyPreviewSuccessState(state.intake, latestPreview)
		);
	} catch (error) {
		return withUpdatedIntake(
			state,
			applyPreviewErrorState(state.intake, errorMessage(error, 'Import preview failed.'))
		);
	}
}

export async function commitImportsPage(
	state: ImportsPageState,
	deps: ImportsCommitDeps
): Promise<ImportsPageState> {
	if (!state.intake.latestPreview) {
		return state;
	}

	try {
		const committed = await deps.commitImportBatch(state.intake.latestPreview.id);
		const batches = await deps.listImportBatches();

		return withUpdatedIntake(
			{
				...state,
				batches
			},
			applyCommitSuccessState(state.intake, committed)
		);
	} catch (error) {
		return withUpdatedIntake(
			state,
			applyCommitErrorState(state.intake, errorMessage(error, 'Import commit failed.'))
		);
	}
}
