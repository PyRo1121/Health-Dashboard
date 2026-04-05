import type { ImportSourceType } from '$lib/core/domain/types';

function parseJsonShape(rawText: string): unknown | null {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

export function inferImportSourceType(rawText: string, filename?: string): ImportSourceType | null {
  const normalizedFilename = filename?.toLowerCase() ?? '';
  const trimmed = rawText.trim();

  if (
    normalizedFilename.endsWith('.xml') ||
    trimmed.startsWith('<?xml') ||
    trimmed.includes('<HealthData')
  ) {
    return 'apple-health-xml';
  }

  const parsed = parseJsonShape(rawText);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  if ('entries' in parsed && Array.isArray((parsed as { entries?: unknown }).entries)) {
    return 'day-one-json';
  }

  if (
    'connector' in parsed &&
    (parsed as { connector?: unknown }).connector === 'healthkit-ios' &&
    'records' in parsed &&
    Array.isArray((parsed as { records?: unknown }).records)
  ) {
    return 'healthkit-companion';
  }

  if (
    'resourceType' in parsed &&
    (parsed as { resourceType?: unknown }).resourceType === 'Bundle' &&
    'entry' in parsed &&
    Array.isArray((parsed as { entry?: unknown }).entry)
  ) {
    return 'smart-fhir-sandbox';
  }

  return null;
}
