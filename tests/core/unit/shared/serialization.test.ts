import { describe, expect, it } from 'vitest';
import { deserializeFromStorage, serializeForStorage } from '$lib/core/shared/serialization';

describe('serialization helpers', () => {
  it('round-trips records without mutating the original object', () => {
    const original = {
      id: 'daily-1',
      localDay: '2026-04-02',
      nested: { mood: 4 },
    };

    const serialized = serializeForStorage(original);
    const deserialized = deserializeFromStorage(serialized);

    expect(deserialized).toEqual(original);
    expect(deserialized).not.toBe(original);
    expect(deserialized.nested).not.toBe(original.nested);
  });
});
