import { describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';
import {
	postFeatureRequest,
	runFeatureMode,
	type FeatureClientDeps
} from '$lib/core/http/feature-client';

function createDeps(overrides: Partial<FeatureClientDeps> = {}): FeatureClientDeps {
	const defaultPostSpy = vi.fn(async (...args: [string, unknown]) => {
		void args;
		return { ok: true };
	});

	return {
		inTestMode: () => false,
		getDb: async () => ({}) as HealthDatabase,
		post: async <Result>(endpoint: string, body: unknown) =>
			(await defaultPostSpy(endpoint, body)) as Result,
		...overrides
	};
}

describe('feature client helpers', () => {
	it('runs the test branch with the resolved db in test mode', async () => {
		const db = { name: 'test-db' } as unknown as HealthDatabase;
		const getDb = vi.fn(async () => db);
		const apiRunner = vi.fn(async () => 'api-result');

		const result = await runFeatureMode(
			async (loadedDb) => {
				expect(loadedDb).toBe(db);
				return 'test-result';
			},
			apiRunner,
			createDeps({
				inTestMode: () => true,
				getDb
			})
		);

		expect(result).toBe('test-result');
		expect(getDb).toHaveBeenCalledOnce();
		expect(apiRunner).not.toHaveBeenCalled();
	});

	it('runs the api branch without opening the test db outside test mode', async () => {
		const getDb = vi.fn(async () => ({}) as HealthDatabase);

		const result = await runFeatureMode(
			async () => 'test-result',
			async () => 'api-result',
			createDeps({
				getDb
			})
		);

		expect(result).toBe('api-result');
		expect(getDb).not.toHaveBeenCalled();
	});

	it('posts the provided request body when using the shared request helper', async () => {
		const postSpy = vi.fn(async (...args: [string, unknown]) => {
			void args;
			return { snapshot: true };
		});

		const result = await postFeatureRequest(
			'/api/health',
			{ action: 'load', localDay: '2026-04-02' },
			async () => ({ snapshot: false }),
			createDeps({
				post: async <Result>(endpoint: string, body: unknown) =>
					(await postSpy(endpoint, body)) as Result
			})
		);

		expect(result).toEqual({ snapshot: true });
		expect(postSpy).toHaveBeenCalledWith('/api/health', {
			action: 'load',
			localDay: '2026-04-02'
		});
	});
});
