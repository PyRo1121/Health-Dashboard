import type { HealthDbDerivedGroceryItemsStore, HealthDbManualGroceryItemsStore, HealthDbPlanSlotsStore } from '$lib/core/db/types';
import type {
  DerivedGroceryItem,
  GroceryItem,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import { sortPlanSlots } from '$lib/core/shared/plan-slots';
import { updateRecordMeta } from '$lib/core/shared/records';
import { listRecipeCatalogItems, type RecipeCatalogItemsStore } from '$lib/features/nutrition/store';
import {
  buildDerivedGroceryItemId,
  buildManualGroceryItemId,
  buildMergedGroceryItem,
  buildMergedWeeklyGroceries,
  deriveWeeklyGroceriesFromData,
  inferAisle,
  parseIngredientLine,
  parseMergedGroceryItemId,
  type WeeklyGroceriesDerivationResult,
} from './derivation';

export type DerivedGroceriesStore = HealthDbDerivedGroceryItemsStore;

export type ManualGroceriesStore = HealthDbManualGroceryItemsStore;

export interface GroceryItemsStore extends DerivedGroceriesStore, ManualGroceriesStore {}

export interface GroceryPlanningStore extends GroceryItemsStore, HealthDbPlanSlotsStore {}

export interface GroceryServiceStore extends GroceryPlanningStore, RecipeCatalogItemsStore {}

async function listDerivedGroceries(
  store: DerivedGroceriesStore,
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  return await store.derivedGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function listManualGroceries(
  store: ManualGroceriesStore,
  weeklyPlanId: string
): Promise<ManualGroceryItem[]> {
  return await store.manualGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

export async function listMergedWeeklyGroceries(
  store: GroceryItemsStore,
  weeklyPlanId: string
): Promise<GroceryItem[]> {
  const [derivedItems, manualItems] = await Promise.all([
    listDerivedGroceries(store, weeklyPlanId),
    listManualGroceries(store, weeklyPlanId),
  ]);

  return buildMergedWeeklyGroceries(weeklyPlanId, derivedItems, manualItems);
}

async function listWeeklyPlanSlotsForGroceries(
  store: GroceryPlanningStore,
  weeklyPlanId: string
): Promise<PlanSlot[]> {
  return sortPlanSlots(await store.planSlots.where('weeklyPlanId').equals(weeklyPlanId).toArray());
}

export type { WeeklyGroceriesDerivationResult } from './derivation';

export async function deriveWeeklyGroceriesWithWarnings(
  store: GroceryServiceStore,
  weeklyPlanId: string,
  recipesInput?: RecipeCatalogItem[]
): Promise<WeeklyGroceriesDerivationResult> {
  const [slots, recipes, existingDerivedItems, manualItems] = await Promise.all([
    listWeeklyPlanSlotsForGroceries(store, weeklyPlanId),
    Promise.resolve(recipesInput ?? listRecipeCatalogItems(store)),
    listDerivedGroceries(store, weeklyPlanId),
    listManualGroceries(store, weeklyPlanId),
  ]);

  const result = deriveWeeklyGroceriesFromData({
    weeklyPlanId,
    slots,
    recipes,
    existingDerivedItems,
    manualItems,
  });

  for (const item of result.derivedItems) {
    await store.derivedGroceryItems.put(item);
  }
  for (const staleItem of existingDerivedItems) {
    if (!result.derivedItems.find((item) => item.id === staleItem.id)) {
      await store.derivedGroceryItems.delete(staleItem.id);
    }
  }

  return result;
}

export async function deriveWeeklyGroceries(
  store: GroceryServiceStore,
  weeklyPlanId: string
): Promise<GroceryItem[]> {
  return (await deriveWeeklyGroceriesWithWarnings(store, weeklyPlanId)).items;
}

export async function setGroceryItemState(
  store: GroceryItemsStore,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<GroceryItem> {
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [derivedItem, manualItem] = await Promise.all([
    store.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, ingredientKey)),
    store.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, ingredientKey)),
  ]);
  if (!derivedItem && !manualItem) {
    throw new Error('Grocery item not found');
  }

  if (derivedItem) {
    await store.derivedGroceryItems.put({
      ...derivedItem,
      ...updateRecordMeta(derivedItem, derivedItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }
  if (manualItem) {
    await store.manualGroceryItems.put({
      ...manualItem,
      ...updateRecordMeta(manualItem, manualItem.id),
      checked: patch.checked,
      excluded: patch.excluded,
      onHand: patch.onHand,
    });
  }

  const merged = buildMergedGroceryItem(
    weeklyPlanId,
    ingredientKey,
    derivedItem
      ? { ...derivedItem, checked: patch.checked, excluded: patch.excluded, onHand: patch.onHand }
      : undefined,
    manualItem
      ? { ...manualItem, checked: patch.checked, excluded: patch.excluded, onHand: patch.onHand }
      : undefined
  );
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function saveManualGroceryItem(
  store: GroceryItemsStore,
  weeklyPlanId: string,
  input: { rawLabel: string }
): Promise<GroceryItem> {
  const parsed = parseIngredientLine(input.rawLabel);
  if (!parsed.ingredientKey || !parsed.label) {
    throw new Error('Manual grocery label is required');
  }

  const [existingManual, existingDerived] = await Promise.all([
    store.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, parsed.ingredientKey)),
    store.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, parsed.ingredientKey)),
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

  await store.manualGroceryItems.put(item);
  const merged = buildMergedGroceryItem(weeklyPlanId, parsed.ingredientKey, existingDerived, item);
  if (!merged) {
    throw new Error('Grocery item not found');
  }
  return merged;
}

export async function removeManualGroceryItem(
  store: GroceryItemsStore,
  itemId: string
): Promise<GroceryItem | null> {
  const { weeklyPlanId, ingredientKey } = parseMergedGroceryItemId(itemId);
  const [manualItem, derivedItem] = await Promise.all([
    store.manualGroceryItems.get(buildManualGroceryItemId(weeklyPlanId, ingredientKey)),
    store.derivedGroceryItems.get(buildDerivedGroceryItemId(weeklyPlanId, ingredientKey)),
  ]);
  if (!manualItem) {
    throw new Error('Grocery item not found');
  }

  if (!derivedItem) {
    await store.manualGroceryItems.delete(manualItem.id);
    return null;
  }

  await store.manualGroceryItems.delete(manualItem.id);
  return buildMergedGroceryItem(weeklyPlanId, ingredientKey, derivedItem);
}
