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
  post: postJson,
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

export interface FeatureRequestClient {
  request<Result>(body: unknown, runTest: (db: HealthDatabase) => Promise<Result>): Promise<Result>;
}

type FeatureActionExtras = Record<string, unknown>;

export interface FeatureActionClient extends FeatureRequestClient {
  action<Result>(
    action: string,
    runTest: (db: HealthDatabase) => Promise<Result>,
    extra?: FeatureActionExtras
  ): Promise<Result>;
  stateAction<State, Result>(
    action: string,
    state: State,
    runTest: (db: HealthDatabase) => Promise<Result>,
    extra?: FeatureActionExtras
  ): Promise<Result>;
}

export function createFeatureRequestClient(
  endpoint: string,
  deps: FeatureClientDeps = defaultFeatureClientDeps
): FeatureRequestClient {
  return {
    request: async <Result>(
      body: unknown,
      runTest: (db: HealthDatabase) => Promise<Result>
    ): Promise<Result> => await postFeatureRequest(endpoint, body, runTest, deps),
  };
}

export function createFeatureActionClient(
  endpoint: string,
  deps: FeatureClientDeps = defaultFeatureClientDeps
): FeatureActionClient {
  const requestClient = createFeatureRequestClient(endpoint, deps);

  return {
    request: requestClient.request,
    action: async <Result>(
      action: string,
      runTest: (db: HealthDatabase) => Promise<Result>,
      extra: FeatureActionExtras = {}
    ): Promise<Result> =>
      await postFeatureRequest(
        endpoint,
        {
          action,
          ...extra,
        },
        runTest,
        deps
      ),
    stateAction: async <State, Result>(
      action: string,
      state: State,
      runTest: (db: HealthDatabase) => Promise<Result>,
      extra: FeatureActionExtras = {}
    ): Promise<Result> =>
      await postFeatureRequest(
        endpoint,
        {
          action,
          state,
          ...extra,
        },
        runTest,
        deps
      ),
  };
}
