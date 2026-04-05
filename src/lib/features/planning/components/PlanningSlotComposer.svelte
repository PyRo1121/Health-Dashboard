<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import type { FoodCatalogItem, RecipeCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
  import type { PlanningSlotFormState } from '$lib/features/planning/model';

  let {
    weekDays,
    slotForm,
    recipeCatalogItems,
    foodCatalogItems,
    workoutTemplates,
    planNotice,
    onLocalDayChange,
    onSlotTypeChange,
    onMealSourceChange,
    onRecipeChange,
    onFoodChange,
    onWorkoutTemplateChange,
    onTitleChange,
    onNotesChange,
    onSaveSlot,
  }: {
    weekDays: string[];
    slotForm: PlanningSlotFormState;
    recipeCatalogItems: RecipeCatalogItem[];
    foodCatalogItems: FoodCatalogItem[];
    workoutTemplates: WorkoutTemplate[];
    planNotice: string;
    onLocalDayChange: (localDay: string) => void;
    onSlotTypeChange: (slotType: 'meal' | 'workout' | 'note') => void;
    onMealSourceChange: (mealSource: 'recipe' | 'food') => void;
    onRecipeChange: (recipeId: string) => void;
    onFoodChange: (foodCatalogItemId: string) => void;
    onWorkoutTemplateChange: (workoutTemplateId: string) => void;
    onTitleChange: (title: string) => void;
    onNotesChange: (notes: string) => void;
    onSaveSlot: () => void;
  } = $props();
</script>

<SectionCard title="Plan this week">
  <div class="field-grid">
    <Field label="Day">
      <select
        value={slotForm.localDay}
        aria-label="Plan day"
        onchange={(event) => onLocalDayChange((event.currentTarget as HTMLSelectElement).value)}
      >
        {#each weekDays as localDay (localDay)}
          <option value={localDay}>{localDay}</option>
        {/each}
      </select>
    </Field>
    <Field label="Slot type">
      <select
        value={slotForm.slotType}
        aria-label="Plan slot type"
        onchange={(event) =>
          onSlotTypeChange(
            (event.currentTarget as HTMLSelectElement).value as 'meal' | 'workout' | 'note'
          )}
      >
        <option value="meal">Meal</option>
        <option value="workout">Workout</option>
        <option value="note">Note</option>
      </select>
    </Field>
  </div>

  {#if slotForm.slotType === 'meal'}
    <Field label="Meal source">
      <select
        value={slotForm.mealSource}
        aria-label="Meal source"
        onchange={(event) =>
          onMealSourceChange((event.currentTarget as HTMLSelectElement).value as 'recipe' | 'food')}
      >
        <option value="recipe">Recipe</option>
        <option value="food">Saved food</option>
      </select>
    </Field>
    {#if slotForm.mealSource === 'recipe'}
      <Field label="Recipe">
        <select
          value={slotForm.recipeId}
          aria-label="Recipe"
          onchange={(event) => onRecipeChange((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Choose a saved recipe</option>
          {#each recipeCatalogItems as recipe (recipe.id)}
            <option value={recipe.id}>{recipe.title}</option>
          {/each}
        </select>
      </Field>
    {:else}
      <Field label="Saved food">
        <select
          value={slotForm.foodCatalogItemId}
          aria-label="Saved food"
          onchange={(event) => onFoodChange((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">Choose a saved food</option>
          {#each foodCatalogItems as item (item.id)}
            <option value={item.id}>{item.name}</option>
          {/each}
        </select>
      </Field>
    {/if}
  {:else if slotForm.slotType === 'workout'}
    <Field label="Workout template">
      <select
        value={slotForm.workoutTemplateId}
        aria-label="Workout template"
        onchange={(event) =>
          onWorkoutTemplateChange((event.currentTarget as HTMLSelectElement).value)}
      >
        <option value="">Choose a workout template</option>
        {#each workoutTemplates as template (template.id)}
          <option value={template.id}>{template.title}</option>
        {/each}
      </select>
    </Field>
  {:else}
    <Field label="Note title">
      <input
        value={slotForm.title}
        aria-label="Note title"
        oninput={(event) => onTitleChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  {/if}

  <Field label="Notes">
    <textarea
      value={slotForm.notes}
      aria-label="Plan notes"
      rows="3"
      oninput={(event) => onNotesChange((event.currentTarget as HTMLTextAreaElement).value)}
    ></textarea>
  </Field>

  <div class="button-row">
    <Button onclick={onSaveSlot}>Add to week</Button>
  </div>
  {#if planNotice}
    <p class="status-copy">{planNotice}</p>
  {/if}
</SectionCard>

<style>
  .field-grid {
    margin: 0 0 1rem;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }
</style>
