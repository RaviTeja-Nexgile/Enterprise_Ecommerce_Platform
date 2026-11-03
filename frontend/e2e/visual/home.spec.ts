import { test, expect } from '@playwright/test';

/**
 * Issue #1: the home screen keeps its look.
 * The hero asserts the storefront home endpoint returns its sections.
 */
test('home screen keeps its look', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Everything you need, delivered' })).toBeVisible();

  await expect(page).toHaveScreenshot('home.png', {
    animations: 'disabled',
  });
});
