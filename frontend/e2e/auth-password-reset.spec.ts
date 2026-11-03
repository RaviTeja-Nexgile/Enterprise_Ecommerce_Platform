import { test, expect } from '@playwright/test';

/**
 * Issue #3: password reset screens (requirements 1.8, 1.10).
 * Requesting a reset shows the neutral confirmation; opening a reset link with
 * an invalid or already-used token shows "This reset link is no longer valid".
 */
test('guest requests a reset and sees the invalid-link state', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';

  // 1.8: the confirmation is shown whatever the email.
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('If the email is registered, a reset link has been sent')).toBeVisible();

  // 1.10: an invalid/used token shows the invalid-link message.
  await page.goto('/reset-password?token=not-a-real-token');
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByRole('textbox', { name: 'New password' }).fill('NewPass123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'This reset link is no longer valid' }).first(),
  ).toBeVisible();
});