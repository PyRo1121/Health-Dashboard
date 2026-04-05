import type { ImportSourceType } from '$lib/core/domain/types';
import { importHealthKitCompanionBundle } from '$lib/features/integrations/connectors/healthkit';
import { importSmartFhirSandboxBundle } from '$lib/features/integrations/connectors/smart-fhir';
import {
  buildInvalidSummary,
  buildReadySummary,
  buildWarningSummary,
  type ImportPayloadAnalysis,
  type ImportPayloadAnalyzer,
  type ImportPayloadSummary,
} from './core';
import { inferImportSourceType } from './detect';
import { parseAppleHealthXml, parseDayOneExport } from './parsers';

function analyzeAppleHealthXml(rawText: string, filename?: string): ImportPayloadAnalysis {
  const records = parseAppleHealthXml(rawText);
  return {
    sourceType: 'apple-health-xml',
    healthEvents: records,
    summary: records.length
      ? buildReadySummary({
          filename,
          inferredSourceType: 'apple-health-xml',
          headline: 'Apple Health XML ready to preview',
          detail:
            'The import center detected Apple Health XML and can stage these records before commit.',
          itemCount: records.length,
          itemLabel: 'records',
        })
      : buildWarningSummary({
          filename,
          inferredSourceType: 'apple-health-xml',
          headline: 'Apple Health XML loaded with no records',
          detail: 'The file parsed, but no Health record nodes were found.',
          itemCount: 0,
          itemLabel: 'records',
        }),
  };
}

function analyzeDayOneJson(rawText: string, filename?: string): ImportPayloadAnalysis {
  const entries = parseDayOneExport(rawText);
  return {
    sourceType: 'day-one-json',
    journalEntries: entries,
    summary: entries.length
      ? buildReadySummary({
          filename,
          inferredSourceType: 'day-one-json',
          headline: 'Day One export ready to preview',
          detail:
            'The import center detected a Day One export and can stage these entries before commit.',
          itemCount: entries.length,
          itemLabel: 'entries',
        })
      : buildWarningSummary({
          filename,
          inferredSourceType: 'day-one-json',
          headline: 'Day One export loaded with no entries',
          detail: 'The JSON parsed, but no journal entries were found.',
          itemCount: 0,
          itemLabel: 'entries',
        }),
  };
}

function analyzeHealthkitCompanion(rawText: string, filename?: string): ImportPayloadAnalysis {
  const normalized = importHealthKitCompanionBundle(rawText);
  const metricTypes = [...new Set(normalized.bundle.records.map((record) => record.metricType))];
  const warnings = normalized.warnings.length;

  return {
    sourceType: 'healthkit-companion',
    healthEvents: normalized.events,
    summary: warnings
      ? buildWarningSummary({
          filename,
          inferredSourceType: 'healthkit-companion',
          headline: 'Shortcut/native bundle loaded with warnings',
          detail: normalized.warnings.join(' '),
          itemCount: normalized.bundle.records.length,
          itemLabel: 'records',
          metricTypes,
        })
      : buildReadySummary({
          filename,
          inferredSourceType: 'healthkit-companion',
          headline: 'Shortcut/native bundle ready to preview',
          detail:
            'The import center detected a compatible iPhone bundle and can stage it before commit.',
          itemCount: normalized.bundle.records.length,
          itemLabel: 'records',
          metricTypes,
        }),
  };
}

function analyzeSmartFhirSandbox(rawText: string, filename?: string): ImportPayloadAnalysis {
  const normalized = importSmartFhirSandboxBundle(rawText);
  return {
    sourceType: 'smart-fhir-sandbox',
    healthEvents: normalized.events,
    patientIdentity: normalized.patientIdentity,
    summary: normalized.warnings.length
      ? buildWarningSummary({
          filename,
          inferredSourceType: 'smart-fhir-sandbox',
          headline: 'SMART sandbox bundle loaded with warnings',
          detail: normalized.warnings.join(' '),
          itemCount: normalized.events.length,
          itemLabel: 'clinical records',
        })
      : buildReadySummary({
          filename,
          inferredSourceType: 'smart-fhir-sandbox',
          headline: 'SMART sandbox bundle ready to preview',
          detail: `Patient ${normalized.patientIdentity.fullName ?? normalized.patientIdentity.sourcePatientId} matched a narrow clinical bundle for preview.`,
          itemCount: normalized.events.length,
          itemLabel: 'clinical records',
        }),
  };
}

const IMPORT_PAYLOAD_ANALYZERS: Partial<Record<ImportSourceType, ImportPayloadAnalyzer>> = {
  'apple-health-xml': analyzeAppleHealthXml,
  'day-one-json': analyzeDayOneJson,
  'healthkit-companion': analyzeHealthkitCompanion,
  'smart-fhir-sandbox': analyzeSmartFhirSandbox,
};

export function analyzeImportPayload(
  rawText: string,
  filename?: string
): ImportPayloadAnalysis | null {
  const inferredSourceType = inferImportSourceType(rawText, filename);
  if (!inferredSourceType) return null;

  const analyzer = IMPORT_PAYLOAD_ANALYZERS[inferredSourceType];
  if (!analyzer) return null;

  try {
    return analyzer(rawText, filename);
  } catch (error) {
    return {
      sourceType: inferredSourceType,
      summary: buildInvalidSummary({
        filename,
        inferredSourceType,
        headline:
          inferredSourceType === 'smart-fhir-sandbox'
            ? 'SMART sandbox bundle is invalid'
            : inferredSourceType === 'healthkit-companion'
              ? 'Shortcut/native bundle is invalid'
              : 'Import payload is invalid',
        detail:
          error instanceof Error ? error.message : 'The import payload could not be validated.',
      }),
    };
  }
}

export function describeImportPayload(rawText: string, filename?: string): ImportPayloadSummary {
  return (
    analyzeImportPayload(rawText, filename)?.summary ?? {
      filename,
      inferredSourceType: null,
      status: 'unknown',
      headline: 'Import source could not be inferred',
      detail: 'Use a HealthKit companion JSON bundle, Apple Health XML, or Day One JSON export.',
    }
  );
}
