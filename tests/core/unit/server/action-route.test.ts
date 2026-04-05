import { describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';
import {
  createDbPostHandler,
  createDbQueryPostHandler,
  createDbActionPostHandler,
  dispatchDbAction,
  type DbActionHandlers,
  type DbActionRouteOptions,
} from '$lib/server/http/action-route';

type TestRequest = { action: 'load'; id: string } | { action: 'save'; value: number };

describe('server action route helper', () => {
  it('dispatches the matching action handler with the db and parsed body', async () => {
    const db = {} as HealthDatabase;
    const load = vi.fn(async () => 0);
    const save = vi.fn(
      async (_db: HealthDatabase, body: Extract<TestRequest, { action: 'save' }>) => body.value * 2
    );
    const handlers: DbActionHandlers<TestRequest, number> = { load, save };

    const result = await dispatchDbAction<TestRequest, number>(
      db,
      { action: 'save', value: 4 },
      handlers
    );

    expect(result).toBe(8);
    expect(save).toHaveBeenCalledWith(db, { action: 'save', value: 4 });
    expect(load).not.toHaveBeenCalled();
  });

  it('creates a post handler that runs inside the db wrapper and serializes the result', async () => {
    const db = {} as HealthDatabase;
    const withDbSpy = vi.fn(
      async (run: (database: HealthDatabase) => Promise<unknown>) => await run(db)
    );
    const withDb = async <Result>(run: (database: HealthDatabase) => Promise<Result>) =>
      (await withDbSpy(run)) as Result;

    const handler = createDbActionPostHandler<TestRequest, { ok: boolean }>(
      {
        load: async (_db, body) => ({ ok: body.id === 'abc' }),
        save: async (_db, body) => ({ ok: body.value > 0 }),
      },
      {
        withDb,
        toResponse: (body) => Response.json(body),
      }
    );

    const response = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', id: 'abc' }),
      }),
    } as Parameters<typeof handler>[0]);

    expect(withDbSpy).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ ok: true });
  });

  it('supports custom request parsing and parse error mapping', async () => {
    const handler = createDbActionPostHandler<TestRequest, { ok: boolean }>(
      {
        load: async (_db, body) => ({ ok: body.id === 'abc' }),
        save: async (_db, body) => ({ ok: body.value > 0 }),
      },
      {
        withDb: async (run) => await run({} as HealthDatabase),
        toResponse: (body) => Response.json(body),
      },
      {
        parseBody: async (request) => {
          const body = (await request.json()) as { action?: string; id?: string };
          if (!body.action || !body.id) {
            throw new Error('bad request');
          }
          return { action: 'load', id: body.id };
        },
        onParseError: () => new Response('invalid', { status: 400 }),
      } satisfies DbActionRouteOptions<TestRequest>
    );

    const invalidResponse = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    } as Parameters<typeof handler>[0]);
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.text()).toBe('invalid');

    const validResponse = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', id: 'abc' }),
      }),
    } as Parameters<typeof handler>[0]);
    expect(await validResponse.json()).toEqual({ ok: true });
  });

  it('supports action error mapping', async () => {
    const handler = createDbActionPostHandler<TestRequest, { ok: boolean }>(
      {
        load: async () => {
          throw new Error('boom');
        },
        save: async () => ({ ok: true }),
      },
      {
        withDb: async (run) => await run({} as HealthDatabase),
        toResponse: (body) => Response.json(body),
      },
      {
        onActionError: (error) =>
          new Response(error instanceof Error ? error.message : 'bad', { status: 422 }),
      } satisfies DbActionRouteOptions<TestRequest>
    );

    const response = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', id: 'abc' }),
      }),
    } as Parameters<typeof handler>[0]);
    expect(response.status).toBe(422);
    expect(await response.text()).toBe('boom');
  });

  it('creates a generic db post handler that can read route params', async () => {
    const db = {} as HealthDatabase;
    const withDbSpy = vi.fn(
      async (run: (database: HealthDatabase) => Promise<unknown>) => await run(db)
    );
    const withDb = async <Result>(run: (database: HealthDatabase) => Promise<Result>) =>
      (await withDbSpy(run)) as Result;
    const handler = createDbPostHandler<void, { ok: boolean; slug: string }>(
      async (_db, _body, event) => ({ ok: true, slug: event.params.code ?? '' }),
      {
        withDb,
        toResponse: (body) => Response.json(body),
      },
      {
        parseBody: async () => undefined,
      }
    );

    const response = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
      }),
      params: { code: 'abc' },
    } as unknown as Parameters<typeof handler>[0]);

    expect(withDbSpy).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ ok: true, slug: 'abc' });
  });

  it('creates a query post handler that trims input and skips db work for blank queries', async () => {
    const withDbSpy = vi.fn(
      async (run: (database: HealthDatabase) => Promise<unknown>) => await run({} as HealthDatabase)
    );
    const withDb = async <Result>(run: (database: HealthDatabase) => Promise<Result>) =>
      (await withDbSpy(run)) as Result;
    const search = vi.fn(async (query: string) => [query]);
    const handler = createDbQueryPostHandler<{ query?: string }, string[]>(
      async (db, query) => {
        expect(db).toBeTruthy();
        return await search(query);
      },
      {
        withDb,
        toResponse: (body) => Response.json(body),
      },
      {
        emptyResult: [],
      }
    );

    const blankResponse = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({ query: '   ' }),
      }),
    } as Parameters<typeof handler>[0]);
    expect(await blankResponse.json()).toEqual([]);
    expect(withDbSpy).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();

    const filledResponse = await handler({
      request: new Request('http://health.test/api/example', {
        method: 'POST',
        body: JSON.stringify({ query: '  oats  ' }),
      }),
    } as Parameters<typeof handler>[0]);
    expect(await filledResponse.json()).toEqual(['oats']);
    expect(withDbSpy).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith('oats');
  });

  it('throws a clear error when the action is not registered', async () => {
    await expect(
      dispatchDbAction({} as HealthDatabase, { action: 'unknown' } as unknown as TestRequest, {
        load: async () => 'load-result',
        save: async () => 'save-result',
      })
    ).rejects.toThrow('Unhandled action: unknown');
  });
});
