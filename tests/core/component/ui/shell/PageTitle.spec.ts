import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { APP_ROUTES, documentTitleFor } from '$lib/core/ui/shell/navigation';
import { resetHealthDb } from '$lib/core/db/client';
import TodayPage from '../../../../../src/routes/today/+page.svelte';
import ReviewPage from '../../../../../src/routes/review/+page.svelte';

describe('page titles', () => {
	beforeEach(async () => {
		await resetHealthDb();
	});

	it('keeps route titles unique', () => {
		const titles = APP_ROUTES.map((route) => documentTitleFor(route.title));
		expect(new Set(titles).size).toBe(titles.length);
	});

	it('uses the Personal Health Cockpit prefix', () => {
		expect(documentTitleFor('Today')).toBe('Personal Health Cockpit · Today');
	});

	it('applies route page titles when rendered', () => {
		render(TodayPage);
		expect(document.title).toBe('Personal Health Cockpit · Today');

		render(ReviewPage);
		expect(document.title).toBe('Personal Health Cockpit · Review');
	});
});
