import { test, expect } from '@playwright/test';

/**
 * Issue #18: the printable invoice (requirement 15.7).
 *
 * An Order Manager signs in and opens the invoice for an order; it shows the
 * order number, the customer, the items, the totals and the date, and offers
 * a Print button. The CSV export (15.8) is built on the admin orders list,
 * which another task adds.
 */
test('order manager opens a printable invoice', async ({ page }) => {
  const email = process.env.E2E_ORDER_MANAGER_EMAIL ?? 'orders@example.com';
  const password = process.env.E2E_ORDER_MANAGER_PASSWORD ?? 'Orders@12345';

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/orders/1/invoice');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 15.7: order number, customer, items, totals and date.
  await expect(page.getByRole('heading', { name: /^Invoice ORD-/ })).toBeVisible();
  await expect(page.getByText(/^Date: \d{4}-\d{2}-\d{2}$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Customer' })).toBeVisible();
  await expect(page.getByText('Casey Customer')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Invoice items' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'The Quiet Ledger' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'SKU-1020' })).toBeVisible();
  await expect(page.getByText('Subtotal')).toBeVisible();
  await expect(page.locator('dl').getByText('Total', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
});
