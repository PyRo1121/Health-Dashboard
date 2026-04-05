import { describe, expect, it } from 'vitest';

import { parsePrCommand } from '../../../../.github/scripts/pr-command-router.mjs';

describe('parsePrCommand', () => {
  it('parses summary and review-depth commands', () => {
    expect(parsePrCommand('@grok summarize').kind).toBe('summarize');
    expect(parsePrCommand('@grok full-review').kind).toBe('full-review');
    expect(parsePrCommand('@grok plan').kind).toBe('plan');
    expect(parsePrCommand('@grok why-not-merge-ready').kind).toBe('why-not-merge-ready');
    expect(parsePrCommand('@grok what-changed-since-review').kind).toBe(
      'what-changed-since-review'
    );
  });

  it('parses status and review commands', () => {
    expect(parsePrCommand('@grok status').kind).toBe('status');
    expect(parsePrCommand('@grok review').kind).toBe('status');
  });

  it('parses fix and retry commands', () => {
    expect(parsePrCommand('@grok fix').kind).toBe('fix');
    expect(parsePrCommand('@grok autofix').kind).toBe('fix');
    expect(parsePrCommand('@grok retry').kind).toBe('retry');
  });

  it('parses resolve and autopilot commands', () => {
    expect(parsePrCommand('@grok resolve').kind).toBe('resolve');
    expect(parsePrCommand('@grok autopilot on').kind).toBe('autopilot-on');
    expect(parsePrCommand('@grok autopilot off').kind).toBe('autopilot-off');
  });

  it('parses explain and assign commands', () => {
    expect(parsePrCommand('@grok explain').kind).toBe('explain');
    expect(parsePrCommand('@grok assign').kind).toBe('assign');
    expect(parsePrCommand('@grok suggest-reviewers').kind).toBe('assign');
  });

  it('ignores unrelated comments', () => {
    expect(parsePrCommand('looks good to me').kind).toBe('none');
  });
});
