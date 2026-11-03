import { test, expect } from '@playwright/test';

/**
 * Issue #16: the customer directory keeps its look.
 */
test('customer directory keeps its look', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';

  await page.goto('/admin/customers');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('table', { name: 'Customers' })).toBeVisible();

  await expect(page).toHaveScreenshot('admin-customers.png', {
    animations: 'disabled',
    mask: [page.locator('table tbody')],
  });
});
