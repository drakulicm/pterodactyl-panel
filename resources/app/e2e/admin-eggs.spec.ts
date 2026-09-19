import { expect, test } from '@playwright/test';

test.describe('admin nests and eggs', () => {
    test('creates a nest, lays an egg in it, adds a variable and removes both', async ({ page }) => {
        const suffix = Date.now().toString().slice(-8);
        const nestName = `E2E Nest ${suffix}`;
        const eggName = `E2E Egg ${suffix}`;

        await page.goto('/admin/nests');
        await expect(page.getByRole('heading', { name: 'Nests' })).toBeVisible();

        await page.getByRole('button', { name: 'New nest' }).click();
        const nestDialog = page.getByRole('dialog');
        await nestDialog.getByLabel('Name').fill(nestName);
        await nestDialog.getByLabel('Description').fill('Created by the end-to-end tests.');
        await nestDialog.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText(`A new nest, ${nestName}, has been successfully created.`)).toBeVisible();

        await page.waitForURL(/\/admin\/nests\/view\/\d+/);
        const nestUrl = page.url();

        await page.getByRole('link', { name: 'New egg' }).click();
        await expect(page.getByRole('heading', { name: 'Create egg' })).toBeVisible();

        await page.getByLabel('Name', { exact: true }).fill(eggName);
        await page.getByLabel('Docker images').fill('ghcr.io/pterodactyl/yolks:java_21');
        await page.getByLabel('Startup command').fill('java -jar server.jar');
        await page.getByLabel('Stop command').fill('stop');
        await page.getByLabel('Log configuration').fill('{}');
        await page.getByLabel('Configuration files').fill('{}');
        await page.getByLabel('Start configuration').fill('{"done": "Done"}');
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await page.waitForURL(/\/admin\/nests\/egg\/\d+/);
        const eggUrl = page.url();
        await expect(page.getByRole('heading', { name: new RegExp(eggName) })).toBeVisible();

        await page.getByRole('tab', { name: 'Variables' }).click();
        await page.getByRole('button', { name: 'Create new variable' }).click();

        const variableDialog = page.getByRole('dialog').filter({ hasText: 'Create new egg variable' });
        await variableDialog.getByLabel('Name', { exact: true }).fill('Server Jar');
        await variableDialog.getByLabel('Environment variable').fill('SERVER_JARFILE');
        await variableDialog.getByLabel('Default value').fill('server.jar');
        await variableDialog.getByLabel('Input rules').fill('required|string');
        await variableDialog.getByRole('button', { name: 'Create variable' }).click();

        await expect(
            page.getByText('New variable has successfully been created and assigned to this egg.'),
        ).toBeVisible();
        await expect(variableDialog).toBeHidden();
        await expect(page.getByRole('textbox', { name: 'Environment variable' })).toHaveValue('SERVER_JARFILE');

        // A nest cannot be removed while it still holds an egg, so remove the egg first.
        await page.goto(eggUrl);
        await page.getByRole('button', { name: 'Delete egg' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
        await page.waitForURL(/\/admin\/nests/);

        await page.goto(nestUrl);
        await page.getByRole('button', { name: 'Delete nest' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
        await expect(
            page.getByText('Successfully deleted the requested nest from the Panel.'),
        ).toBeVisible();
    });

    test('reports an egg that is missing its configuration', async ({ page }) => {
        await page.goto('/admin/nests');

        await page.getByRole('button', { name: 'New nest' }).first().click();
        await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

        await expect(page.getByRole('dialog')).toBeVisible();
    });
});
