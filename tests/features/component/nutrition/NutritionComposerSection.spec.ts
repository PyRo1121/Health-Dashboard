import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import NutritionComposerSection from '../../../../src/lib/features/nutrition/components/NutritionComposerSection.svelte';
import { createNutritionForm } from '../../../../src/lib/features/nutrition/model';

describe('NutritionComposerSection', () => {
  it('renders USDA and Open Food Facts metadata when search responses carry source metadata', () => {
    render(NutritionComposerSection, {
      searchQuery: 'oatmeal',
      searchNotice: 'USDA live search unavailable, using local fallback foods.',
      searchMetadata: {
        provenance: [
          {
            sourceId: 'usda-fooddata-central',
            sourceName: 'USDA FoodData Central',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
      },
      matches: [],
      packagedQuery: 'cola',
      barcodeQuery: '',
      packagedNotice: 'Open Food Facts search unavailable, using local packaged foods.',
      packagedMetadata: {
        provenance: [
          {
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
      },
      packagedMatches: [],
      recipeQuery: '',
      recipeNotice: '',
      recipeMatches: [],
      form: createNutritionForm(),
      saveNotice: '',
      onSearchQueryChange: vi.fn(),
      onSearchFoods: vi.fn(),
      onUseMatch: vi.fn(),
      onPackagedQueryChange: vi.fn(),
      onSearchPackagedFoods: vi.fn(),
      onBarcodeQueryChange: vi.fn(),
      onLookupBarcode: vi.fn(),
      onRecipeQueryChange: vi.fn(),
      onSearchRecipes: vi.fn(),
      onUseRecipe: vi.fn(),
      onFormFieldChange: vi.fn(),
      onSaveMeal: vi.fn(),
      onPlanNextMeal: vi.fn(),
      onSaveCustomFood: vi.fn(),
      onSaveRecurringMeal: vi.fn(),
    });

    expect(screen.getByText(/Sources: USDA FoodData Central/i)).toBeTruthy();
    expect(screen.getByText(/Sources: Open Food Facts/i)).toBeTruthy();
    expect(screen.getAllByText(/local-cache/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/degraded/i).length).toBeGreaterThan(0);
  });
});
