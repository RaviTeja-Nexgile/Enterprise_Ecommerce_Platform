import { test, expect } from '@playwright/test';

/**
 * Issue #10: the account overview keeps its look.
 */
test('account overview keeps its look', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();

  await expect(page).toHaveScreenshot('account.png', {
    animations: 'disabled',
  });
});
