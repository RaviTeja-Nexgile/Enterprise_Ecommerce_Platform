import { test, expect } from '@playwright/test';

/**
 * Issue #3: registration screen (requirements 1.1, 1.2, 1.3).
 * A weak password keeps the form open with the password rule; a duplicate
 * email keeps it open with "An account with this email already exists"; a new
 * email signs the shopper in and opens the storefront home page.
 */
test('guest registers: weak password, duplicate email, then success', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';

  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  // Weak password (1.3).
  await page.getByRole('textbox', { name: 'First name' }).fill('Test');
  await page.getByRole('textbox', { name: 'Last name' }).fill('User');
  await page.getByRole('textbox', { name: 'Email' }).fill('newuser@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('weak');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText(
      'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit',
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  // Duplicate email (1.2).
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'An account with this email already exists' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  // New email signs the shopper in (1.1).
  const unique = `shopper${Date.now()}@example.com`;
  await page.getByRole('textbox', { name: 'Email' }).fill(unique);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Everything you need, delivered' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});