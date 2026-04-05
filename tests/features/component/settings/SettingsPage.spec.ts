import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearOwnerProfile, getOwnerProfile } from '$lib/features/settings/service';
import SettingsPage from '../../../../src/routes/settings/+page.svelte';

describe('Settings route', () => {
  beforeEach(() => {
    clearOwnerProfile();
  });

  it('shows the no-Mac iPhone setup path', () => {
    render(SettingsPage);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText(/Download the Shortcut kit/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Download template JSON' }).getAttribute('href')).toBe(
      '/downloads/ios-shortcuts/healthkit-companion-template.json'
    );
    expect(screen.getByRole('link', { name: 'Open shortcut blueprint' }).getAttribute('href')).toBe(
      '/downloads/ios-shortcuts/shortcut-blueprint.md'
    );
  });

  it('saves the single-owner clinical profile used by SMART imports', async () => {
    render(SettingsPage);

    await fireEvent.input(screen.getByLabelText('Owner full name'), {
      target: { value: 'Pyro Example' },
    });
    await fireEvent.input(screen.getByLabelText('Owner birth date'), {
      target: { value: '1990-01-01' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save owner profile' }));

    await waitFor(() => {
      expect(
        screen.getByText(/SMART clinical imports now match against this identity/i)
      ).toBeTruthy();
      expect(getOwnerProfile()).toEqual({
        fullName: 'Pyro Example',
        birthDate: '1990-01-01',
      });
    });
  });
});
