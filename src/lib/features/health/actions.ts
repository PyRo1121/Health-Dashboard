import {
  logAnxietyEvent,
  logSleepNoteEvent,
  logSymptomEvent,
  quickLogHealthTemplate,
  saveHealthTemplate,
  type HealthStorage,
} from './service';
import {
  createAnxietyForm,
  createSleepNoteForm,
  createSymptomForm,
  createTemplateForm,
} from './model';
import {
  refreshWeeklyReviewArtifactsSafely,
  type ReviewStorage,
} from '$lib/features/review/service';
import { type HealthPageState, type HealthPageStorage, reloadHealthPageState } from './state';

function parseOptionalNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const normalized = typeof value === 'number' ? String(value) : value;
  if (!normalized.trim()) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface HealthActionsStorage extends HealthPageStorage, HealthStorage, ReviewStorage {}

async function refreshHealthPageAfterMutation(
  store: HealthActionsStorage,
  state: HealthPageState,
  overrides: Partial<
    Pick<
      HealthPageState,
      'saveNotice' | 'symptomForm' | 'anxietyForm' | 'sleepNoteForm' | 'templateForm'
    >
  >
): Promise<HealthPageState> {
  await refreshWeeklyReviewArtifactsSafely(store, state.localDay);
  return await reloadHealthPageState(store, state, overrides);
}

export async function saveSymptomPage(
  store: HealthActionsStorage,
  state: HealthPageState
): Promise<HealthPageState> {
  if (!state.symptomForm.symptom.trim()) {
    return {
      ...state,
      saveNotice: 'Symptom name is required.',
    };
  }

  await logSymptomEvent(store, {
    localDay: state.localDay,
    symptom: state.symptomForm.symptom,
    severity: Number(state.symptomForm.severity),
    note: state.symptomForm.note,
    referenceUrl: state.symptomForm.referenceUrl,
  });
  return await refreshHealthPageAfterMutation(store, state, {
    saveNotice: 'Symptom logged.',
    symptomForm: createSymptomForm(),
  });
}

export async function saveAnxietyPage(
  store: HealthActionsStorage,
  state: HealthPageState
): Promise<HealthPageState> {
  await logAnxietyEvent(store, {
    localDay: state.localDay,
    intensity: Number(state.anxietyForm.intensity),
    trigger: state.anxietyForm.trigger,
    durationMinutes: parseOptionalNumber(state.anxietyForm.durationMinutes),
    note: state.anxietyForm.note,
  });
  return await refreshHealthPageAfterMutation(store, state, {
    saveNotice: 'Anxiety episode logged.',
    anxietyForm: createAnxietyForm(),
  });
}

export async function saveSleepNotePage(
  store: HealthActionsStorage,
  state: HealthPageState
): Promise<HealthPageState> {
  if (!state.sleepNoteForm.note.trim()) {
    return {
      ...state,
      saveNotice: 'Sleep note is required.',
    };
  }

  await logSleepNoteEvent(store, {
    localDay: state.localDay,
    note: state.sleepNoteForm.note,
    restfulness: parseOptionalNumber(state.sleepNoteForm.restfulness),
    context: state.sleepNoteForm.context,
  });
  return await refreshHealthPageAfterMutation(store, state, {
    saveNotice: 'Sleep context logged.',
    sleepNoteForm: createSleepNoteForm(),
  });
}

export async function saveTemplatePage(
  store: HealthActionsStorage,
  state: HealthPageState
): Promise<HealthPageState> {
  if (!state.templateForm.label.trim()) {
    return {
      ...state,
      saveNotice: 'Template name is required.',
    };
  }

  await saveHealthTemplate(store, {
    label: state.templateForm.label,
    templateType: state.templateForm.templateType,
    defaultDose: parseOptionalNumber(state.templateForm.defaultDose),
    defaultUnit: state.templateForm.defaultUnit,
    note: state.templateForm.note,
    referenceUrl: state.templateForm.referenceUrl,
  });
  return await refreshHealthPageAfterMutation(store, state, {
    saveNotice: 'Template saved.',
    templateForm: createTemplateForm(),
  });
}

export async function quickLogTemplatePage(
  store: HealthActionsStorage,
  state: HealthPageState,
  templateId: string
): Promise<HealthPageState> {
  await quickLogHealthTemplate(store, {
    localDay: state.localDay,
    templateId,
  });
  return await refreshHealthPageAfterMutation(store, state, {
    saveNotice: 'Template logged.',
  });
}
