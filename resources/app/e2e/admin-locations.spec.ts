import { expect, test } from '@playwright/test';

test.describe('admin locations', () => {
    test('creates, edits and deletes a location', async ({ page }) => {
        const short = `e2e-${Date.now().toString().slice(-8)}`;

        await page.goto('/admin/locations');
        await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible();

        await page.getByRole('button', { name: 'New location' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel('Short code').fill(short);
        await dialog.getByLabel('Description').fill('Created by the end-to-end tests.');
        await dialog.getByRole('button', { name: 'Create' }).click();

        await page.waitForURL(/\/admin\/locations\/view\/\d+/);
        await expect(page.getByRole('heading', { name: short })).toBeVisible();

        await page.getByLabel('Description').fill('Edited by the end-to-end tests.');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText(`${short} has been updated.`)).toBeVisible();

        await page.getByRole('button', { name: 'Delete location' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

        await page.waitForURL('/admin/locations');
        await page.getByPlaceholder('Search by short code...').fill(short);
        await expect(page.getByText('No locations')).toBeVisible();
    });

    test('requires a short code', async ({ page }) => {
        await page.goto('/admin/locations');

        await page.getByRole('button', { name: 'New location' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

        await expect(page.getByRole('dialog')).toBeVisible();
    });
});
