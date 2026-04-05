import type { HealthEvent, ImportSourceType, JournalEntry } from '$lib/core/domain/types';
import type { ClinicalPatientIdentity } from '$lib/features/integrations/identity/patient-match';

export interface ImportPayloadSummary {
  filename?: string;
  inferredSourceType: ImportSourceType | null;
  status: 'ready' | 'warning' | 'invalid' | 'unknown';
  headline: string;
  detail: string;
  itemCount?: number;
  itemLabel?: string;
  metricTypes?: string[];
}

export interface ImportPayloadAnalysis {
  sourceType: ImportSourceType;
  summary: ImportPayloadSummary;
  healthEvents?: HealthEvent[];
  journalEntries?: JournalEntry[];
  patientIdentity?: ClinicalPatientIdentity;
}

export type ImportPayloadAnalyzer = (rawText: string, filename?: string) => ImportPayloadAnalysis;

export function textFingerprint(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `fp-${Math.abs(hash)}`;
}

export function buildReadySummary(input: {
  filename?: string;
  inferredSourceType: ImportSourceType;
  headline: string;
  detail: string;
  itemCount: number;
  itemLabel: string;
  metricTypes?: string[];
}): ImportPayloadSummary {
  return {
    filename: input.filename,
    inferredSourceType: input.inferredSourceType,
    status: 'ready',
    headline: input.headline,
    detail: input.detail,
    itemCount: input.itemCount,
    itemLabel: input.itemLabel,
    metricTypes: input.metricTypes,
  };
}

export function buildWarningSummary(input: {
  filename?: string;
  inferredSourceType: ImportSourceType;
  headline: string;
  detail: string;
  itemCount: number;
  itemLabel: string;
  metricTypes?: string[];
}): ImportPayloadSummary {
  return {
    filename: input.filename,
    inferredSourceType: input.inferredSourceType,
    status: 'warning',
    headline: input.headline,
    detail: input.detail,
    itemCount: input.itemCount,
    itemLabel: input.itemLabel,
    metricTypes: input.metricTypes,
  };
}

export function buildInvalidSummary(input: {
  filename?: string;
  inferredSourceType: ImportSourceType;
  headline: string;
  detail: string;
}): ImportPayloadSummary {
  return {
    filename: input.filename,
    inferredSourceType: input.inferredSourceType,
    status: 'invalid',
    headline: input.headline,
    detail: input.detail,
  };
}

export function warningCount(analysis: ImportPayloadAnalysis | null): number {
  return analysis?.summary.status === 'warning' ? 1 : 0;
}
