import { nowIso, toLocalDay } from '$lib/core/domain/time';
import type {
  HealthEvent,
  NativeCompanionBundle,
  NativeCompanionRecord,
} from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';
import { HEALTHKIT_SUPPORTED_METRICS } from '$lib/features/integrations/bridge/schema';

function sourceRecordId(bundle: NativeCompanionBundle, record: NativeCompanionRecord): string {
  return `${bundle.connector}:${bundle.deviceId}:${record.id}`;
}

function isSupportedMetric(metricType: string): boolean {
  return HEALTHKIT_SUPPORTED_METRICS.includes(
    metricType as (typeof HEALTHKIT_SUPPORTED_METRICS)[number]
  );
}

export function normalizeHealthKitBundle(bundle: NativeCompanionBundle): {
  events: HealthEvent[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const events: HealthEvent[] = [];
  const importedAt = nowIso();

  for (const record of bundle.records) {
    if (!isSupportedMetric(record.metricType)) {
      warnings.push(`Skipped unsupported HealthKit metric "${record.metricType}".`);
      continue;
    }

    const sourceTimestamp = record.endAt ?? record.recordedAt;
    events.push({
      ...createRecordMeta(createRecordId('native-health'), importedAt),
      sourceType: 'native-companion',
      sourceApp: `HealthKit Companion · ${bundle.deviceName}`,
      sourceRecordId: sourceRecordId(bundle, record),
      sourceTimestamp,
      localDay: toLocalDay(sourceTimestamp, bundle.timezone),
      timezone: bundle.timezone,
      connector: bundle.connector,
      connectorVersion: bundle.connectorVersion,
      deviceId: bundle.deviceId,
      sourcePlatform: bundle.sourcePlatform,
      confidence: 0.98,
      eventType: record.metricType,
      value: record.value,
      unit: record.unit,
      payload: {
        connector: bundle.connector,
        connectorVersion: bundle.connectorVersion,
        deviceId: bundle.deviceId,
        deviceName: bundle.deviceName,
        sourcePlatform: bundle.sourcePlatform,
        capturedAt: bundle.capturedAt,
        metricType: record.metricType,
        startAt: record.startAt,
        endAt: record.endAt,
        metadata: record.metadata,
        raw: record.raw,
      },
    });
  }

  return { events, warnings };
}
