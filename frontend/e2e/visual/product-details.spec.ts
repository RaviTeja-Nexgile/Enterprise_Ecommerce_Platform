import { test, expect } from '@playwright/test';

/**
 * The look of the product details page (issue #6). The product is answered
 * with fixed records so the screenshot does not change with the seed data.
 */
test('product details keeps its look', async ({ page }) => {
  const product = {
    id: 9,
    name: 'Atlas Trail Runner',
    slug: 'atlas-trail-runner',
    sku: 'SKU-1008',
    short_description: 'Lightweight trail shoes with a grippy outsole',
    description:
      'Lightweight trail shoes with a grippy outsole. Built for everyday use, backed by a two-year warranty and shipped from our local warehouse.',
    brand: 'Atlas Wear',
    category: 'Fashion',
    status: 'published',
    regular_price_cents: 11999,
    discounted_price_cents: 9599,
    discount_percentage: 20,
    in_stock: false,
    available_quantity: 0,
    is_featured: true,
    is_new_arrival: false,
    rating_average: 4.8,
    rating_count: 24,
    rating_summary: {
      average: 3,
      count: 1,
      counts: { '1': 0, '2': 0, '3': 1, '4': 0, '5': 0 },
    },
    image_url: '/uploads/product-atlas-trail-runner-1.svg',
    images: [
      { id: 17, url: '/uploads/product-atlas-trail-runner-1.svg', alt_text: 'Atlas Trail Runner image 1', sort_order: 0 },
      { id: 18, url: '/uploads/product-atlas-trail-runner-2.svg', alt_text: 'Atlas Trail Runner image 2', sort_order: 1 },
    ],
    attributes: [],
    variants: [
      { id: 1, name: 'US 8', sku: 'SKU-1008-V1', price_cents: 11999, available_quantity: 18, status: 'published', attributes: { option: 'US 8' } },
      { id: 2, name: 'US 9', sku: 'SKU-1008-V2', price_cents: 11999, available_quantity: 0, status: 'published', attributes: { option: 'US 9' } },
      { id: 3, name: 'US 10', sku: 'SKU-1008-V3', price_cents: 12499, available_quantity: 4, status: 'published', attributes: { option: 'US 10' } },
    ],
    reviews: [
      {
        id: 9,
        product_id: 9,
        user_id: 7,
        rating: 3,
        comment: 'Solid quality and a nice finish.',
        status: 'approved',
        is_verified_purchase: true,
        created_at: '2026-11-04T14:35:14.596521',
      },
    ],
    related: [
      {
        id: 10,
        name: 'Merino Crew Sweater',
        slug: 'merino-crew-sweater',
        sku: 'SKU-1009',
        short_description: 'Fine merino wool sweater that resists odour',
        image_url: '/uploads/product-merino-crew-sweater-1.svg',
        brand: 'Atlas Wear',
        category: 'Fashion',
        regular_price_cents: 8499,
        discounted_price_cents: null,
        discount_percentage: 0,
        in_stock: true,
        available_quantity: 60,
        rating_average: 4.1,
        rating_count: 25,
        is_featured: false,
        is_new_arrival: false,
      },
    ],
  };

  await page.route('**/api/v1/products/atlas-trail-runner', (route) => route.fulfill({ json: product }));
  await page.goto('/products/atlas-trail-runner');
  await expect(page.getByRole('heading', { name: 'Atlas Trail Runner', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Related products' })).toBeVisible();

  await expect(page).toHaveScreenshot('product-details.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
