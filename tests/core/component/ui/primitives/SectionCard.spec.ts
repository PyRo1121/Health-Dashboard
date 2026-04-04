import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SectionCardHost from './SectionCardHost.svelte';

describe('SectionCard', () => {
	it('renders a title, optional intro, and slotted content', () => {
		render(SectionCardHost);

		expect(screen.getByRole('heading', { name: 'Clinical owner profile' })).toBeTruthy();
		expect(screen.getByText('Single-user mode.')).toBeTruthy();
		expect(screen.getByText('Inner content')).toBeTruthy();
	});
});
