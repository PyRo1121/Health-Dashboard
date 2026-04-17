import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient, createFeatureRequestClient } from '$lib/core/http/feature-client';
import {
  createHealthPageState,
  loadHealthPage as loadHealthPageController,
  type HealthPageState,
} from './state';
import {
  quickLogTemplatePage as quickLogTemplatePageController,
  saveAnxietyPage as saveAnxietyPageController,
  saveSleepNotePage as saveSleepNotePageController,
  saveSymptomPage as saveSymptomPageController,
  saveTemplatePage as saveTemplatePageController,
  type HealthActionsStorage,
} from './actions';
import type { HealthSymptomSuggestion } from './model';
import type { HealthSymptomSuggestionResponse } from '$lib/server/health/clinical-tables';
import type { HealthMedicationSuggestion } from './model';
import type { HealthMedicationSuggestionResponse } from '$lib/server/health/rxnorm';

export { createHealthPageState };

const healthClient = createFeatureActionClient<HealthActionsStorage>('/api/health');
const symptomSearchClient = createFeatureRequestClient<never>('/api/health/search-symptoms');
const medicationSearchClient = createFeatureRequestClient<never>('/api/health/search-medications');

export async function loadHealthPage(localDay = currentLocalDay()): Promise<HealthPageState> {
  return await healthClient.action('load', (db) => loadHealthPageController(db, localDay), {
    localDay,
  });
}

export async function saveSymptomPage(state: HealthPageState): Promise<HealthPageState> {
  return await healthClient.stateAction('saveSymptom', state, (db) =>
    saveSymptomPageController(db, state)
  );
}

export async function saveAnxietyPage(state: HealthPageState): Promise<HealthPageState> {
  return await healthClient.stateAction('saveAnxiety', state, (db) =>
    saveAnxietyPageController(db, state)
  );
}

export async function saveSleepNotePage(state: HealthPageState): Promise<HealthPageState> {
  return await healthClient.stateAction('saveSleepNote', state, (db) =>
    saveSleepNotePageController(db, state)
  );
}

export async function saveTemplatePage(state: HealthPageState): Promise<HealthPageState> {
  return await healthClient.stateAction('saveTemplate', state, (db) =>
    saveTemplatePageController(db, state)
  );
}

export async function quickLogTemplatePage(
  state: HealthPageState,
  templateId: string
): Promise<HealthPageState> {
  return await healthClient.stateAction(
    'quickLogTemplate',
    state,
    (db) => quickLogTemplatePageController(db, state, templateId),
    { templateId }
  );
}

export async function searchHealthSymptomSuggestions(
  query: string
): Promise<HealthSymptomSuggestionResponse> {
  return await symptomSearchClient.request<HealthSymptomSuggestionResponse>({ query }, async () => ({
    suggestions: [] satisfies HealthSymptomSuggestion[],
    notice: '',
    metadata: {
      provenance: [],
      cacheStatus: 'none',
      degradationStatus: 'none',
    },
  }));
}

export async function searchHealthMedicationSuggestions(
  query: string
): Promise<HealthMedicationSuggestionResponse> {
  return await medicationSearchClient.request<HealthMedicationSuggestionResponse>(
    { query },
    async () => ({
      suggestions: [] satisfies HealthMedicationSuggestion[],
      notice: '',
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    })
  );
}
