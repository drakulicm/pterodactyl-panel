import { expect, test, type Page } from '@playwright/test';

// The shortcut is bound in an effect and the palette resets its selection when the
// server list resolves, so let both settle before driving it.
const openPalette = async (page: Page) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your servers' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('ControlOrMeta+k');

    return page.getByRole('dialog');
};

test.describe('navigation', () => {
    test('shows the dashboard for the signed-in account', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('heading', { name: 'Your servers' })).toBeVisible();
    });

    test('opens the command palette and navigates with it', async ({ page }) => {
        const palette = await openPalette(page);
        await expect(palette).toBeVisible();

        await palette.getByPlaceholder('Search servers and pages...').fill('API');
        await expect(palette.getByText('API Credentials')).toBeVisible();
        await page.keyboard.press('Enter');

        await page.waitForURL('/account/api');
        await expect(page.getByRole('heading', { name: 'API credentials' })).toBeVisible();
    });

    test('reports a search that matches nothing', async ({ page }) => {
        const palette = await openPalette(page);

        await palette.getByPlaceholder('Search servers and pages...').fill('nothing matches this string');

        await expect(page.getByText('Nothing matches that.')).toBeVisible();
    });

    test('closes the command palette with escape', async ({ page }) => {
        const palette = await openPalette(page);
        await expect(palette).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(palette).toBeHidden();
    });
});
