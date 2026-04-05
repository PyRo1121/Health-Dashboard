import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';

export interface GroceryGroup {
  aisle: string;
  items: GroceryItem[];
}

export function createGrocerySummary(item: GroceryItem): string {
  const badges = [
    item.quantityText,
    item.onHand ? 'On hand' : '',
    item.excluded ? 'Excluded' : '',
    item.checked ? 'Checked' : '',
  ].filter(Boolean);

  return [item.aisle, ...badges].filter(Boolean).join(' · ');
}

export function createGroceryGroups(items: GroceryItem[]): GroceryGroup[] {
  const groups = new Map<string, GroceryItem[]>();

  for (const item of items) {
    const aisle = item.aisle ?? 'Other';
    const current = groups.get(aisle) ?? [];
    current.push(item);
    groups.set(aisle, current);
  }

  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([aisle, groupedItems]) => ({
      aisle,
      items: [...groupedItems].sort((left, right) => left.label.localeCompare(right.label)),
    }));
}

export function createRecipeSourceSummary(item: GroceryItem, recipes: RecipeCatalogItem[]): string {
  const titles = item.sourceRecipeIds
    .map((recipeId) => recipes.find((candidate) => candidate.id === recipeId)?.title)
    .filter(Boolean) as string[];

  return titles.join(', ');
}
