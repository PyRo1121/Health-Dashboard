import type { HealthEvent, ManualHealthEventType, SourceType } from '$lib/core/domain/types';
import {
  formatHealthEventLabel,
  formatHealthEventValue,
} from '$lib/features/integrations/connectors/healthkit';

const MANUAL_HEALTH_EVENT_LABELS: Readonly<Record<ManualHealthEventType, string>> = {
  symptom: 'Symptom',
  'anxiety-episode': 'Anxiety episode',
  'sleep-note': 'Sleep note',
  'medication-dose': 'Medication dose',
  'supplement-dose': 'Supplement dose',
};

function isManualHealthEventType(eventType: string): eventType is ManualHealthEventType {
  return eventType in MANUAL_HEALTH_EVENT_LABELS;
}

function formatManualHealthEventLabel(eventType: string): string | null {
  return isManualHealthEventType(eventType) ? MANUAL_HEALTH_EVENT_LABELS[eventType] : null;
}

function formatManualHealthEventValue(event: Pick<HealthEvent, 'value' | 'unit'>): string | null {
  if (event.value === undefined || event.value === null) return null;
  if (typeof event.value === 'number' || typeof event.value === 'string') {
    return String(event.value);
  }
  if (event.unit) return `${String(event.value)} ${event.unit}`;
  return String(event.value);
}

export function sortHealthEventTimestamp(event: HealthEvent): string {
  return event.sourceTimestamp ?? event.updatedAt ?? event.createdAt;
}

export function humanizeSourceType(sourceType: SourceType): string {
  return sourceType.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

export function buildHealthEventDisplay(event: HealthEvent): {
  label: string;
  valueLabel: string;
  sourceLabel: string;
} {
  const manualLabel = formatManualHealthEventLabel(event.eventType);
  const manualValueLabel = manualLabel ? formatManualHealthEventValue(event) : null;

  return {
    label: manualLabel ?? formatHealthEventLabel(event.eventType),
    valueLabel: manualValueLabel ?? formatHealthEventValue(event),
    sourceLabel: humanizeSourceType(event.sourceType),
  };
}
