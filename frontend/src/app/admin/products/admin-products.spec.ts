import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ToastService } from '../../shared/toast/toast.service';
import {
  DUPLICATE_SKU_MESSAGE,
  INVALID_IMAGE_MESSAGE,
  MAX_IMAGE_BYTES,
  isAcceptedImage,
} from './admin-product.model';
import { AdminProductsService } from './admin-products.service';
import { ProductFormComponent } from './product-form.component';
import { ProductTableComponent } from './product-table.component';

const PRODUCT = {
  id: 7,
  name: 'Aurora Desk Lamp',
  slug: 'aurora-desk-lamp',
  sku: 'LAMP-001',
  short_description: null,
  image_url: null,
  brand: 'Lumen',
  category: 'Home',
  category_id: 2,
  brand_id: 3,
  regular_price_cents: 12999,
  discounted_price_cents: null,
  discount_percentage: 0,
  in_stock: true,
  available_quantity: 12,
  rating_average: 4.5,
  rating_count: 3,
  is_featured: false,
  is_new_arrival: false,
  description: 'A lamp',
  status: 'draft',
  images: [],
  variants: [],
};

function imageFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('isAcceptedImage', () => {
  it('accepts a JPEG or PNG of 5 MB or less', () => {
    expect(isAcceptedImage(imageFile('photo.jpg', 'image/jpeg', 1024))).toBe(true);
    expect(isAcceptedImage(imageFile('photo.png', 'image/png', MAX_IMAGE_BYTES))).toBe(true);
  });

  it('refuses a file that is not a JPEG or PNG', () => {
    expect(isAcceptedImage(imageFile('notes.pdf', 'application/pdf', 1024))).toBe(false);
    expect(isAcceptedImage(imageFile('photo.gif', 'image/gif', 1024))).toBe(false);
  });

  it('refuses a file larger than 5 MB', () => {
    expect(isAcceptedImage(imageFile('big.png', 'image/png', MAX_IMAGE_BYTES + 1))).toBe(false);
  });
});

describe('AdminProductsService', () => {
  let service: AdminProductsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminProductsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists 20 products per page with the filters', () => {
    service.list({ q: 'lamp', status: 'draft', page: 2 }).subscribe();
    const request = http.expectOne(
      (req) =>
        req.url === '/api/v1/admin/products' &&
        req.params.get('q') === 'lamp' &&
        req.params.get('status') === 'draft' &&
        req.params.get('page') === '2' &&
        req.params.get('per_page') === '20',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { page: 2, per_page: 20, total: 0, total_pages: 0 } });
  });

  it('posts a bulk action for the selected ids', () => {
    service.bulk([1, 2], 'publish').subscribe();
    const request = http.expectOne('/api/v1/admin/products/bulk');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ids: [1, 2], action: 'publish' });
    request.flush({ updated: 2, status: 'published' });
  });
});

describe('ProductTableComponent', () => {
  let fixture: ComponentFixture<ProductTableComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductTableComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductTableComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function flushList(): void {
    http
      .expectOne((req) => req.url === '/api/v1/admin/products')
      .flush({ data: [PRODUCT], meta: { page: 1, per_page: 20, total: 1, total_pages: 1 } });
    http.expectOne('/api/v1/admin/categories').flush({ data: [] });
    http.expectOne('/api/v1/admin/brands').flush({ data: [] });
    fixture.detectChanges();
  }

  it('shows name, SKU, category, price, stock and status', () => {
    flushList();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aurora Desk Lamp');
    expect(text).toContain('LAMP-001');
    expect(text).toContain('Home');
    expect(text).toContain('$129.99');
    expect(text).toContain('12');
    expect(text).toContain('Draft');
  });

  it('runs a bulk action for every selected product', () => {
    flushList();
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const publish = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Publish') as HTMLButtonElement;
    publish.click();

    const bulk = http.expectOne('/api/v1/admin/products/bulk');
    expect(bulk.request.body).toEqual({ ids: [7], action: 'publish' });
    bulk.flush({ updated: 1, status: 'published' });
    http
      .expectOne((req) => req.url === '/api/v1/admin/products')
      .flush({ data: [PRODUCT], meta: { page: 1, per_page: 20, total: 1, total_pages: 1 } });
  });
});

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  async function setup(id: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFormComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/categories').flush({
      data: [{ id: 2, name: 'Home', slug: 'home', status: 'active', sort_order: 0, children: [] }],
    });
    http.expectOne('/api/v1/admin/brands').flush({ data: [] });
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function fill(value: { name?: string; sku?: string; category?: string; price?: string }): void {
    const set = (selector: string, text: string): void => {
      const input = element().querySelector(selector) as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    if (value.name !== undefined) set('#product-name', value.name);
    if (value.sku !== undefined) set('#product-sku', value.sku);
    if (value.category !== undefined) {
      const select = element().querySelector('#product-category') as HTMLSelectElement;
      select.value = value.category;
      select.dispatchEvent(new Event('change'));
    }
    if (value.price !== undefined) set('#product-price', value.price);
    fixture.detectChanges();
  }

  function submit(): void {
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows an error beside each missing field and keeps the form open', async () => {
    await setup(null);
    submit();

    const text = element().textContent ?? '';
    expect(text).toContain('Enter a product name');
    expect(text).toContain('Enter a SKU');
    expect(text).toContain('Choose a category');
    expect(text).toContain('Enter a regular price');
    http.expectNone('/api/v1/admin/products');
  });

  it('shows "This SKU is already in use" and keeps the form open', async () => {
    await setup(null);
    fill({ name: 'Aurora Lamp', sku: 'LAMP-001', category: '2', price: '129.99' });
    submit();

    const request = http.expectOne('/api/v1/admin/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Aurora Lamp',
      sku: 'LAMP-001',
      category_id: 2,
      brand_id: null,
      regular_price_cents: 12999,
      description: null,
    });
    request.flush(
      { error: { code: 'duplicate_sku', message: DUPLICATE_SKU_MESSAGE } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(element().textContent).toContain(DUPLICATE_SKU_MESSAGE);
    expect(element().querySelector('#product-name')).not.toBeNull();
  });

  it('refuses an image that is not a JPEG or PNG', async () => {
    await setup('7');
    http.expectOne('/api/v1/admin/products/7').flush(PRODUCT);
    fixture.detectChanges();

    const input = element().querySelector('#product-image') as HTMLInputElement;
    const file = imageFile('notes.pdf', 'application/pdf', 1024);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element().textContent).toContain(INVALID_IMAGE_MESSAGE);
    http.expectNone('/api/v1/admin/products/7/images');
  });

  it('refuses an image larger than 5 MB', async () => {
    await setup('7');
    http.expectOne('/api/v1/admin/products/7').flush(PRODUCT);
    fixture.detectChanges();

    const input = element().querySelector('#product-image') as HTMLInputElement;
    const file = imageFile('big.png', 'image/png', MAX_IMAGE_BYTES + 1);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element().textContent).toContain(INVALID_IMAGE_MESSAGE);
    http.expectNone('/api/v1/admin/products/7/images');
  });

  it('uploads a JPEG of 5 MB or less and shows it in the gallery', async () => {
    await setup('7');
    http.expectOne('/api/v1/admin/products/7').flush(PRODUCT);
    fixture.detectChanges();

    const input = element().querySelector('#product-image') as HTMLInputElement;
    const file = imageFile('photo.jpg', 'image/jpeg', 2048);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    const upload = http.expectOne('/api/v1/admin/products/7/images');
    expect(upload.request.method).toBe('POST');
    upload.flush({ id: 11, url: '/uploads/photo.jpg', alt_text: 'Aurora', sort_order: 0 });
    fixture.detectChanges();

    const gallery = element().querySelector('.gallery') as HTMLElement;
    expect(gallery).not.toBeNull();
    expect(gallery.querySelector('img')?.getAttribute('src')).toBe('/uploads/photo.jpg');
    expect(toasts.toasts().some((toast) => toast.message === 'Image added')).toBe(true);
  });

  it('adds a variant with its own SKU, price and stock', async () => {
    await setup('7');
    http.expectOne('/api/v1/admin/products/7').flush(PRODUCT);
    fixture.detectChanges();

    const set = (selector: string, text: string): void => {
      const input = element().querySelector(selector) as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    set('#variant-name', 'Large');
    set('#variant-sku', 'LAMP-001-L');
    set('#variant-price', '149.50');
    set('#variant-stock', '4');
    fixture.detectChanges();

    (element().querySelector('.variant-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = http.expectOne('/api/v1/admin/products/7/variants');
    expect(request.request.body).toEqual({
      name: 'Large',
      sku: 'LAMP-001-L',
      price_cents: 14950,
      stock: 4,
    });
    request.flush({
      id: 3,
      sku: 'LAMP-001-L',
      name: 'Large',
      price_cents: 14950,
      status: 'published',
      available_quantity: 4,
    });
    fixture.detectChanges();
    expect(element().textContent).toContain('LAMP-001-L');
  });
});
