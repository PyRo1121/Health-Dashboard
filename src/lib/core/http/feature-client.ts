import { postJson } from './client';

export interface FeatureClientDeps<TestStore = unknown> {
  inTestMode: () => boolean;
  getTestDb: () => Promise<TestStore>;
  post: <Result>(endpoint: string, body: unknown) => Promise<Result>;
}

let featureTestDbLoader: (() => Promise<unknown>) | null = null;

export function configureFeatureClientTestDb(loader: () => Promise<unknown>): void {
  featureTestDbLoader = loader;
}

export function resetFeatureClientTestDb(): void {
  featureTestDbLoader = null;
}

function requireFeatureTestDb(): Promise<unknown> {
  if (!featureTestDbLoader) {
    throw new Error('Feature test DB is not configured for test mode');
  }

  return featureTestDbLoader();
}

function defaultInTestMode(): boolean {
  if (featureTestDbLoader) {
    return true;
  }

  const mode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE;
  if (typeof mode === 'string' && mode.startsWith('test')) {
    return true;
  }

  const argv = typeof process !== 'undefined' && Array.isArray(process.argv) ? process.argv : [];
  if (argv.some((value) => value === 'test' || /\.test\.[cm]?[jt]sx?$/.test(value))) {
    return true;
  }

  const maybeTestGlobals = globalThis as { describe?: unknown; it?: unknown; expect?: unknown };
  return (
    typeof maybeTestGlobals.describe === 'function' &&
    typeof maybeTestGlobals.it === 'function' &&
    typeof maybeTestGlobals.expect === 'function'
  );
}

const defaultFeatureClientDeps: FeatureClientDeps<unknown> = {
  inTestMode: () => defaultInTestMode(),
  getTestDb: () => requireFeatureTestDb(),
  post: postJson,
};

export async function runFeatureMode<TestStore, Result>(
  runTest: (db: TestStore) => Promise<Result>,
  runApi: () => Promise<Result>,
  deps: FeatureClientDeps<TestStore> = defaultFeatureClientDeps as FeatureClientDeps<TestStore>
): Promise<Result> {
  if (deps.inTestMode()) {
    return await runTest(await deps.getTestDb());
  }

  return await runApi();
}

export async function postFeatureRequest<TestStore, Result>(
  endpoint: string,
  body: unknown,
  runTest: (db: TestStore) => Promise<Result>,
  deps: FeatureClientDeps<TestStore> = defaultFeatureClientDeps as FeatureClientDeps<TestStore>
): Promise<Result> {
  return await runFeatureMode(runTest, () => deps.post<Result>(endpoint, body), deps);
}

export interface FeatureRequestClient<TestStore> {
  request<Result>(body: unknown, runTest: (db: TestStore) => Promise<Result>): Promise<Result>;
}

type FeatureActionExtras = Record<string, unknown>;

export interface FeatureActionClient<TestStore> extends FeatureRequestClient<TestStore> {
  action<Result>(
    action: string,
    runTest: (db: TestStore) => Promise<Result>,
    extra?: FeatureActionExtras
  ): Promise<Result>;
  stateAction<State, Result>(
    action: string,
    state: State,
    runTest: (db: TestStore) => Promise<Result>,
    extra?: FeatureActionExtras
  ): Promise<Result>;
}

export function createFeatureRequestClient<TestStore = unknown>(
  endpoint: string,
  deps: FeatureClientDeps<TestStore> = defaultFeatureClientDeps as FeatureClientDeps<TestStore>
): FeatureRequestClient<TestStore> {
  return {
    request: async <Result>(
      body: unknown,
      runTest: (db: TestStore) => Promise<Result>
    ): Promise<Result> => await postFeatureRequest(endpoint, body, runTest, deps),
  };
}

export function createFeatureActionClient<TestStore = unknown>(
  endpoint: string,
  deps: FeatureClientDeps<TestStore> = defaultFeatureClientDeps as FeatureClientDeps<TestStore>
): FeatureActionClient<TestStore> {
  const requestClient = createFeatureRequestClient(endpoint, deps);

  return {
    request: requestClient.request,
    action: async <Result>(
      action: string,
      runTest: (db: TestStore) => Promise<Result>,
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
      runTest: (db: TestStore) => Promise<Result>,
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
