import { test, expect } from '@playwright/test';

/**
 * Issue #4: the storefront home page (requirements 3.1-3.7, 21.4, 21.5, 23.2).
 *
 * A guest opens `/` and sees the hero, featured categories, trending,
 * best-selling, new arrivals, special offers, testimonials, the newsletter
 * form and the footer, with at most 8 products per section. A featured
 * category opens the catalog filtered to it, a product card opens its detail
 * page, and the newsletter form shows its success and validation messages.
 */
test('guest browses the home page, a category, a product and the newsletter', async ({ page }) => {
  await page.goto('/');

  // 3.1: every home section is on the page.
  await expect(page.getByRole('heading', { name: 'Everything you need, delivered' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured categories' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trending' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Best selling' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Special offers' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New arrivals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What our customers say' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stay in the loop' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();

  // 3.2: each product section holds at most 8 product cards.
  for (const section of ['Trending', 'Best selling', 'Special offers', 'New arrivals']) {
    const region = page.getByRole('region', { name: section });
    const cards = region.locator('app-product-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(8);
  }

  // 3.3: a featured category opens the catalog filtered to that category.
  await page.getByRole('link', { name: /^Electronics/ }).first().click();
  await expect(page).toHaveURL(/\/products\?category=electronics/);

  // 3.4: a product card opens that product's detail page.
  await page.goto('/');
  await page.getByRole('link', { name: /Aurora Wireless Headphones/ }).first().click();
  await expect(page).toHaveURL(/\/products\/aurora-wireless-headphones/);

  // 3.6: an invalid email keeps the form open with the validation message.
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email address' }).fill('not-an-email');
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Subscribe' })).toBeVisible();

  // 3.5: a valid email shows the success message.
  await page.getByRole('textbox', { name: 'Email address' }).fill(`wave9-${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await expect(page.getByText('Thanks for subscribing')).toBeVisible();
});
