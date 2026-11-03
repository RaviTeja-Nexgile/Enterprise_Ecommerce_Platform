import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminCustomer,
  AdminCustomerProfile,
  CUSTOMER_ACTIVATED_MESSAGE,
  CUSTOMER_DEACTIVATED_MESSAGE,
} from './admin-customer.model';
import { AdminCustomersService } from './admin-customers.service';
import { CustomerProfileComponent } from './customer-profile.component';
import { CustomerTableComponent } from './customer-table.component';

const ALICE: AdminCustomer = {
  id: 7,
  name: 'Alice Shopper',
  email: 'alice@example.com',
  phone: '555-0100',
  registered_at: '2026-01-15T10:00:00',
  is_active: true,
  total_spent_cents: 12999,
};

const BOB: AdminCustomer = {
  id: 8,
  name: 'Bob Buyer',
  email: 'bob@example.com',
  phone: null,
  registered_at: '2026-02-20T09:30:00',
  is_active: false,
  total_spent_cents: 0,
};

const PROFILE: AdminCustomerProfile = {
  ...ALICE,
  addresses: [
    {
      id: 1,
      type: 'shipping',
      line1: '1 Main Street',
      line2: null,
      city: 'Springfield',
      state: 'IL',
      postal_code: '62701',
      country: 'US',
      is_default: true,
    },
  ],
  orders: [
    {
      id: 11,
      order_number: 'ORD-1001',
      status: 'delivered',
      total_cents: 12999,
      placed_at: '2026-03-01T12:00:00',
    },
  ],
  order_count: 1,
  spending: { total_cents: 12999 },
};

const META = { page: 1, per_page: 20, total: 2, total_pages: 1 };

describe('AdminCustomersService', () => {
  let service: AdminCustomersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminCustomersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists customers with the search and page', () => {
    service.list({ q: 'alice', page: 2, per_page: 20 }).subscribe();
    const request = http.expectOne(
      (req) => req.url === '/api/v1/admin/customers' && req.method === 'GET',
    );
    expect(request.request.params.get('q')).toBe('alice');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('per_page')).toBe('20');
    request.flush({ data: [ALICE], meta: META });
  });

  it('loads a customer profile', () => {
    service.profile(7).subscribe();
    const request = http.expectOne('/api/v1/admin/customers/7');
    expect(request.request.method).toBe('GET');
    request.flush(PROFILE);
  });

  it('patches the account status', () => {
    service.setActive(7, false).subscribe();
    const request = http.expectOne('/api/v1/admin/customers/7');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ is_active: false });
    request.flush({ ...ALICE, is_active: false });
  });
});

describe('CustomerTableComponent', () => {
  let fixture: ComponentFixture<CustomerTableComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerTableComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomerTableComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushList(data: AdminCustomer[], meta = META): void {
    http.expectOne((req) => req.url === '/api/v1/admin/customers').flush({ data, meta });
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('shows name, email, registration date, status and total spent', () => {
    flushList([ALICE, BOB]);
    const text = element().textContent ?? '';
    expect(text).toContain('Alice Shopper');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('$129.99');
    expect(text).toContain('Active');
    expect(text).toContain('Inactive');
    expect(text).toContain(new Date(ALICE.registered_at as string).toLocaleDateString('en-US'));
  });

  it('searches customers by the typed text', () => {
    flushList([ALICE, BOB]);

    const input = element().querySelector('#customer-search') as HTMLInputElement;
    input.value = 'alice';
    input.dispatchEvent(new Event('input'));
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const request = http.expectOne(
      (req) => req.url === '/api/v1/admin/customers' && req.params.get('q') === 'alice',
    );
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ data: [ALICE], meta: { ...META, total: 1 } });
    fixture.detectChanges();

    expect(element().textContent).toContain('Alice Shopper');
    expect(element().textContent).not.toContain('Bob Buyer');
  });

  it('deactivates an active customer and shows the success toast', () => {
    flushList([ALICE, BOB]);
    button('Deactivate').click();

    const request = http.expectOne('/api/v1/admin/customers/7');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ is_active: false });
    request.flush({ ...ALICE, is_active: false });
    http.expectOne((req) => req.url === '/api/v1/admin/customers').flush({
      data: [{ ...ALICE, is_active: false }, BOB],
      meta: META,
    });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === CUSTOMER_DEACTIVATED_MESSAGE)).toBe(
      true,
    );
  });

  it('activates an inactive customer and shows the success toast', () => {
    flushList([ALICE, BOB]);
    button('Activate').click();

    const request = http.expectOne('/api/v1/admin/customers/8');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ is_active: true });
    request.flush({ ...BOB, is_active: true });
    http.expectOne((req) => req.url === '/api/v1/admin/customers').flush({
      data: [ALICE, { ...BOB, is_active: true }],
      meta: META,
    });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === CUSTOMER_ACTIVATED_MESSAGE)).toBe(
      true,
    );
  });

  it('shows an empty state when no customer matches', () => {
    flushList([], { page: 1, per_page: 20, total: 0, total_pages: 0 });
    expect(element().textContent).toContain('No customers match your search.');
    expect(button('Clear search')).toBeTruthy();
  });

  it('shows the load error with a retry instead of the empty state when the list fails', () => {
    http
      .expectOne((req) => req.url === '/api/v1/admin/customers')
      .flush(
        { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    fixture.detectChanges();

    expect(element().textContent).toContain('Too many requests. Please try again later.');
    expect(element().textContent).not.toContain('No customers match your search.');

    button('Try again').click();
    http.expectOne((req) => req.url === '/api/v1/admin/customers').flush({
      data: [ALICE],
      meta: { ...META, total: 1 },
    });
    fixture.detectChanges();

    expect(element().textContent).toContain('Alice Shopper');
  });
});

describe('CustomerProfileComponent', () => {
  let fixture: ComponentFixture<CustomerProfileComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerProfileComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomerProfileComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushProfile(profile: AdminCustomerProfile = PROFILE): void {
    http.expectOne('/api/v1/admin/customers/7').flush(profile);
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('shows details, addresses, order history and spending summary', () => {
    flushProfile();
    const text = element().textContent ?? '';
    expect(text).toContain('Alice Shopper');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('555-0100');
    expect(text).toContain('1 Main Street');
    expect(text).toContain('Springfield');
    expect(text).toContain('ORD-1001');
    expect(text).toContain('$129.99');
    expect(text).toContain('Spending summary');
  });

  it('shows the load error with a retry instead of "not found" when the profile fails', () => {
    http
      .expectOne('/api/v1/admin/customers/7')
      .flush(
        { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    fixture.detectChanges();

    expect(element().textContent).toContain('Too many requests. Please try again later.');
    expect(element().textContent).not.toContain('This customer could not be found.');

    button('Try again').click();
    http.expectOne('/api/v1/admin/customers/7').flush(PROFILE);
    fixture.detectChanges();

    expect(element().textContent).toContain('Alice Shopper');
  });

  it('deactivates the customer from the profile and shows the success toast', () => {
    flushProfile();
    button('Deactivate account').click();

    const request = http.expectOne('/api/v1/admin/customers/7');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ is_active: false });
    request.flush({ ...ALICE, is_active: false });
    http.expectOne('/api/v1/admin/customers/7').flush({ ...PROFILE, is_active: false });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === CUSTOMER_DEACTIVATED_MESSAGE)).toBe(
      true,
    );
    expect(element().textContent).toContain('Activate account');
  });
});
