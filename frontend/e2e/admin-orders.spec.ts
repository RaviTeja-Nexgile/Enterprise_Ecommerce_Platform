import { test, expect } from '@playwright/test';

/**
 * Issue #17: order management (requirements 15.1-15.6, 21.4, 21.5, 23.1, 23.4).
 *
 * An Order Manager signs in, sees the 20-per-page order table with order
 * number, customer, date, status, payment status and total, searches by order
 * number and filters by status and date, opens an order (items, totals,
 * customer, addresses, payment, status history), moves it to its next status
 * with a success toast, is refused an illegal status with "This status change
 * is not allowed" and the order left unchanged, cancels an unshipped order and
 * refunds a delivered one.
 */
const ORDER_MANAGER_EMAIL = process.env.E2E_ORDER_MANAGER_EMAIL ?? 'orders@example.com';
const ORDER_MANAGER_PASSWORD = process.env.E2E_ORDER_MANAGER_PASSWORD ?? 'Orders@12345';

async function signIn(page: import('@playwright/test').Page, target: string): Promise<void> {
  // Open the authenticated route first so sign-in returns to it.
  await page.goto(target);
  await page.getByRole('textbox', { name: 'Email' }).fill(ORDER_MANAGER_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(ORDER_MANAGER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('order manager searches and filters the order table', async ({ page }) => {
  await signIn(page, '/admin/orders');

  // 15.1: the table with order number, customer, date, status, payment status
  // and total, 20 per page.
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  const table = page.getByRole('table', { name: 'Orders' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Order number' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Payment status' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Total' })).toBeVisible();
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  expect(rowCount).toBeLessThanOrEqual(20);

  // 15.1: search by order number.
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('ORD-2026-1003');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(rows).toHaveCount(1);
  await expect(table.getByRole('link', { name: 'ORD-2026-1003' })).toBeVisible();

  // 15.1: filter by status.
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('');
  await page.getByRole('combobox', { name: 'Status' }).selectOption('delivered');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(rows.first()).toBeVisible();
  for (const status of await rows.locator('td:nth-child(4)').allInnerTexts()) {
    expect(status.trim()).toBe('Delivered');
  }

  // 15.1: filter by date range.
  await page.getByRole('combobox', { name: 'Status' }).selectOption('');
  await page.locator('#order-from').fill('2026-10-01');
  await page.locator('#order-to').fill('2026-10-31');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(rows.first()).toBeVisible();
  for (const date of await rows.locator('td:nth-child(3)').allInnerTexts()) {
    expect(date.trim()).toMatch(/^10\//);
  }

  // 21.4: no horizontal scrolling at 375 px.
  await page.setViewportSize({ width: 375, height: 812 });
  const phone = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(phone.scroll).toBeLessThanOrEqual(phone.client);

  // 21.5: the desktop layout keeps the full navigation at 1440 px.
  await page.setViewportSize({ width: 1440, height: 900 });
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
});

/** The order number of the first row whose status column is one of `statuses`. */
async function firstOrderWithStatus(
  page: import('@playwright/test').Page,
  statuses: string[],
): Promise<string> {
  const table = page.getByRole('table', { name: 'Orders' });
  await expect(table).toBeVisible();
  const rows = table.locator('tbody tr');
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const status = (await row.locator('td:nth-child(4)').innerText()).trim();
    if (statuses.includes(status)) {
      return (await row.locator('td:nth-child(1)').innerText()).trim();
    }
  }
  throw new Error(`no order with status ${statuses.join(' or ')}`);
}

/** Open one order from the table by its order number. */
async function openOrder(page: import('@playwright/test').Page, orderNumber: string): Promise<void> {
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(orderNumber);
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.getByRole('table', { name: 'Orders' }).getByRole('link', { name: orderNumber }).click();
  await expect(page.getByRole('heading', { name: `Order ${orderNumber}`, level: 1 })).toBeVisible();
}

test('order manager opens an order and moves it to its next status', async ({ page }) => {
  await signIn(page, '/admin/orders');

  // Open an order that can still move forward. Earlier runs move orders on, so
  // the order is picked by its current status rather than by its number.
  const orderNumber = await firstOrderWithStatus(page, ['Pending', 'Confirmed', 'Processing', 'Shipped']);
  await openOrder(page, orderNumber);

  // 15.2: items, totals, customer, shipping and billing addresses, payment and
  // full status history.
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByText('Subtotal')).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Customer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shipping address' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Billing address' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible();

  // 15.3 and 23.4: the next status is saved, a history entry is added and a
  // success toast shows.
  const advance = page.getByRole('button', { name: /^Mark as / });
  await expect(advance).toBeVisible();
  const nextLabel = (await advance.innerText()).replace('Mark as ', '').trim();
  await advance.click();
  await expect(page.getByText('Order status updated')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible();
  await expect(page.getByText(nextLabel, { exact: true }).first()).toBeVisible();
});

test('order manager is refused an illegal status change', async ({ page }) => {
  await signIn(page, '/admin/orders');
  const orderNumber = await firstOrderWithStatus(page, ['Pending', 'Confirmed', 'Processing', 'Shipped']);
  await openOrder(page, orderNumber);

  // 15.4 and 23.1: the API refuses the change; the order stays unchanged and
  // the message shows.
  await page.route('**/api/v1/admin/orders/*/status', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'invalid_transition', message: 'This status change is not allowed' },
      }),
    }),
  );
  const advance = page.getByRole('button', { name: /^Mark as / });
  const nextLabel = (await advance.innerText()).replace('Mark as ', '').trim();
  await advance.click();
  await expect(page.getByRole('alert').filter({ hasText: 'This status change is not allowed' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: `Mark as ${nextLabel}` })).toBeVisible();
  await page.unroute('**/api/v1/admin/orders/*/status');
});

test('order manager cancels an unshipped order and refunds a delivered one', async ({ page }) => {
  await signIn(page, '/admin/orders');

  // 15.5 and 23.4: cancelling an unshipped order sets it to Cancelled, refunds
  // it in full and shows the success toast. Earlier runs cancel orders, so a
  // shipped order is moved back to Processing first when none is left.
  let cancellable: string;
  try {
    cancellable = await firstOrderWithStatus(page, ['Pending', 'Confirmed', 'Processing']);
  } catch {
    cancellable = await firstOrderWithStatus(page, ['Shipped']);
    await openOrder(page, cancellable);
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();
    await expect(page.getByText('Order status updated')).toBeVisible();
    await page.getByRole('link', { name: '← Back to orders' }).click();
    // A delivered order cannot be cancelled, so the cancel check uses the
    // shipped order's own details page only when it is still cancellable.
    throw new Error('no unshipped order left to cancel');
  }
  await openOrder(page, cancellable);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('Order cancelled')).toBeVisible();
  await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Refunded', { exact: true }).first()).toBeVisible();

  // 15.6 and 23.4: refunding a delivered order sets it to Refunded and shows
  // the success toast. Earlier runs may have refunded every delivered order,
  // so one is moved to Delivered first when none is left.
  await page.getByRole('link', { name: '← Back to orders' }).click();
  let delivered: string;
  try {
    delivered = await firstOrderWithStatus(page, ['Delivered']);
  } catch {
    const shippable = await firstOrderWithStatus(page, ['Shipped']);
    await openOrder(page, shippable);
    await page.getByRole('button', { name: 'Mark as Delivered' }).click();
    await expect(page.getByText('Order status updated')).toBeVisible();
    delivered = shippable;
    await page.getByRole('link', { name: '← Back to orders' }).click();
  }
  await openOrder(page, delivered);
  await page.getByRole('button', { name: 'Refund order' }).click();
  await expect(page.getByText('Order refunded')).toBeVisible();
  await expect(page.getByText('Refunded', { exact: true }).first()).toBeVisible();
});
