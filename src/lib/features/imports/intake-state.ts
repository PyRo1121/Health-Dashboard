import type { ImportBatch, ImportSourceType } from '$lib/core/domain/types';
import type { ImportPayloadSummary } from './service';

export type PayloadOrigin = 'manual' | 'file' | 'sample';

export interface ImportIntakeState {
  sourceType: ImportSourceType;
  payload: string;
  payloadOrigin: PayloadOrigin;
  selectedFileName: string;
  fileNotice: string;
  payloadSummary: ImportPayloadSummary | null;
  isManualAnalysisPending: boolean;
  latestPreview: ImportBatch | null;
  saveNotice: string;
  errorNotice: string;
}

export interface LoadedPayloadInput {
  text: string;
  filename?: string;
  notice: string;
  origin: Extract<PayloadOrigin, 'file' | 'sample'>;
  summary: ImportPayloadSummary | null;
}

function inferSourceType(
  current: ImportSourceType,
  summary: ImportPayloadSummary | null
): ImportSourceType {
  return summary?.inferredSourceType ?? current;
}

function clearFeedbackState(
  state: ImportIntakeState,
  overrides: Partial<ImportIntakeState> = {}
): ImportIntakeState {
  return {
    ...state,
    saveNotice: '',
    errorNotice: '',
    ...overrides,
  };
}

function clearPreviewState(
  state: ImportIntakeState,
  overrides: Partial<ImportIntakeState> = {}
): ImportIntakeState {
  return clearFeedbackState(
    {
      ...state,
      latestPreview: null,
    },
    overrides
  );
}

function clearLoadedPayloadDetails(
  state: ImportIntakeState,
  overrides: Partial<ImportIntakeState> = {}
): ImportIntakeState {
  return {
    ...state,
    selectedFileName: '',
    fileNotice: '',
    payloadSummary: null,
    ...overrides,
  };
}

export function createImportIntakeState(
  sourceType: ImportSourceType = 'healthkit-companion'
): ImportIntakeState {
  return {
    sourceType,
    payload: '',
    payloadOrigin: 'manual',
    selectedFileName: '',
    fileNotice: '',
    payloadSummary: null,
    isManualAnalysisPending: false,
    latestPreview: null,
    saveNotice: '',
    errorNotice: '',
  };
}

export function applyLoadedPayloadState(
  state: ImportIntakeState,
  input: LoadedPayloadInput
): ImportIntakeState {
  return clearPreviewState(state, {
    sourceType: inferSourceType(state.sourceType, input.summary),
    payload: input.text,
    payloadOrigin: input.origin,
    selectedFileName: input.filename ?? '',
    fileNotice: input.notice,
    payloadSummary: input.summary,
    isManualAnalysisPending: false,
  });
}

export function applyManualPayloadEditState(
  state: ImportIntakeState,
  payload: string
): ImportIntakeState {
  return clearPreviewState(
    clearLoadedPayloadDetails(state, {
      payload,
      payloadOrigin: 'manual',
      isManualAnalysisPending: payload.trim().length > 0,
    })
  );
}

export function finalizeManualPayloadAnalysisState(
  state: ImportIntakeState,
  summary: ImportPayloadSummary | null
): ImportIntakeState {
  if (!state.payload.trim()) {
    return {
      ...state,
      payloadSummary: null,
      isManualAnalysisPending: false,
    };
  }

  return {
    ...state,
    sourceType: inferSourceType(state.sourceType, summary),
    payloadSummary: summary,
    isManualAnalysisPending: false,
  };
}

export function clearLoadedPayloadState(state: ImportIntakeState): ImportIntakeState {
  return clearPreviewState(
    clearLoadedPayloadDetails(state, {
      payload: '',
      payloadOrigin: 'manual',
      isManualAnalysisPending: false,
    })
  );
}

export function applyPreviewSuccessState(
  state: ImportIntakeState,
  latestPreview: ImportBatch
): ImportIntakeState {
  return clearFeedbackState(state, { latestPreview });
}

export function applyPreviewErrorState(
  state: ImportIntakeState,
  errorNotice: string
): ImportIntakeState {
  return clearPreviewState(state, { errorNotice });
}

export function applyCommitSuccessState(
  state: ImportIntakeState,
  latestPreview: ImportBatch,
  saveNotice = 'Import committed.'
): ImportIntakeState {
  return clearFeedbackState(state, { latestPreview, saveNotice });
}

export function applyCommitErrorState(
  state: ImportIntakeState,
  errorNotice: string
): ImportIntakeState {
  return {
    ...state,
    errorNotice,
  };
}

export function applyLoadErrorState(
  state: ImportIntakeState,
  errorNotice: string
): ImportIntakeState {
  return {
    ...state,
    errorNotice,
  };
}

export function applyFileLoadErrorState(
  state: ImportIntakeState,
  errorNotice: string
): ImportIntakeState {
  return clearLoadedPayloadDetails(state, { errorNotice });
}

export function canPreviewImportPayload(
  state: Pick<ImportIntakeState, 'payload' | 'isManualAnalysisPending' | 'payloadSummary'>
): boolean {
  return (
    Boolean(state.payload.trim()) &&
    !state.isManualAnalysisPending &&
    (!state.payloadSummary || !['invalid', 'unknown'].includes(state.payloadSummary.status))
  );
}

export function allowsHelperLinks(summary: ImportPayloadSummary | null): boolean {
  return !summary || !['invalid', 'unknown'].includes(summary.status);
}

export function queuedImportFile(files: FileList | File[] | undefined): File | undefined {
  if (!files) return undefined;
  if (typeof files === 'object' && 'item' in files) {
    return files.item(0) ?? undefined;
  }
  return Array.isArray(files) ? files[0] : undefined;
}
