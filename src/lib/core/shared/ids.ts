export function createRecordId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
