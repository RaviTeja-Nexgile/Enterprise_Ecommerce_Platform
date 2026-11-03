import { test, expect } from '@playwright/test';

/**
 * Issue #10: the account area (requirements 9.1-9.4, 21.3, 21.4, 21.5, 23.4).
 *
 * A Customer signs in, sees the overview (name, email, order count, total
 * spent, latest order status), saves their profile and sees "Profile updated",
 * changes their password and sees "Password changed", then adds, edits, sets
 * default and deletes an address in the address book.
 */
test('customer uses the account overview, profile, password and address book', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@example.com';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer@12345';

  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // 9.1: the overview shows name, email, order count, total spent and the
  // latest order's status.
  await page.getByRole('link', { name: 'Account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await expect(page.getByText('Casey Customer')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: /^Orders$/ })).toBeVisible();
  await expect(page.getByText('Total spent')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest order' })).toBeVisible();
  await expect(page.getByText('Status')).toBeVisible();

  // 9.2: saving the profile shows "Profile updated".
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('textbox', { name: 'Phone' }).fill('+1 555 0199');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Profile updated')).toBeVisible();

  // 9.3: changing the password shows "Password changed"; change it back so
  // the seeded login keeps working.
  const temporary = 'Wave9Temp@123';
  await page.getByRole('textbox', { name: 'Current password' }).fill(password);
  await page.getByRole('textbox', { name: 'New password', exact: true }).fill(temporary);
  await page.getByRole('textbox', { name: 'Confirm new password' }).fill(temporary);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed')).toBeVisible();

  await page.getByRole('textbox', { name: 'Current password' }).fill(temporary);
  await page.getByRole('textbox', { name: 'New password', exact: true }).fill(password);
  await page.getByRole('textbox', { name: 'Confirm new password' }).fill(password);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed')).toBeVisible();

  // 9.4: the address book lists addresses and lets the customer add, edit,
  // set default and delete one.
  await page.getByRole('link', { name: 'Addresses' }).click();
  await expect(page.getByRole('heading', { name: 'Addresses' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Add address' }).click();
  await page.getByRole('textbox', { name: 'Address line 1' }).fill('22 Wave Street');
  await page.getByRole('textbox', { name: 'City' }).fill('Seattle');
  await page.getByRole('textbox', { name: 'State' }).fill('WA');
  await page.getByRole('textbox', { name: 'Postal code' }).fill('98101');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('22 Wave Street')).toBeVisible();

  // Edit the new address.
  await page
    .getByRole('listitem')
    .filter({ hasText: '22 Wave Street' })
    .getByRole('button', { name: 'Edit' })
    .click();
  await page.getByRole('textbox', { name: 'Address line 1' }).fill('24 Wave Street');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('24 Wave Street')).toBeVisible();

  // Set it as the default address.
  await page
    .getByRole('listitem')
    .filter({ hasText: '24 Wave Street' })
    .getByRole('button', { name: 'Set default' })
    .click();
  await expect(
    page.getByRole('listitem').filter({ hasText: '24 Wave Street' }).getByText('Default'),
  ).toBeVisible();

  // Delete it again.
  await page
    .getByRole('listitem')
    .filter({ hasText: '24 Wave Street' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('24 Wave Street')).toHaveCount(0);
});
