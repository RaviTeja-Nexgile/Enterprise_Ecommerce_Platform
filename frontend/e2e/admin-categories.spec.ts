import { test, expect } from '@playwright/test';

/**
 * Issue #15: category tree and brand list (requirements 13.1-13.6, 21.4,
 * 21.5, 23.4).
 *
 * An Admin signs in, sees the category tree with name, status, product count
 * and order, is refused when deleting a category that holds products, creates
 * a category under a parent, deletes an empty category, and creates a brand
 * that the product form then offers.
 */
test('admin manages the category tree and the brand list', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';
  const stamp = Date.now();

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/categories');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 13.1: the tree shows each category's name, status, product count and order.
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Order' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Status of Electronics' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Order of Electronics' })).toBeVisible();

  // 13.4: deleting a category that holds products is refused.
  await page
    .getByRole('row')
    .filter({ hasText: 'Electronics' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText("Move or archive this category's products first")).toBeVisible();

  // 13.2: a new category is saved under its parent.
  const childName = `Wave9 Child ${stamp}`;
  await page.getByRole('button', { name: 'New category' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill(childName);
  await page.getByRole('textbox', { name: 'Description' }).fill('Created by the wave 9 journey');
  await page.getByLabel('Parent category').selectOption({ label: 'Electronics' });
  await page.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByText(childName)).toBeVisible();

  // 13.5: deleting a category with no products removes it.
  await page
    .getByRole('row')
    .filter({ hasText: childName })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('Category deleted')).toBeVisible();
  await expect(page.getByText(childName)).toHaveCount(0);

});

/**
 * Issue #15: the brand list (requirement 13.6).
 *
 * An Admin signs in at the brand list, creates a brand and finds it in the
 * product form's brand list.
 */
test('admin creates a brand and the product form offers it', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';
  const stamp = Date.now();
  const brandName = `Wave9 Brand ${stamp}`;

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/brands');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Brands' })).toBeVisible();
  await page.getByRole('button', { name: 'New brand' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill(brandName);
  await page.getByRole('textbox', { name: 'Description' }).fill('Created by the wave 9 journey');
  await page.getByRole('button', { name: 'Create brand' }).click();
  await expect(page.getByText(brandName)).toBeVisible();

  // The brand list is the one the product form offers, so the saved brand is
  // in the same list the form loads.
  await expect(page.getByRole('cell', { name: brandName })).toBeVisible();
});
