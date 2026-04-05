import { describe, expect, it } from 'vitest';
import {
  commitImportBatch,
  describeImportPayload,
  inferImportSourceType,
  listImportBatches,
  parseAppleHealthXml,
  parseDayOneExport,
  previewImport,
} from '$lib/features/imports/service';
import {
  HEALTHKIT_BUNDLE_JSON,
  INVALID_HEALTHKIT_BUNDLE_VERSION_JSON,
} from '../../../support/fixtures/healthkit-bundle';
import {
  INVALID_SMART_FHIR_BUNDLE_JSON,
  SMART_FHIR_BUNDLE_JSON,
  SMART_FHIR_BUNDLE_MISMATCH_JSON,
} from '../../../support/fixtures/smart-fhir-bundle';
import { useTestHealthDb } from '../../../support/unit/testDb';

const APPLE_HEALTH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" value="4321" startDate="2026-04-02T08:00:00Z" />
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" value="2100" startDate="2026-04-02T12:00:00Z" />
</HealthData>`;

const DAY_ONE_JSON = JSON.stringify({
  entries: [
    {
      uuid: 'entry-1',
      creationDate: '2026-04-02T09:00:00Z',
      text: 'Morning reflection from Day One.',
    },
  ],
});

describe('import service', () => {
  const getDb = useTestHealthDb('imports-service');

  it('parses Apple Health XML records', () => {
    const records = parseAppleHealthXml(APPLE_HEALTH_XML);
    expect(records).toHaveLength(2);
    expect(records[0]?.eventType).toContain('StepCount');
  });

  it('parses Day One entries', () => {
    const entries = parseDayOneExport(DAY_ONE_JSON);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.body).toContain('Morning reflection');
  });

  it('uses one fallback timestamp per Apple Health parse when dates are missing', () => {
    const records = parseAppleHealthXml(`<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" value="4321" />
</HealthData>`);

    expect(records[0]?.createdAt).toBe(records[0]?.updatedAt);
    expect(records[0]?.createdAt).toBe(records[0]?.sourceTimestamp);
    expect(records[0]?.localDay).toBe(records[0]?.sourceTimestamp?.slice(0, 10));
    expect(records[0]?.sourceRecordId).toBe(`iPhone:${records[0]?.sourceTimestamp}`);
  });

  it('uses one fallback timestamp per Day One parse when creation dates are missing', () => {
    const entries = parseDayOneExport(
      JSON.stringify({
        entries: [{ text: 'Untimestamped import' }],
      })
    );

    expect(entries[0]?.createdAt).toBe(entries[0]?.updatedAt);
    expect(entries[0]?.localDay).toBe(entries[0]?.createdAt?.slice(0, 10));
  });

  it('infers import source types from filename and content', () => {
    expect(inferImportSourceType(APPLE_HEALTH_XML, 'export.xml')).toBe('apple-health-xml');
    expect(inferImportSourceType(DAY_ONE_JSON, 'journal.json')).toBe('day-one-json');
    expect(inferImportSourceType(HEALTHKIT_BUNDLE_JSON, 'healthkit-bundle.json')).toBe(
      'healthkit-companion'
    );
    expect(inferImportSourceType(SMART_FHIR_BUNDLE_JSON, 'smart-sandbox.json')).toBe(
      'smart-fhir-sandbox'
    );
    expect(inferImportSourceType('not valid data', 'unknown.txt')).toBeNull();
  });

  it('describes a loaded HealthKit bundle before preview', () => {
    const summary = describeImportPayload(HEALTHKIT_BUNDLE_JSON, 'healthkit-bundle.json');

    expect(summary.status).toBe('ready');
    expect(summary.inferredSourceType).toBe('healthkit-companion');
    expect(summary.itemCount).toBe(3);
    expect(summary.metricTypes).toEqual(['sleep-duration', 'step-count', 'resting-heart-rate']);
  });

  it('describes unknown payloads as not inferable', () => {
    const summary = describeImportPayload('garbage', 'random.txt');

    expect(summary.status).toBe('unknown');
    expect(summary.inferredSourceType).toBeNull();
  });

  it('describes a SMART sandbox bundle before preview', () => {
    const summary = describeImportPayload(SMART_FHIR_BUNDLE_JSON, 'smart-sandbox.json');

    expect(summary.status).toBe('ready');
    expect(summary.inferredSourceType).toBe('smart-fhir-sandbox');
    expect(summary.headline).toMatch(/SMART sandbox bundle/i);
    expect(summary.itemCount).toBe(3);
  });

  it('auto-recovers from a mismatched selected source during preview', async () => {
    const db = getDb();
    const batch = await previewImport(db, {
      sourceType: 'apple-health-xml',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });

    expect(batch.sourceType).toBe('healthkit-companion');
    expect(batch.summary).toEqual({ adds: 3, duplicates: 0, warnings: 0 });
  });

  it('stages Apple Health import preview and keeps duplicate replay idempotent', async () => {
    const db = getDb();
    const first = await previewImport(db, {
      sourceType: 'apple-health-xml',
      rawText: APPLE_HEALTH_XML,
    });
    expect(first.summary).toEqual({ adds: 2, duplicates: 0, warnings: 0 });
    await commitImportBatch(db, first.id);
    expect(await db.healthEvents.count()).toBe(2);

    const second = await previewImport(db, {
      sourceType: 'apple-health-xml',
      rawText: APPLE_HEALTH_XML,
    });
    expect(second.summary).toEqual({ adds: 0, duplicates: 2, warnings: 0 });
  });

  it('commits Day One imports into journal entries', async () => {
    const db = getDb();
    const batch = await previewImport(db, { sourceType: 'day-one-json', rawText: DAY_ONE_JSON });
    await commitImportBatch(db, batch.id);
    expect(await db.journalEntries.count()).toBe(1);
  });

  it('stages HealthKit companion bundle previews and dedupes replay', async () => {
    const db = getDb();
    const first = await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    expect(first.summary).toEqual({ adds: 3, duplicates: 0, warnings: 0 });

    await commitImportBatch(db, first.id);

    const events = await db.healthEvents.toArray();
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.sourceType === 'native-companion')).toBe(true);

    const second = await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    expect(second.summary).toEqual({ adds: 0, duplicates: 3, warnings: 0 });
  });

  it('rejects malformed HealthKit companion bundles without creating empty batches', async () => {
    const db = getDb();
    await expect(
      previewImport(db, {
        sourceType: 'healthkit-companion',
        rawText: INVALID_HEALTHKIT_BUNDLE_VERSION_JSON,
      })
    ).rejects.toThrow(/connectorVersion/i);

    expect(await db.importBatches.count()).toBe(0);
  });

  it('blocks SMART sandbox preview when no owner profile is configured', async () => {
    const db = getDb();
    await expect(
      previewImport(db, {
        sourceType: 'smart-fhir-sandbox',
        rawText: SMART_FHIR_BUNDLE_JSON,
      })
    ).rejects.toThrow(/owner profile/i);

    expect(await db.importBatches.count()).toBe(0);
  });

  it('blocks SMART sandbox preview when the patient does not match the local owner', async () => {
    const db = getDb();
    await expect(
      previewImport(db, {
        sourceType: 'smart-fhir-sandbox',
        rawText: SMART_FHIR_BUNDLE_MISMATCH_JSON,
        ownerProfile: {
          fullName: 'Pyro Example',
          birthDate: '1990-01-01',
        },
      })
    ).rejects.toThrow(/blocked/i);

    expect(await db.importBatches.count()).toBe(0);
  });

  it('stages and commits SMART sandbox clinical events for the configured owner', async () => {
    const db = getDb();
    const batch = await previewImport(db, {
      sourceType: 'smart-fhir-sandbox',
      rawText: SMART_FHIR_BUNDLE_JSON,
      ownerProfile: {
        fullName: 'Pyro Example',
        birthDate: '1990-01-01',
      },
    });

    expect(batch.summary).toEqual({ adds: 3, duplicates: 0, warnings: 0 });

    await commitImportBatch(db, batch.id);

    const events = await db.healthEvents.toArray();
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.sourceApp === 'SMART on FHIR sandbox')).toBe(true);
    expect(events.some((event) => event.eventType === 'Systolic blood pressure')).toBe(true);
  });

  it('rejects malformed SMART sandbox bundles without creating empty batches', async () => {
    const db = getDb();
    await expect(
      previewImport(db, {
        sourceType: 'smart-fhir-sandbox',
        rawText: INVALID_SMART_FHIR_BUNDLE_JSON,
        ownerProfile: {
          fullName: 'Pyro Example',
          birthDate: '1990-01-01',
        },
      })
    ).rejects.toThrow(/patient/i);

    expect(await db.importBatches.count()).toBe(0);
  });

  it('lists import batches newest first', async () => {
    const db = getDb();
    await previewImport(db, { sourceType: 'day-one-json', rawText: DAY_ONE_JSON });
    await previewImport(db, { sourceType: 'apple-health-xml', rawText: APPLE_HEALTH_XML });

    const batches = await listImportBatches(db);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.sourceType).toBe('apple-health-xml');
  });
});
