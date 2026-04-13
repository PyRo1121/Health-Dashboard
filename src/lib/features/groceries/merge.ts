import type { DerivedGroceryItem, GroceryItem, ManualGroceryItem } from '$lib/core/domain/types';

function buildGroceryItemId(weeklyPlanId: string, ingredientKey: string): string {
  return `grocery:${weeklyPlanId}:${ingredientKey}`;
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
