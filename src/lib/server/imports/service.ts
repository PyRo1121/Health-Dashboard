import { nowIso } from '$lib/core/domain/time';
import type {
  HealthEvent,
  ImportArtifact,
  ImportBatch,
  ImportSourceType,
  JournalEntry,
  OwnerProfile,
} from '$lib/core/domain/types';
import { importHealthKitCompanionBundle } from '$lib/features/integrations/connectors/healthkit';
import { importSmartFhirSandboxBundle } from '$lib/features/integrations/connectors/smart-fhir';
import type {
  ClinicalPatientIdentity,
  LocalPatientCandidate,
} from '$lib/features/integrations/identity/patient-match';
import { resolveClinicalPatientMatch } from '$lib/features/integrations/identity/patient-match';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectAllMirrorRecords,
  selectAllMirrorRecordsDesc,
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  selectMirrorRecordsByFieldValues,
  upsertMirrorRecord,
  upsertMirrorRecords,
} from '$lib/server/db/drizzle/mirror';
import { refreshWeeklyReviewArtifactsForDaysServer } from '$lib/server/review/service';
import {
  type ImportPayloadAnalysis,
  textFingerprint,
  warningCount,
} from '$lib/features/imports/core';
import { analyzeImportPayload } from '$lib/features/imports/analyze';
import { parseAppleHealthXml, parseDayOneExport } from '$lib/features/imports/parsers';

function ownerCandidate(ownerProfile: OwnerProfile): LocalPatientCandidate {
  return {
    localPatientId: 'local-owner',
    displayName: ownerProfile.fullName,
    birthDate: ownerProfile.birthDate,
  };
}

function resolveSmartClinicalImport(
  analysis: ImportPayloadAnalysis | null,
  rawText: string
): { events: HealthEvent[]; patientIdentity: ClinicalPatientIdentity } {
  if (analysis?.healthEvents && analysis.patientIdentity) {
    return {
      events: analysis.healthEvents,
      patientIdentity: analysis.patientIdentity,
    };
  }

  const imported = importSmartFhirSandboxBundle(rawText);
  return {
    events: imported.events,
    patientIdentity: imported.patientIdentity,
  };
}

async function stageArtifacts(input: {
  batchId: string;
  artifactType: 'healthEvent' | 'journalEntry';
  records: Array<HealthEvent | JournalEntry>;
}): Promise<void> {
  const { db } = getServerDrizzleClient();
  const timestamp = nowIso();

  const artifacts: ImportArtifact[] = input.records.map((record) => ({
    ...createRecordMeta(createRecordId('import-artifact'), timestamp),
    batchId: input.batchId,
    artifactType: input.artifactType,
    fingerprint: textFingerprint(JSON.stringify(record)),
    payload: record as unknown as Record<string, unknown>,
  }));

  await upsertMirrorRecords(db, 'importArtifacts', drizzleSchema.importArtifacts, artifacts);
}

export async function listImportBatchesServer(): Promise<ImportBatch[]> {
  const { db } = getServerDrizzleClient();
  return (await selectAllMirrorRecords<ImportBatch>(db, drizzleSchema.importBatches)).sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt)
  );
}

export async function createImportBatchServer(sourceType: ImportSourceType): Promise<ImportBatch> {
  const { db } = getServerDrizzleClient();
  const timestamp = nowIso();
  const batch: ImportBatch = {
    ...createRecordMeta(createRecordId('import-batch'), timestamp),
    sourceType,
    status: 'staged',
  };
  await upsertMirrorRecord(db, 'importBatches', drizzleSchema.importBatches, batch);
  return batch;
}

export async function dedupeImportedEventsServer(
  events: HealthEvent[]
): Promise<{ adds: HealthEvent[]; duplicates: HealthEvent[] }> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordsByFieldValues<HealthEvent>(
    db,
    drizzleSchema.healthEvents,
    'sourceRecordId',
    events.map((event) => event.sourceRecordId ?? '')
  );
  const existingIds = new Set(existing.map((event) => event.sourceRecordId ?? ''));
  const adds: HealthEvent[] = [];
  const duplicates: HealthEvent[] = [];

  for (const event of events) {
    if (existingIds.has(event.sourceRecordId ?? '')) {
      duplicates.push(event);
    } else {
      adds.push(event);
    }
  }

  return { adds, duplicates };
}

async function stageHealthEventBatch(
  sourceType: Extract<
    ImportSourceType,
    'apple-health-xml' | 'healthkit-companion' | 'smart-fhir-sandbox'
  >,
  events: HealthEvent[],
  analysis: ImportPayloadAnalysis | null
): Promise<ImportBatch> {
  const { db } = getServerDrizzleClient();
  const { adds, duplicates } = await dedupeImportedEventsServer(events);
  const batch = await createImportBatchServer(sourceType);
  await stageArtifacts({
    batchId: batch.id,
    artifactType: 'healthEvent',
    records: adds,
  });

  const staged: ImportBatch = {
    ...batch,
    summary: {
      adds: adds.length,
      duplicates: duplicates.length,
      warnings: warningCount(analysis),
    },
  };
  await upsertMirrorRecord(db, 'importBatches', drizzleSchema.importBatches, staged);
  return staged;
}

export async function previewImportServer(input: {
  sourceType: ImportSourceType;
  rawText: string;
  ownerProfile?: OwnerProfile | null;
}): Promise<ImportBatch> {
  const { db } = getServerDrizzleClient();
  const analysis = analyzeImportPayload(input.rawText);
  const resolvedSourceType = analysis?.sourceType ?? input.sourceType;

  if (resolvedSourceType === 'apple-health-xml') {
    const parsed = analysis?.healthEvents ?? parseAppleHealthXml(input.rawText);
    return await stageHealthEventBatch(resolvedSourceType, parsed, analysis);
  }

  if (resolvedSourceType === 'healthkit-companion') {
    const parsed = analysis?.healthEvents ?? importHealthKitCompanionBundle(input.rawText).events;
    return await stageHealthEventBatch(resolvedSourceType, parsed, analysis);
  }

  if (resolvedSourceType === 'smart-fhir-sandbox') {
    if (!input.ownerProfile) {
      throw new Error(
        'Configure your owner profile in Settings before previewing SMART clinical imports.'
      );
    }

    const normalized = analysis ?? analyzeImportPayload(input.rawText);
    const imported = resolveSmartClinicalImport(normalized, input.rawText);
    const match = resolveClinicalPatientMatch(imported.patientIdentity, [
      ownerCandidate(input.ownerProfile),
    ]);

    if (match.status !== 'exact') {
      throw new Error(match.reason);
    }

    return await stageHealthEventBatch(resolvedSourceType, imported.events, normalized);
  }

  const parsedEntries = analysis?.journalEntries ?? parseDayOneExport(input.rawText);
  const batch = await createImportBatchServer(resolvedSourceType);
  await stageArtifacts({
    batchId: batch.id,
    artifactType: 'journalEntry',
    records: parsedEntries,
  });

  const staged: ImportBatch = {
    ...batch,
    summary: {
      adds: parsedEntries.length,
      duplicates: 0,
      warnings: warningCount(analysis),
    },
  };
  await upsertMirrorRecord(db, 'importBatches', drizzleSchema.importBatches, staged);
  return staged;
}

export async function commitImportBatchServer(batchId: string): Promise<ImportBatch> {
  const { db } = getServerDrizzleClient();
  const batch = await selectMirrorRecordById<ImportBatch>(db, drizzleSchema.importBatches, batchId);
  if (!batch) {
    throw new Error('Import batch not found');
  }

  const artifacts = await selectMirrorRecordsByField<ImportArtifact>(
    db,
    drizzleSchema.importArtifacts,
    'batchId',
    batchId
  );
  const affectedDays = new Set<string>();
  const healthEvents: HealthEvent[] = [];
  const journalEntries: JournalEntry[] = [];

  for (const artifact of artifacts) {
    if (artifact.artifactType === 'healthEvent' && artifact.payload) {
      const event = structuredClone(artifact.payload) as unknown as HealthEvent;
      healthEvents.push(event);
      affectedDays.add(event.localDay);
    }

    if (artifact.artifactType === 'journalEntry' && artifact.payload) {
      journalEntries.push(structuredClone(artifact.payload) as unknown as JournalEntry);
    }
  }

  await upsertMirrorRecords(db, 'healthEvents', drizzleSchema.healthEvents, healthEvents);
  await upsertMirrorRecords(db, 'journalEntries', drizzleSchema.journalEntries, journalEntries);

  const committed: ImportBatch = {
    ...batch,
    ...updateRecordMeta(batch, batch.id, nowIso()),
    status: 'committed',
  };

  await upsertMirrorRecord(db, 'importBatches', drizzleSchema.importBatches, committed);

  if (affectedDays.size > 0) {
    await refreshWeeklyReviewArtifactsForDaysServer([...affectedDays]);
  }

  return committed;
}
