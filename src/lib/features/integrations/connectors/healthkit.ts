import type { HealthEvent, NativeCompanionBundle } from '$lib/core/domain/types';
import { parseHealthKitCompanionBundle } from '$lib/features/integrations/bridge/validate';
import { normalizeHealthKitBundle } from '$lib/features/integrations/normalization/health-normalize';

const HEALTH_EVENT_LABELS: Record<string, string> = {
  'sleep-duration': 'Sleep duration',
  'step-count': 'Step count',
  'resting-heart-rate': 'Resting heart rate',
};

export function importHealthKitCompanionBundle(rawText: string): {
  bundle: NativeCompanionBundle;
  events: ReturnType<typeof normalizeHealthKitBundle>['events'];
  warnings: string[];
} {
  const bundle = parseHealthKitCompanionBundle(rawText);
  const normalized = normalizeHealthKitBundle(bundle);

  return {
    bundle,
    events: normalized.events,
    warnings: normalized.warnings,
  };
}

export function formatHealthEventLabel(eventType: string): string {
  return HEALTH_EVENT_LABELS[eventType] ?? eventType;
}

export function formatHealthEventValue(event: Pick<HealthEvent, 'value' | 'unit'>): string {
  if (typeof event.value === 'number') {
    if (event.unit === 'hours') return `${event.value} hours`;
    if (event.unit === 'bpm') return `${event.value} bpm`;
    if (event.unit === 'count') return `${event.value} count`;
  }

  if (event.unit) return `${String(event.value)} ${event.unit}`;
  return String(event.value ?? '');
}

export function createSampleHealthKitBundle(): NativeCompanionBundle {
  return {
    connector: 'healthkit-ios',
    connectorVersion: 1,
    deviceId: 'iphone-15-pro',
    deviceName: 'Pyro iPhone',
    sourcePlatform: 'ios',
    capturedAt: '2026-04-02T15:00:00Z',
    timezone: 'America/Chicago',
    records: [
      {
        id: 'sleep-2026-04-02',
        metricType: 'sleep-duration',
        recordedAt: '2026-04-02T12:30:00Z',
        startAt: '2026-04-02T04:30:00Z',
        endAt: '2026-04-02T12:30:00Z',
        unit: 'hours',
        value: 8,
        raw: {
          type: 'HKCategoryTypeIdentifierSleepAnalysis',
          value: 8,
        },
      },
      {
        id: 'steps-2026-04-02',
        metricType: 'step-count',
        recordedAt: '2026-04-02T18:00:00Z',
        unit: 'count',
        value: 8421,
        raw: {
          type: 'HKQuantityTypeIdentifierStepCount',
          value: 8421,
        },
      },
      {
        id: 'rhr-2026-04-02',
        metricType: 'resting-heart-rate',
        recordedAt: '2026-04-02T13:00:00Z',
        unit: 'bpm',
        value: 58,
        raw: {
          type: 'HKQuantityTypeIdentifierRestingHeartRate',
          value: 58,
        },
      },
    ],
  };
}
