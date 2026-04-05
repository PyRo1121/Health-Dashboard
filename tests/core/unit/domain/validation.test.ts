import { describe, expect, it } from 'vitest';
import { clampScore, isValidLocalDay, validateConfidence } from '$lib/core/domain/validation';

describe('validation helpers', () => {
  it('clamps scores to the expected range', () => {
    expect(clampScore(-2)).toBe(0);
    expect(clampScore(3)).toBe(3);
    expect(clampScore(9)).toBe(5);
  });

  it('validates local day strings', () => {
    expect(isValidLocalDay('2026-04-02')).toBe(true);
    expect(isValidLocalDay('04/02/2026')).toBe(false);
    expect(isValidLocalDay('2026-4-2')).toBe(false);
  });

  it('validates confidence as a 0..1 number', () => {
    expect(validateConfidence(0)).toBe(true);
    expect(validateConfidence(0.5)).toBe(true);
    expect(validateConfidence(1)).toBe(true);
    expect(validateConfidence(-0.1)).toBe(false);
    expect(validateConfidence(1.1)).toBe(false);
  });
});
