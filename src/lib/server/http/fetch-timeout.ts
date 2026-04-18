export const DEFAULT_REMOTE_FETCH_TIMEOUT_MS = 3000;

export function withTimeoutInit(
  init: RequestInit = {},
  timeoutMs = DEFAULT_REMOTE_FETCH_TIMEOUT_MS
): RequestInit {
  return {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  };
}
