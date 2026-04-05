import { createShortcutTemplateResponse } from '$lib/features/integrations/downloads';

export function GET() {
  return createShortcutTemplateResponse();
}
