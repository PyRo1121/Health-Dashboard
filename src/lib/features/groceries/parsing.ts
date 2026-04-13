import { nowIso } from '$lib/core/domain/time';
import type { DerivedGroceryItem, ManualGroceryItem } from '$lib/core/domain/types';
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
