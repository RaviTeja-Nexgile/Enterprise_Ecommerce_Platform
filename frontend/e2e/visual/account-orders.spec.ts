import { test, expect } from '@playwright/test';

/**
 * Issue #11: the order history screen keeps its look.
 */
test('order history screen keeps its look', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  await page.goto('/account/orders');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('table', { name: 'Your orders' })).toBeVisible();

  await expect(page).toHaveScreenshot('account-orders.png', {
    animations: 'disabled',
    mask: [page.locator('table tbody')],
  });
});
