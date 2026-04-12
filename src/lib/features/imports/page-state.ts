import type { ImportBatch, ImportSourceType } from '$lib/core/domain/types';
import type { ImportPayloadSummary } from './core';
import {
  applyLoadedPayloadState,
  applyManualPayloadEditState,
  clearLoadedPayloadState,
  createImportIntakeState,
  finalizeManualPayloadAnalysisState,
  type ImportIntakeState,
} from './intake-state';
import type { ImportSourceConfig } from './source-config';

export interface ImportsPageState {
  loading: boolean;
  batches: ImportBatch[];
  intake: ImportIntakeState;
  isDragActive: boolean;
}

type DescribeImportPayload = (rawText: string, filename?: string) => ImportPayloadSummary;

function withUpdatedIntake(state: ImportsPageState, intake: ImportIntakeState): ImportsPageState {
  return {
    ...state,
    intake,
  };
}

export function createImportsPageState(
  sourceType: ImportSourceType = 'healthkit-companion'
): ImportsPageState {
  return {
    loading: true,
    batches: [],
    intake: createImportIntakeState(sourceType),
    isDragActive: false,
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
      sourceType,
    },
  };
}

export function setImportsPageDragState(
  state: ImportsPageState,
  isDragActive: boolean
): ImportsPageState {
  return {
    ...state,
    isDragActive,
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
      summary: describeImportPayload(text, sampleBundle.filename),
    })
  );
}

export async function loadImportsFilePayloadState(
  state: ImportsPageState,
  file: File,
  describeImportPayload: DescribeImportPayload
): Promise<ImportsPageState> {
  const text = await file.text();
  return withUpdatedIntake(
    state,
    applyLoadedPayloadState(state.intake, {
      text,
      filename: file.name,
      notice: `Loaded ${file.name} into the import payload.`,
      origin: 'file',
      summary: describeImportPayload(text, file.name),
    })
  );
}
