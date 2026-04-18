import type { Handle } from '@sveltejs/kit';
import { authorizeSessionRequest } from '$lib/server/http/session-guard';

function requestNeedsSession(pathname: string): boolean {
  if (pathname === '/api/status') {
    return false;
  }

  if (pathname.startsWith('/api/')) {
    return true;
  }

  if (pathname.startsWith('/_app/')) {
    return false;
  }

  return !/\.[a-z0-9]+$/i.test(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
  if (requestNeedsSession(event.url.pathname)) {
    const authResponse = authorizeSessionRequest(event);
    if (authResponse) {
      return authResponse;
    }
  }

  return await resolve(event);
};
