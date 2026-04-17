export const externalSourceCategories = [
  'nutrition',
  'movement',
  'reference',
  'import',
  'environment',
] as const;
export type ExternalSourceCategory = (typeof externalSourceCategories)[number];

export const externalSourceAuthModes = ['none', 'api-key', 'oauth2', 'native-consent'] as const;
export type ExternalSourceAuthMode = (typeof externalSourceAuthModes)[number];

export const externalSourceLicenseClasses = [
  'public-domain',
  'community-data',
  'open-data-sharealike',
  'standards-docs',
  'restricted-free',
] as const;
export type ExternalSourceLicenseClass = (typeof externalSourceLicenseClasses)[number];

export const externalSourceReliabilityLevels = [
  'official',
  'community',
  'sandbox',
  'optional',
] as const;
export type ExternalSourceReliability = (typeof externalSourceReliabilityLevels)[number];

export const externalSourceProductionPostures = ['adopt', 'optional', 'later', 'avoid'] as const;
export type ExternalSourceProductionPosture = (typeof externalSourceProductionPostures)[number];

export const externalSourceIds = [
  'usda-fooddata-central',
  'open-food-facts',
  'themealdb',
  'wger',
  'rxnorm',
  'clinical-tables-conditions',
  'medlineplus-connect',
  'medlineplus-web-service',
  'openfda-drug-label',
  'smart-fhir-sandbox',
  'healthkit-companion',
  'health-connect',
  'blue-button',
  'airnow',
  'open-meteo',
] as const;
export type ExternalSourceId = (typeof externalSourceIds)[number];

export interface ExternalSourceDefinition {
  id: ExternalSourceId;
  sourceName: string;
  category: ExternalSourceCategory;
  authMode: ExternalSourceAuthMode;
  licenseClass: ExternalSourceLicenseClass;
  reliability: ExternalSourceReliability;
  cacheTtlHours: number;
  productionPosture: ExternalSourceProductionPosture;
}

export const EXTERNAL_SOURCE_REGISTRY: ExternalSourceDefinition[] = [
  {
    id: 'usda-fooddata-central',
    sourceName: 'USDA FoodData Central',
    category: 'nutrition',
    authMode: 'api-key',
    licenseClass: 'public-domain',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'open-food-facts',
    sourceName: 'Open Food Facts',
    category: 'nutrition',
    authMode: 'none',
    licenseClass: 'community-data',
    reliability: 'community',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'themealdb',
    sourceName: 'TheMealDB',
    category: 'nutrition',
    authMode: 'none',
    licenseClass: 'restricted-free',
    reliability: 'optional',
    cacheTtlHours: 24,
    productionPosture: 'optional',
  },
  {
    id: 'wger',
    sourceName: 'wger',
    category: 'movement',
    authMode: 'none',
    licenseClass: 'open-data-sharealike',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'rxnorm',
    sourceName: 'RxNorm',
    category: 'reference',
    authMode: 'none',
    licenseClass: 'public-domain',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'clinical-tables-conditions',
    sourceName: 'Clinical Tables Conditions',
    category: 'reference',
    authMode: 'none',
    licenseClass: 'public-domain',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'medlineplus-connect',
    sourceName: 'MedlinePlus Connect',
    category: 'reference',
    authMode: 'none',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'medlineplus-web-service',
    sourceName: 'MedlinePlus Web Service',
    category: 'reference',
    authMode: 'none',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'adopt',
  },
  {
    id: 'openfda-drug-label',
    sourceName: 'openFDA Drug Label',
    category: 'reference',
    authMode: 'api-key',
    licenseClass: 'public-domain',
    reliability: 'official',
    cacheTtlHours: 24,
    productionPosture: 'optional',
  },
  {
    id: 'smart-fhir-sandbox',
    sourceName: 'SMART on FHIR sandbox',
    category: 'import',
    authMode: 'oauth2',
    licenseClass: 'standards-docs',
    reliability: 'sandbox',
    cacheTtlHours: 1,
    productionPosture: 'adopt',
  },
  {
    id: 'healthkit-companion',
    sourceName: 'HealthKit Companion',
    category: 'import',
    authMode: 'native-consent',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 1,
    productionPosture: 'adopt',
  },
  {
    id: 'health-connect',
    sourceName: 'Health Connect',
    category: 'import',
    authMode: 'native-consent',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 1,
    productionPosture: 'adopt',
  },
  {
    id: 'blue-button',
    sourceName: 'Blue Button 2.0',
    category: 'import',
    authMode: 'oauth2',
    licenseClass: 'restricted-free',
    reliability: 'sandbox',
    cacheTtlHours: 1,
    productionPosture: 'later',
  },
  {
    id: 'airnow',
    sourceName: 'AirNow',
    category: 'environment',
    authMode: 'api-key',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 6,
    productionPosture: 'optional',
  },
  {
    id: 'open-meteo',
    sourceName: 'Open-Meteo',
    category: 'environment',
    authMode: 'none',
    licenseClass: 'restricted-free',
    reliability: 'official',
    cacheTtlHours: 6,
    productionPosture: 'optional',
  },
];

const EXTERNAL_SOURCE_REGISTRY_BY_ID = new Map(
  EXTERNAL_SOURCE_REGISTRY.map((entry) => [entry.id, entry] as const)
);

export function getExternalSourceDefinition(sourceId: ExternalSourceId): ExternalSourceDefinition {
  const definition = EXTERNAL_SOURCE_REGISTRY_BY_ID.get(sourceId);
  if (!definition) {
    throw new Error(`Unknown external source: ${sourceId}`);
  }

  return definition;
}

export type ExternalSourceCacheStatus = 'local-cache' | 'remote-live' | 'none';
export type ExternalSourceDegradationStatus = 'none' | 'degraded' | 'local-only';

export interface ExternalSourceProvenance {
  sourceId: ExternalSourceId;
  sourceName: string;
  category: ExternalSourceCategory;
  productionPosture: ExternalSourceProductionPosture;
}

export interface ExternalSourceMetadata {
  provenance: ExternalSourceProvenance[];
  cacheStatus: ExternalSourceCacheStatus;
  degradationStatus: ExternalSourceDegradationStatus;
}

export function createExternalSourceMetadata(
  sourceId: ExternalSourceId,
  cacheStatus: ExternalSourceCacheStatus,
  degradationStatus: ExternalSourceDegradationStatus
): ExternalSourceMetadata {
  const definition = getExternalSourceDefinition(sourceId);

  return {
    provenance: [
      {
        sourceId: definition.id,
        sourceName: definition.sourceName,
        category: definition.category,
        productionPosture: definition.productionPosture,
      },
    ],
    cacheStatus,
    degradationStatus,
  };
}
