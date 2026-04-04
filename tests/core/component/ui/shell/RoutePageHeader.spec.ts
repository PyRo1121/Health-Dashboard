import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

describe('RoutePageHeader', () => {
	it('renders section metadata for a standard route', () => {
		render(RoutePageHeader, {
			props: {
				href: '/today'
			}
		});

		expect(screen.getByText('Daily Loop')).toBeTruthy();
		expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
		expect(document.title).toBe('Personal Health Cockpit · Today');
	});

	it('uses the custom overview heading while keeping the overview document title', () => {
		render(RoutePageHeader, {
			props: {
				href: '/'
			}
		});

		expect(screen.getByRole('heading', { name: 'Personal Health Cockpit' })).toBeTruthy();
		expect(document.title).toBe('Personal Health Cockpit · Overview');
	});
});
