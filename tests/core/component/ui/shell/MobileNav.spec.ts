import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MobileNav from '$lib/core/ui/shell/MobileNav.svelte';

describe('MobileNav', () => {
	it('renders the locked mobile navigation items', async () => {
		render(MobileNav);

		expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Today' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Review' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'More' })).toBeTruthy();
	});
});
