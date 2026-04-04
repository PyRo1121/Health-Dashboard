import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AppShell from '$lib/core/ui/shell/AppShell.svelte';

describe('AppShell', () => {
	it('renders primary navigation and main landmark', async () => {
		render(AppShell);

		expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy();
		expect(screen.getByRole('main', { name: 'Main content' })).toBeTruthy();
	});
});
