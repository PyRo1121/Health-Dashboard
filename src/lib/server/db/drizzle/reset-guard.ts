import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const PLAYWRIGHT_MODE_FLAG = join(process.cwd(), '.playwright-mode');
export const PLAYWRIGHT_MODE_REQUIRED_MESSAGE =
  'Database reset is only available in Playwright mode.';

export class PlaywrightModeRequiredError extends Error {
  constructor() {
    super(PLAYWRIGHT_MODE_REQUIRED_MESSAGE);
    this.name = 'PlaywrightModeRequiredError';
  }
}

export function isPlaywrightMode(): boolean {
  return existsSync(PLAYWRIGHT_MODE_FLAG);
}

export function assertPlaywrightModeForDbReset(): void {
  if (!isPlaywrightMode()) {
    throw new PlaywrightModeRequiredError();
  }
}
