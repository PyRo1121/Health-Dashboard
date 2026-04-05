import type { HealthDatabase } from '$lib/core/db/types';
import {
  createDailyCheckinPayload,
  createTodayForm,
  createTodayFormFromSnapshot,
  type TodayFormState,
} from './model';
import {
  clearTodayPlannedMeal,
  getTodaySnapshot,
  logPlannedMealForToday,
  loadTodaySnapshotWithNotice,
  saveDailyCheckin,
  updateTodayPlanSlotStatus,
  type TodaySnapshot,
} from '$lib/features/today/service';

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
  db: HealthDatabase,
  state: TodayPageState,
  overrides: Partial<TodayPageState> = {}
): Promise<TodayPageState> {
  const snapshot = await getTodaySnapshot(db, state.todayDate);
  return createLoadedTodayPageState(state, state.todayDate, snapshot, overrides);
}

export async function loadTodayPage(db: HealthDatabase, localDay: string): Promise<TodayPageState> {
  const { snapshot, notice } = await loadTodaySnapshotWithNotice(db, localDay);
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
  db: HealthDatabase,
  state: TodayPageState
): Promise<TodayPageState> {
  await saveDailyCheckin(db, createDailyCheckinPayload(state.todayDate, state.form));
  return await reloadTodayPageState(db, state, {
    saveNotice: 'Saved for today.',
  });
}

export async function logTodayPlannedMealPage(
  db: HealthDatabase,
  state: TodayPageState
): Promise<TodayPageState> {
  const entry = await logPlannedMealForToday(db, state.todayDate);
  return await reloadTodayPageState(db, state, {
    saveNotice: entry ? 'Planned meal logged.' : 'No planned meal to log.',
  });
}

export async function clearTodayPlannedMealPage(
  db: HealthDatabase,
  state: TodayPageState
): Promise<TodayPageState> {
  await clearTodayPlannedMeal(db, state.todayDate);
  return await reloadTodayPageState(db, state, {
    saveNotice: 'Planned meal cleared.',
  });
}

export async function markTodayPlanSlotStatusPage(
  db: HealthDatabase,
  state: TodayPageState,
  slotId: string,
  status: 'planned' | 'done' | 'skipped'
): Promise<TodayPageState> {
  await updateTodayPlanSlotStatus(db, slotId, status);
  return await reloadTodayPageState(db, state, {
    saveNotice: `Plan item marked ${status}.`,
  });
}
