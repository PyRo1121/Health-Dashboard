import type { HealthDatabase } from '$lib/core/db/types';
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
import { refreshWeeklyReviewArtifactsForDaysSafely } from '$lib/features/review/service';
import { type ImportPayloadAnalysis, textFingerprint, warningCount } from './core';
import { analyzeImportPayload } from './analyze';
import { parseAppleHealthXml, parseDayOneExport } from './parsers';

async function stageHealthEventBatch(
  db: HealthDatabase,
  sourceType: Extract<
    ImportSourceType,
    'apple-health-xml' | 'healthkit-companion' | 'smart-fhir-sandbox'
  >,
  events: HealthEvent[],
  analysis: ImportPayloadAnalysis | null
): Promise<ImportBatch> {
  const { adds, duplicates } = await dedupeImportedEvents(db, events);
  const batch = await createImportBatch(db, sourceType);
  await stageArtifacts({
    artifactTable: db.importArtifacts,
    batchId: batch.id,
    artifactType: 'healthEvent',
    records: adds,
  });

  batch.summary = {
    adds: adds.length,
    duplicates: duplicates.length,
    warnings: warningCount(analysis),
  };
  await db.importBatches.put(batch);
  return batch;
}

async function stageArtifacts<T extends HealthEvent | JournalEntry>(input: {
  artifactTable: HealthDatabase['importArtifacts'];
  batchId: string;
  artifactType: 'healthEvent' | 'journalEntry';
  records: T[];
}): Promise<void> {
  const timestamp = nowIso();
  for (const record of input.records) {
    const artifact: ImportArtifact = {
      ...createRecordMeta(createRecordId('import-artifact'), timestamp),
      batchId: input.batchId,
      artifactType: input.artifactType,
      fingerprint: textFingerprint(JSON.stringify(record)),
      payload: record as unknown as Record<string, unknown>,
    };
    await input.artifactTable.put(artifact);
  }
}

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

export async function createImportBatch(
  db: HealthDatabase,
  sourceType: ImportSourceType
): Promise<ImportBatch> {
  const timestamp = nowIso();
  const batch: ImportBatch = {
    ...createRecordMeta(createRecordId('import-batch'), timestamp),
    sourceType,
    status: 'staged',
  };
  await db.importBatches.put(batch);
  return batch;
}

export async function dedupeImportedEvents(
  db: HealthDatabase,
  events: HealthEvent[]
): Promise<{ adds: HealthEvent[]; duplicates: HealthEvent[] }> {
  const adds: HealthEvent[] = [];
  const duplicates: HealthEvent[] = [];

  for (const event of events) {
    const existing = await db.healthEvents
      .where('sourceRecordId')
      .equals(event.sourceRecordId ?? '')
      .first();

    if (existing) {
      duplicates.push(event);
    } else {
      adds.push(event);
    }
  }

  return { adds, duplicates };
}

export async function previewImport(
  db: HealthDatabase,
  input: { sourceType: ImportSourceType; rawText: string; ownerProfile?: OwnerProfile | null }
): Promise<ImportBatch> {
  const analysis = analyzeImportPayload(input.rawText);
  const resolvedSourceType = analysis?.sourceType ?? input.sourceType;

  if (resolvedSourceType === 'apple-health-xml') {
    const parsed = analysis?.healthEvents ?? parseAppleHealthXml(input.rawText);
    return stageHealthEventBatch(db, resolvedSourceType, parsed, analysis);
  }

  if (resolvedSourceType === 'healthkit-companion') {
    const parsed = analysis?.healthEvents ?? importHealthKitCompanionBundle(input.rawText).events;
    return stageHealthEventBatch(db, resolvedSourceType, parsed, analysis);
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

    return stageHealthEventBatch(db, resolvedSourceType, imported.events, normalized);
  }

  const parsedEntries = analysis?.journalEntries ?? parseDayOneExport(input.rawText);
  const batch = await createImportBatch(db, resolvedSourceType);
  await stageArtifacts({
    artifactTable: db.importArtifacts,
    batchId: batch.id,
    artifactType: 'journalEntry',
    records: parsedEntries,
  });

  batch.summary = {
    adds: parsedEntries.length,
    duplicates: 0,
    warnings: warningCount(analysis),
  };
  await db.importBatches.put(batch);
  return batch;
}

export async function commitImportBatch(db: HealthDatabase, batchId: string): Promise<ImportBatch> {
  const batch = await db.importBatches.get(batchId);
  if (!batch) throw new Error('Import batch not found');

  const artifacts = await db.importArtifacts.where('batchId').equals(batchId).toArray();
  const affectedDays = new Set<string>();

  for (const artifact of artifacts) {
    if (artifact.artifactType === 'healthEvent' && artifact.payload) {
      const event = structuredClone(artifact.payload) as unknown as HealthEvent;
      await db.healthEvents.put(event);
      affectedDays.add(event.localDay);
    }
    if (artifact.artifactType === 'journalEntry' && artifact.payload) {
      await db.journalEntries.put(structuredClone(artifact.payload) as unknown as JournalEntry);
    }
  }

  const committed: ImportBatch = {
    ...batch,
    ...updateRecordMeta(batch, batch.id, nowIso()),
    status: 'committed',
  };

  await db.importBatches.put(committed);
  await refreshWeeklyReviewArtifactsForDaysSafely(db, [...affectedDays]);
  return committed;
}

export async function listImportBatches(db: HealthDatabase): Promise<ImportBatch[]> {
  return (await db.importBatches.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
