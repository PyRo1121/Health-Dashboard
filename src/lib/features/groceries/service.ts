import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { GroceryItem, PlanSlot, RecipeCatalogItem } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import { listRecipeCatalogItems } from '$lib/features/nutrition/service';

const COMMON_UNITS = new Set([
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'lb',
  'lbs',
  'oz',
  'ounce',
  'ounces',
  'g',
  'kg',
  'ml',
  'l',
  'can',
  'cans',
  'clove',
  'cloves',
]);

function sortPlanSlots(slots: PlanSlot[]): PlanSlot[] {
  return [...slots].sort(
    (left, right) =>
      left.localDay.localeCompare(right.localDay) ||
      left.order - right.order ||
      left.createdAt.localeCompare(right.createdAt)
  );
}

function inferAisle(label: string): string {
  const normalized = label.toLowerCase();

  if (
    /(berry|apple|banana|lettuce|spinach|kale|onion|tomato|pepper|broccoli|carrot|avocado)/.test(
      normalized
    )
  ) {
    return 'Produce';
  }

  if (/(chicken|beef|turkey|salmon|tuna|egg|yogurt|milk|cheese)/.test(normalized)) {
    return 'Protein & Dairy';
  }

  if (
    /(rice|pasta|oat|oats|flour|beans|lentil|soy sauce|olive oil|broth|sugar|salt)/.test(normalized)
  ) {
    return 'Pantry';
  }

  return 'Other';
}

function parseIngredientLine(rawLine: string): {
  ingredientKey: string;
  label: string;
  quantityText?: string;
} {
  const normalized = rawLine.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return {
      ingredientKey: '',
      label: '',
    };
  }

  const tokens = normalized.split(' ');
  const consumed: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!.toLowerCase();
    if (
      /^\d+$/.test(token) ||
      /^\d+\/\d+$/.test(token) ||
      /^\d+(?:\.\d+)?$/.test(token) ||
      COMMON_UNITS.has(token)
    ) {
      consumed.push(tokens[index]!);
      index += 1;
      continue;
    }
    break;
  }

  const label = tokens.slice(index).join(' ') || normalized;
  const ingredientKey = label
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    ingredientKey,
    label,
    quantityText: consumed.length ? consumed.join(' ') : undefined,
  };
}

async function listWeeklyPlanSlotsForGroceries(
  db: HealthDatabase,
  weeklyPlanId: string
): Promise<PlanSlot[]> {
  return sortPlanSlots(await db.planSlots.where('weeklyPlanId').equals(weeklyPlanId).toArray());
}

export interface WeeklyGroceriesDerivationResult {
  items: GroceryItem[];
  warnings: string[];
}

function createMissingIngredientsWarning(recipeTitle: string): string {
  return `${recipeTitle}: no ingredients available for grocery generation.`;
}

export async function deriveWeeklyGroceriesWithWarnings(
  db: HealthDatabase,
  weeklyPlanId: string,
  recipesInput?: RecipeCatalogItem[]
): Promise<WeeklyGroceriesDerivationResult> {
  const [slots, recipes, existingItems] = await Promise.all([
    listWeeklyPlanSlotsForGroceries(db, weeklyPlanId),
    Promise.resolve(recipesInput ?? listRecipeCatalogItems(db)),
    db.groceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray(),
  ]);
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const existingById = new Map(existingItems.map((item) => [item.id, item]));
  const warnings: string[] = [];
  const grouped = new Map<
    string,
    {
      label: string;
      quantityParts: string[];
      sourceRecipeIds: string[];
    }
  >();

  for (const slot of slots) {
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

  const timestamp = nowIso();
  const nextItems = [...grouped.entries()].map(([ingredientKey, item]) => {
    const id = `grocery:${weeklyPlanId}:${ingredientKey}`;
    const existing = existingById.get(id);
    const groceryItem: GroceryItem = {
      ...updateRecordMeta(existing, id, timestamp),
      weeklyPlanId,
      ingredientKey,
      label: item.label,
      quantityText: item.quantityParts.join(' + ') || undefined,
      aisle: inferAisle(item.label),
      checked: existing?.checked ?? false,
      excluded: existing?.excluded ?? false,
      onHand: existing?.onHand ?? false,
      sourceRecipeIds: item.sourceRecipeIds,
    };

    return groceryItem;
  });

  for (const item of nextItems) {
    await db.groceryItems.put(item);
  }
  for (const staleItem of existingItems) {
    if (!nextItems.find((item) => item.id === staleItem.id)) {
      await db.groceryItems.delete(staleItem.id);
    }
  }

  return {
    items: nextItems.sort(
      (left, right) =>
        left.aisle!.localeCompare(right.aisle!) || left.label.localeCompare(right.label)
    ),
    warnings,
  };
}

export async function deriveWeeklyGroceries(
  db: HealthDatabase,
  weeklyPlanId: string
): Promise<GroceryItem[]> {
  return (await deriveWeeklyGroceriesWithWarnings(db, weeklyPlanId)).items;
}

export async function setGroceryItemState(
  db: HealthDatabase,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<GroceryItem> {
  const existing = await db.groceryItems.get(itemId);
  if (!existing) {
    throw new Error('Grocery item not found');
  }

  const item: GroceryItem = {
    ...existing,
    ...updateRecordMeta(existing, existing.id),
    checked: patch.checked,
    excluded: patch.excluded,
    onHand: patch.onHand,
  };

  await db.groceryItems.put(item);
  return item;
}
