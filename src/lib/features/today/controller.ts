import {
  createDailyCheckinPayload,
  createTodayForm,
  createTodayFormFromSnapshot,
  type TodayFormState,
} from './model';
import {
  logPlannedMealForToday,
  saveDailyCheckin,
  clearTodayPlannedMeal,
  updateTodayPlanSlotStatus,
  applyTodayRecoveryAction,
  type TodayActionsStorage,
} from './actions';
import {
  getTodaySnapshot,
  loadTodaySnapshotWithNotice,
  type TodaySnapshot,
  type TodaySnapshotStore,
} from './snapshot';

export interface TodayPageStorage extends TodayActionsStorage, TodaySnapshotStore {}

export interface TodayPageState {
  loading: boolean;
  saving: boolean;
  saveNotice: string;
  todayDate: string;
  snapshot: TodaySnapshot | null;
  form: TodayFormState;
}

export function createTodayPageState(): TodayPageState {
  return {
    loading: true,
    saving: false,
    saveNotice: '',
    todayDate: '',
    snapshot: null,
    form: createTodayForm(),
  };
}

function createLoadedTodayPageState(
  state: TodayPageState,
  localDay: string,
  snapshot: TodaySnapshot,
  overrides: Partial<TodayPageState> = {}
): TodayPageState {
  return {
    ...state,
    loading: false,
    saving: false,
    saveNotice: '',
    todayDate: localDay,
    snapshot,
    form: createTodayFormFromSnapshot(snapshot),
    ...overrides,
  };
}

async function reloadTodayPageState(
  store: TodayPageStorage,
  state: TodayPageState,
  overrides: Partial<TodayPageState> = {}
): Promise<TodayPageState> {
  const snapshot = await getTodaySnapshot(store, state.todayDate);
  return createLoadedTodayPageState(state, state.todayDate, snapshot, overrides);
}

async function reloadTodayPageWithNotice(
  store: TodayPageStorage,
  state: TodayPageState,
  saveNotice: string
): Promise<TodayPageState> {
  return await reloadTodayPageState(store, state, { saveNotice });
}

export async function loadTodayPage(
  store: TodayPageStorage,
  localDay: string
): Promise<TodayPageState> {
  const { snapshot, notice } = await loadTodaySnapshotWithNotice(store, localDay);
  return createLoadedTodayPageState(createTodayPageState(), localDay, snapshot, {
    saveNotice: notice ?? '',
  });
}

export function beginTodaySave(state: TodayPageState): TodayPageState {
  return {
    ...state,
    saving: true,
    saveNotice: '',
  };
}

export async function saveTodayPage(
  store: TodayPageStorage,
  state: TodayPageState
): Promise<TodayPageState> {
  await saveDailyCheckin(store, createDailyCheckinPayload(state.todayDate, state.form));
  return await reloadTodayPageWithNotice(store, state, 'Saved for today.');
}

export async function logTodayPlannedMealPage(
  store: TodayPageStorage,
  state: TodayPageState
): Promise<TodayPageState> {
  const entry = await logPlannedMealForToday(store, state.todayDate);
  return await reloadTodayPageWithNotice(
    store,
    state,
    entry ? 'Planned meal logged.' : 'No planned meal to log.'
  );
}

export async function clearTodayPlannedMealPage(
  store: TodayPageStorage,
  state: TodayPageState
): Promise<TodayPageState> {
  await clearTodayPlannedMeal(store, state.todayDate);
  return await reloadTodayPageWithNotice(store, state, 'Planned meal cleared.');
}

export async function markTodayPlanSlotStatusPage(
  store: TodayPageStorage,
  state: TodayPageState,
  slotId: string,
  status: 'planned' | 'done' | 'skipped'
): Promise<TodayPageState> {
  await updateTodayPlanSlotStatus(store, slotId, status);
  return await reloadTodayPageWithNotice(store, state, `Plan item marked ${status}.`);
}

export async function applyTodayRecoveryActionPage(
  store: TodayPageStorage,
  state: TodayPageState,
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout'
): Promise<TodayPageState> {
  const applied = await applyTodayRecoveryAction(store, state.todayDate, actionId);
  return await reloadTodayPageWithNotice(
    store,
    state,
    applied
      ? actionId === 'apply-recovery-meal'
        ? 'Recovery meal applied.'
        : 'Recovery workout applied.'
      : 'Recovery action unavailable.'
  );
}
