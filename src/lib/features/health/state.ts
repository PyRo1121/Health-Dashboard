import type { HealthDatabase } from '$lib/core/db/types';
import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';
import type { HealthSnapshot } from './service';
import { buildHealthSnapshot } from './service';
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

export async function loadHealthPage(
  db: HealthDatabase,
  localDay: string
): Promise<HealthPageState> {
  return await loadLocalDayPageState(
    {
      ...createHealthPageState(),
      localDay,
    },
    localDay,
    (day) => buildHealthSnapshot(db, day),
    (state, nextLocalDay, snapshot) => ({
      ...state,
      loading: false,
      localDay: nextLocalDay,
      snapshot,
    })
  );
}

export async function reloadHealthPageState(
  db: HealthDatabase,
  state: HealthPageState,
  overrides: Partial<HealthPageState> = {}
): Promise<HealthPageState> {
  return await reloadLocalDayPageState(
    state,
    (localDay) => buildHealthSnapshot(db, localDay),
    (current, snapshot) => ({
      ...current,
      loading: false,
      snapshot,
    }),
    overrides
  );
}
