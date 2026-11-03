import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductSummary, StorefrontHome } from '../../core/models/catalog.model';
import { NewsletterComponent } from '../newsletter/newsletter.component';
import { HomeComponent } from './home.component';

function product(id: number, name: string): ProductSummary {
  return {
    id,
    name,
    slug: `slug-${id}`,
    sku: `SKU-${id}`,
    short_description: null,
    image_url: `/uploads/p${id}.svg`,
    brand: 'Northwind',
    category: 'Electronics',
    regular_price_cents: 10000,
    discounted_price_cents: null,
    discount_percentage: 0,
    in_stock: true,
    available_quantity: 5,
    rating_average: 4.5,
    rating_count: 10,
    is_featured: false,
    is_new_arrival: false,
  };
}

const homeData: StorefrontHome = {
  hero: {
    title: 'Everything you need, delivered',
    subtitle: 'Curated products from brands you can trust.',
    image_url: '/uploads/hero.svg',
    cta: 'Shop the catalog',
  },
  featured_categories: [
    { id: 1, name: 'Electronics', slug: 'electronics', status: 'active', sort_order: 0, image_url: '/uploads/cat.svg', product_count: 4 },
    { id: 2, name: 'Home & Kitchen', slug: 'home-kitchen', status: 'active', sort_order: 1, image_url: '/uploads/cat2.svg', product_count: 3 },
  ],
  trending: [product(1, 'Lamp'), product(2, 'Chair')],
  best_selling: [product(3, 'Desk')],
  new_arrivals: [product(4, 'Mug')],
  offers: [product(5, 'Sofa')],
  testimonials: [{ name: 'Jordan L.', quote: 'Fast delivery and the quality is excellent.', rating: 5 }],
};

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows skeleton placeholders while the home data loads', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.home__skeleton')).not.toBeNull();
    expect(element.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    http.expectOne('/api/v1/storefront/home').flush(homeData);
  });

  it('renders the hero, every section, testimonials and the newsletter', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/storefront/home').flush(homeData);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.hero__title')?.textContent).toContain('Everything you need, delivered');
    expect(element.querySelector('#featured-heading')?.textContent).toContain('Featured categories');
    expect(element.querySelector('#trending-heading')?.textContent).toContain('Trending');
    expect(element.querySelector('#best-selling-heading')?.textContent).toContain('Best selling');
    expect(element.querySelector('#offers-heading')?.textContent).toContain('Special offers');
    expect(element.querySelector('#new-arrivals-heading')?.textContent).toContain('New arrivals');
    expect(element.querySelector('#testimonials-heading')?.textContent).toContain('What our customers say');
    expect(element.querySelector('.testimonial__quote')?.textContent).toContain('Fast delivery');
    expect(element.querySelector('app-newsletter')).not.toBeNull();
  });

  it('fills each product section from the API with at most 8 products', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/storefront/home').flush(homeData);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trending = element.querySelectorAll('#trending-heading + .product-grid app-product-card');
    expect(trending.length).toBeGreaterThan(0);
    expect(trending.length).toBeLessThanOrEqual(8);
    expect(trending.length).toBe(2);
  });

  it('opens the catalog filtered to a category when a category tile is clicked', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/storefront/home').flush(homeData);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const tile = element.querySelector('.category-tile') as HTMLAnchorElement;
    expect(tile).not.toBeNull();
    expect(tile.getAttribute('href')).toContain('/products');
    expect(tile.getAttribute('href')).toContain('category=electronics');
  });

  it('opens the product detail page when a product card is clicked', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/storefront/home').flush(homeData);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('app-product-card a') as HTMLAnchorElement;
    expect(card).not.toBeNull();
    expect(card.getAttribute('href')).toContain('/products/slug-1');
  });
});

describe('NewsletterComponent', () => {
  let fixture: ComponentFixture<NewsletterComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsletterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(NewsletterComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function typeEmail(value: string): void {
    const input = fixture.nativeElement.querySelector('#newsletter-email') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Click the Subscribe button so the real form submit wiring (ngSubmit) runs. */
  function submitForm(): void {
    const button = fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  it('shows "Thanks for subscribing" for a valid email', () => {
    typeEmail('shopper@example.com');
    submitForm();
    const request = http.expectOne('/api/v1/newsletter');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'shopper@example.com' });
    request.flush({ message: 'Thanks for subscribing' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.newsletter__message')?.textContent).toContain(
      'Thanks for subscribing',
    );
  });

  it('keeps the form open and shows "Enter a valid email address" for an invalid email', () => {
    typeEmail('not-an-email');
    submitForm();
    expect(fixture.nativeElement.querySelector('.field__error')?.textContent).toContain(
      'Enter a valid email address',
    );
    expect(fixture.nativeElement.querySelector('#newsletter-email')).not.toBeNull();
  });

  it('keeps the form open and shows the error for an empty email', () => {
    submitForm();
    expect(fixture.nativeElement.querySelector('.field__error')?.textContent).toContain(
      'Enter a valid email address',
    );
    expect(fixture.nativeElement.querySelector('#newsletter-email')).not.toBeNull();
  });
});