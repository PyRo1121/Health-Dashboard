export function toLocalDay(value: Date | string, timeZone = 'UTC'): string {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function resolvedTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function nowIso(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function currentLocalDay(
  value: Date | string = new Date(),
  timeZone = resolvedTimeZone()
): string {
  return toLocalDay(value, timeZone);
}
