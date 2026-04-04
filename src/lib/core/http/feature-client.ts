import type { HealthDatabase } from '$lib/core/db/types';
import { postJson } from './client';

export interface FeatureClientDeps {
	inTestMode: () => boolean;
	getDb: () => Promise<HealthDatabase>;
	post: <Result>(endpoint: string, body: unknown) => Promise<Result>;
}

const defaultFeatureClientDeps: FeatureClientDeps = {
	inTestMode: () => import.meta.env.MODE.startsWith('test'),
	getDb: async () => {
		const { getHealthDb } = await import('$lib/core/db/client');
		return getHealthDb();
	},
	post: postJson
};

export async function runFeatureMode<Result>(
	runTest: (db: HealthDatabase) => Promise<Result>,
	runApi: () => Promise<Result>,
	deps: FeatureClientDeps = defaultFeatureClientDeps
): Promise<Result> {
	if (deps.inTestMode()) {
		return await runTest(await deps.getDb());
	}

	return await runApi();
}

export async function postFeatureRequest<Result>(
	endpoint: string,
	body: unknown,
	runTest: (db: HealthDatabase) => Promise<Result>,
	deps: FeatureClientDeps = defaultFeatureClientDeps
): Promise<Result> {
	return await runFeatureMode(runTest, () => deps.post<Result>(endpoint, body), deps);
}
