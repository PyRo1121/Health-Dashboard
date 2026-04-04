import { describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';
import {
	createDbActionPostHandler,
	dispatchDbAction,
	type DbActionHandlers
} from '$lib/server/http/action-route';

type TestRequest =
	| { action: 'load'; id: string }
	| { action: 'save'; value: number };

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
		const withDbSpy = vi.fn(async (run: (database: HealthDatabase) => Promise<unknown>) => await run(db));
		const withDb = async <Result>(run: (database: HealthDatabase) => Promise<Result>) =>
			(await withDbSpy(run)) as Result;

		const handler = createDbActionPostHandler<TestRequest, { ok: boolean }>(
			{
				load: async (_db, body) => ({ ok: body.id === 'abc' }),
				save: async (_db, body) => ({ ok: body.value > 0 })
			},
			{
				withDb,
				toResponse: (body) => Response.json(body)
			}
		);

		const response = await handler({
			request: new Request('http://health.test/api/example', {
				method: 'POST',
				body: JSON.stringify({ action: 'load', id: 'abc' })
			})
		} as Parameters<typeof handler>[0]);

		expect(withDbSpy).toHaveBeenCalledOnce();
		expect(await response.json()).toEqual({ ok: true });
	});

	it('throws a clear error when the action is not registered', async () => {
		await expect(
			dispatchDbAction(
				{} as HealthDatabase,
				{ action: 'unknown' } as unknown as TestRequest,
				{
					load: async () => 'load-result',
					save: async () => 'save-result'
				}
			)
		).rejects.toThrow('Unhandled action: unknown');
	});
});
