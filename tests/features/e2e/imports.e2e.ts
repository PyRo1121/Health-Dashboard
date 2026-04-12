import { expect, test } from '@playwright/test';
import { HEALTHKIT_BUNDLE_JSON } from '../../support/fixtures/healthkit-bundle';
import { SMART_FHIR_BUNDLE_JSON } from '../../support/fixtures/smart-fhir-bundle';
import { ImportsPage } from '../../support/e2e/pages/ImportsPage';
import { SettingsPage } from '../../support/e2e/pages/SettingsPage';
import { formatHealthMetricLabel } from '$lib/core/domain/health-metrics';

const resetHeaders = { 'x-health-reset-token': 'codex-e2e' };

test.beforeEach(async ({ page }) => {
  const response = await page.request.post('/api/test/reset-db', { headers: resetHeaders });
  expect(response.ok()).toBe(true);
});

test('imports flow with preview and commit', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await importsPage.selectSource('day-one-json');
  await importsPage.fillPayload(
    JSON.stringify({
      entries: [
        {
          uuid: 'entry-1',
          creationDate: '2026-04-02T09:00:00Z',
          text: 'Morning reflection from Day One.',
        },
      ],
    })
  );
  await importsPage.previewAndExpectAdds(1);
  await importsPage.commit();
  await expect(page.getByRole('status')).toBeVisible();
});

test('smart sandbox import requires an owner profile and lands in timeline once configured', async ({
  page,
}) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await importsPage.selectSource('smart-fhir-sandbox');
  await importsPage.fillPayload(SMART_FHIR_BUNDLE_JSON);
  await importsPage.preview();
  await importsPage.expectValidationMessage(
    'Configure your owner profile in Settings before previewing SMART clinical imports.'
  );

  await new SettingsPage(page).saveOwnerProfile('Pyro Example', '1990-01-01');

  await importsPage.goto();
  await importsPage.selectSource('smart-fhir-sandbox');
  await importsPage.fillPayload(SMART_FHIR_BUNDLE_JSON);
  await importsPage.previewAndExpectAdds(3);
  await importsPage.commit();
  await importsPage.expectCommitted();

  await page.goto('/timeline');
  await expect(page.getByText(new RegExp(formatHealthMetricLabel('Systolic blood pressure'), 'i'))).toBeVisible();
  await expect(page.getByText(/SMART on FHIR sandbox/i).first()).toBeVisible();
});

test('iphone companion bundle import lands in timeline and review', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await importsPage.selectSource('healthkit-companion');
  await importsPage.fillPayload(HEALTHKIT_BUNDLE_JSON);
  await importsPage.previewAndExpectAdds(3);
  await importsPage.commit();
  await importsPage.expectCommitted();

  await page.goto('/integrations');
  await expect(page.getByText('Connected')).toBeVisible();
  await expect(page.getByText(/Imported native companion events: 3/i)).toBeVisible();
  await expect(page.getByText(/Devices:\s*Pyro iPhone/i)).toBeVisible();

  await page.goto('/timeline');
  await expect(page.getByText(/Resting heart rate/i)).toBeVisible();
  await expect(page.getByText(/HealthKit Companion · Pyro iPhone/i).first()).toBeVisible();

  await page.goto('/review');
  await expect(page.getByText(/Device highlights/i)).toBeVisible();
  await expect(page.getByText(/Sleep duration: 8 hours on 2026-04-02/i)).toBeVisible();
});

test('integrations page routes users into the import center', async ({ page }) => {
  await page.goto('/integrations');
  await expect(
    page.getByRole('table', { name: 'Clinical connector capability matrix' })
  ).toBeVisible();
  await expect(page.getByText('SMART on FHIR sandbox', { exact: true })).toBeVisible();
  await expect(page.getByText(/Identity gate required/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download template JSON' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/healthkit-companion-template.json'
  );
  await expect(page.getByRole('link', { name: 'Open shortcut blueprint' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/shortcut-blueprint.md'
  );
  await page.getByRole('link', { name: 'Open import center' }).click();
  await expect(page).toHaveURL(/\/imports$/);
});

test('served shortcut kit endpoints are downloadable', async ({ page }) => {
  const template = await page.request.get(
    '/downloads/ios-shortcuts/healthkit-companion-template.json'
  );
  expect(await template.text()).toContain('"connector": "healthkit-ios"');

  const blueprint = await page.request.get('/downloads/ios-shortcuts/shortcut-blueprint.md');
  expect(await blueprint.text()).toContain('Shortcut Blueprint: Health Cockpit Export');
});

test('shortcut bundle file upload populates the import payload', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await expect(importsPage.previewButton).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Download template JSON' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/healthkit-companion-template.json'
  );
  await expect(page.getByRole('link', { name: 'Open shortcut blueprint' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/shortcut-blueprint.md'
  );
  await importsPage.uploadFile('healthkit-bundle.json', HEALTHKIT_BUNDLE_JSON);

  await expect(page.getByText('healthkit-bundle.json', { exact: true })).toBeVisible();
  await importsPage.expectShortcutBundleReady();
  await importsPage.previewAndExpectAdds(3);
  await page.getByRole('button', { name: 'Clear loaded file' }).click();
  await expect(importsPage.payloadInput).toHaveValue('');
  await expect(importsPage.summaryCard).toHaveCount(0);
});

test('shortcut bundle drag and drop preserves the same intake flow', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await expect(importsPage.previewButton).toBeDisabled();

  await importsPage.dropFile('shortcut-export.json', HEALTHKIT_BUNDLE_JSON);

  await expect(page.getByText('shortcut-export.json', { exact: true })).toBeVisible();
  await importsPage.expectShortcutBundleReady();
  await importsPage.previewAndExpectAdds(3);
});

test('editing a pasted payload clears stale preview state', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await importsPage.fillPayload(HEALTHKIT_BUNDLE_JSON);
  await expect(importsPage.previewButton).toBeDisabled();
  await expect(importsPage.summaryCard).toContainText('Shortcut/native bundle ready to preview');
  await expect(importsPage.sourceSelect).toHaveValue('healthkit-companion');
  await importsPage.previewAndExpectAdds(3);
  await expect(importsPage.commitButton).toBeEnabled();

  await importsPage.payloadInput.fill(`${HEALTHKIT_BUNDLE_JSON}\n`);
  await expect(page.getByText(/Adds: 3/i)).toHaveCount(0);
  await expect(importsPage.commitButton).toBeDisabled();
});

test('invalid shortcut bundle surfaces recovery links', async ({ page }) => {
  const importsPage = new ImportsPage(page);
  await importsPage.goto();
  await importsPage.fillPayload(
    JSON.stringify({
      connector: 'healthkit-ios',
      connectorVersion: 999,
      deviceId: 'iphone-15-pro',
      deviceName: 'Pyro iPhone',
      sourcePlatform: 'ios',
      capturedAt: '2026-04-02T13:10:00.000Z',
      timezone: 'America/Chicago',
      records: [],
    })
  );

  await expect(importsPage.summaryCard).toContainText('Shortcut/native bundle is invalid');
  await expect(importsPage.previewButton).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Download template JSON' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/healthkit-companion-template.json'
  );
  await expect(page.getByRole('link', { name: 'Open shortcut blueprint' })).toHaveAttribute(
    'href',
    '/downloads/ios-shortcuts/shortcut-blueprint.md'
  );
});
