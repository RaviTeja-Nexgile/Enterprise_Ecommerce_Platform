import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminCategory,
  CATEGORY_DELETED_MESSAGE,
  CATEGORY_HAS_PRODUCTS_MESSAGE,
} from './admin-category.model';
import { AdminCategoriesService, flattenCategoryTree } from './admin-categories.service';
import { CategoryFormComponent } from './category-form.component';
import { CategoryTreeComponent } from './category-tree.component';

const HOME: AdminCategory = {
  id: 1,
  name: 'Home',
  slug: 'home',
  status: 'active',
  sort_order: 0,
  product_count: 3,
  children: [
    {
      id: 2,
      name: 'Lighting',
      slug: 'lighting',
      status: 'inactive',
      sort_order: 1,
      product_count: 2,
      children: [],
    },
  ],
};

describe('flattenCategoryTree', () => {
  it('flattens a tree into rows with their depth', () => {
    const rows = flattenCategoryTree([HOME]);
    expect(rows.map((row) => row.category.name)).toEqual(['Home', 'Lighting']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1]);
  });
});

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminCategoriesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the category tree', () => {
    service.tree().subscribe();
    const request = http.expectOne('/api/v1/admin/categories');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [HOME] });
  });

  it('creates a category', () => {
    service.create({ name: 'Lighting', parent_id: 1 }).subscribe();
    const request = http.expectOne('/api/v1/admin/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Lighting', parent_id: 1 });
    request.flush({ id: 3, name: 'Lighting', slug: 'lighting', status: 'active', sort_order: 0 });
  });
});

describe('CategoryTreeComponent', () => {
  let fixture: ComponentFixture<CategoryTreeComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryTreeComponent],
      // The app shows API errors through the error interceptor, so the spec
      // registers it too and the refusal is asserted where users see it.
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryTreeComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushTree(data: AdminCategory[]): void {
    http.expectOne('/api/v1/admin/categories').flush({ data });
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('shows the tree with name, status, product count and order', () => {
    flushTree([HOME]);
    const text = element().textContent ?? '';
    expect(text).toContain('Home');
    expect(text).toContain('Lighting');
    expect(text).toContain('3');
    expect(text).toContain('2');

    const orderInputs = Array.from(element().querySelectorAll('.order-input')) as HTMLInputElement[];
    expect(orderInputs.map((input) => input.value)).toEqual(['0', '1']);
  });

  it('saves a status change and reloads', () => {
    flushTree([HOME]);
    const select = element().querySelector('.status-select') as HTMLSelectElement;
    select.value = 'inactive';
    select.dispatchEvent(new Event('change'));

    const request = http.expectOne('/api/v1/admin/categories/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'inactive' });
    request.flush({ ...HOME, status: 'inactive' });
    http.expectOne('/api/v1/admin/categories').flush({ data: [HOME] });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === 'Category updated')).toBe(true);
  });

  it('saves a new order and reloads', () => {
    flushTree([HOME]);
    const input = element().querySelector('.order-input') as HTMLInputElement;
    input.value = '5';
    input.dispatchEvent(new Event('change'));

    const request = http.expectOne('/api/v1/admin/categories/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ sort_order: 5 });
    request.flush({ ...HOME, sort_order: 5 });
    http.expectOne('/api/v1/admin/categories').flush({ data: [HOME] });
    fixture.detectChanges();
  });

  it('refuses to delete a category that contains products', () => {
    flushTree([HOME]);
    button('Delete').click();

    const request = http.expectOne('/api/v1/admin/categories/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(
      { error: { code: 'category_has_products', message: CATEGORY_HAS_PRODUCTS_MESSAGE } },
      { status: 409, statusText: 'Conflict' },
    );
    http.expectOne('/api/v1/admin/categories').flush({ data: [HOME] });
    fixture.detectChanges();

    const refusals = toasts
      .toasts()
      .filter((toast) => toast.message === CATEGORY_HAS_PRODUCTS_MESSAGE);
    expect(refusals.length).toBe(1);
  });

  it('deletes a category with no products and shows "Category deleted"', () => {
    flushTree([{ ...HOME, product_count: 0, children: [] }]);
    button('Delete').click();

    const request = http.expectOne('/api/v1/admin/categories/1');
    request.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/v1/admin/categories').flush({ data: [] });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === CATEGORY_DELETED_MESSAGE)).toBe(true);
  });
});

describe('CategoryFormComponent', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryFormComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.componentRef.setInput('category', null);
    fixture.componentRef.setInput('tree', [HOME]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function submit(): void {
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('creates a category under its parent', () => {
    const name = element().querySelector('#category-name') as HTMLInputElement;
    name.value = 'Lighting';
    name.dispatchEvent(new Event('input'));
    const parent = element().querySelector('#category-parent') as HTMLSelectElement;
    parent.value = '1';
    parent.dispatchEvent(new Event('change'));
    submit();

    const request = http.expectOne('/api/v1/admin/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Lighting',
      description: null,
      parent_id: 1,
      status: 'active',
    });
    request.flush({ id: 3, name: 'Lighting', slug: 'lighting', status: 'active', sort_order: 0 });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === 'Category created')).toBe(true);
  });

  it('shows an error beside a missing name and keeps the form open', () => {
    submit();
    expect(element().textContent).toContain('Enter a category name');
    http.expectNone('/api/v1/admin/categories');
  });
});