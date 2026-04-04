import { json, type RequestHandler } from '@sveltejs/kit';
import type { HealthDatabase } from '$lib/core/db/types';

type ActionRequest = { action: string };

export type DbActionHandlers<RequestBody extends ActionRequest, Result> = {
	[Action in RequestBody['action']]: (
		db: HealthDatabase,
		body: Extract<RequestBody, { action: Action }>
	) => Promise<Result>;
};

export interface DbActionRouteDeps {
	withDb: <Result>(run: (db: HealthDatabase) => Promise<Result>) => Promise<Result>;
	toResponse: (body: unknown) => Response;
}

const defaultDbActionRouteDeps: DbActionRouteDeps = {
	withDb: async <Result>(run: (db: HealthDatabase) => Promise<Result>) => {
		const { withServerHealthDb } = await import('$lib/server/db/client');
		return await withServerHealthDb(run);
	},
	toResponse: (body) => json(body)
};

export async function dispatchDbAction<RequestBody extends ActionRequest, Result>(
	db: HealthDatabase,
	body: RequestBody,
	handlers: DbActionHandlers<RequestBody, Result>
): Promise<Result> {
	const action = body.action as RequestBody['action'];
	const handler = handlers[action] as
		| ((db: HealthDatabase, body: RequestBody) => Promise<Result>)
		| undefined;

	if (!handler) {
		throw new Error(`Unhandled action: ${body.action}`);
	}

	return await handler(db, body);
}

export function createDbActionPostHandler<RequestBody extends ActionRequest, Result>(
	handlers: DbActionHandlers<RequestBody, Result>,
	deps: DbActionRouteDeps = defaultDbActionRouteDeps
): RequestHandler {
	return async ({ request }) => {
		const body = (await request.json()) as RequestBody;
		const result = await deps.withDb((db) => dispatchDbAction(db, body, handlers));
		return deps.toResponse(result);
	};
}
