import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FieldHost from './FieldHost.svelte';

describe('Field primitive', () => {
	it('renders a slotted control and optional hint', () => {
		render(FieldHost);

		expect(screen.getByText('Owner full name')).toBeTruthy();
		expect(screen.getByLabelText('Owner full name')).toBeTruthy();
		expect(screen.getByText('Used for SMART identity matching.')).toBeTruthy();
	});
});
