import { createShortcutBlueprintResponse } from '$lib/features/integrations/downloads';

export function GET() {
  return createShortcutBlueprintResponse();
}
