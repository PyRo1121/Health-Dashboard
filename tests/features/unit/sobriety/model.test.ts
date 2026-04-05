import { describe, expect, it } from 'vitest';
import type { SobrietyEvent } from '$lib/core/domain/types';
import { createSobrietyEventRows, formatSobrietyStreak } from '$lib/features/sobriety/model';

describe('sobriety model', () => {
  it('formats streaks and event rows', () => {
    const events = createSobrietyEventRows([
      {
        id: 'sobriety:craving:1',
        createdAt: '2026-04-02T12:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
        localDay: '2026-04-02',
        eventType: 'craving',
        cravingScore: 4,
        note: 'Stress spike after lunch.',
      } satisfies SobrietyEvent,
    ]);

    expect(formatSobrietyStreak(1)).toBe('1 day');
    expect(formatSobrietyStreak(2)).toBe('2 days');
    expect(events[0]).toMatchObject({
      title: 'craving',
      lines: ['Stress spike after lunch.'],
      badge: '4/5',
    });
  });
});
