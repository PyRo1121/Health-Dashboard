export function toSafeExternalHref(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeSafeExternalUrl(url: string | undefined | null): string | undefined {
  return toSafeExternalHref(url) ?? undefined;
}
