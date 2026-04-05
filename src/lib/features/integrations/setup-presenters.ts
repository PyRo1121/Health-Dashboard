import type { NativeCompanionSummary } from '$lib/core/domain/types';
import type { ClinicalSourceManifest } from '$lib/features/integrations/manifests/clinical-sources';
import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
import { NO_MAC_SETUP_STEPS, NO_MAC_T9_SHIPS } from '$lib/features/integrations/setup-guide';

export type SetupLinkRoute =
  | '/downloads/ios-shortcuts/healthkit-companion-template.json'
  | '/downloads/ios-shortcuts/shortcut-blueprint.md'
  | '/settings'
  | '/imports'
  | '/timeline'
  | '/review';

export interface SetupLink {
  route: SetupLinkRoute;
  label: string;
  download?: boolean;
}

export interface ImportSourceHelperCopy {
  title: string;
  description: string;
  links?: SetupLink[];
  bullets?: string[];
}

export interface NoMacSetupModel {
  resourceDescription: string;
  primaryLinks: SetupLink[];
  navigationLinks: SetupLink[];
  steps: typeof NO_MAC_SETUP_STEPS;
  ships: typeof NO_MAC_T9_SHIPS;
}

export interface ClinicalConnectorRow extends ClinicalSourceManifest {
  starterResourceLabel: string;
}

export function buildNoMacSetupModel(
  manifest: DeviceSourceManifest,
  showNavigationLinks = true
): NoMacSetupModel {
  return {
    resourceDescription: `Primary path: ${manifest.automationSurface} JSON. Fallback: ${manifest.fallbackPath}. \`/imports\` stays the only place that stages and commits data.`,
    primaryLinks: [
      {
        route: manifest.downloadTemplatePath,
        label: 'Download template JSON',
        download: true,
      },
      {
        route: manifest.downloadBlueprintPath,
        label: 'Open shortcut blueprint',
      },
    ],
    navigationLinks: showNavigationLinks
      ? [
          { route: '/imports', label: 'Open import center' },
          { route: '/timeline', label: 'Open timeline' },
          { route: '/review', label: 'Open review' },
        ]
      : [],
    steps: NO_MAC_SETUP_STEPS,
    ships: NO_MAC_T9_SHIPS,
  };
}

export function buildHealthKitImportHelperCopy(
  manifest: DeviceSourceManifest
): ImportSourceHelperCopy {
  return {
    title: `${manifest.label} v${manifest.version} on ${manifest.sourcePlatform}`,
    description: `Primary no-Mac path: ${manifest.automationSurface} JSON. Fallback: Apple Health XML.`,
    links: [
      {
        route: manifest.downloadTemplatePath,
        label: 'Download template JSON',
        download: true,
      },
      {
        route: manifest.downloadBlueprintPath,
        label: 'Open shortcut blueprint',
      },
    ],
    bullets: [...manifest.supportedMetrics],
  };
}

export function buildSmartFhirImportHelperCopy(): ImportSourceHelperCopy {
  return {
    title: 'SMART on FHIR sandbox preview lane',
    description:
      'This bundle only stages when the bundle patient matches the single-owner profile saved in Settings.',
    links: [{ route: '/settings', label: 'Open Settings' }],
  };
}

export function buildNativeCompanionSummaryRows(summary: NativeCompanionSummary): string[] {
  return [
    ...(summary.deviceNames.length ? [`Devices: ${summary.deviceNames.join(', ')}`] : []),
    ...(summary.metricTypes.length ? [`Imported metrics: ${summary.metricTypes.join(', ')}`] : []),
    ...(summary.latestCaptureAt ? [`Latest capture: ${summary.latestCaptureAt}`] : []),
  ];
}

export function buildClinicalConnectorRows(
  manifests: ClinicalSourceManifest[]
): ClinicalConnectorRow[] {
  return manifests.map((manifest) => ({
    ...manifest,
    starterResourceLabel: manifest.starterResources.join(', '),
  }));
}
