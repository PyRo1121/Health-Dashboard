import { expect, type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly ownerFullNameInput: Locator;
  readonly ownerBirthDateInput: Locator;
  readonly saveOwnerProfileButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.ownerFullNameInput = page.getByLabel('Owner full name');
    this.ownerBirthDateInput = page.getByLabel('Owner birth date');
    this.saveOwnerProfileButton = page.getByRole('button', { name: 'Save owner profile' });
  }

  async goto() {
    await this.page.goto('/settings');
  }

  async saveOwnerProfile(fullName: string, birthDate: string) {
    await this.goto();
    await this.ownerFullNameInput.fill(fullName);
    await this.ownerBirthDateInput.fill(birthDate);
    await this.saveOwnerProfileButton.click();
    await expect(this.page.getByText(/Owner profile saved/i)).toBeVisible();
  }
}
