<script lang="ts">
  import type { FavoriteMeal, FoodCatalogItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import { Button, EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import { createRecipeSummary } from '$lib/features/nutrition/model';

  let {
    summary,
    summaryRows,
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    onReuseMeal,
    onUseRecipe,
  }: {
    summary: {
      calories: number;
      protein: number;
      fiber: number;
      carbs: number;
      fat: number;
      entries: Array<{ id: string; name?: string }>;
    };
    summaryRows: string[];
    favoriteMeals: FavoriteMeal[];
    catalogItems: FoodCatalogItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    onReuseMeal: (id: string) => void;
    onUseRecipe: (recipe: RecipeCatalogItem) => void;
  } = $props();
</script>

<SectionCard title="Today summary">
  {#if summary.entries.length}
    <ul class="summary-list">
      {#each summaryRows as row (row)}
        <li>{row}</li>
      {/each}
    </ul>
    <ul class="entry-list">
      {#each summary.entries as entry (entry.id)}
        <li>{entry.name ?? 'Untitled meal'}</li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No meals logged for today."
      message="Log one simple meal first, then save it as recurring if it earns that spot."
    />
  {/if}
</SectionCard>

<SectionCard title="Recurring meals">
  {#if favoriteMeals.length}
    <ul class="entry-list">
      {#each favoriteMeals as meal (meal.id)}
        <li>
          <div>
            <strong>{meal.name}</strong>
            <p>{meal.mealType}</p>
          </div>
          <Button variant="ghost" onclick={() => onReuseMeal(meal.id)}>Reuse meal</Button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="status-copy">No recurring meals yet.</p>
  {/if}
</SectionCard>

<SectionCard title="Custom food catalog">
  {#if catalogItems.length}
    <ul class="entry-list">
      {#each catalogItems as item (item.id)}
        <li>
          <div>
            <strong>{item.name}</strong>
            <p>
              {item.calories ?? 0} kcal · {item.protein ?? 0}g protein · {item.fiber ?? 0}g fiber
            </p>
            <p>{item.carbs ?? 0}g carbs · {item.fat ?? 0}g fat</p>
          </div>
          <span class="status-copy">{item.sourceName}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="status-copy">No custom foods saved yet.</p>
  {/if}
</SectionCard>

<SectionCard title="Recipe cache">
  {#if recipeCatalogItems.length}
    <ul class="entry-list">
      {#each recipeCatalogItems as recipe (recipe.id)}
        <li>
          <div>
            <strong>{recipe.title}</strong>
            <p>{createRecipeSummary(recipe)}</p>
          </div>
          <Button variant="ghost" onclick={() => onUseRecipe(recipe)}>Use recipe</Button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="status-copy">No recipe ideas saved yet.</p>
  {/if}
</SectionCard>

<style>
  .entry-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .entry-list li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }
</style>
