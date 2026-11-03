import { test, expect } from '@playwright/test';

/**
 * Issue #12: review form on the product page (requirements 10.1, 10.2, 10.3,
 * 21.3, 23.4). A signed-in Customer submits a 1-5 star rating and a comment of
 * at least 10 characters; the review is saved as Pending and the
 * awaiting-approval message is shown. An invalid submission keeps the form
 * open with the validation message.
 *
 * A fresh account signs up inside the journey so it can run more than once.
 */
test('customer submits a review and sees the awaiting-approval message', async ({ page }) => {
  const stamp = Date.now();

  await page.goto('/register');
  await page.getByRole('textbox', { name: 'First name' }).fill('Review');
  await page.getByRole('textbox', { name: 'Last name' }).fill('Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(`review${stamp}@example.com`);
  await page.getByRole('textbox', { name: 'Password' }).fill('ReviewPass1');
  await page.getByRole('button', { name: 'Create account' }).click();

  // The new customer lands on the storefront home page.
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // Open a product detail page from a product card.
  await page.getByRole('link', { name: /The Quiet Ledger/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();

  // Invalid submission keeps the form open (10.3, 21.3).
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(
    page.getByText('Choose a rating and write at least 10 characters').first(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();

  // Valid submission is saved as Pending (10.1, 23.4).
  await page.getByRole('radio', { name: '5 stars' }).check();
  await page.getByLabel('Comment').fill('A fantastic read, highly recommended!');
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByText('Your review is awaiting approval').first()).toBeVisible();
  await expect(page.getByText('Pending')).toBeVisible();
});
