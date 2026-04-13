<script lang="ts">
  import type { RecipeCatalogItem } from '$lib/core/domain/types';
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import {
    createRecipeSummary,
    nutritionMealTypeOptions,
    type NutritionFormState,
  } from '$lib/features/nutrition/model';
  import type { FoodLookupResult } from '$lib/features/nutrition/types';

  let {
    searchQuery,
    searchNotice,
    matches,
    packagedQuery,
    barcodeQuery,
    packagedNotice,
    packagedMatches,
    recipeQuery,
    recipeNotice,
    recipeMatches,
    form,
    saveNotice,
    onSearchQueryChange,
    onSearchFoods,
    onUseMatch,
    onPackagedQueryChange,
    onSearchPackagedFoods,
    onBarcodeQueryChange,
    onLookupBarcode,
    onRecipeQueryChange,
    onSearchRecipes,
    onUseRecipe,
    onFormFieldChange,
    onSaveMeal,
    onPlanNextMeal,
    onSaveCustomFood,
    onSaveRecurringMeal,
  }: {
    searchQuery: string;
    searchNotice: string;
    matches: FoodLookupResult[];
    packagedQuery: string;
    barcodeQuery: string;
    packagedNotice: string;
    packagedMatches: FoodLookupResult[];
    recipeQuery: string;
    recipeNotice: string;
    recipeMatches: RecipeCatalogItem[];
    form: NutritionFormState;
    saveNotice: string;
    onSearchQueryChange: (value: string) => void;
    onSearchFoods: () => void;
    onUseMatch: (match: FoodLookupResult) => void;
    onPackagedQueryChange: (value: string) => void;
    onSearchPackagedFoods: () => void;
    onBarcodeQueryChange: (value: string) => void;
    onLookupBarcode: () => void;
    onRecipeQueryChange: (value: string) => void;
    onSearchRecipes: () => void;
    onUseRecipe: (recipe: RecipeCatalogItem) => void;
    onFormFieldChange: (field: keyof NutritionFormState, value: string) => void;
    onSaveMeal: () => void;
    onPlanNextMeal: () => void;
    onSaveCustomFood: () => void;
    onSaveRecurringMeal: () => void;
  } = $props();
</script>

<SectionCard title="Meal logging">
  <Field label="Food search">
    <input
      value={searchQuery}
      aria-label="Food search"
      placeholder="Search USDA fallback foods"
      oninput={(event) => onSearchQueryChange((event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="button-row">
    <Button variant="secondary" onclick={onSearchFoods}>Search foods</Button>
  </div>

  {#if searchNotice}
    <p class="status-copy">{searchNotice}</p>
  {/if}

  {#if matches.length}
    <ul class="match-list">
      {#each matches as match (match.id)}
        <li>
          <div>
            <strong>{match.name}</strong>
            <p>{match.calories} kcal · {match.protein}g protein · {match.fiber}g fiber</p>
            <p>{match.carbs}g carbs · {match.fat}g fat</p>
          </div>
          <Button variant="ghost" onclick={() => onUseMatch(match)}>Use match</Button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="packaged-search">
    <Field label="Packaged product search">
      <input
        value={packagedQuery}
        aria-label="Packaged product search"
        placeholder="Search Open Food Facts packaged foods"
        oninput={(event) => onPackagedQueryChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <div class="button-row">
      <Button variant="secondary" onclick={onSearchPackagedFoods}>Search packaged foods</Button>
    </div>

    <Field label="Barcode lookup">
      <input
        value={barcodeQuery}
        aria-label="Barcode lookup"
        placeholder="Enter barcode"
        oninput={(event) => onBarcodeQueryChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <div class="button-row">
      <Button variant="secondary" onclick={onLookupBarcode}>Lookup barcode</Button>
    </div>

    {#if packagedNotice}
      <p class="status-copy">{packagedNotice}</p>
    {/if}

    {#if packagedMatches.length}
      <ul class="match-list">
        {#each packagedMatches as match (match.id)}
          <li>
            <div>
              <strong>{match.name}</strong>
              <p>{match.brandName ?? match.sourceName}</p>
              <p>{match.calories} kcal · {match.protein}g protein · {match.fiber}g fiber</p>
              <p>{match.carbs}g carbs · {match.fat}g fat</p>
            </div>
            <Button variant="ghost" onclick={() => onUseMatch(match)}>Use packaged</Button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="recipe-search">
    <Field label="Recipe search">
      <input
        value={recipeQuery}
        aria-label="Recipe search"
        placeholder="Search TheMealDB recipes"
        oninput={(event) => onRecipeQueryChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <div class="button-row">
      <Button variant="secondary" onclick={onSearchRecipes}>Search recipes</Button>
    </div>

    {#if recipeNotice}
      <p class="status-copy">{recipeNotice}</p>
    {/if}

    {#if recipeMatches.length}
      <ul class="match-list">
        {#each recipeMatches as recipe (recipe.id)}
          <li>
            <div>
              <strong>{recipe.title}</strong>
              <p>{createRecipeSummary(recipe)}</p>
              <p>{recipe.ingredients.slice(0, 3).join(', ')}</p>
            </div>
            <Button variant="ghost" onclick={() => onUseRecipe(recipe)}>Use recipe</Button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="field-grid">
    <Field label="Meal type">
      <select
        value={form.mealType}
        aria-label="Meal type"
        onchange={(event) =>
          onFormFieldChange('mealType', (event.currentTarget as HTMLSelectElement).value)}
      >
        {#each nutritionMealTypeOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </Field>
    <Field label="Name">
      <input
        value={form.name}
        aria-label="Meal name"
        oninput={(event) =>
          onFormFieldChange('name', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Calories">
      <input
        value={form.calories}
        aria-label="Calories"
        type="number"
        min="0"
        oninput={(event) =>
          onFormFieldChange('calories', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Protein">
      <input
        value={form.protein}
        aria-label="Protein"
        type="number"
        min="0"
        oninput={(event) =>
          onFormFieldChange('protein', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Fiber">
      <input
        value={form.fiber}
        aria-label="Fiber"
        type="number"
        min="0"
        oninput={(event) =>
          onFormFieldChange('fiber', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Carbs">
      <input
        value={form.carbs}
        aria-label="Carbs"
        type="number"
        min="0"
        oninput={(event) =>
          onFormFieldChange('carbs', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Fat">
      <input
        value={form.fat}
        aria-label="Fat"
        type="number"
        min="0"
        oninput={(event) =>
          onFormFieldChange('fat', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="button-row">
    <Button onclick={onSaveMeal}>Save meal</Button>
    <Button variant="secondary" onclick={onPlanNextMeal}>Plan next meal</Button>
    <Button variant="secondary" onclick={onSaveCustomFood}>Save as custom food</Button>
    <Button variant="secondary" onclick={onSaveRecurringMeal}>Save as recurring meal</Button>
  </div>

  {#if saveNotice}
    <p class="status-copy">{saveNotice}</p>
  {/if}
</SectionCard>

<style>
  .field-grid {
    margin: 1rem 0;
  }

  .match-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: grid;
    gap: 0.75rem;
  }

  .match-list li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }
</style>
