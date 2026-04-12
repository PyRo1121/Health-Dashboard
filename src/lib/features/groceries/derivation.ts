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
  'bottle',
  'bottles',
  'clove',
  'cloves',
]);

export function inferAisle(label: string): string {
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

export function parseIngredientLine(rawLine: string): {
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

function buildGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `grocery:${weeklyPlanId}:${ingredientKey}`;
}

export function buildDerivedGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `derived-grocery:${weeklyPlanId}:${ingredientKey}`;
}

export function buildManualGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `manual-grocery:${weeklyPlanId}:${ingredientKey}`;
}

export function buildManualGroceryItemRecord(input: {
  weeklyPlanId: string;
  parsed: { ingredientKey: string; label: string; quantityText?: string };
  existingManual?: ManualGroceryItem;
  existingDerived?: DerivedGroceryItem;
  timestamp?: string;
}): ManualGroceryItem {
  const { weeklyPlanId, parsed, existingManual, existingDerived } = input;
  const label = existingManual?.label ?? existingDerived?.label ?? parsed.label;
  const timestamp = input.timestamp ?? nowIso();

  return {
    ...updateRecordMeta(
      existingManual,
      buildManualGroceryItemId(weeklyPlanId, parsed.ingredientKey),
      timestamp
    ),
    weeklyPlanId,
    ingredientKey: parsed.ingredientKey,
    label,
    quantityText: parsed.quantityText ?? existingManual?.quantityText,
    aisle: existingManual?.aisle ?? existingDerived?.aisle ?? inferAisle(label),
    checked: existingManual?.checked ?? existingDerived?.checked ?? false,
    excluded: existingManual?.excluded ?? existingDerived?.excluded ?? false,
    onHand: existingManual?.onHand ?? existingDerived?.onHand ?? false,
  };
}

function combineQuantityTexts(...texts: Array<string | undefined>): string | undefined {
  const unique = [...new Set(texts.map((text) => text?.trim()).filter(Boolean) as string[])];
  return unique.length ? unique.join(' + ') : undefined;
}

export function buildMergedGroceryItem(
  weeklyPlanId: string,
  ingredientKey: string,
  derivedItem?: DerivedGroceryItem,
  manualItem?: ManualGroceryItem
): GroceryItem | null {
  const base = manualItem ?? derivedItem;
  if (!base) {
    return null;
  }

  return {
    id: buildGroceryItemId(weeklyPlanId, ingredientKey),
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    weeklyPlanId,
    ingredientKey,
    label: manualItem?.label ?? derivedItem?.label ?? '',
    quantityText: combineQuantityTexts(derivedItem?.quantityText, manualItem?.quantityText),
    manual: Boolean(manualItem),
    aisle: manualItem?.aisle ?? derivedItem?.aisle ?? 'Other',
    checked: manualItem?.checked ?? derivedItem?.checked ?? false,
    excluded: manualItem?.excluded ?? derivedItem?.excluded ?? false,
    onHand: manualItem?.onHand ?? derivedItem?.onHand ?? false,
    sourceRecipeIds: derivedItem?.sourceRecipeIds ?? [],
  };
}

export function buildMergedWeeklyGroceries(
  weeklyPlanId: string,
  derivedItems: DerivedGroceryItem[],
  manualItems: ManualGroceryItem[]
): GroceryItem[] {
  const keys = new Set([
    ...derivedItems.map((item) => item.ingredientKey),
    ...manualItems.map((item) => item.ingredientKey),
  ]);

  return [...keys]
    .map((ingredientKey) =>
      buildMergedGroceryItem(
        weeklyPlanId,
        ingredientKey,
        derivedItems.find((item) => item.ingredientKey === ingredientKey),
        manualItems.find((item) => item.ingredientKey === ingredientKey)
      )
    )
    .filter((item): item is GroceryItem => Boolean(item))
    .sort(
      (left, right) =>
        (left.aisle ?? 'Other').localeCompare(right.aisle ?? 'Other') ||
        left.label.localeCompare(right.label)
    );
}

export function parseMergedGroceryItemId(itemId: string): {
  weeklyPlanId: string;
  ingredientKey: string;
} {
  const prefix = 'grocery:';
  if (!itemId.startsWith(prefix)) {
    throw new Error('Grocery item not found');
  }

  const rest = itemId.slice(prefix.length);
  const separatorIndex = rest.indexOf(':');
  if (separatorIndex < 0) {
    throw new Error('Grocery item not found');
  }

  return {
    weeklyPlanId: rest.slice(0, separatorIndex),
    ingredientKey: rest.slice(separatorIndex + 1),
  };
}

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
      ...updateRecordMeta(existing, buildDerivedGroceryItemId(weeklyPlanId, ingredientKey), timestamp),
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
