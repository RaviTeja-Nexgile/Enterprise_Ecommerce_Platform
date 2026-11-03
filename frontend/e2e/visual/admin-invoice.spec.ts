import { test, expect } from '@playwright/test';

/**
 * Issue #18: the printable invoice keeps its look.
 */
test('admin invoice keeps its look', async ({ page }) => {
  const email = process.env.E2E_ORDER_MANAGER_EMAIL ?? 'orders@example.com';
  const password = process.env.E2E_ORDER_MANAGER_PASSWORD ?? 'Orders@12345';

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/orders/1/invoice');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /^Invoice ORD-/ })).toBeVisible();

  await expect(page).toHaveScreenshot('admin-invoice.png', {
    animations: 'disabled',
  });
});
