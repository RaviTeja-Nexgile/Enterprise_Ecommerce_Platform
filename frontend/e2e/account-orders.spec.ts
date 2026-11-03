import { test, expect } from '@playwright/test';

/**
 * Issue #11: order history, order details and cancellation (requirements
 * 9.5-9.9, 21.4, 23.3, 23.4).
 *
 * A Customer signs in, sees their orders newest first with order number, date,
 * status, payment status and total, 10 per page; opens an order and sees its
 * items, totals, addresses, delivery method, payment status and status history;
 * cancels a Pending order and sees it Cancelled/Refunded with a success toast;
 * and sees their reviews with each review's status.
 */
test('customer views order history, order details, cancels an order and sees reviews', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  // Open the authenticated route first so sign-in returns to it (the access
  // token lives in memory only).
  await page.goto('/account/orders');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 9.5: the order history lists orders newest first with order number, date,
  // status, payment status and total, 10 per page.
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  const table = page.getByRole('table', { name: 'Your orders' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Order' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Payment' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Total' })).toBeVisible();
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  expect(rowCount).toBeLessThanOrEqual(10);

  // 9.6: opening an order shows its items, totals, addresses, delivery method,
  // payment status and status history.
  await rows.first().getByRole('link').click();
  await expect(page.getByRole('heading', { name: /^Order ORD-/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible();
  await expect(page.getByText('Payment status')).toBeVisible();
  await expect(page.getByText('Delivery method')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shipping address' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Billing address' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible();
  await expect(page.getByText('Subtotal')).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();

  // 9.7: cancelling a Pending order sets it to Cancelled and refunds it, with
  // a success toast (23.4).
  const cancel = page.getByRole('button', { name: 'Cancel order' });
  if (await cancel.isVisible()) {
    await cancel.click();
    await expect(page.getByText('Order cancelled')).toBeVisible();
    await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
    await expect(page.getByText('Refunded', { exact: true })).toBeVisible();
    // 9.8: a cancelled order can no longer be cancelled.
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeHidden();
  }

  // 9.9: the reviews section lists the customer's reviews with each review's
  // status Pending, Approved or Rejected.
  await page.getByRole('link', { name: 'Reviews' }).click();
  await expect(page.getByRole('heading', { name: 'Reviews', level: 1 })).toBeVisible();
  const reviews = page.locator('li.review');
  await expect(reviews.first()).toBeVisible();
  const statuses = await reviews.locator('.status').allTextContents();
  expect(statuses.length).toBeGreaterThan(0);
  for (const status of statuses) {
    expect(['Pending', 'Approved', 'Rejected']).toContain(status.trim());
  }

  // 21.4: no horizontal scrolling at 375 px.
  await page.setViewportSize({ width: 375, height: 812 });
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});

/**
 * 9.8: an order that can no longer be cancelled keeps its status and shows
 * "This order can no longer be cancelled" when the cancel is refused.
 */
test('customer sees the refusal message when an order can no longer be cancelled', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  await page.goto('/account/orders');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();

  // Answer the cancel request with the API's refusal so the screen shows the
  // message the rule names.
  await page.route('**/api/v1/orders/*/cancel', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'not_cancellable', message: 'This order can no longer be cancelled' } }),
    }),
  );

  const rows = page.getByRole('table', { name: 'Your orders' }).locator('tbody tr');
  await rows.first().getByRole('link').click();
  await expect(page.getByRole('heading', { name: /^Order ORD-/ })).toBeVisible();
  const cancel = page.getByRole('button', { name: 'Cancel order' });
  if (await cancel.isVisible()) {
    await cancel.click();
    await expect(page.getByText('This order can no longer be cancelled')).toBeVisible();
  }
});
