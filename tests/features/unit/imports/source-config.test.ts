import { describe, expect, it } from 'vitest';
import {
  buildImportSourceCatalog,
  isSampleBundleSourceType,
} from '$lib/features/imports/source-config';
import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
import { HEALTHKIT_CONNECTOR } from '$lib/features/integrations/bridge/schema';

const HEALTHKIT_MANIFEST: DeviceSourceManifest = {
  connector: HEALTHKIT_CONNECTOR,
  name: 'HealthKit Companion',
  label: 'iPhone HealthKit Companion',
  version: 1,
  sourcePlatform: 'ios',
  handoffMode: 'file import',
  primaryPath: 'shortcuts-json',
  fallbackPath: 'apple-health-xml',
  docsPath: '/apps/ios-shortcuts/README.md',
  automationSurface: 'Shortcuts',
  supportedMetrics: ['sleep-duration', 'step-count', 'resting-heart-rate'],
  downloadTemplatePath: '/downloads/ios-shortcuts/healthkit-companion-template.json',
  downloadBlueprintPath: '/downloads/ios-shortcuts/shortcut-blueprint.md',
};

describe('buildImportSourceCatalog', () => {
  it('returns aligned config, options, and labels for all import sources', () => {
    const catalog = buildImportSourceCatalog({
      healthkitManifest: HEALTHKIT_MANIFEST,
      createSampleHealthKitBundle: () => ({ connector: 'healthkit' }),
      createSampleSmartFhirBundle: () => ({ resourceType: 'Bundle' }),
    });

    expect(catalog.options.map((option) => option.value)).toEqual([
      'healthkit-companion',
      'smart-fhir-sandbox',
      'apple-health-xml',
      'day-one-json',
    ]);
    expect(catalog.labels['healthkit-companion']).toBe('iPhone bundle / Shortcuts JSON');
    expect(catalog.config['smart-fhir-sandbox'].sampleBundle?.filename).toBe(
      'sample-smart-fhir-bundle.json'
    );
  });
});

describe('isSampleBundleSourceType', () => {
  it('accepts only sources with sample bundle support', () => {
    expect(isSampleBundleSourceType('healthkit-companion')).toBe(true);
    expect(isSampleBundleSourceType('smart-fhir-sandbox')).toBe(true);
    expect(isSampleBundleSourceType('day-one-json')).toBe(false);
  });
});
