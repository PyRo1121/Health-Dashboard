import type { ImportBatch, ImportSourceType, OwnerProfile } from '$lib/core/domain/types';
import {
  applyCommitErrorState,
  applyCommitSuccessState,
  applyFileLoadErrorState,
  applyLoadErrorState,
  applyPreviewErrorState,
  applyPreviewSuccessState,
} from './intake-state';
import { loadImportsFilePayloadState, type ImportsPageState } from './page-state';

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
  intake: import('./intake-state').ImportIntakeState
): ImportsPageState {
  return {
    ...state,
    intake,
  };
}

function withLoadedBatches(state: ImportsPageState, batches: ImportBatch[]): ImportsPageState {
  return {
    ...state,
    loading: false,
    batches,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function loadImportsFilePayload(
  state: ImportsPageState,
  file: File,
  describeImportPayload: (
    rawText: string,
    filename?: string
  ) => import('./service').ImportPayloadSummary
): Promise<ImportsPageState> {
  try {
    return await loadImportsFilePayloadState(state, file, describeImportPayload);
  } catch (error) {
    return withUpdatedIntake(
      state,
      applyFileLoadErrorState(state.intake, errorMessage(error, `Failed to load ${file.name}.`))
    );
  }
}

export async function refreshImportsPage(
  state: ImportsPageState,
  listImportBatches: () => Promise<ImportBatch[]>
): Promise<ImportsPageState> {
  try {
    return withLoadedBatches(state, await listImportBatches());
  } catch (error) {
    return withUpdatedIntake(
      {
        ...state,
        loading: false,
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
      ownerProfile: deps.getOwnerProfile(),
    });
    const batches = await deps.listImportBatches();

    return withUpdatedIntake(
      {
        ...state,
        batches,
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
        batches,
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
