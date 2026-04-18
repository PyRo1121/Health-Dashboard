import { timingSafeEqual } from 'node:crypto';

type ControlPlaneGuardOptions = {
  envVar: string;
  headerName: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice('bearer '.length).trim();
}

export function requireControlPlaneToken(
  request: Request,
  options: ControlPlaneGuardOptions
): Response | null {
  const expectedToken = readEnv(options.envVar);
  if (!expectedToken) {
    return new Response('Forbidden', { status: 403 });
  }

  const providedToken = request.headers.get(options.headerName)?.trim() ?? readBearerToken(request);
  if (!safeEqual(providedToken, expectedToken)) {
    return new Response('Forbidden', { status: 403 });
  }

  return null;
}
