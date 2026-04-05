import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import type { HealthDatabase } from '$lib/core/db/types';

type ActionRequest = { action: string };

export type DbActionHandlers<RequestBody extends ActionRequest, Result> = {
  [Action in RequestBody['action']]: (
    db: HealthDatabase,
    body: Extract<RequestBody, { action: Action }>
  ) => Promise<Result>;
};

export interface DbPostRouteDeps {
  withDb: <Result>(run: (db: HealthDatabase) => Promise<Result>) => Promise<Result>;
  toResponse: (body: unknown) => Response;
}

export interface DbPostRouteOptions<RequestBody> {
  parseBody?: (request: Request) => Promise<RequestBody>;
  onParseError?: (error: unknown) => Response;
  onActionError?: (error: unknown) => Response;
}

export type DbActionRouteDeps = DbPostRouteDeps;
export type DbActionRouteOptions<RequestBody extends ActionRequest> =
  DbPostRouteOptions<RequestBody>;

const defaultDbPostRouteDeps: DbPostRouteDeps = {
  withDb: async <Result>(run: (db: HealthDatabase) => Promise<Result>) => {
    const { withServerHealthDb } = await import('$lib/server/db/client');
    return await withServerHealthDb(run);
  },
  toResponse: (body) => json(body),
};

async function parseDbPostBody<RequestBody>(
  request: Request,
  options: DbPostRouteOptions<RequestBody>
): Promise<RequestBody> {
  return options.parseBody
    ? await options.parseBody(request)
    : ((await request.json()) as RequestBody);
}

function handleDbPostParseError<RequestBody>(
  error: unknown,
  options: DbPostRouteOptions<RequestBody>
): Response {
  if (options.onParseError) {
    return options.onParseError(error);
  }

  throw error;
}

function handleDbPostActionError<RequestBody>(
  error: unknown,
  options: DbPostRouteOptions<RequestBody>
): Response {
  if (options.onActionError) {
    return options.onActionError(error);
  }

  throw error;
}

export function createDbPostHandler<RequestBody, Result>(
  run: (db: HealthDatabase, body: RequestBody, event: RequestEvent) => Promise<Result>,
  deps: DbPostRouteDeps = defaultDbPostRouteDeps,
  options: DbPostRouteOptions<RequestBody> = {}
): RequestHandler {
  return async (event) => {
    let body: RequestBody;
    try {
      body = await parseDbPostBody(event.request, options);
    } catch (error) {
      return handleDbPostParseError(error, options);
    }

    try {
      const result = await deps.withDb((db) => run(db, body, event));
      return deps.toResponse(result);
    } catch (error) {
      return handleDbPostActionError(error, options);
    }
  };
}

export interface DbQueryPostRouteOptions<
  RequestBody extends { query?: string },
  Result,
> extends DbPostRouteOptions<RequestBody> {
  emptyResult: Result;
}

export function createDbQueryPostHandler<RequestBody extends { query?: string }, Result>(
  run: (
    db: HealthDatabase,
    query: string,
    body: RequestBody,
    event: RequestEvent
  ) => Promise<Result>,
  deps: DbPostRouteDeps = defaultDbPostRouteDeps,
  options: DbQueryPostRouteOptions<RequestBody, Result>
): RequestHandler {
  return async (event) => {
    let body: RequestBody;
    try {
      body = await parseDbPostBody(event.request, options);
    } catch (error) {
      return handleDbPostParseError(error, options);
    }

    const query = body.query?.trim() ?? '';
    if (!query) {
      return deps.toResponse(options.emptyResult);
    }

    try {
      const result = await deps.withDb((db) => run(db, query, body, event));
      return deps.toResponse(result);
    } catch (error) {
      return handleDbPostActionError(error, options);
    }
  };
}

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
  deps: DbActionRouteDeps = defaultDbPostRouteDeps,
  options: DbActionRouteOptions<RequestBody> = {}
): RequestHandler {
  return createDbPostHandler((db, body) => dispatchDbAction(db, body, handlers), deps, options);
}
