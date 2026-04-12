import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createSobrietyPageState,
  loadSobrietyPage as loadSobrietyPageController,
  markSobrietyStatus as markSobrietyStatusController,
  saveSobrietyCraving as saveSobrietyCravingController,
  saveSobrietyLapse as saveSobrietyLapseController,
  type SobrietyPageState,
} from './controller';

export { createSobrietyPageState };

const sobrietyClient = createFeatureActionClient<Parameters<typeof loadSobrietyPageController>[0]>('/api/sobriety');

export async function loadSobrietyPage(
  state: SobrietyPageState,
  localDay = currentLocalDay()
): Promise<SobrietyPageState> {
  return await sobrietyClient.stateAction(
    'load',
    state,
    (db) => loadSobrietyPageController(db, localDay, state),
    { localDay }
  );
}

export async function markSobrietyStatus(
  state: SobrietyPageState,
  status: 'sober' | 'recovery',
  notice: string
): Promise<SobrietyPageState> {
  return await sobrietyClient.stateAction(
    'markStatus',
    state,
    (db) => markSobrietyStatusController(db, state, status, notice),
    { status, notice }
  );
}

export async function saveSobrietyCraving(state: SobrietyPageState): Promise<SobrietyPageState> {
  return await sobrietyClient.stateAction('saveCraving', state, (db) =>
    saveSobrietyCravingController(db, state)
  );
}

export async function saveSobrietyLapse(state: SobrietyPageState): Promise<SobrietyPageState> {
  return await sobrietyClient.stateAction('saveLapse', state, (db) =>
    saveSobrietyLapseController(db, state)
  );
}
