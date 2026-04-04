import { expect, type Locator, type Page } from '@playwright/test';

export class ImportsPage {
	readonly page: Page;
	readonly sourceSelect: Locator;
	readonly payloadInput: Locator;
	readonly previewButton: Locator;
	readonly commitButton: Locator;
	readonly summaryCard: Locator;
	readonly previewSummary: Locator;
	readonly fileInput: Locator;
	readonly dropZone: Locator;

	constructor(page: Page) {
		this.page = page;
		this.sourceSelect = page.getByLabel('Import source');
		this.payloadInput = page.getByRole('textbox', { name: 'Import payload' });
		this.previewButton = page.getByRole('button', { name: 'Preview import' });
		this.commitButton = page.getByRole('button', { name: 'Commit import' });
		this.summaryCard = page.getByLabel('Import payload summary');
		this.previewSummary = page.locator('.preview-summary');
		this.fileInput = page.getByLabel('Import file');
		this.dropZone = page.getByLabel('Import drop zone');
	}

	async goto() {
		await this.page.goto('/imports');
	}

	async selectSource(source: string) {
		await this.sourceSelect.selectOption(source);
	}

	async fillPayload(rawText: string) {
		await this.payloadInput.fill(rawText);
	}

	async preview() {
		await this.previewButton.click();
	}

	async commit() {
		await this.commitButton.click();
	}

	async expectAdds(count: number) {
		await expect(this.previewSummary).toContainText(`Adds: ${count}`);
	}

	async expectShortcutBundleReady() {
		await expect(this.summaryCard).toContainText('Shortcut/native bundle ready to preview');
		await expect(this.summaryCard).toContainText('3 records');
		await expect(this.sourceSelect).toHaveValue('healthkit-companion');
		await expect(this.previewButton).toBeEnabled();
	}

	async expectCommitted() {
		await expect(this.page.getByText(/Import committed\./i)).toBeVisible();
	}

	async expectValidationMessage(message: string | RegExp) {
		await expect(this.page.getByText(message)).toBeVisible();
	}

	async previewAndExpectAdds(count: number) {
		await this.preview();
		await this.expectAdds(count);
	}

	async uploadFile(name: string, contents: string, mimeType = 'application/json') {
		await this.fileInput.setInputFiles({
			name,
			mimeType,
			buffer: Buffer.from(contents, 'utf8')
		});
	}

	async dropFile(name: string, contents: string, mimeType = 'application/json') {
		const dataTransfer = await this.page.evaluateHandle(
			({ filename, rawText, type }) => {
				const transfer = new DataTransfer();
				transfer.items.add(new File([rawText], filename, { type }));
				return transfer;
			},
			{ filename: name, rawText: contents, type: mimeType }
		);

		await this.dropZone.dispatchEvent('dragenter', { dataTransfer });
		await this.dropZone.dispatchEvent('dragover', { dataTransfer });
		await this.dropZone.dispatchEvent('drop', { dataTransfer });
	}
}
