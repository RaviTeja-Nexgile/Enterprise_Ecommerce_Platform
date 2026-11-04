import { test, expect } from '@playwright/test';

/**
 * The look of the admin order table (issue #17). The order list is answered
 * with fixed records so the screenshot does not change with the seed data.
 */
const ORDER_MANAGER_EMAIL = process.env.E2E_ORDER_MANAGER_EMAIL ?? 'orders@example.com';
const ORDER_MANAGER_PASSWORD = process.env.E2E_ORDER_MANAGER_PASSWORD ?? 'Orders@12345';

const ORDERS = [
  {
    id: 1,
    order_number: 'ORD-2026-1000',
    customer: { id: 2, name: 'Casey Customer', email: 'customer@example.com' },
    placed_at: '2026-11-04T14:35:13',
    status: 'pending',
    payment_status: 'pending',
    total_cents: 9947,
    subtotal_cents: 8747,
    discount_cents: 0,
    shipping_cents: 500,
    tax_cents: 700,
    delivery_method: 'standard',
    items: [],
    status_history: [],
  },
  {
    id: 2,
    order_number: 'ORD-2026-1001',
    customer: { id: 6, name: 'Jordan Lee', email: 'jordan.lee@example.com' },
    placed_at: '2026-11-01T13:35:13',
    status: 'confirmed',
    payment_status: 'success',
    total_cents: 10865,
    subtotal_cents: 9597,
    discount_cents: 0,
    shipping_cents: 500,
    tax_cents: 768,
    delivery_method: 'standard',
    items: [],
    status_history: [],
  },
  {
    id: 3,
    order_number: 'ORD-2026-1002',
    customer: { id: 7, name: 'Sam Rivera', email: 'sam.rivera@example.com' },
    placed_at: '2026-10-29T13:35:13',
    status: 'processing',
    payment_status: 'success',
    total_cents: 22136,
    subtotal_cents: 19589,
    discount_cents: 0,
    shipping_cents: 500,
    tax_cents: 2047,
    delivery_method: 'standard',
    items: [],
    status_history: [],
  },
  {
    id: 4,
    order_number: 'ORD-2026-1003',
    customer: { id: 8, name: 'Priya Patel', email: 'priya.patel@example.com' },
    placed_at: '2026-10-26T13:35:13',
    status: 'shipped',
    payment_status: 'success',
    total_cents: 7300,
    subtotal_cents: 6800,
    discount_cents: 0,
    shipping_cents: 0,
    tax_cents: 500,
    delivery_method: 'standard',
    items: [],
    status_history: [],
  },
  {
    id: 5,
    order_number: 'ORD-2026-1004',
    customer: { id: 9, name: 'Noah Brown', email: 'noah.brown@example.com' },
    placed_at: '2026-10-23T13:35:13',
    status: 'delivered',
    payment_status: 'success',
    total_cents: 41577,
    subtotal_cents: 38497,
    discount_cents: 0,
    shipping_cents: 0,
    tax_cents: 3080,
    delivery_method: 'standard',
    items: [],
    status_history: [],
  },
];

test('admin order table keeps its look', async ({ page }) => {
  await page.route('**/api/v1/admin/orders?*', (route) =>
    route.fulfill({
      json: {
        data: ORDERS,
        meta: { page: 1, per_page: 20, total: ORDERS.length, total_pages: 1 },
      },
    }),
  );

  await page.goto('/admin/orders');
  await page.getByRole('textbox', { name: 'Email' }).fill(ORDER_MANAGER_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(ORDER_MANAGER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ORD-2026-1004' })).toBeVisible();

  await expect(page).toHaveScreenshot('admin-orders.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
