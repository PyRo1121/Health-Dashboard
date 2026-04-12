import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
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

export { createHealthPageState };

const healthClient = createFeatureActionClient<HealthActionsStorage>('/api/health');

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
