import { describe, expect, it } from 'vitest';
import type { ImportBatch } from '$lib/core/domain/types';
import type { ImportPayloadSummary } from '$lib/features/imports/service';
import {
	allowsHelperLinks,
	applyCommitErrorState,
	applyCommitSuccessState,
	applyFileLoadErrorState,
	applyLoadedPayloadState,
	applyManualPayloadEditState,
	applyPreviewErrorState,
	applyPreviewSuccessState,
	canPreviewImportPayload,
	clearLoadedPayloadState,
	createImportIntakeState,
	finalizeManualPayloadAnalysisState,
	queuedImportFile
} from '$lib/features/imports/intake-state';

const READY_SUMMARY: ImportPayloadSummary = {
	inferredSourceType: 'healthkit-companion',
	status: 'ready',
	headline: 'Ready',
	detail: 'Looks valid.',
	itemCount: 3,
	itemLabel: 'records'
};

const INVALID_SUMMARY: ImportPayloadSummary = {
	inferredSourceType: 'healthkit-companion',
	status: 'invalid',
	headline: 'Invalid',
	detail: 'Looks broken.'
};

const STAGED_BATCH: ImportBatch = {
	id: 'batch-1',
	createdAt: '2026-04-02T08:00:00.000Z',
	updatedAt: '2026-04-02T08:00:00.000Z',
	sourceType: 'healthkit-companion',
	status: 'staged'
};

describe('imports intake state', () => {
	it('creates the default intake state', () => {
		expect(createImportIntakeState()).toEqual({
			sourceType: 'healthkit-companion',
			payload: '',
			payloadOrigin: 'manual',
			selectedFileName: '',
			fileNotice: '',
			payloadSummary: null,
			isManualAnalysisPending: false,
			latestPreview: null,
			saveNotice: '',
			errorNotice: ''
		});
	});

	it('applies a loaded payload, inferred source, and notice together', () => {
		const state = applyLoadedPayloadState(createImportIntakeState('day-one-json'), {
			text: '{"connector":"healthkit-ios"}',
			filename: 'bundle.json',
			notice: 'Loaded bundle.json into the import payload.',
			origin: 'file',
			summary: READY_SUMMARY
		});

		expect(state.sourceType).toBe('healthkit-companion');
		expect(state.payloadOrigin).toBe('file');
		expect(state.selectedFileName).toBe('bundle.json');
		expect(state.payloadSummary).toEqual(READY_SUMMARY);
		expect(state.fileNotice).toMatch(/bundle\.json/i);
		expect(state.latestPreview).toBeNull();
	});

	it('switches file/sample state back to manual editing and clears stale preview state', () => {
		const loaded = applyLoadedPayloadState(createImportIntakeState(), {
			text: '{"connector":"healthkit-ios"}',
			filename: 'bundle.json',
			notice: 'Loaded bundle.json into the import payload.',
			origin: 'file',
			summary: READY_SUMMARY
		});
		const previewed = applyPreviewSuccessState(loaded, STAGED_BATCH);
		const edited = applyManualPayloadEditState(previewed, '{"connector":"healthkit-ios"}\n');

		expect(edited.payloadOrigin).toBe('manual');
		expect(edited.selectedFileName).toBe('');
		expect(edited.fileNotice).toBe('');
		expect(edited.payloadSummary).toBeNull();
		expect(edited.isManualAnalysisPending).toBe(true);
		expect(edited.latestPreview).toBeNull();
		expect(edited.errorNotice).toBe('');
	});

	it('finalizes manual payload analysis and adopts the inferred source type', () => {
		const pending = applyManualPayloadEditState(createImportIntakeState('apple-health-xml'), '{"entry":[]}');
		const finalized = finalizeManualPayloadAnalysisState(pending, {
			...READY_SUMMARY,
			inferredSourceType: 'smart-fhir-sandbox'
		});

		expect(finalized.isManualAnalysisPending).toBe(false);
		expect(finalized.payloadSummary?.inferredSourceType).toBe('smart-fhir-sandbox');
		expect(finalized.sourceType).toBe('smart-fhir-sandbox');
	});

	it('clears a loaded payload back to the neutral manual state', () => {
		const state = clearLoadedPayloadState(
			applyLoadedPayloadState(createImportIntakeState(), {
				text: '{"connector":"healthkit-ios"}',
				filename: 'bundle.json',
				notice: 'Loaded bundle.json into the import payload.',
				origin: 'sample',
				summary: READY_SUMMARY
			})
		);

		expect(state.payload).toBe('');
		expect(state.payloadOrigin).toBe('manual');
		expect(state.selectedFileName).toBe('');
		expect(state.fileNotice).toBe('');
		expect(state.payloadSummary).toBeNull();
	});

	it('tracks preview and commit result states separately from errors', () => {
		const state = createImportIntakeState();
		const previewed = applyPreviewSuccessState(state, STAGED_BATCH);
		const committed = applyCommitSuccessState(previewed, { ...STAGED_BATCH, status: 'committed' });
		const previewError = applyPreviewErrorState(committed, 'Preview failed.');
		const fileError = applyFileLoadErrorState(previewError, 'File upload failed.');
		const commitError = applyCommitErrorState(fileError, 'Commit failed.');

		expect(previewed.latestPreview?.status).toBe('staged');
		expect(committed.latestPreview?.status).toBe('committed');
		expect(committed.saveNotice).toBe('Import committed.');
		expect(previewError.latestPreview).toBeNull();
		expect(fileError.selectedFileName).toBe('');
		expect(commitError.errorNotice).toBe('Commit failed.');
	});

	it('derives preview and helper-link eligibility from the current summary state', () => {
		expect(canPreviewImportPayload(createImportIntakeState())).toBe(false);
		expect(
			canPreviewImportPayload(
				applyManualPayloadEditState(createImportIntakeState(), '{"connector":"healthkit-ios"}')
			)
		).toBe(false);
		expect(
			canPreviewImportPayload(
				finalizeManualPayloadAnalysisState(
					applyManualPayloadEditState(createImportIntakeState(), '{"connector":"healthkit-ios"}'),
					READY_SUMMARY
				)
			)
		).toBe(true);
		expect(allowsHelperLinks(null)).toBe(true);
		expect(allowsHelperLinks(READY_SUMMARY)).toBe(true);
		expect(allowsHelperLinks(INVALID_SUMMARY)).toBe(false);
	});

	it('extracts the queued file from either FileList-like or array inputs', () => {
		const file = new File(['{}'], 'bundle.json', { type: 'application/json' });

		expect(queuedImportFile([file])).toBe(file);
		expect(queuedImportFile(undefined)).toBeUndefined();
	});
});
