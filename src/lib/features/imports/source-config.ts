import type { ImportSourceType } from '$lib/core/domain/types';
import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
import {
	buildHealthKitImportHelperCopy,
	buildSmartFhirImportHelperCopy,
	type ImportSourceHelperCopy
} from '$lib/features/integrations/setup-presenters';

export interface ImportSourceConfig {
	label: string;
	description: string;
	helper?: ImportSourceHelperCopy;
	sampleBundle?: {
		filename: string;
		notice: string;
		build: () => unknown;
	};
}

export interface ImportSourceCatalog {
	config: Record<ImportSourceType, ImportSourceConfig>;
	options: Array<{ value: ImportSourceType; label: string }>;
	labels: Record<ImportSourceType, string>;
}

export function buildImportSourceCatalog(input: {
	healthkitManifest: DeviceSourceManifest;
	createSampleHealthKitBundle: () => unknown;
	createSampleSmartFhirBundle: () => unknown;
}): ImportSourceCatalog {
	const config: Record<ImportSourceType, ImportSourceConfig> = {
		'healthkit-companion': {
			label: 'iPhone bundle / Shortcuts JSON',
			description:
				'Preferred no-Mac T9 path. Use Apple Shortcuts to export this JSON bundle, or paste the same contract from a native iPhone companion build.',
			helper: buildHealthKitImportHelperCopy(input.healthkitManifest),
			sampleBundle: {
				filename: 'sample-healthkit-bundle.json',
				notice: 'Loaded sample bundle into the import payload.',
				build: input.createSampleHealthKitBundle
			}
		},
		'smart-fhir-sandbox': {
			label: 'SMART sandbox FHIR JSON',
			description:
				'T10 proof lane. Paste a SMART sandbox FHIR Bundle after you configure your single-owner profile in Settings.',
			helper: buildSmartFhirImportHelperCopy(),
			sampleBundle: {
				filename: 'sample-smart-fhir-bundle.json',
				notice: 'Loaded sample SMART sandbox bundle into the import payload.',
				build: input.createSampleSmartFhirBundle
			}
		},
		'apple-health-xml': {
			label: 'Apple Health XML',
			description: 'Fallback import for Apple Health XML archives.'
		},
		'day-one-json': {
			label: 'Day One JSON',
			description: 'Journal import lane for Day One JSON exports.'
		}
	};

	const entries = Object.entries(config) as Array<[ImportSourceType, ImportSourceConfig]>;

	return {
		config,
		options: entries.map(([value, item]) => ({
			value,
			label: item.label
		})),
		labels: Object.fromEntries(entries.map(([value, item]) => [value, item.label])) as Record<
			ImportSourceType,
			string
		>
	};
}

export function isSampleBundleSourceType(
	value: ImportSourceType
): value is Extract<ImportSourceType, 'healthkit-companion' | 'smart-fhir-sandbox'> {
	return value === 'healthkit-companion' || value === 'smart-fhir-sandbox';
}
