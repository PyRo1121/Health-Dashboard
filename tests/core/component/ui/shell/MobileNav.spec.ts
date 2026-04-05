import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { MOBILE_NAV_ROUTES } from '$lib/core/ui/shell/navigation';
import MobileNav from '$lib/core/ui/shell/MobileNav.svelte';

describe('MobileNav', () => {
  it('renders the mobile navigation from route metadata in order', async () => {
    render(MobileNav);

    const nav = screen.getByRole('navigation', { name: 'Mobile' });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());

    expect(labels).toEqual(MOBILE_NAV_ROUTES.map((route) => route.label));
  });
});
