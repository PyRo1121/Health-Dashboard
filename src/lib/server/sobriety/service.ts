import type { SobrietyEvent } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import {
  buildSobrietyEvent,
  buildSobrietyTrendSummaryFromData,
} from '$lib/features/sobriety/service';
import type { SobrietyPageState } from '$lib/features/sobriety/controller';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordsByField, upsertMirrorRecord } from '$lib/server/db/drizzle/mirror';

async function upsertDailyRecordPatch(
  localDay: string,
  patch: { sobrietyStatus?: 'sober' | 'lapse' | 'recovery'; cravingScore?: number }
) {
  const { db } = getServerDrizzleClient();
  const existing = (
    await selectMirrorRecordsByField<{ id: string; createdAt: string } & Record<string, unknown>>(
      db,
      drizzleSchema.dailyRecords,
      'date',
      localDay
    )
  )[0];
  const timestamp = new Date().toISOString();
  await upsertMirrorRecord(db, 'dailyRecords', drizzleSchema.dailyRecords, {
    ...existing,
    ...updateRecordMeta(existing, `daily:${localDay}`, timestamp),
    date: localDay,
    ...patch,
  });
}

async function loadSobrietySummaryServer(localDay: string) {
  const { db } = getServerDrizzleClient();
  const [statusEvents, todayEvents] = await Promise.all([
    selectMirrorRecordsByField<SobrietyEvent>(
      db,
      drizzleSchema.sobrietyEvents,
      'eventType',
      'status'
    ),
    selectMirrorRecordsByField<SobrietyEvent>(
      db,
      drizzleSchema.sobrietyEvents,
      'localDay',
      localDay
    ),
  ]);
  return buildSobrietyTrendSummaryFromData(statusEvents, todayEvents, localDay);
}

async function reloadSobrietyPageStateServer(
  state: SobrietyPageState,
  overrides: Partial<SobrietyPageState> = {}
): Promise<SobrietyPageState> {
  return {
    ...state,
    loading: false,
    summary: await loadSobrietySummaryServer(state.localDay),
    ...overrides,
  };
}

async function refreshSobrietyPageAfterMutationServer(
  state: SobrietyPageState,
  overrides: Partial<
    Pick<SobrietyPageState, 'saveNotice' | 'cravingNote' | 'lapseNote' | 'recoveryAction'>
  >
): Promise<SobrietyPageState> {
  await refreshWeeklyReviewArtifactsServer(state.localDay);
  return await reloadSobrietyPageStateServer(state, overrides);
}

export async function loadSobrietyPageServer(
  localDay: string,
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  return {
    ...state,
    loading: false,
    localDay,
    summary: await loadSobrietySummaryServer(localDay),
  };
}

export async function markSobrietyStatusServer(
  state: SobrietyPageState,
  status: 'sober' | 'recovery',
  notice: string
): Promise<SobrietyPageState> {
  const { db } = getServerDrizzleClient();
  const event = buildSobrietyEvent({
    id: `sobriety:status:${state.localDay}`,
    localDay: state.localDay,
    eventType: 'status',
    status,
  });
  await upsertMirrorRecord(db, 'sobrietyEvents', drizzleSchema.sobrietyEvents, event);
  await upsertDailyRecordPatch(state.localDay, { sobrietyStatus: status });
  return await refreshSobrietyPageAfterMutationServer(state, { saveNotice: notice });
}

export async function saveSobrietyCravingServer(
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  const { db } = getServerDrizzleClient();
  const event = buildSobrietyEvent({
    id: `sobriety:craving:${state.localDay}:${crypto.randomUUID()}`,
    localDay: state.localDay,
    eventType: 'craving',
    cravingScore: Number(state.cravingScore),
    note: state.cravingNote.trim(),
  });
  await upsertMirrorRecord(db, 'sobrietyEvents', drizzleSchema.sobrietyEvents, event);
  await upsertDailyRecordPatch(state.localDay, { cravingScore: Number(state.cravingScore) });
  return await refreshSobrietyPageAfterMutationServer(state, {
    saveNotice: 'Craving logged.',
    cravingNote: '',
  });
}

export async function saveSobrietyLapseServer(
  state: SobrietyPageState
): Promise<SobrietyPageState> {
  const { db } = getServerDrizzleClient();
  const event = buildSobrietyEvent({
    id: `sobriety:lapse:${state.localDay}:${crypto.randomUUID()}`,
    localDay: state.localDay,
    eventType: 'lapse',
    status: 'lapse',
    recoveryAction: state.recoveryAction.trim(),
    note: state.lapseNote.trim(),
  });
  await upsertMirrorRecord(db, 'sobrietyEvents', drizzleSchema.sobrietyEvents, event);
  await upsertDailyRecordPatch(state.localDay, { sobrietyStatus: 'lapse' });
  return await refreshSobrietyPageAfterMutationServer(state, {
    saveNotice: 'Lapse context logged.',
  });
}
