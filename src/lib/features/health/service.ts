import type { HealthDbHealthEventsStore, HealthDbHealthTemplatesStore } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import {
  isHealthMetricVisibleOnSurface,
  matchesHealthMetric,
} from '$lib/core/domain/health-metrics';
import type {
  AnxietyHealthEventPayload,
  HealthEvent,
  HealthTemplate,
  HealthTemplateType,
  ManualHealthEventPayload,
  ManualHealthEventType,
  SleepNoteHealthEventPayload,
  SymptomHealthEventPayload,
  TemplateDoseHealthEventPayload,
} from '$lib/core/domain/types';
import { sortHealthEventTimestamp } from '$lib/core/shared/health-events';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';

const HEALTH_SOURCE_APP = 'personal-health-cockpit';
const MANUAL_HEALTH_EVENT_TYPES: ReadonlySet<string> = new Set([
  'symptom',
  'anxiety-episode',
  'sleep-note',
  'medication-dose',
  'supplement-dose',
]);

export type HealthEventsStore = HealthDbHealthEventsStore;

export type HealthTemplatesStore = HealthDbHealthTemplatesStore;

export interface HealthStorage extends HealthEventsStore, HealthTemplatesStore {}

export interface SymptomLogInput {
  localDay: string;
  symptom: string;
  severity: number;
  note?: string;
}

export interface AnxietyLogInput {
  localDay: string;
  intensity: number;
  trigger?: string;
  durationMinutes?: number;
  note?: string;
}

export interface SleepNoteLogInput {
  localDay: string;
  note: string;
  restfulness?: number;
  context?: string;
}

export interface CreateHealthTemplateInput {
  label: string;
  templateType: HealthTemplateType;
  defaultDose?: number;
  defaultUnit?: string;
  note?: string;
}

export interface HealthSnapshot {
  localDay: string;
  events: HealthEvent[];
  templates: HealthTemplate[];
  sleepEvent: HealthEvent | null;
}

function resolveTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function normalizeOptionalText(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalNumber(value?: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

export function buildManualHealthEvent(input: {
  localDay: string;
  eventType: ManualHealthEventType;
  payload: ManualHealthEventPayload;
  value?: number;
  unit?: string;
  sourceRecordId?: string;
  timestamp?: string;
}): HealthEvent {
  const timestamp = input.timestamp ?? nowIso();
  const sourceRecordId = input.sourceRecordId ?? `${input.eventType}:${crypto.randomUUID()}`;

  return {
    ...createRecordMeta(
      `health:${input.eventType}:${input.localDay}:${crypto.randomUUID()}`,
      timestamp
    ),
    sourceType: 'manual',
    sourceApp: HEALTH_SOURCE_APP,
    sourceRecordId,
    sourceTimestamp: timestamp,
    localDay: input.localDay,
    timezone: resolveTimeZone(),
    confidence: 1,
    eventType: input.eventType,
    value: input.value,
    unit: input.unit,
    payload: { ...input.payload },
  };
}

export function isHealthPageEvent(event: Pick<HealthEvent, 'eventType'>): boolean {
  return (
    isHealthMetricVisibleOnSurface(event.eventType, 'health') ||
    MANUAL_HEALTH_EVENT_TYPES.has(event.eventType)
  );
}

export function sortHealthPageEvents(events: HealthEvent[]): HealthEvent[] {
  return [...events]
    .filter((event) => isHealthPageEvent(event))
    .sort((left, right) =>
      sortHealthEventTimestamp(right).localeCompare(sortHealthEventTimestamp(left))
    );
}

export function sortActiveHealthTemplates(templates: HealthTemplate[]): HealthTemplate[] {
  return [...templates]
    .filter((template) => !template.archived)
    .sort((left, right) => {
      if (left.templateType !== right.templateType) {
        return left.templateType.localeCompare(right.templateType);
      }
      return left.label.localeCompare(right.label);
    });
}

export function buildHealthSnapshotFromData(
  localDay: string,
  events: HealthEvent[],
  templates: HealthTemplate[]
): HealthSnapshot {
  const visibleEvents = sortHealthPageEvents(events);
  const visibleTemplates = sortActiveHealthTemplates(templates);

  return {
    localDay,
    events: visibleEvents,
    templates: visibleTemplates,
    sleepEvent:
      visibleEvents.find((event) => matchesHealthMetric(event.eventType, 'sleep-duration')) ?? null,
  };
}

export async function listHealthEventsForDay(
  store: HealthEventsStore,
  localDay: string
): Promise<HealthEvent[]> {
  const events = await store.healthEvents.where('localDay').equals(localDay).toArray();
  return sortHealthPageEvents(events);
}

export async function listHealthTemplates(store: HealthTemplatesStore): Promise<HealthTemplate[]> {
  return sortActiveHealthTemplates(await store.healthTemplates.toArray());
}

export async function buildHealthSnapshot(
  store: HealthStorage,
  localDay: string
): Promise<HealthSnapshot> {
  const [events, templates] = await Promise.all([
    listHealthEventsForDay(store, localDay),
    listHealthTemplates(store),
  ]);

  return buildHealthSnapshotFromData(localDay, events, templates);
}

export function buildHealthTemplateRecord(
  existing: HealthTemplate | undefined,
  input: CreateHealthTemplateInput,
  timestamp: string = nowIso()
): HealthTemplate {
  const normalizedLabel = input.label.trim();
  const normalizedUnit = normalizeOptionalText(input.defaultUnit);
  const normalizedNote = normalizeOptionalText(input.note);
  const normalizedDose = normalizeOptionalNumber(input.defaultDose);

  return {
    ...updateRecordMeta(
      existing,
      existing?.id ?? `health-template:${input.templateType}:${crypto.randomUUID()}`,
      timestamp
    ),
    label: normalizedLabel,
    templateType: input.templateType,
    defaultDose: normalizedDose,
    defaultUnit: normalizedUnit,
    note: normalizedNote,
    archived: false,
  };
}

export async function logSymptomEvent(
  store: HealthEventsStore,
  input: SymptomLogInput
): Promise<HealthEvent> {
  const payload: SymptomHealthEventPayload = {
    kind: 'symptom',
    symptom: input.symptom.trim(),
    severity: input.severity,
    note: normalizeOptionalText(input.note),
  };

  const event = buildManualHealthEvent({
    localDay: input.localDay,
    eventType: 'symptom',
    payload,
    value: input.severity,
  });

  await store.healthEvents.put(event);
  return event;
}

export async function logAnxietyEvent(
  store: HealthEventsStore,
  input: AnxietyLogInput
): Promise<HealthEvent> {
  const payload: AnxietyHealthEventPayload = {
    kind: 'anxiety',
    intensity: input.intensity,
    trigger: normalizeOptionalText(input.trigger),
    durationMinutes: normalizeOptionalNumber(input.durationMinutes),
    note: normalizeOptionalText(input.note),
  };

  const event = buildManualHealthEvent({
    localDay: input.localDay,
    eventType: 'anxiety-episode',
    payload,
    value: input.intensity,
  });

  await store.healthEvents.put(event);
  return event;
}

export async function logSleepNoteEvent(
  store: HealthEventsStore,
  input: SleepNoteLogInput
): Promise<HealthEvent> {
  const payload: SleepNoteHealthEventPayload = {
    kind: 'sleep-note',
    note: input.note.trim(),
    restfulness: normalizeOptionalNumber(input.restfulness),
    context: normalizeOptionalText(input.context),
  };

  const event = buildManualHealthEvent({
    localDay: input.localDay,
    eventType: 'sleep-note',
    payload,
    value: input.restfulness,
  });

  await store.healthEvents.put(event);
  return event;
}

export async function saveHealthTemplate(
  store: HealthTemplatesStore,
  input: CreateHealthTemplateInput
): Promise<HealthTemplate> {
  const existing = (await store.healthTemplates.toArray()).find(
    (template) =>
      !template.archived &&
      template.templateType === input.templateType &&
      template.label.toLowerCase() === input.label.trim().toLowerCase()
  );

  const template = buildHealthTemplateRecord(existing, input);

  await store.healthTemplates.put(template);
  return template;
}

export async function quickLogHealthTemplate(
  store: HealthStorage,
  input: { localDay: string; templateId: string }
): Promise<HealthEvent> {
  const template = await store.healthTemplates.get(input.templateId);
  if (!template || template.archived) {
    throw new Error('Health template not found');
  }

  const payload: TemplateDoseHealthEventPayload = {
    kind: 'template-dose',
    templateId: template.id,
    templateName: template.label,
    templateType: template.templateType,
    amount: template.defaultDose,
    unit: template.defaultUnit,
    note: template.note,
  };

  const eventType: ManualHealthEventType =
    template.templateType === 'medication' ? 'medication-dose' : 'supplement-dose';
  const event = buildManualHealthEvent({
    localDay: input.localDay,
    eventType,
    payload,
    value: template.defaultDose,
    unit: template.defaultUnit,
    sourceRecordId: template.id,
  });

  await store.healthEvents.put(event);
  return event;
}
