import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  applyTodayRecoveryActionPage as applyTodayRecoveryActionPageController,
  beginTodaySave,
  clearTodayPlannedMealPage as clearTodayPlannedMealPageController,
  createTodayPageState,
  logTodayPlannedMealPage as logTodayPlannedMealPageController,
  loadTodayPage as loadTodayPageController,
  markTodayPlanSlotStatusPage as markTodayPlanSlotStatusPageController,
  saveTodayPage as saveTodayPageController,
  type TodayPageState,
} from './controller';

export { beginTodaySave, createTodayPageState };

const todayClient = createFeatureActionClient('/api/today');

export async function loadTodayPage(localDay = currentLocalDay()): Promise<TodayPageState> {
  return await todayClient.action('load', (db) => loadTodayPageController(db, localDay), {
    localDay,
  });
}

export async function saveTodayPage(state: TodayPageState): Promise<TodayPageState> {
  return await todayClient.stateAction('save', state, (db) => saveTodayPageController(db, state));
}

export async function logTodayPlannedMealPage(state: TodayPageState): Promise<TodayPageState> {
  return await todayClient.stateAction('logPlannedMeal', state, (db) =>
    logTodayPlannedMealPageController(db, state)
  );
}

export async function clearTodayPlannedMealPage(state: TodayPageState): Promise<TodayPageState> {
  return await todayClient.stateAction('clearPlannedMeal', state, (db) =>
    clearTodayPlannedMealPageController(db, state)
  );
}

export async function applyTodayRecoveryActionPage(
  state: TodayPageState,
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout'
): Promise<TodayPageState> {
  return await todayClient.stateAction(
    'applyRecoveryAction',
    state,
    (db) => applyTodayRecoveryActionPageController(db, state, actionId),
    { actionId }
  );
}

export async function markTodayPlanSlotStatusPage(
  state: TodayPageState,
  slotId: string,
  status: 'planned' | 'done' | 'skipped'
): Promise<TodayPageState> {
  return await todayClient.stateAction(
    'markPlanSlotStatus',
    state,
    (db) => markTodayPlanSlotStatusPageController(db, state, slotId, status),
    { slotId, status }
  );
}
