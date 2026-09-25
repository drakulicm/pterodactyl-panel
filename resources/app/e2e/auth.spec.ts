import { expect, test } from '@playwright/test';

import { credentials } from './credentials';

test.use({ storageState: { cookies: [], origins: [] } });

// The panel throttles the login endpoint to 10 attempts per minute per IP
// (RouteServiceProvider::configureRateLimiting), so this file keeps the number of
// requests that actually reach it small: every other spec reuses the session saved by
// auth.setup.ts instead of logging in again.
test.describe('authentication', () => {
    test('rejects a password that is not correct', async ({ page }) => {
        await page.goto('/auth/login');

        await page.getByLabel('Username or Email').fill(credentials.username);
        await page.getByLabel('Password', { exact: true }).fill('not-the-password');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.getByText('No account matching those credentials could be found.')).toBeVisible();
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('reports a submission with no credentials without calling the panel', async ({ page }) => {
        await page.goto('/auth/login');

        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.getByText('A username or email must be provided.')).toBeVisible();
        await expect(page.getByText('Please enter your account password.')).toBeVisible();
    });

    test('sends someone who is not logged in to the login page', async ({ page }) => {
        await page.goto('/account/api');

        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('logs in and back out again', async ({ page }) => {
        await page.goto('/auth/login');

        await page.getByLabel('Username or Email').fill(credentials.username);
        await page.getByLabel('Password', { exact: true }).fill(credentials.password);
        await page.getByRole('button', { name: 'Login' }).click();

        await page.waitForURL('/');
        await expect(page.getByRole('heading', { name: 'Your servers' })).toBeVisible();

        await page.getByRole('button', { name: new RegExp(credentials.username) }).click({ position: { x: 24, y: 24 } });
        await page.getByRole('menuitem', { name: 'Sign out' }).click();

        await expect(page).toHaveURL(/\/auth\/login/);
    });
});
