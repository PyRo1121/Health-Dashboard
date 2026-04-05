import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
import { APP_SECTIONS } from '$lib/core/ui/shell/section-metadata';

describe('RoutePageHeader', () => {
  it('renders metadata-driven headings and titles for every real section', () => {
    const sections = APP_SECTIONS.filter((section) => section.title !== 'More');

    for (const section of sections) {
      const { unmount } = render(RoutePageHeader, {
        props: {
          href: section.href,
        },
      });

      if (section.pageEyebrow) {
        expect(screen.getByText(section.pageEyebrow)).toBeTruthy();
      }
      expect(
        screen.getByRole('heading', {
          name: section.pageHeadingTitle ?? section.title,
        })
      ).toBeTruthy();
      expect(document.title).toBe(`Personal Health Cockpit · ${section.title}`);

      unmount();
    }
  });
});
