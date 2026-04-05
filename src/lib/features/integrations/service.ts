import type { HealthDatabase } from '$lib/core/db/types';
import type { HealthEvent, NativeCompanionSummary } from '$lib/core/domain/types';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function latestTimestamp(current: string | undefined, event: HealthEvent): string | undefined {
  const candidate =
    asString(event.payload?.capturedAt) ??
    event.sourceTimestamp ??
    event.updatedAt ??
    event.createdAt;
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate > current ? candidate : current;
}

function summarizeNativeCompanionEvent(event: HealthEvent): {
  deviceName?: string;
  metricType?: string;
  latestCaptureAt?: string;
} {
  const payload = event.payload ?? {};
  return {
    deviceName: asString(payload.deviceName) ?? event.deviceId,
    metricType: asString(payload.metricType) ?? event.eventType,
    latestCaptureAt:
      asString(payload.capturedAt) ?? event.sourceTimestamp ?? event.updatedAt ?? event.createdAt,
  };
}

export async function summarizeNativeCompanionEvents(
  db: HealthDatabase
): Promise<NativeCompanionSummary> {
  const events = (await db.healthEvents.toArray()).filter(
    (event) => event.sourceType === 'native-companion'
  );
  const deviceNames = new Set<string>();
  const metricTypes = new Set<string>();
  let latestCaptureAt: string | undefined;

  for (const event of events) {
    const { deviceName, metricType } = summarizeNativeCompanionEvent(event);

    if (deviceName) deviceNames.add(deviceName);
    if (metricType) metricTypes.add(metricType);
    latestCaptureAt = latestTimestamp(latestCaptureAt, event);
  }

  return {
    importedEvents: events.length,
    deviceNames: [...deviceNames].sort(),
    metricTypes: [...metricTypes].sort(),
    latestCaptureAt,
  };
}
