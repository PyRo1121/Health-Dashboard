import type { Handle } from '@sveltejs/kit';
import { authorizeSessionRequest } from '$lib/server/http/session-guard';

const PUBLIC_PATHS = new Set([
  '/api/status',
  '/downloads/ios-shortcuts/healthkit-companion-template.json',
  '/downloads/ios-shortcuts/shortcut-blueprint.md',
  '/favicon.ico',
]);

function requestNeedsSession(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return false;
  }

  if (pathname.startsWith('/_app/')) {
    return false;
  }

  return true;
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
