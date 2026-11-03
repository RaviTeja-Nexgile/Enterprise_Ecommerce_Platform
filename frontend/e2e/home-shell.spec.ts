import { test, expect } from '@playwright/test';

/**
 * Issue #1: the Angular workspace boots and the app shell renders.
 * A guest opens the home page and sees the header, the hero, the API status
 * card (which proves the /api proxy reaches the Flask API) and the footer.
 */
test('guest opens the home page and sees the app shell', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('link', { name: 'E-Commerce Platform home' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Shop the essentials, managed end to end' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse products' })).toBeVisible();

  await expect(page.getByRole('status')).toHaveText('The API is reachable.');

  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByText('Runs locally. No cloud services.')).toBeVisible();
});
