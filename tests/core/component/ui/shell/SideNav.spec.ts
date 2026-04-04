import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SideNav from '$lib/core/ui/shell/SideNav.svelte';

describe('SideNav', () => {
	it('renders the desktop navigation in the expected order', async () => {
		render(SideNav);

		expect(screen.getByRole('link', { name: 'Today' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Journal' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Review' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
	});
});
