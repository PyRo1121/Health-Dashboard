import { nowIso } from '$lib/core/domain/time';
import type {
  DerivedGroceryItem,
  GroceryItem,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import { sortPlanSlots } from '$lib/core/shared/plan-slots';
import { updateRecordMeta } from '$lib/core/shared/records';
import { buildMergedWeeklyGroceries } from './merge';
import { buildDerivedGroceryItemId, inferAisle, parseIngredientLine } from './parsing';

export {
  buildDerivedGroceryItemId,
  buildManualGroceryItemId,
  buildManualGroceryItemRecord,
  inferAisle,
  parseIngredientLine,
  parseMergedGroceryItemId,
} from './parsing';
export { buildMergedGroceryItem, buildMergedWeeklyGroceries } from './merge';

function createMissingIngredientsWarning(recipeTitle: string): string {
  return `${recipeTitle}: no ingredients available for grocery generation.`;
}

export interface WeeklyGroceriesDerivationResult {
  derivedItems: DerivedGroceryItem[];
  items: GroceryItem[];
  warnings: string[];
}

export interface DeriveWeeklyGroceriesFromDataInput {
  weeklyPlanId: string;
  slots: PlanSlot[];
  recipes: RecipeCatalogItem[];
  existingDerivedItems: DerivedGroceryItem[];
  manualItems: ManualGroceryItem[];
  timestamp?: string;
}

export function deriveWeeklyGroceriesFromData(
  input: DeriveWeeklyGroceriesFromDataInput
): WeeklyGroceriesDerivationResult {
  const { weeklyPlanId, slots, recipes, existingDerivedItems, manualItems } = input;
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const existingByKey = new Map(existingDerivedItems.map((item) => [item.ingredientKey, item]));
  const manualByKey = new Map(manualItems.map((item) => [item.ingredientKey, item]));
  const warnings: string[] = [];
  const grouped = new Map<
    string,
    {
      label: string;
      quantityParts: string[];
      sourceRecipeIds: string[];
    }
  >();

  for (const slot of sortPlanSlots(slots)) {
    if (slot.slotType !== 'meal' || slot.itemType !== 'recipe' || !slot.itemId) {
      continue;
    }

    const recipe = recipeById.get(slot.itemId);
    if (!recipe) {
      continue;
    }

    let addedIngredient = false;

    for (const ingredient of recipe.ingredients) {
      const parsed = parseIngredientLine(ingredient);
      if (!parsed.ingredientKey || !parsed.label) {
        continue;
      }

      const existing = grouped.get(parsed.ingredientKey);
      if (existing) {
        addedIngredient = true;
        if (parsed.quantityText) {
          existing.quantityParts.push(parsed.quantityText);
        }
        if (!existing.sourceRecipeIds.includes(recipe.id)) {
          existing.sourceRecipeIds.push(recipe.id);
        }
        continue;
      }

      addedIngredient = true;
      grouped.set(parsed.ingredientKey, {
        label: parsed.label,
        quantityParts: parsed.quantityText ? [parsed.quantityText] : [],
        sourceRecipeIds: [recipe.id],
      });
    }

    if (!addedIngredient) {
      warnings.push(createMissingIngredientsWarning(recipe.title));
    }
  }

  const timestamp = input.timestamp ?? nowIso();
  const derivedItems = [...grouped.entries()].map(([ingredientKey, item]) => {
    const existing = existingByKey.get(ingredientKey);
    const manual = manualByKey.get(ingredientKey);

    return {
      ...updateRecordMeta(
        existing,
        buildDerivedGroceryItemId(weeklyPlanId, ingredientKey),
        timestamp
      ),
      weeklyPlanId,
      ingredientKey,
      label: item.label,
      quantityText: item.quantityParts.join(' + ') || undefined,
      aisle: inferAisle(item.label),
      checked: existing?.checked ?? manual?.checked ?? false,
      excluded: existing?.excluded ?? manual?.excluded ?? false,
      onHand: existing?.onHand ?? manual?.onHand ?? false,
      sourceRecipeIds: item.sourceRecipeIds,
    } satisfies DerivedGroceryItem;
  });

  return {
    derivedItems,
    items: buildMergedWeeklyGroceries(weeklyPlanId, derivedItems, manualItems),
    warnings,
  };
}
