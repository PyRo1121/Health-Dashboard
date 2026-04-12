import type { HealthEvent, HealthTemplate } from '$lib/core/domain/types';
import {
  buildHealthSnapshotFromData,
  buildHealthTemplateRecord,
  buildManualHealthEvent,
  type AnxietyLogInput,
  type CreateHealthTemplateInput,
  type SleepNoteLogInput,
} from '$lib/features/health/service';
import {
  createAnxietyForm,
  createSleepNoteForm,
  createSymptomForm,
  createTemplateForm,
} from '$lib/features/health/model';
import type { HealthMutationState } from '$lib/features/health/contracts';
import { createHealthPageState, type HealthPageState } from '$lib/features/health/state';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectAllMirrorRecords,
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
} from '$lib/server/db/drizzle/mirror';

async function buildHealthSnapshotServer(localDay: string) {
  const { db } = getServerDrizzleClient();
  const [events, templates] = await Promise.all([
    selectMirrorRecordsByField<HealthEvent>(db, drizzleSchema.healthEvents, 'localDay', localDay),
    selectAllMirrorRecords<HealthTemplate>(db, drizzleSchema.healthTemplates),
  ]);

  return buildHealthSnapshotFromData(localDay, events, templates);
}

function createLoadedHealthPageState(
  localDay: string,
  snapshot: NonNullable<HealthPageState['snapshot']>,
  overrides: Partial<HealthPageState> = {}
): HealthPageState {
  return {
    ...createHealthPageState(),
    loading: false,
    localDay,
    snapshot,
    ...overrides,
  };
}

async function reloadHealthPageStateServer(
  state: HealthMutationState,
  overrides: Partial<HealthPageState> = {}
): Promise<HealthPageState> {
  return createLoadedHealthPageState(state.localDay, await buildHealthSnapshotServer(state.localDay), {
    ...state,
    ...overrides,
  });
}

async function refreshHealthPageAfterMutationServer(
  state: HealthMutationState,
  overrides: Partial<HealthPageState>
): Promise<HealthPageState> {
  await refreshWeeklyReviewArtifactsServer(state.localDay);
  return await reloadHealthPageStateServer(state, overrides);
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function upsertHealthEventServer(event: HealthEvent): Promise<void> {
  const { db } = getServerDrizzleClient();
  await upsertMirrorRecord(db, 'healthEvents', drizzleSchema.healthEvents, event);
}

async function upsertHealthTemplateServer(template: HealthTemplate): Promise<void> {
  const { db } = getServerDrizzleClient();
  await upsertMirrorRecord(db, 'healthTemplates', drizzleSchema.healthTemplates, template);
}

export async function loadHealthPageServer(localDay: string): Promise<HealthPageState> {
  return createLoadedHealthPageState(localDay, await buildHealthSnapshotServer(localDay));
}

export async function saveSymptomPageServer(state: HealthMutationState): Promise<HealthPageState> {
  if (!state.symptomForm.symptom.trim()) {
    return await reloadHealthPageStateServer(state, {
      saveNotice: 'Symptom name is required.',
    });
  }

  const severity = Number(state.symptomForm.severity);
  await upsertHealthEventServer(
    buildManualHealthEvent({
      localDay: state.localDay,
      eventType: 'symptom',
      payload: {
        kind: 'symptom',
        symptom: state.symptomForm.symptom.trim(),
        severity,
        note: state.symptomForm.note.trim() || undefined,
      },
      value: severity,
    })
  );

  return await refreshHealthPageAfterMutationServer(state, {
    saveNotice: 'Symptom logged.',
    symptomForm: createSymptomForm(),
  });
}

export async function saveAnxietyPageServer(state: HealthMutationState): Promise<HealthPageState> {
  const input: AnxietyLogInput = {
    localDay: state.localDay,
    intensity: Number(state.anxietyForm.intensity),
    trigger: state.anxietyForm.trigger.trim() || undefined,
    durationMinutes: parseOptionalNumber(state.anxietyForm.durationMinutes),
    note: state.anxietyForm.note.trim() || undefined,
  };

  await upsertHealthEventServer(
    buildManualHealthEvent({
      localDay: input.localDay,
      eventType: 'anxiety-episode',
      payload: {
        kind: 'anxiety',
        intensity: input.intensity,
        trigger: input.trigger,
        durationMinutes: input.durationMinutes,
        note: input.note,
      },
      value: input.intensity,
    })
  );

  return await refreshHealthPageAfterMutationServer(state, {
    saveNotice: 'Anxiety episode logged.',
    anxietyForm: createAnxietyForm(),
  });
}

export async function saveSleepNotePageServer(state: HealthMutationState): Promise<HealthPageState> {
  if (!state.sleepNoteForm.note.trim()) {
    return await reloadHealthPageStateServer(state, {
      saveNotice: 'Sleep note is required.',
    });
  }

  const input: SleepNoteLogInput = {
    localDay: state.localDay,
    note: state.sleepNoteForm.note.trim(),
    restfulness: parseOptionalNumber(state.sleepNoteForm.restfulness),
    context: state.sleepNoteForm.context.trim() || undefined,
  };

  await upsertHealthEventServer(
    buildManualHealthEvent({
      localDay: input.localDay,
      eventType: 'sleep-note',
      payload: {
        kind: 'sleep-note',
        note: input.note,
        restfulness: input.restfulness,
        context: input.context,
      },
      value: input.restfulness,
    })
  );

  return await refreshHealthPageAfterMutationServer(state, {
    saveNotice: 'Sleep context logged.',
    sleepNoteForm: createSleepNoteForm(),
  });
}

export async function saveTemplatePageServer(state: HealthMutationState): Promise<HealthPageState> {
  if (!state.templateForm.label.trim()) {
    return await reloadHealthPageStateServer(state, {
      saveNotice: 'Template name is required.',
    });
  }

  const { db } = getServerDrizzleClient();
  const templates = await selectAllMirrorRecords<HealthTemplate>(db, drizzleSchema.healthTemplates);
  const existing = templates.find(
    (template) =>
      !template.archived &&
      template.templateType === state.templateForm.templateType &&
      template.label.toLowerCase() === state.templateForm.label.trim().toLowerCase()
  );

  const input: CreateHealthTemplateInput = {
    label: state.templateForm.label,
    templateType: state.templateForm.templateType,
    defaultDose: parseOptionalNumber(state.templateForm.defaultDose),
    defaultUnit: state.templateForm.defaultUnit,
    note: state.templateForm.note,
  };

  await upsertHealthTemplateServer(buildHealthTemplateRecord(existing, input));

  return await refreshHealthPageAfterMutationServer(state, {
    saveNotice: 'Template saved.',
    templateForm: createTemplateForm(),
  });
}

export async function quickLogTemplatePageServer(
  state: HealthMutationState,
  templateId: string
): Promise<HealthPageState> {
  const { db } = getServerDrizzleClient();
  const template = await selectMirrorRecordById<HealthTemplate>(
    db,
    drizzleSchema.healthTemplates,
    templateId
  );
  if (!template || template.archived) {
    throw new Error('Health template not found');
  }

  await upsertHealthEventServer(
    buildManualHealthEvent({
      localDay: state.localDay,
      eventType: template.templateType === 'medication' ? 'medication-dose' : 'supplement-dose',
      payload: {
        kind: 'template-dose',
        templateId: template.id,
        templateName: template.label,
        templateType: template.templateType,
        amount: template.defaultDose,
        unit: template.defaultUnit,
        note: template.note,
      },
      value: template.defaultDose,
      unit: template.defaultUnit,
      sourceRecordId: template.id,
    })
  );

  return await refreshHealthPageAfterMutationServer(state, {
    saveNotice: 'Template logged.',
  });
}
