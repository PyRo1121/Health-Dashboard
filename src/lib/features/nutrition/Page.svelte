<script lang="ts">
  import type { RecipeCatalogItem } from '$lib/core/domain/types';
  import {
    clearNutritionPlannedMeal,
    createNutritionPageState,
    loadNutritionPage,
    lookupPackagedBarcode,
    planNutritionMeal,
    reuseNutritionMeal,
    searchNutritionFoods,
    searchNutritionRecipes,
    searchPackagedFoods,
    saveNutritionCatalogItem,
    saveNutritionMeal,
    saveNutritionRecurringMeal,
    useNutritionMatch,
    useNutritionRecipeIdea,
    updateNutritionBarcode,
    updateNutritionPackagedSearch,
    updateNutritionRecipeSearch,
    updateNutritionSearch,
  } from '$lib/features/nutrition/client';
  import NutritionCollectionsSection from '$lib/features/nutrition/components/NutritionCollectionsSection.svelte';
  import NutritionComposerSection from '$lib/features/nutrition/components/NutritionComposerSection.svelte';
  import NutritionPlannedMealSection from '$lib/features/nutrition/components/NutritionPlannedMealSection.svelte';
  import NutritionRecommendationsSection from '$lib/features/nutrition/components/NutritionRecommendationsSection.svelte';
  import {
    clearNutritionIntentFromLocation,
    readNutritionIntentFromSearch,
  } from '$lib/features/nutrition/navigation';
  import {
    createRecommendationContextRows,
    createNutritionDraftFromForm,
    createPlannedMealRows,
    createNutritionSummaryRows,
  } from '$lib/features/nutrition/model';
  import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import {
    foodLookupResultFromCatalogItem,
    type FoodLookupResult,
  } from '$lib/features/nutrition/service';

  let page = $state(createNutritionPageState());
  let draftFromForm = $derived(
    createNutritionDraftFromForm(page.localDay, page.form, page.selectedMatch)
  );
  let summaryRows = $derived(createNutritionSummaryRows(page.summary));
  let plannedMealRows = $derived(createPlannedMealRows(page.plannedMeal));
  let recommendationContextRows = $derived(
    createRecommendationContextRows({
      mealType: page.form.mealType,
      ...page.recommendationContext,
    })
  );
  let recommendations = $derived(
    buildNutritionRecommendations({
      context: {
        mealType: page.form.mealType,
        ...page.recommendationContext,
      },
      foods: page.catalogItems,
      recipes: page.recipeCatalogItems,
    })
  );

  async function applyPendingIntent(nextPage: typeof page): Promise<typeof page> {
    const intent = readNutritionIntentFromSearch(window.location.search);
    if (!intent) {
      return nextPage;
    }

    clearNutritionIntentFromLocation(window.location, window.history);

    if (intent.kind === 'food') {
      const item = nextPage.catalogItems.find((candidate) => candidate.id === intent.id);
      if (!item) {
        return {
          ...nextPage,
          searchNotice: 'That saved food is no longer available in your local catalog.',
        };
      }

      const hydrated = await useNutritionMatch(nextPage, foodLookupResultFromCatalogItem(item));
      return {
        ...hydrated,
        searchNotice: 'Loaded from Review strategy.',
      };
    }

    const recipe = nextPage.recipeCatalogItems.find((candidate) => candidate.id === intent.id);
    if (!recipe) {
      return {
        ...nextPage,
        recipeNotice: 'That saved recipe is no longer available in your local cache.',
      };
    }

    return {
      ...useNutritionRecipeIdea(nextPage, recipe),
      recipeNotice: 'Loaded from Review strategy.',
    };
  }

  async function refreshData() {
    const loaded = await loadNutritionPage(page);
    page = await applyPendingIntent(loaded);
  }

  async function runSearch() {
    page = await searchNutritionFoods(page);
  }

  async function runPackagedSearch() {
    page = await searchPackagedFoods(page);
  }

  async function runBarcodeLookup() {
    page = await lookupPackagedBarcode(page);
  }

  async function runRecipeSearch() {
    page = await searchNutritionRecipes(page);
  }

  async function useMatch(match: FoodLookupResult) {
    page = await useNutritionMatch(page, match);
  }

  async function saveMeal() {
    page = await saveNutritionMeal(page, draftFromForm);
  }

  async function saveRecurringMeal() {
    page = await saveNutritionRecurringMeal(page, draftFromForm);
  }

  async function saveCustomFood() {
    page = await saveNutritionCatalogItem(page, {
      name: draftFromForm.name,
      calories: draftFromForm.calories,
      protein: draftFromForm.protein,
      fiber: draftFromForm.fiber,
      carbs: draftFromForm.carbs,
      fat: draftFromForm.fat,
    });
  }

  async function savePlannedMeal() {
    page = await planNutritionMeal(page, draftFromForm);
  }

  async function clearPlannedMeal() {
    page = await clearNutritionPlannedMeal(page);
  }

  async function reuseMeal(id: string) {
    page = await reuseNutritionMeal(page, id);
  }

  function updateFormField(field: keyof typeof page.form, value: string) {
    page = {
      ...page,
      form: {
        ...page.form,
        [field]: value,
      },
    };
  }

  function useRecipe(recipe: RecipeCatalogItem) {
    page = useNutritionRecipeIdea(page, recipe);
  }

  function loadPlannedMeal() {
    if (!page.plannedMeal) return;
    page = {
      ...page,
      selectedMatch: null,
      saveNotice: 'Planned meal loaded into draft.',
      form: {
        ...page.form,
        mealType: page.plannedMeal.mealType,
        name: page.plannedMeal.name,
        calories: String(page.plannedMeal.calories ?? 0),
        protein: String(page.plannedMeal.protein ?? 0),
        fiber: String(page.plannedMeal.fiber ?? 0),
        carbs: String(page.plannedMeal.carbs ?? 0),
        fat: String(page.plannedMeal.fat ?? 0),
        notes: page.plannedMeal.notes ?? '',
      },
    };
  }

  async function planRecommendation(recommendationId: string, kind: 'food' | 'recipe') {
    if (kind === 'food') {
      const item = page.catalogItems.find((candidate) => candidate.id === recommendationId);
      if (!item) return;
      page = await planNutritionMeal(page, {
        name: item.name,
        mealType: page.form.mealType,
        calories: item.calories ?? 0,
        protein: item.protein ?? 0,
        fiber: item.fiber ?? 0,
        carbs: item.carbs ?? 0,
        fat: item.fat ?? 0,
        notes: '',
        sourceName: item.sourceName,
      });
      return;
    }

    const recipe = page.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
    if (!recipe) return;
    page = await planNutritionMeal(page, {
      name: recipe.title,
      mealType: recipe.mealType ?? page.form.mealType,
      calories: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
      notes: recipe.ingredients.slice(0, 4).join(', '),
      sourceName: recipe.sourceName,
    });
  }

  async function useRecommendation(recommendationId: string, kind: 'food' | 'recipe') {
    if (kind === 'food') {
      const item = page.catalogItems.find((candidate) => candidate.id === recommendationId);
      if (!item) return;
      page = await useNutritionMatch(page, foodLookupResultFromCatalogItem(item));
      return;
    }

    const recipe = page.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
    if (!recipe) return;
    page = useNutritionRecipeIdea(page, recipe);
  }

  onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/nutrition" />

{#if page.loading}
  <p class="status-copy">Loading nutrition…</p>
{:else}
  <div class="page-grid nutrition-grid">
    <NutritionComposerSection
      searchQuery={page.searchQuery}
      searchNotice={page.searchNotice}
      matches={page.matches}
      packagedQuery={page.packagedQuery}
      barcodeQuery={page.barcodeQuery}
      packagedNotice={page.packagedNotice}
      packagedMatches={page.packagedMatches}
      recipeQuery={page.recipeQuery}
      recipeNotice={page.recipeNotice}
      recipeMatches={page.recipeMatches}
      form={page.form}
      saveNotice={page.saveNotice}
      onSearchQueryChange={(value) => {
        page = updateNutritionSearch(page, value);
      }}
      onSearchFoods={runSearch}
      onUseMatch={useMatch}
      onPackagedQueryChange={(value) => {
        page = updateNutritionPackagedSearch(page, value);
      }}
      onSearchPackagedFoods={runPackagedSearch}
      onBarcodeQueryChange={(value) => {
        page = updateNutritionBarcode(page, value);
      }}
      onLookupBarcode={runBarcodeLookup}
      onRecipeQueryChange={(value) => {
        page = updateNutritionRecipeSearch(page, value);
      }}
      onSearchRecipes={runRecipeSearch}
      onUseRecipe={useRecipe}
      onFormFieldChange={updateFormField}
      onSaveMeal={saveMeal}
      onPlanNextMeal={savePlannedMeal}
      onSaveCustomFood={saveCustomFood}
      onSaveRecurringMeal={saveRecurringMeal}
    />

    <NutritionPlannedMealSection
      plannedMeal={page.plannedMeal}
      plannedMealIssue={page.plannedMealIssue}
      {plannedMealRows}
      onLoadPlannedMeal={loadPlannedMeal}
      onClearPlannedMeal={clearPlannedMeal}
    />

    <NutritionCollectionsSection
      summary={page.summary}
      {summaryRows}
      favoriteMeals={page.favoriteMeals}
      catalogItems={page.catalogItems}
      recipeCatalogItems={page.recipeCatalogItems}
      onReuseMeal={reuseMeal}
      onUseRecipe={useRecipe}
    />

    <NutritionRecommendationsSection
      {recommendationContextRows}
      {recommendations}
      onUseRecommendation={useRecommendation}
      onPlanRecommendation={planRecommendation}
    />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .nutrition-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
