import { describe, expect, it } from 'vitest';
import { APP_ROUTES, documentTitleFor } from '$lib/core/ui/shell/navigation';

describe('page titles', () => {
  it('keeps route titles unique', () => {
    const titles = APP_ROUTES.map((route) => documentTitleFor(route.title));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('uses the Personal Health Cockpit prefix', () => {
    expect(documentTitleFor('Today')).toBe('Personal Health Cockpit · Today');
  });

  it('applies the prefix to every registered route title', () => {
    expect(
      APP_ROUTES.every((route) =>
        documentTitleFor(route.title).startsWith('Personal Health Cockpit · ')
      )
    ).toBe(true);
  });
});
