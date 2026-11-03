import { test, expect } from '@playwright/test';

/**
 * Issue #16: the customer directory and customer profile (requirements
 * 14.1-14.5, 21.4, 23.3, 23.4).
 *
 * An Admin signs in, searches the 20-per-page customer table (name, email,
 * registration date, account status, total spent), opens a customer's profile
 * (details, addresses, order history, spending summary), deactivates and
 * reactivates the account with a success toast, and a Customer is refused the
 * customer management endpoint with 403.
 */
test('admin searches customers, opens a profile and toggles the account status', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';

  // Open the authenticated route first so sign-in returns to it.
  await page.goto('/admin/customers');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 14.1: a searchable table with name, email, registration date, account
  // status and total spent, 20 per page.
  await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();
  const table = page.getByRole('table', { name: 'Customers' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Email' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Registered' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Total spent' })).toBeVisible();
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  expect(rowCount).toBeLessThanOrEqual(20);

  // 14.1: the search narrows the table.
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('jordan');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(table.getByText('jordan.lee@example.com')).toBeVisible();

  // 14.2: the profile shows details, addresses, order history and spending.
  await table.getByRole('link', { name: 'Jordan Lee' }).click();
  await expect(page.getByRole('heading', { name: 'Jordan Lee', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spending summary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order history' })).toBeVisible();
  await expect(page.getByText('Total spent')).toBeVisible();
  await expect(page.getByText('Average order')).toBeVisible();

  // 14.3 and 23.4: deactivating shows the success toast and the Inactive
  // status.
  await page.getByRole('button', { name: 'Deactivate account' }).click();
  await expect(page.getByText('Customer deactivated')).toBeVisible();
  await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

  // 14.4 and 23.4: reactivating shows the success toast and the Active status.
  await page.getByRole('button', { name: 'Activate account' }).click();
  await expect(page.getByText('Customer activated')).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();

  // 21.4: no horizontal scrolling at 375 px.
  await page.setViewportSize({ width: 375, height: 812 });
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});

/**
 * 14.5: a Customer calling a customer management endpoint is answered 403.
 */
test('customer is refused the customer management endpoint with 403', async ({ request }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  const login = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  const body = (await login.json()) as { access_token?: string; data?: { access_token?: string } };
  const token = body.access_token ?? body.data?.access_token;
  expect(token).toBeTruthy();

  const answer = await request.get('/api/v1/admin/customers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(answer.status()).toBe(403);
});
