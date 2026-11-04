import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ProductDetail } from '../../core/models/catalog.model';
import { ToastService } from '../../shared/toast/toast.service';
import {
  OUT_OF_STOCK_MESSAGE,
  ProductDetailsComponent,
  RECENTLY_VIEWED_KEY,
} from './product-details.component';

const SLUG = 'wireless-headphones';

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 7,
    name: 'Wireless Headphones',
    slug: SLUG,
    sku: 'WH-001',
    short_description: 'Comfortable over-ear headphones',
    image_url: 'https://example.test/1.jpg',
    brand: 'Acme',
    category: 'Audio',
    regular_price_cents: 12999,
    discounted_price_cents: 9999,
    discount_percentage: 23,
    in_stock: true,
    available_quantity: 10,
    rating_average: 4.5,
    rating_count: 2,
    is_featured: false,
    is_new_arrival: false,
    description: 'A long description of the headphones.',
    status: 'published',
    images: [
      { id: 1, url: 'https://example.test/1.jpg', alt_text: 'Front', sort_order: 0 },
      { id: 2, url: 'https://example.test/2.jpg', alt_text: 'Side', sort_order: 1 },
    ],
    variants: [
      {
        id: 11,
        sku: 'WH-001-BLK',
        name: 'Black',
        price_cents: 9999,
        attributes: { color: 'Black' },
        status: 'published',
        available_quantity: 5,
      },
      {
        id: 12,
        sku: 'WH-001-WHT',
        name: 'White',
        price_cents: 10999,
        attributes: { color: 'White' },
        status: 'published',
        available_quantity: 0,
      },
    ],
    attributes: [{ name: 'Color', values: ['Black', 'White'] }],
    reviews: [
      {
        id: 1,
        product_id: 7,
        user_id: 3,
        rating: 5,
        comment: 'Great sound quality',
        is_verified_purchase: true,
        status: 'approved',
        created_at: '2026-11-01T00:00:00Z',
      },
    ],
    related: [],
    rating_summary: { average: 4.5, count: 2, counts: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 } },
    ...overrides,
  };
}

describe('ProductDetailsComponent', () => {
  let fixture: ComponentFixture<ProductDetailsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: { subscribe: (fn: (map: unknown) => void) => fn(convertToParamMap({ slug: SLUG })) } },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductDetailsComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function load(product: ProductDetail = detail()): void {
    http.expectOne((req) => req.url.endsWith(`/products/${SLUG}`)).flush(product);
    fixture.detectChanges();
  }

  function click(selector: string): void {
    const target = element().querySelector<HTMLElement>(selector);
    expect(target).not.toBeNull();
    target!.click();
    fixture.detectChanges();
  }

  it('shows the name, SKU, prices, discount and stock', () => {
    load();

    const text = element().textContent ?? '';
    expect(text).toContain('Wireless Headphones');
    expect(text).toContain('WH-001');
    expect(text).toContain('$99.99');
    expect(text).toContain('$129.99');
    expect(text).toContain('-23%');
    expect(text).toContain('In stock');
  });

  it('shows the description, specifications and approved reviews', () => {
    load();

    const text = element().textContent ?? '';
    expect(text).toContain('A long description of the headphones.');
    expect(text).toContain('Color');
    expect(text).toContain('Great sound quality');
    expect(text).toContain('Verified purchase');
  });

  it('shows the clicked thumbnail as the main image', () => {
    load();

    const main = () => element().querySelector<HTMLImageElement>('.gallery__image');
    expect(main()?.getAttribute('src')).toBe('https://example.test/1.jpg');

    const thumbs = element().querySelectorAll<HTMLButtonElement>('.gallery__thumb');
    expect(thumbs.length).toBe(2);
    thumbs[1].click();
    fixture.detectChanges();

    expect(main()?.getAttribute('src')).toBe('https://example.test/2.jpg');
  });

  it('opens the enlarged image when the main image is clicked', () => {
    load();

    expect(element().querySelector('.gallery__overlay')).toBeNull();
    click('.gallery__zoom-trigger');

    const overlay = element().querySelector('.gallery__overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(element().querySelector('.gallery__zoom-image')).not.toBeNull();
  });

  it('updates the SKU, price and stock when a variant is selected', () => {
    load();

    const chips = element().querySelectorAll<HTMLButtonElement>('.product-details__chip');
    expect(chips.length).toBe(2);
    chips[1].click();
    fixture.detectChanges();

    const text = element().textContent ?? '';
    expect(text).toContain('WH-001-WHT');
    expect(text).toContain('$109.99');
    expect(text).toContain(OUT_OF_STOCK_MESSAGE);
  });

  it('disables Add to cart and shows Out of stock when the variant has no stock', () => {
    load();

    const chips = element().querySelectorAll<HTMLButtonElement>('.product-details__chip');
    chips[1].click();
    fixture.detectChanges();

    const addButton = element().querySelector<HTMLButtonElement>(
      '.product-details__actions app-button button',
    );
    expect(addButton?.disabled).toBe(true);
    expect(element().textContent).toContain(OUT_OF_STOCK_MESSAGE);
  });

  it('adds the selected variant and quantity to the cart', () => {
    const toast = TestBed.inject(ToastService);
    load();

    const chips = element().querySelectorAll<HTMLButtonElement>('.product-details__chip');
    chips[0].click();
    fixture.detectChanges();
    click('.product-details__step[aria-label="Increase quantity"]');
    click('.product-details__actions app-button button');

    const request = http.expectOne((req) => req.url.endsWith('/cart/items'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ product_id: 7, variant_id: 11, quantity: 2 });
    request.flush({});
    fixture.detectChanges();

    expect(toast.toasts().some((item) => item.message === 'Added to cart')).toBe(true);
  });

  it('sends a signed-out wishlist click to the sign-in page', () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    expect(auth.isSignedIn()).toBe(false);
    load();

    const buttons = element().querySelectorAll<HTMLButtonElement>(
      '.product-details__actions app-button button',
    );
    buttons[1].click();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
    http.expectNone((req) => req.url.includes('/wishlist/items'));
  });

  it('keeps at most 6 recently viewed products in local storage', () => {
    const existing = Array.from({ length: 6 }, (_, index) => ({
      ...detail({ id: 100 + index, slug: `old-${index}` }),
    }));
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(existing));

    load();

    const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]') as { id: number }[];
    expect(stored.length).toBe(6);
    expect(stored[0].id).toBe(7);
    expect(stored.some((entry) => entry.id === 105)).toBe(false);
  });

  it('shows the not-found message when the product cannot be loaded', () => {
    http
      .expectOne((req) => req.url.endsWith(`/products/${SLUG}`))
      .flush({ error: { code: 'not_found', message: 'The requested product was not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'The requested product was not found',
    );
  });
});
