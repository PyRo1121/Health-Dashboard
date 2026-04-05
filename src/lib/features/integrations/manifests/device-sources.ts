import {
  HEALTHKIT_CONNECTOR,
  HEALTHKIT_CONNECTOR_VERSION,
  HEALTHKIT_SUPPORTED_METRICS,
} from '$lib/features/integrations/bridge/schema';

export interface DeviceSourceManifest {
  connector: typeof HEALTHKIT_CONNECTOR;
  name: string;
  label: string;
  version: number;
  sourcePlatform: 'ios';
  handoffMode: 'file import';
  primaryPath: 'shortcuts-json';
  fallbackPath: 'apple-health-xml';
  docsPath: string;
  downloadTemplatePath: '/downloads/ios-shortcuts/healthkit-companion-template.json';
  downloadBlueprintPath: '/downloads/ios-shortcuts/shortcut-blueprint.md';
  automationSurface: 'Shortcuts';
  supportedMetrics: string[];
}

export const DEVICE_SOURCE_MANIFESTS: DeviceSourceManifest[] = [
  {
    connector: HEALTHKIT_CONNECTOR,
    name: 'HealthKit Companion',
    label: 'iPhone HealthKit Companion',
    version: HEALTHKIT_CONNECTOR_VERSION,
    sourcePlatform: 'ios',
    handoffMode: 'file import',
    primaryPath: 'shortcuts-json',
    fallbackPath: 'apple-health-xml',
    docsPath: '/apps/ios-shortcuts/README.md',
    downloadTemplatePath: '/downloads/ios-shortcuts/healthkit-companion-template.json',
    downloadBlueprintPath: '/downloads/ios-shortcuts/shortcut-blueprint.md',
    automationSurface: 'Shortcuts',
    supportedMetrics: [...HEALTHKIT_SUPPORTED_METRICS],
  },
];
