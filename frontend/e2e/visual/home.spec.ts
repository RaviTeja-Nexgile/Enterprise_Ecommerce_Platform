import { test, expect } from '@playwright/test';

/**
 * Issue #1: the home screen keeps its look.
 * The API status card is masked because its text depends on the API being up.
 */
test('home screen keeps its look', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Shop the essentials, managed end to end' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('The API is reachable.');

  await expect(page).toHaveScreenshot('home.png', {
    animations: 'disabled',
    mask: [page.getByRole('status')],
  });
});
