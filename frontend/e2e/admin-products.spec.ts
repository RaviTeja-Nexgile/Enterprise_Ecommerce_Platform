import { test, expect } from '@playwright/test';

/**
 * Issue #14: product table and form (requirements 12.1, 12.2, 12.3, 12.4,
 * 12.7, 12.8, 12.9, 12.10).
 * An admin opens /admin/products, sees the searchable/filterable table, creates
 * a product (missing fields show errors, a duplicate SKU is refused), adds a
 * variant, publishes it, and archives it through the bulk action.
 */
test('admin manages products: table, create, variant, publish, archive', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';
  const stamp = Date.now();
  const sku = `E2E-${stamp}`;
  const name = `E2E Product ${stamp}`;

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/products');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 12.1: the searchable, filterable table of products.
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible();

  // 12.4: missing fields show an error beside each.
  await page.getByRole('button', { name: 'New product' }).click();
  await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByText('Enter a product name')).toBeVisible();
  await expect(page.getByText('Enter a SKU')).toBeVisible();
  await expect(page.locator('#product-category-error')).toBeVisible();
  await expect(page.getByText('Enter a regular price')).toBeVisible();

  // 12.3: a duplicate SKU keeps the form open with the exact message.
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('textbox', { name: 'SKU' }).fill('SKU-1031');
  await page.getByLabel('Category *').selectOption('Electronics');
  await page.getByRole('spinbutton', { name: 'Regular price (USD)' }).fill('19.99');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByText('This SKU is already in use').first()).toBeVisible();

  // 12.2: a unique SKU saves the product and opens the edit form.
  await page.getByRole('textbox', { name: 'SKU' }).fill(sku);
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible();
  await expect(page.getByText('Product created')).toBeVisible();

  // 12.7: add a variant with its own SKU, price and stock.
  await page.getByRole('textbox', { name: 'Variant name' }).fill('Small');
  await page.getByRole('textbox', { name: 'Variant SKU' }).fill(`${sku}-S`);
  await page.getByRole('spinbutton', { name: 'Variant price (USD)' }).fill('14.99');
  await page.getByRole('spinbutton', { name: 'Variant stock' }).fill('10');
  await page.getByRole('button', { name: 'Add variant' }).click();
  await expect(page.getByText('Variant added')).toBeVisible();
  await expect(page.getByText('Small')).toBeVisible();

  // 12.8: publish the product.
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Product published')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

  // 12.9 / 12.10: select the product and archive it through the bulk action.
  await page.getByRole('link', { name: 'Back to products' }).click();
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await page.getByRole('checkbox', { name: `Select ${name}` }).check();
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('1 product(s) updated')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(name) }).getByRole('cell', { name: 'Archived' })).toBeVisible();
});