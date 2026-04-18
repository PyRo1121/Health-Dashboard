import { describe, expect, it } from 'vitest';
import {
  EXTERNAL_SOURCE_REGISTRY,
  getExternalSourceDefinition,
} from '$lib/core/domain/external-sources';

describe('external source registry', () => {
  it('registers the first-wave production sources with stable posture', () => {
    expect(getExternalSourceDefinition('usda-fooddata-central')).toMatchObject({
      id: 'usda-fooddata-central',
      category: 'nutrition',
      authMode: 'api-key',
      productionPosture: 'adopt',
    });

    expect(getExternalSourceDefinition('open-food-facts')).toMatchObject({
      id: 'open-food-facts',
      category: 'nutrition',
      authMode: 'none',
      productionPosture: 'adopt',
    });

    expect(getExternalSourceDefinition('wger')).toMatchObject({
      id: 'wger',
      category: 'movement',
      authMode: 'none',
      productionPosture: 'adopt',
    });
  });

  it('keeps later or seed-only sources out of the adopt-now tier', () => {
    expect(getExternalSourceDefinition('themealdb')).toMatchObject({
      productionPosture: 'optional',
    });
    expect(getExternalSourceDefinition('blue-button')).toMatchObject({
      productionPosture: 'later',
    });
  });

  it('exposes the registry as a stable list for manifests and UI surfaces', () => {
    expect(EXTERNAL_SOURCE_REGISTRY.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'usda-fooddata-central',
        'open-food-facts',
        'wger',
        'smart-fhir-sandbox',
        'healthkit-companion',
      ])
    );
  });
});
