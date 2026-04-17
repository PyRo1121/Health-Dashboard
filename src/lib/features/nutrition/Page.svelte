<script lang="ts">
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
    createRecommendationContextRows,
    createNutritionDraftFromForm,
    createPlannedMealRows,
    createNutritionSummaryRows,
  } from '$lib/features/nutrition/model';
  import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import type { FoodLookupResult } from '$lib/features/nutrition/types';
  import {
    applyNutritionRecommendationSelection,
    getNutritionRecommendationPlanDraft,
    loadPlannedMealIntoDraft,
    updateNutritionFormField,
  } from '$lib/features/nutrition/page-actions';
  import { applyPendingNutritionIntent } from '$lib/features/nutrition/page-intent';

  let page = $state(createNutritionPageState());
  let draftFromForm = $derived(
    createNutritionDraftFromForm(
      page.localDay,
      page.form,
      page.selectedMatch,
      page.selectedDraftSource
    )
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
  let pendingAction = Promise.resolve();

  function runNutritionAction(run: () => Promise<void>) {
    const next = pendingAction.catch(() => undefined).then(run);
    pendingAction = next;
    return next;
  }

  async function refreshData() {
    await runNutritionAction(async () => {
      const loaded = await loadNutritionPage(page);
      page = await applyPendingNutritionIntent(loaded, window, {
        hydrateFoodMatch: useNutritionMatch,
        applyRecipe: useNutritionRecipeIdea,
      });
    });
  }

  async function runSearch() {
    await runNutritionAction(async () => {
      page = await searchNutritionFoods(page);
    });
  }

  async function runPackagedSearch() {
    await runNutritionAction(async () => {
      page = await searchPackagedFoods(page);
    });
  }

  async function runBarcodeLookup() {
    await runNutritionAction(async () => {
      page = await lookupPackagedBarcode(page);
    });
  }

  async function runRecipeSearch() {
    await runNutritionAction(async () => {
      page = await searchNutritionRecipes(page);
    });
  }

  async function useMatch(match: FoodLookupResult) {
    await runNutritionAction(async () => {
      page = await useNutritionMatch(page, match);
    });
  }

  async function saveMeal() {
    await runNutritionAction(async () => {
      page = await saveNutritionMeal(page, draftFromForm);
    });
  }

  async function saveRecurringMeal() {
    await runNutritionAction(async () => {
      page = await saveNutritionRecurringMeal(page, draftFromForm);
    });
  }

  async function saveCustomFood() {
    await runNutritionAction(async () => {
      page = await saveNutritionCatalogItem(page, {
        name: draftFromForm.name,
        calories: draftFromForm.calories,
        protein: draftFromForm.protein,
        fiber: draftFromForm.fiber,
        carbs: draftFromForm.carbs,
        fat: draftFromForm.fat,
      });
    });
  }

  async function savePlannedMeal() {
    await runNutritionAction(async () => {
      page = await planNutritionMeal(page, draftFromForm);
    });
  }

  async function clearPlannedMeal() {
    await runNutritionAction(async () => {
      page = await clearNutritionPlannedMeal(page);
    });
  }

  async function reuseMeal(id: string) {
    await runNutritionAction(async () => {
      page = await reuseNutritionMeal(page, id);
    });
  }

  function updateFormField(field: keyof typeof page.form, value: string) {
    page = updateNutritionFormField(page, field, value);
  }

  async function useRecipe(recipe: (typeof page.recipeCatalogItems)[number]) {
    await runNutritionAction(async () => {
      page = useNutritionRecipeIdea(page, recipe);
    });
  }

  function loadPlannedMeal() {
    page = loadPlannedMealIntoDraft(page);
  }

  async function planRecommendation(
    recommendationId: string,
    kind: 'food' | 'recipe',
    canPlanDirectly: boolean
  ) {
    await runNutritionAction(async () => {
      const draft = getNutritionRecommendationPlanDraft(
        page,
        recommendationId,
        kind,
        canPlanDirectly
      );
      if (!draft) {
        return;
      }

      page = await planNutritionMeal(page, draft);
    });
  }

  async function useRecommendation(recommendationId: string, kind: 'food' | 'recipe') {
    await runNutritionAction(async () => {
      page = await applyNutritionRecommendationSelection(
        page,
        recommendationId,
        kind,
        useNutritionMatch,
        useNutritionRecipeIdea
      );
    });
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
      searchMetadata={page.searchMetadata}
      matches={page.matches}
      packagedQuery={page.packagedQuery}
      barcodeQuery={page.barcodeQuery}
      packagedNotice={page.packagedNotice}
      packagedMetadata={page.packagedMetadata}
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
