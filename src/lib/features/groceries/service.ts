import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
  DerivedGroceryItem,
  GroceryItem,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
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
  'bottle',
  'bottles',
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

function buildGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `grocery:${weeklyPlanId}:${ingredientKey}`;
}

function buildDerivedGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `derived-grocery:${weeklyPlanId}:${ingredientKey}`;
}

function buildManualGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `manual-grocery:${weeklyPlanId}:${ingredientKey}`;
}

function combineQuantityTexts(...texts: Array<string | undefined>): string | undefined {
  const unique = [...new Set(texts.map((text) => text?.trim()).filter(Boolean) as string[])];
  return unique.length ? unique.join(' + ') : undefined;
}

function createMergedGroceryItem(
  weeklyPlanId: string,
  ingredientKey: string,
  derivedItem: DerivedGroceryItem | undefined,
  manualItem: ManualGroceryItem | undefined
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
    derivedQuantityText: derivedItem?.quantityText,
    manual: Boolean(manualItem),
    manualQuantityText: manualItem?.quantityText,
    aisle: manualItem?.aisle ?? derivedItem?.aisle,
    checked: manualItem?.checked ?? derivedItem?.checked ?? false,
    excluded: manualItem?.excluded ?? derivedItem?.excluded ?? false,
    onHand: manualItem?.onHand ?? derivedItem?.onHand ?? false,
    sourceRecipeIds: derivedItem?.sourceRecipeIds ?? [],
  };
}

async function listDerivedWeeklyGroceries(
  db: HealthDatabase,
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  return await db.derivedGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function listManualWeeklyGroceries(
  db: HealthDatabase,
  weeklyPlanId: string
): Promise<ManualGroceryItem[]> {
  return await db.manualGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

export async function listMergedWeeklyGroceries(
  db: HealthDatabase,
  weeklyPlanId: string
): Promise<GroceryItem[]> {
  const [derivedItems, manualItems] = await Promise.all([
    listDerivedWeeklyGroceries(db, weeklyPlanId),
    listManualWeeklyGroceries(db, weeklyPlanId),
  ]);

  const ingredientKeys = new Set([
    ...derivedItems.map((item) => item.ingredientKey),
    ...manualItems.map((item) => item.ingredientKey),
  ]);

  return [...ingredientKeys]
    .map((ingredientKey) =>
      createMergedGroceryItem(
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

function parseMergedGroceryItemId(itemId: string): { weeklyPlanId: string; ingredientKey: string } {
  const prefix = 'grocery:';
  if (!itemId.startsWith(prefix)) {
    throw new Error('Grocery item not found');
  }

  const rest = itemId.slice(prefix.length);
  const delimiterIndex = rest.indexOf(':');
  if (delimiterIndex < 0) {
    throw new Error('Grocery item not found');
  }

  return {
    weeklyPlanId: rest.slice(0, delimiterIndex),
    ingredientKey: rest.slice(delimiterIndex + 1),
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
    listDerivedWeeklyGroceries(db, weeklyPlanId),
  ]);
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const existingByKey = new Map(existingItems.map((item) => [item.ingredientKey, item]));
  const manualItems = await listManualWeeklyGroceries(db, weeklyPlanId);
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
    const existing = existingByKey.get(ingredientKey);
    const manual = manualByKey.get(ingredientKey);
    const derivedQuantityText = item.quantityParts.join(' + ') || undefined;
    const groceryItem: DerivedGroceryItem = {
      ...updateRecordMeta(
        existing,
        buildDerivedGroceryItemId(weeklyPlanId, ingredientKey),
        timestamp
      ),
      weeklyPlanId,
      ingredientKey,
      label: item.label,
      quantityText: derivedQuantityText,
      aisle: inferAisle(item.label),
      checked: existing?.checked ?? manual?.checked ?? false,
      excluded: existing?.excluded ?? manual?.excluded ?? false,
      onHand: existing?.onHand ?? manual?.onHand ?? false,
      sourceRecipeIds: item.sourceRecipeIds,
    };

    return groceryItem;
  });

  for (const item of nextItems) {
    await db.derivedGroceryItems.put(item);
  }
  for (const staleItem of existingItems) {
    if (!nextItems.find((item) => item.id === staleItem.id)) {
      await db.derivedGroceryItems.delete(staleItem.id);
    }
  }

  return {
    items: await listMergedWeeklyGroceries(db, weeklyPlanId),
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
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [derivedItem, manualItem] = await Promise.all([
    db.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, ingredientKey)),
    db.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, ingredientKey)),
  ]);

  if (!derivedItem && !manualItem) {
    throw new Error('Grocery item not found');
  }

  if (derivedItem) {
    await db.derivedGroceryItems.put({
      ...derivedItem,
      ...updateRecordMeta(derivedItem, derivedItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }

  if (manualItem) {
    await db.manualGroceryItems.put({
      ...manualItem,
      ...updateRecordMeta(manualItem, manualItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }

  const merged = createMergedGroceryItem(
    weeklyPlanId,
    ingredientKey,
    derivedItem
      ? {
          ...derivedItem,
          checked: patch.checked,
          excluded: patch.excluded,
          onHand: patch.onHand,
        }
      : undefined,
    manualItem
      ? {
          ...manualItem,
          checked: patch.checked,
          excluded: patch.excluded,
          onHand: patch.onHand,
        }
      : undefined
  );
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function saveManualGroceryItem(
  db: HealthDatabase,
  weeklyPlanId: string,
  input: { rawLabel: string }
): Promise<GroceryItem> {
  const parsed = parseIngredientLine(input.rawLabel);
  if (!parsed.ingredientKey || !parsed.label) {
    throw new Error('Manual grocery label is required');
  }

  const [existingManual, existingDerived] = await Promise.all([
    db.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, parsed.ingredientKey)),
    db.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, parsed.ingredientKey)),
  ]);

  const label = existingManual?.label ?? existingDerived?.label ?? parsed.label;
  const item: ManualGroceryItem = {
    ...updateRecordMeta(
      existingManual,
      buildManualGroceryItemId(weeklyPlanId, parsed.ingredientKey)
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

  await db.manualGroceryItems.put(item);
  const merged = createMergedGroceryItem(weeklyPlanId, parsed.ingredientKey, existingDerived, item);
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function removeManualGroceryItem(
  db: HealthDatabase,
  itemId: string
): Promise<GroceryItem | null> {
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [manualItem, derivedItem] = await Promise.all([
    db.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, ingredientKey)),
    db.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, ingredientKey)),
  ]);

  if (!manualItem) {
    throw new Error('Grocery item not found');
  }

  if (!derivedItem) {
    await db.manualGroceryItems.delete(manualItem.id);
    return null;
  }

  await db.manualGroceryItems.delete(manualItem.id);
  return createMergedGroceryItem(weeklyPlanId, ingredientKey, derivedItem, undefined);
}
