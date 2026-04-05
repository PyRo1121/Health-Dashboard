# iPhone Shortcuts Health Export

This is the no-Mac primary path for `T9`.

Goal:

- export a local JSON file from iPhone Shortcuts
- keep the payload identical to the existing `healthkit-companion` import contract
- import that file into `/imports` in the web app

The bundle contract it targets lives in:

- [types.ts](../../src/lib/core/domain/types.ts)
- [schema.ts](../../src/lib/features/integrations/bridge/schema.ts)
- [validate.ts](../../src/lib/features/integrations/bridge/validate.ts)

## Why this path

If you do not have a Mac, Shortcuts is the cleanest iPhone-native automation surface available today.

Use this first.

Keep these as fallback or later options:

- Apple Health XML export
- cloud iOS builds

## Supported metrics in the first Shortcut

- `sleep-duration`
- `step-count`
- `resting-heart-rate`

## Output

The downloadable template and blueprint now ship from the app itself:

- `/downloads/ios-shortcuts/healthkit-companion-template.json`
- `/downloads/ios-shortcuts/shortcut-blueprint.md`

Canonical source lives in:

- [shortcut-kit.ts](../../src/lib/features/integrations/shortcut-kit.ts)

## Shortcut recipe

Detailed action-by-action recipe:

- `/downloads/ios-shortcuts/shortcut-blueprint.md`

## Import flow

1. Run the shortcut on iPhone.
2. Save the JSON file to Files.
3. Open the web app.
4. Go to `/imports`.
5. Choose `iPhone bundle / Shortcuts JSON`.
6. Paste the JSON or upload it once file upload exists.
7. Preview, then commit.

## Notes

- This path intentionally reuses the same import contract as the Swift companion scaffold.
- That keeps dedupe, Timeline, Review, and E2E coverage on one bundle shape.
