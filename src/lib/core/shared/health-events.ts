import {
  formatHealthMetricLabel,
  formatHealthMetricValue,
  getHealthMetricDefinition,
} from '$lib/core/domain/health-metrics';
import type { HealthEvent, SourceType } from '$lib/core/domain/types';

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

export function compareHealthEventsNewestFirst(left: HealthEvent, right: HealthEvent): number {
  const timestampCompare = sortHealthEventTimestamp(right).localeCompare(sortHealthEventTimestamp(left));
  if (timestampCompare != 0) {
    return timestampCompare;
  }

  const localDayCompare = right.localDay.localeCompare(left.localDay);
  if (localDayCompare != 0) {
    return localDayCompare;
  }

  const eventTypeCompare = left.eventType.localeCompare(right.eventType);
  if (eventTypeCompare != 0) {
    return eventTypeCompare;
  }

  return left.id.localeCompare(right.id);
}

export function humanizeSourceType(sourceType: SourceType): string {
  return sourceType.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

export function buildHealthEventDisplay(event: HealthEvent): {
  label: string;
  valueLabel: string;
  sourceLabel: string;
} {
  const definition = getHealthMetricDefinition(event.eventType);
  const valueLabel =
    definition?.category === 'manual'
      ? formatManualHealthEventValue(event)
      : formatHealthMetricValue(event.value, event.unit);

  return {
    label: formatHealthMetricLabel(event.eventType),
    valueLabel: valueLabel ?? '',
    sourceLabel: humanizeSourceType(event.sourceType),
  };
}
