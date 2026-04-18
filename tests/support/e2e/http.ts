import type { APIRequestContext } from '@playwright/test';

export const TEST_RESET_TOKEN = 'codex-e2e';
export const TEST_CONTROL_PLANE_TOKEN = 'codex-e2e';

export const resetHeaders = {
  'x-health-reset-token': TEST_RESET_TOKEN,
};

export const migrationHeaders = {
  'x-health-control-token': TEST_CONTROL_PLANE_TOKEN,
};

type PostOptions = NonNullable<Parameters<APIRequestContext['post']>[1]>;

export async function resetDb(request: Pick<APIRequestContext, 'post'>) {
  return await request.post('/api/test/reset-db', { headers: resetHeaders });
}

export async function postMigrationSnapshot(
  request: Pick<APIRequestContext, 'post'>,
  options: PostOptions
) {
  return await request.post('/api/db/migrate', {
    ...options,
    headers: {
      ...migrationHeaders,
      ...(options.headers ?? {}),
    },
  });
}
