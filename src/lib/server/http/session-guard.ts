import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';

export const HEALTH_SESSION_COOKIE_NAME = 'health_session';
export const HEALTH_AUTH_TOKEN_HEADER = 'x-health-auth-token';

const BASIC_REALM = 'Personal Health Cockpit';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionAuthConfig = {
  token?: string;
  username?: string;
  password?: string;
  sessionValue: string;
};

function sessionAuthEnabledForRuntime(): boolean {
  return process.env.NODE_ENV !== 'test' || process.env.HEALTH_AUTH_TEST_MODE === 'enabled';
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getSessionAuthConfig(): SessionAuthConfig | null {
  if (!sessionAuthEnabledForRuntime()) {
    return null;
  }

  const token = readEnv('HEALTH_AUTH_TOKEN');
  const username = readEnv('HEALTH_AUTH_USERNAME');
  const password = readEnv('HEALTH_AUTH_PASSWORD');

  if (!token && !(username && password)) {
    return null;
  }

  return {
    token,
    username,
    password,
    sessionValue: createHash('sha256')
      .update([token ?? '', username ?? '', password ?? ''].join('\n'))
      .digest('hex'),
  };
}

function safeEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readBearerToken(request: Request): string | null {
  const explicitHeader = request.headers.get(HEALTH_AUTH_TOKEN_HEADER)?.trim();
  if (explicitHeader) {
    return explicitHeader;
  }

  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice('bearer '.length).trim();
}

function readBasicAuthorization(request: Request): { username: string; password: string } | null {
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('basic ')) {
    return null;
  }

  try {
    const decoded = Buffer.from(authorization.slice('basic '.length).trim(), 'base64').toString(
      'utf8'
    );
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function unauthorizedResponse(config: SessionAuthConfig): Response {
  const headers = new Headers({
    'cache-control': 'no-store',
  });

  if (config.username && config.password) {
    headers.set('WWW-Authenticate', `Basic realm="${BASIC_REALM}", charset="UTF-8"`);
  }

  return new Response('Unauthorized', {
    status: 401,
    headers,
  });
}

function setSessionCookie(event: Pick<RequestEvent, 'cookies'>, sessionValue: string): void {
  event.cookies.set(HEALTH_SESSION_COOKIE_NAME, sessionValue, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function authorizeSessionRequest(
  event: Pick<RequestEvent, 'request' | 'cookies'>
): Response | null {
  const config = getSessionAuthConfig();
  if (!config) {
    return null;
  }

  const sessionCookie = event.cookies.get(HEALTH_SESSION_COOKIE_NAME);
  if (safeEqual(sessionCookie, config.sessionValue)) {
    return null;
  }

  const token = readBearerToken(event.request);
  if (config.token && safeEqual(token, config.token)) {
    setSessionCookie(event, config.sessionValue);
    return null;
  }

  const basicAuth = readBasicAuthorization(event.request);
  if (
    config.username &&
    config.password &&
    basicAuth &&
    safeEqual(basicAuth.username, config.username) &&
    safeEqual(basicAuth.password, config.password)
  ) {
    setSessionCookie(event, config.sessionValue);
    return null;
  }

  return unauthorizedResponse(config);
}
