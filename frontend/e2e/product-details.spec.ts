import { test, expect } from '@playwright/test';

/**
 * Issue #6: the product details page (requirements 5.1-5.8, 21.4, 21.5).
 *
 * A Guest shopper opens `/products/atlas-trail-runner` and sees the gallery,
 * name, SKU, prices and discount, stock, description, variants, quantity
 * selector, the two buttons, the rating summary, the approved reviews and the
 * related products. A thumbnail becomes the main image, the main image opens
 * the zoom dialog, a variant updates the SKU, price and stock, an out-of-stock
 * variant disables "Add to cart" with "Out of stock", a signed-out wishlist
 * click opens the sign-in page, the page shows within 2 seconds, and the
 * product is added to the recently viewed list kept in local storage.
 */
test('guest browses a product detail page', async ({ page }) => {
  // 5.7: the page shows within 2 seconds on a local machine.
  const started = Date.now();
  await page.goto('/products/atlas-trail-runner');
  await expect(page.getByRole('heading', { name: 'Atlas Trail Runner', level: 1 })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2000);

  // 5.1: the gallery, name, SKU, prices, discount, stock, description,
  // variants, quantity selector, buttons, rating summary, reviews and related
  // products.
  await expect(page.getByRole('button', { name: 'Zoom image: Atlas Trail Runner image 1' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Product images' })).toBeVisible();
  await expect(page.getByText('SKU SKU-1008')).toBeVisible();
  await expect(page.getByText('$95.99').first()).toBeVisible();
  await expect(page.getByText('$119.99').first()).toBeVisible();
  await expect(page.getByText('-20%')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Out of stock' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Options' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Add to cart' }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add to wishlist' })).toBeVisible();
  await expect(page.getByLabel('3 out of 5 stars').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Customer reviews' })).toBeVisible();
  await expect(page.getByText('Solid quality and a nice finish.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Related products' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Merino Crew Sweater/ })).toBeVisible();

  // 5.2: clicking a thumbnail makes that image the main one.
  await page.getByRole('button', { name: 'Show image Atlas Trail Runner image 2' }).click();
  await expect(page.getByRole('button', { name: 'Zoom image: Atlas Trail Runner image 2' })).toBeVisible();

  // 5.3: clicking the main image shows it enlarged with zoom.
  await page.getByRole('button', { name: 'Zoom image: Atlas Trail Runner image 2' }).click();
  const zoom = page.getByRole('dialog', { name: 'Enlarged image' });
  await expect(zoom).toBeVisible();
  await expect(zoom.getByRole('img', { name: 'Atlas Trail Runner image 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Close enlarged image' }).click();
  await expect(zoom).toBeHidden();

  // 5.4: selecting a variant shows its SKU, price and stock.
  await page.getByRole('button', { name: 'US 8' }).click();
  await expect(page.getByText('SKU SKU-1008-V1')).toBeVisible();
  await expect(page.getByText('$119.99').first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'In stock (18 available)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to cart' }).first()).toBeEnabled();

  // 5.5: a variant with no stock disables "Add to cart" and shows "Out of stock".
  await page.getByRole('button', { name: 'US 9' }).click();
  await expect(page.getByText('SKU SKU-1008-V2')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Out of stock' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to cart' }).first()).toBeDisabled();

  // 5.6: a signed-out wishlist click opens the sign-in page.
  await page.getByRole('button', { name: 'Add to wishlist' }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

/**
 * 5.8: opening a product adds it to the recently viewed products kept in local
 * storage, showing at most 6 of them.
 */
test('guest sees at most 6 recently viewed products', async ({ page }) => {
  await page.goto('/products/atlas-trail-runner');
  await expect(page.getByRole('heading', { name: 'Atlas Trail Runner', level: 1 })).toBeVisible();

  // Visit six more products so the list would grow past its limit.
  for (const slug of [
    'merino-crew-sweater',
    'canvas-weekender-bag',
    'everyday-denim-jacket',
    'summit-yoga-mat',
    'harvest-sea-salt-1kg',
    'harvest-honey-500g',
  ]) {
    await page.goto(`/products/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('recently_viewed_products');
    return raw ? (JSON.parse(raw) as { slug: string }[]) : [];
  });
  expect(stored.length).toBe(6);
  expect(stored.map((entry) => entry.slug)).toContain('harvest-honey-500g');

  // The page shows the recently viewed section with at most 6 products.
  await page.goto('/products/atlas-trail-runner');
  const recent = page.getByRole('region', { name: 'Recently viewed' });
  await expect(recent).toBeVisible();
  const cards = recent.getByRole('link');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(6);
});

/**
 * 21.4 and 21.5: the product page has no horizontal scrolling at 375 px and
 * keeps the desktop layout with the full navigation at 1440 px.
 */
test('product page fits a 375 px screen and keeps the desktop layout at 1440 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/products/atlas-trail-runner');
  await expect(page.getByRole('heading', { name: 'Atlas Trail Runner', level: 1 })).toBeVisible();
  const phone = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(phone.scroll).toBeLessThanOrEqual(phone.client);

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(desktop.scroll).toBeLessThanOrEqual(desktop.client);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
});
