import { expect, test } from '@playwright/test';

test.describe('account API keys', () => {
    test('creates a key, shows the secret once and deletes it', async ({ page }) => {
        const description = `e2e key ${Date.now()}`;

        await page.goto('/account/api');
        await expect(page.getByRole('heading', { name: 'API credentials' })).toBeVisible();

        await page.getByLabel('Description').fill(description);
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        // The secret is only ever shown in the dialog that follows creation.
        const dialog = page.getByRole('dialog').filter({ hasText: 'Your API key' });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('code')).toHaveText(/^ptlc_[A-Za-z0-9]{43}$/);
        await dialog.getByRole('button', { name: 'Close' }).click();
        await expect(dialog).toBeHidden();

        await expect(page.getByText(description)).toBeVisible();

        await page.getByRole('button', { name: `Delete ${description}` }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

        await expect(page.getByText(description)).toHaveCount(0);
    });

    test('rejects a description that is too short', async ({ page }) => {
        await page.goto('/account/api');

        await page.getByLabel('Description').fill('ab');
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect(page.getByText('A description of at least 4 characters is required.')).toBeVisible();
    });
});
