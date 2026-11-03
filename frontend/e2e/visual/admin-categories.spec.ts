import { test, expect } from '@playwright/test';

/**
 * Issue #15: the admin category tree keeps its look.
 */
test('admin category tree keeps its look', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@12345';

  // Opening an authenticated route redirects to sign-in; signing in returns there.
  await page.goto('/admin/categories');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();

  await expect(page).toHaveScreenshot('admin-categories.png', {
    animations: 'disabled',
  });
});
