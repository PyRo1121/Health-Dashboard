import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';
import type { SobrietyEvent } from '$lib/core/domain/types';
import {
  buildSobrietyTrendSummary,
  logCravingEvent,
  logLapseEvent,
  setSobrietyStatusForDay,
  type SobrietyStorage,
} from '$lib/features/sobriety/service';
import { refreshWeeklyReviewArtifactsSafely, type ReviewStorage } from '$lib/features/review/service';

export interface SobrietyPageStorage extends SobrietyStorage, ReviewStorage {}

export interface SobrietyPageState {
  loading: boolean;
  localDay: string;
  summary: { streak: number; todayEvents: SobrietyEvent[] };
  saveNotice: string;
  cravingScore: string;
  cravingNote: string;
  lapseNote: string;
  recoveryAction: string;
}

export function createSobrietyPageState(): SobrietyPageState {
  return createLocalDayPageState({
    summary: { streak: 0, todayEvents: [] },
    cravingScore: '3',
    cravingNote: '',
    lapseNote: '',
    recoveryAction: '',
  });
}

export async function loadSobrietyPage(
  store: SobrietyPageStorage,
  localDay: string,
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  return await loadLocalDayPageState(
    state,
    localDay,
    (day) => buildSobrietyTrendSummary(store, day),
    (current, nextLocalDay, summary) => ({
      ...current,
      loading: false,
      localDay: nextLocalDay,
      summary,
    })
  );
}

async function reloadSobrietyPageState(
  store: SobrietyPageStorage,
  state: SobrietyPageState,
  overrides: Partial<SobrietyPageState> = {}
): Promise<SobrietyPageState> {
  return await reloadLocalDayPageState(
    state,
    (localDay) => buildSobrietyTrendSummary(store, localDay),
    (current, summary) => ({
      ...current,
      loading: false,
      summary,
    }),
    overrides
  );
}

async function refreshSobrietyPageAfterMutation(
  store: SobrietyPageStorage,
  state: SobrietyPageState,
  overrides: Partial<Pick<SobrietyPageState, 'saveNotice' | 'cravingNote' | 'lapseNote' | 'recoveryAction'>>
): Promise<SobrietyPageState> {
  await refreshWeeklyReviewArtifactsSafely(store, state.localDay);
  return await reloadSobrietyPageState(store, state, overrides);
}

export async function markSobrietyStatus(
  store: SobrietyPageStorage,
  state: SobrietyPageState,
  status: 'sober' | 'recovery',
  notice: string
): Promise<SobrietyPageState> {
  await setSobrietyStatusForDay(store, { localDay: state.localDay, status });
  return await refreshSobrietyPageAfterMutation(store, state, {
    saveNotice: notice,
  });
}

export async function saveSobrietyCraving(
  store: SobrietyPageStorage,
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  await logCravingEvent(store, {
    localDay: state.localDay,
    cravingScore: Number(state.cravingScore),
    note: state.cravingNote.trim(),
  });
  return await refreshSobrietyPageAfterMutation(store, state, {
    saveNotice: 'Craving logged.',
    cravingNote: '',
  });
}

export async function saveSobrietyLapse(
  store: SobrietyPageStorage,
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  await logLapseEvent(store, {
    localDay: state.localDay,
    note: state.lapseNote.trim(),
    recoveryAction: state.recoveryAction.trim(),
  });
  return await refreshSobrietyPageAfterMutation(store, state, {
    saveNotice: 'Lapse context logged.',
  });
}
