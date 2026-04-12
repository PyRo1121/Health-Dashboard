import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';
import { buildHealthSnapshot, type HealthSnapshot, type HealthStorage } from './service';
import {
  createAnxietyForm,
  createSleepNoteForm,
  createSymptomForm,
  createTemplateForm,
  type AnxietyFormState,
  type SleepNoteFormState,
  type SymptomFormState,
  type TemplateFormState,
} from './model';

export interface HealthPageState {
  loading: boolean;
  localDay: string;
  snapshot: HealthSnapshot | null;
  saveNotice: string;
  symptomForm: SymptomFormState;
  anxietyForm: AnxietyFormState;
  sleepNoteForm: SleepNoteFormState;
  templateForm: TemplateFormState;
}

export function createHealthPageState(): HealthPageState {
  return createLocalDayPageState({
    snapshot: null,
    symptomForm: createSymptomForm(),
    anxietyForm: createAnxietyForm(),
    sleepNoteForm: createSleepNoteForm(),
    templateForm: createTemplateForm(),
  });
}

export type HealthPageStorage = HealthStorage;

export async function loadHealthPage(
  store: HealthPageStorage,
  localDay: string
): Promise<HealthPageState> {
  return await loadLocalDayPageState(
    {
      ...createHealthPageState(),
      localDay,
    },
    localDay,
    (day) => buildHealthSnapshot(store, day),
    (state, nextLocalDay, snapshot) => ({
      ...state,
      loading: false,
      localDay: nextLocalDay,
      snapshot,
    })
  );
}

export async function reloadHealthPageState(
  store: HealthPageStorage,
  state: HealthPageState,
  overrides: Partial<HealthPageState> = {}
): Promise<HealthPageState> {
  return await reloadLocalDayPageState(
    state,
    (localDay) => buildHealthSnapshot(store, localDay),
    (current, snapshot) => ({
      ...current,
      loading: false,
      snapshot,
    }),
    overrides
  );
}
