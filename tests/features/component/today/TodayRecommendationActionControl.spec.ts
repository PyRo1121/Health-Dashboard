import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TodayRecommendationActionControl from '../../../../src/lib/features/today/components/TodayRecommendationActionControl.svelte';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('TodayRecommendationActionControl', () => {
  it('renders route href actions as links', () => {
    render(TodayRecommendationActionControl, {
      action: { kind: 'href', label: 'Open Nutrition', href: '/nutrition' },
      classes: 'action-control',
      onAction: vi.fn(),
    });

    const link = screen.getByRole('link', { name: 'Open Nutrition' });
    expect(link.getAttribute('href')).toBe('/nutrition');
  });

  it('renders hash href actions as buttons and scrolls the addressed target', async () => {
    const target = document.createElement('div');
    target.id = 'today-check-in';
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    render(TodayRecommendationActionControl, {
      action: { kind: 'href', label: 'Open check-in', href: '#today-check-in' },
      classes: 'action-control',
      onAction: vi.fn(),
    });

    const button = screen.getByRole('button', { name: 'Open check-in' });
    expect(button.getAttribute('type')).toBe('button');

    await fireEvent.click(button);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('renders callback actions as buttons and dispatches through the callback', async () => {
    const onAction = vi.fn();

    render(TodayRecommendationActionControl, {
      action: {
        kind: 'open-journal-context-capture',
        label: 'Capture context',
      },
      classes: 'action-control',
      onAction,
    });

    const button = screen.getByRole('button', { name: 'Capture context' });
    expect(button.getAttribute('type')).toBe('button');

    await fireEvent.click(button);

    expect(onAction).toHaveBeenCalledWith({
      kind: 'open-journal-context-capture',
      label: 'Capture context',
    });
  });
});
