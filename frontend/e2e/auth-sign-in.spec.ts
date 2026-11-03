import { test, expect } from '@playwright/test';

/**
 * Issue #3: sign-in screen (requirements 1.4, 1.5, 1.7).
 * A customer signs in with a wrong password and sees "Invalid email or
 * password"; then signs in correctly and lands on the storefront home page;
 * then signs out and returns to the sign-in page.
 */
test('customer signs in, sees the wrong-password error, and signs out', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Wrong password keeps the form open with the exact message (1.5).
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPass123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Correct credentials open the storefront home page (1.4).
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Shop the essentials, managed end to end' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // Sign out revokes the session and opens the sign-in page (1.7).
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});