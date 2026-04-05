import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { DESKTOP_NAV_ROUTES } from '$lib/core/ui/shell/navigation';
import SideNav from '$lib/core/ui/shell/SideNav.svelte';

describe('SideNav', () => {
  it('renders the desktop navigation from route metadata in order', async () => {
    render(SideNav);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());

    expect(labels).toEqual(DESKTOP_NAV_ROUTES.map((route) => route.label));
  });
});
