import { nowIso, resolvedTimeZone, toLocalDay } from '$lib/core/domain/time';
import type { HealthEvent } from '$lib/core/domain/types';
import type { ClinicalPatientIdentity } from '$lib/features/integrations/identity/patient-match';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';

export interface SmartFhirBundle {
  resourceType: 'Bundle';
  type: string;
  id?: string;
  entry: Array<{
    resource: Record<string, unknown>;
  }>;
}

export interface SmartFhirImportResult {
  patientIdentity: ClinicalPatientIdentity;
  events: HealthEvent[];
  warnings: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readCodeText(value: unknown, fallback: string): string {
  const record = asRecord(value);
  if (!record) return fallback;

  const text = asString(record.text);
  if (text) return text;

  const firstCoding = Array.isArray(record.coding) ? asRecord(record.coding[0]) : null;
  return asString(firstCoding?.display) ?? asString(firstCoding?.code) ?? fallback;
}

function readPatientName(resource: Record<string, unknown>): string {
  const firstName = Array.isArray(resource.name) ? asRecord(resource.name[0]) : null;
  const text = asString(firstName?.text);
  if (text) return text;

  const given = Array.isArray(firstName?.given)
    ? firstName?.given.filter((value): value is string => typeof value === 'string').join(' ')
    : '';
  const family = asString(firstName?.family) ?? '';
  const combined = `${given} ${family}`.trim();
  return combined.length > 0 ? combined : 'Unknown patient';
}

function subjectMatchesPatient(resource: Record<string, unknown>, patientId: string): boolean {
  const subject = asRecord(resource.subject);
  const reference = asString(subject?.reference);
  return reference === `Patient/${patientId}` || reference === patientId;
}

function buildSourceRecordId(patientId: string, resourceType: string, resourceId: string): string {
  return `smart-fhir-sandbox:${patientId}:${resourceType}:${resourceId}`;
}

function buildClinicalEvent(input: {
  resourceType: 'Observation' | 'Condition' | 'MedicationRequest';
  resourceId: string;
  importedAt: string;
  timestamp: string;
  timeZone: string;
  patientIdentity: ClinicalPatientIdentity;
  eventType: string;
  value: string | number | boolean;
  unit?: string;
}): HealthEvent {
  return {
    ...createRecordMeta(createRecordId('smart-clinical'), input.importedAt),
    sourceType: 'import',
    sourceApp: 'SMART on FHIR sandbox',
    sourceRecordId: buildSourceRecordId(
      input.patientIdentity.sourcePatientId,
      input.resourceType,
      input.resourceId
    ),
    sourceTimestamp: input.timestamp,
    localDay: toLocalDay(input.timestamp, input.timeZone),
    timezone: input.timeZone,
    confidence: input.resourceType === 'Observation' ? 0.92 : 0.9,
    eventType: input.eventType,
    value: input.value,
    unit: input.unit,
    payload: {
      resourceType: input.resourceType,
      patientId: input.patientIdentity.sourcePatientId,
    },
  };
}

function buildObservationEvent(
  resource: Record<string, unknown>,
  patientIdentity: ClinicalPatientIdentity,
  importedAt: string,
  timeZone: string
): HealthEvent {
  const quantity = asRecord(resource.valueQuantity);
  const quantityValue = quantity?.value;
  const value =
    typeof quantityValue === 'number'
      ? quantityValue
      : (asString(quantityValue) ??
        asString(resource.valueString) ??
        asString(resource.status) ??
        'recorded');

  return buildClinicalEvent({
    resourceType: 'Observation',
    resourceId: asString(resource.id) ?? createRecordId('smart-observation'),
    importedAt,
    timestamp: asString(resource.effectiveDateTime) ?? asString(resource.issued) ?? importedAt,
    timeZone,
    patientIdentity,
    eventType: readCodeText(resource.code, 'Observation'),
    value,
    unit: asString(quantity?.unit),
  });
}

function buildConditionEvent(
  resource: Record<string, unknown>,
  patientIdentity: ClinicalPatientIdentity,
  importedAt: string,
  timeZone: string
): HealthEvent {
  return buildClinicalEvent({
    resourceType: 'Condition',
    resourceId: asString(resource.id) ?? createRecordId('smart-condition'),
    timestamp:
      asString(resource.recordedDate) ??
      asString(resource.onsetDateTime) ??
      asString(resource.abatementDateTime) ??
      importedAt,
    importedAt,
    timeZone,
    patientIdentity,
    eventType: `Condition: ${readCodeText(resource.code, 'Condition')}`,
    value: readCodeText(resource.clinicalStatus, 'recorded'),
    unit: undefined,
  });
}

function buildMedicationRequestEvent(
  resource: Record<string, unknown>,
  patientIdentity: ClinicalPatientIdentity,
  importedAt: string,
  timeZone: string
): HealthEvent {
  return buildClinicalEvent({
    resourceType: 'MedicationRequest',
    resourceId: asString(resource.id) ?? createRecordId('smart-medication'),
    importedAt,
    timestamp: asString(resource.authoredOn) ?? importedAt,
    timeZone,
    patientIdentity,
    eventType: `Medication: ${readCodeText(resource.medicationCodeableConcept, 'Medication request')}`,
    value: asString(resource.status) ?? 'recorded',
    unit: undefined,
  });
}

export function normalizeSmartFhirBundle(
  bundle: SmartFhirBundle,
  timeZone = resolvedTimeZone()
): SmartFhirImportResult {
  const importedAt = nowIso();
  const patientEntry = bundle.entry.find(
    (entry) => asRecord(entry.resource)?.resourceType === 'Patient'
  );
  const patientResource = patientEntry ? asRecord(patientEntry.resource) : null;

  if (!patientResource) {
    throw new Error('SMART sandbox bundle must include one Patient resource.');
  }

  const patientId = asString(patientResource.id);
  if (!patientId) {
    throw new Error('SMART sandbox bundle patient is missing an id.');
  }

  const patientIdentity: ClinicalPatientIdentity = {
    connectorId: 'smart-fhir-sandbox',
    sourcePatientId: patientId,
    fullName: readPatientName(patientResource),
    birthDate: asString(patientResource.birthDate),
  };

  const events: HealthEvent[] = [];
  const warnings: string[] = [];

  for (const entry of bundle.entry) {
    const resource = asRecord(entry.resource);
    if (!resource) continue;

    const resourceType = asString(resource.resourceType);
    if (!resourceType || resourceType === 'Patient') continue;

    if (!subjectMatchesPatient(resource, patientId)) {
      warnings.push(`Skipped ${resourceType} because it did not reference the bundle patient.`);
      continue;
    }

    if (resourceType === 'Observation') {
      events.push(buildObservationEvent(resource, patientIdentity, importedAt, timeZone));
      continue;
    }

    if (resourceType === 'Condition') {
      events.push(buildConditionEvent(resource, patientIdentity, importedAt, timeZone));
      continue;
    }

    if (resourceType === 'MedicationRequest') {
      events.push(buildMedicationRequestEvent(resource, patientIdentity, importedAt, timeZone));
      continue;
    }

    warnings.push(`Skipped unsupported SMART resource "${resourceType}".`);
  }

  return {
    patientIdentity,
    events,
    warnings,
  };
}
