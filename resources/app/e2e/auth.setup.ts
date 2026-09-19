import { expect, test as setup } from '@playwright/test';

import { credentials } from './credentials';

const STATE_PATH = 'e2e/.auth/state.json';

setup('authenticate', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByLabel('Username or Email').fill(credentials.username);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL('/');
    await expect(page.getByRole('heading', { name: 'Your servers' })).toBeVisible();

    await page.context().storageState({ path: STATE_PATH });
});
