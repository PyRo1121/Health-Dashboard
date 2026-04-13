import type { RequestHandler } from '@sveltejs/kit';
import type { z } from 'zod';

type ActionRequest = { action: string };

type ActionHandlerMap<TRequest extends ActionRequest> = {
  [TAction in TRequest['action']]: (
    payload: Extract<TRequest, { action: TAction }>
  ) => Promise<unknown>;
};

export function createValidatedActionPostHandler<TRequest extends ActionRequest>(input: {
  schema: z.ZodType<TRequest>;
  invalidMessage: string;
  handlers: ActionHandlerMap<TRequest>;
  onError?: (error: unknown) => Response;
}): RequestHandler {
  return async ({ request }) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return new Response(input.invalidMessage, { status: 400 });
    }

    const parsed = input.schema.safeParse(body);
    if (!parsed.success) {
      return new Response(input.invalidMessage, { status: 400 });
    }

    const handler = input.handlers[parsed.data.action as TRequest['action']] as (
      payload: TRequest
    ) => Promise<unknown>;

    try {
      return Response.json(await handler(parsed.data));
    } catch (error) {
      if (input.onError) {
        return input.onError(error);
      }

      throw error;
    }
  };
}
