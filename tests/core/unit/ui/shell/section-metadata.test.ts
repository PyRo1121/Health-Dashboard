import { describe, expect, it } from 'vitest';
import { APP_SECTIONS, getAppSectionMeta } from '$lib/core/ui/shell/section-metadata';

describe('section metadata', () => {
  it('keeps page route titles unique for real sections', () => {
    const sections = APP_SECTIONS.filter((section) => section.pageDescription);
    const titles = sections.map((section) => section.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('returns full page metadata for known routes', () => {
    const healthRoute = '/health' as never;

    expect(getAppSectionMeta('/today')).toMatchObject({
      label: 'Today',
      title: 'Today',
      pageEyebrow: 'Daily Loop',
    });
    expect(getAppSectionMeta(healthRoute)).toMatchObject({
      label: 'Health',
      title: 'Health',
    });
    expect(getAppSectionMeta('/imports')).toMatchObject({
      label: 'Imports',
      title: 'Imports',
      pageEyebrow: 'Data Intake',
    });
    expect(getAppSectionMeta('/movement' as never)).toMatchObject({
      label: 'Movement',
      title: 'Movement',
      pageEyebrow: 'Movement Loop',
    });
    expect(getAppSectionMeta('/groceries' as never)).toMatchObject({
      label: 'Groceries',
      title: 'Groceries',
      pageEyebrow: 'Weekly Ledger',
    });
  });
});
