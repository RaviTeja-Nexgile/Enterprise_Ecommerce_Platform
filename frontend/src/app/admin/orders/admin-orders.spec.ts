import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminOrder,
  INVALID_TRANSITION_MESSAGE,
  ORDER_CANCELLED_MESSAGE,
  ORDER_REFUNDED_MESSAGE,
  ORDER_STATUS_UPDATED_MESSAGE,
} from './admin-order.model';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderDetailsComponent } from './order-details.component';
import { OrderTableComponent } from './order-table.component';

const ORDER: AdminOrder = {
  id: 11,
  order_number: 'ORD-2026-0011',
  status: 'pending',
  payment_status: 'success',
  subtotal_cents: 10000,
  discount_cents: 0,
  shipping_cents: 500,
  tax_cents: 800,
  total_cents: 11300,
  delivery_method: 'standard',
  placed_at: '2026-03-01T12:00:00',
  items: [
    {
      product_id: 3,
      variant_id: null,
      name: 'Wireless Headphones',
      sku: 'WH-001',
      quantity: 1,
      unit_price_cents: 10000,
      total_cents: 10000,
    },
  ],
  shipping_address: {
    type: 'shipping',
    line1: '1 Main Street',
    line2: null,
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'US',
  },
  billing_address: {
    type: 'billing',
    line1: '2 Billing Road',
    line2: null,
    city: 'Springfield',
    state: 'IL',
    postal_code: '62702',
    country: 'US',
  },
  payment: { status: 'success', method: 'card', transaction_id: 'TX-123' },
  status_history: [
    { status: 'pending', changed_at: '2026-03-01T12:00:00', changed_by: 'Alice Shopper' },
  ],
  customer: { id: 7, name: 'Alice Shopper', email: 'alice@example.com' },
};

const SHIPPED: AdminOrder = {
  ...ORDER,
  id: 12,
  order_number: 'ORD-2026-0012',
  status: 'shipped',
  customer: { id: 8, name: 'Bob Buyer', email: 'bob@example.com' },
};

const META = { page: 1, per_page: 20, total: 2, total_pages: 1 };

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminOrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists orders with the search, status, date and page filters', () => {
    service
      .list({ q: 'ORD-2026', status: 'shipped', from: '2026-01-01', to: '2026-02-01', page: 2, per_page: 20 })
      .subscribe();
    const request = http.expectOne(
      (req) => req.url === '/api/v1/admin/orders' && req.method === 'GET',
    );
    expect(request.request.params.get('q')).toBe('ORD-2026');
    expect(request.request.params.get('status')).toBe('shipped');
    expect(request.request.params.get('from')).toBe('2026-01-01');
    expect(request.request.params.get('to')).toBe('2026-02-01');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('per_page')).toBe('20');
    request.flush({ data: [ORDER], meta: META });
  });

  it('loads one order', () => {
    service.get(11).subscribe();
    const request = http.expectOne('/api/v1/admin/orders/11');
    expect(request.request.method).toBe('GET');
    request.flush(ORDER);
  });

  it('patches the status', () => {
    service.changeStatus(11, 'confirmed').subscribe();
    const request = http.expectOne('/api/v1/admin/orders/11/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'confirmed' });
    request.flush({ ...ORDER, status: 'confirmed' });
  });

  it('cancels through the status endpoint', () => {
    service.cancel(11).subscribe();
    const request = http.expectOne('/api/v1/admin/orders/11/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'cancelled' });
    request.flush({ ...ORDER, status: 'cancelled' });
  });

  it('refunds through the refund endpoint', () => {
    service.refund(11).subscribe();
    const request = http.expectOne('/api/v1/admin/orders/11/refund');
    expect(request.request.method).toBe('POST');
    request.flush({ ...ORDER, status: 'refunded' });
  });
});

describe('OrderTableComponent', () => {
  let fixture: ComponentFixture<OrderTableComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderTableComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderTableComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushList(data: AdminOrder[], meta = META): void {
    http.expectOne((req) => req.url === '/api/v1/admin/orders').flush({ data, meta });
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('shows order number, customer, date, status, payment status and total', () => {
    flushList([ORDER, SHIPPED]);
    const text = element().textContent ?? '';
    expect(text).toContain('ORD-2026-0011');
    expect(text).toContain('Alice Shopper');
    expect(text).toContain('Pending');
    expect(text).toContain('Shipped');
    expect(text).toContain('Success');
    expect(text).toContain('$113.00');
    expect(text).toContain(new Date(ORDER.placed_at).toLocaleDateString('en-US'));
  });

  it('requests 20 orders per page', () => {
    const request = http.expectOne((req) => req.url === '/api/v1/admin/orders');
    expect(request.request.params.get('per_page')).toBe('20');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ data: [ORDER], meta: META });
  });

  it('searches by order number', () => {
    flushList([ORDER, SHIPPED]);

    const input = element().querySelector('#order-search') as HTMLInputElement;
    input.value = 'ORD-2026-0012';
    input.dispatchEvent(new Event('input'));
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const request = http.expectOne(
      (req) => req.url === '/api/v1/admin/orders' && req.params.get('q') === 'ORD-2026-0012',
    );
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ data: [SHIPPED], meta: { ...META, total: 1 } });
    fixture.detectChanges();

    expect(element().textContent).toContain('ORD-2026-0012');
    expect(element().textContent).not.toContain('ORD-2026-0011');
  });

  it('filters by status and date range', () => {
    flushList([ORDER, SHIPPED]);

    const status = element().querySelector('#order-status') as HTMLSelectElement;
    status.value = 'shipped';
    status.dispatchEvent(new Event('change'));
    const from = element().querySelector('#order-from') as HTMLInputElement;
    from.value = '2026-01-01';
    from.dispatchEvent(new Event('input'));
    const to = element().querySelector('#order-to') as HTMLInputElement;
    to.value = '2026-02-01';
    to.dispatchEvent(new Event('input'));
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const request = http.expectOne(
      (req) => req.url === '/api/v1/admin/orders' && req.params.get('status') === 'shipped',
    );
    expect(request.request.params.get('from')).toBe('2026-01-01');
    expect(request.request.params.get('to')).toBe('2026-02-01');
    request.flush({ data: [SHIPPED], meta: { ...META, total: 1 } });
    fixture.detectChanges();

    expect(element().textContent).toContain('ORD-2026-0012');
    expect(element().textContent).not.toContain('ORD-2026-0011');
  });

  it('shows an empty state when no order matches', () => {
    flushList([], { page: 1, per_page: 20, total: 0, total_pages: 0 });
    expect(element().textContent).toContain('No orders match your search.');
    expect(button('Clear filters')).toBeTruthy();
  });
});

describe('AdminOrderDetailsComponent', () => {
  let fixture: ComponentFixture<AdminOrderDetailsComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderDetailsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '11' }) } },
        },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminOrderDetailsComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function flushOrder(order: AdminOrder = ORDER): void {
    http.expectOne('/api/v1/admin/orders/11').flush(order);
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  it('shows items, totals, customer, addresses, payment and status history', () => {
    flushOrder();
    const text = element().textContent ?? '';
    expect(text).toContain('Wireless Headphones');
    expect(text).toContain('WH-001');
    expect(text).toContain('$113.00');
    expect(text).toContain('Alice Shopper');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('1 Main Street');
    expect(text).toContain('2 Billing Road');
    expect(text).toContain('TX-123');
    expect(text).toContain('Status history');
    expect(text).toContain('Pending');
  });

  it('moves the order to its next status and shows the success toast', () => {
    flushOrder();
    button('Mark as Confirmed').click();

    const request = http.expectOne('/api/v1/admin/orders/11/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'confirmed' });
    request.flush({ ...ORDER, status: 'confirmed' });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === ORDER_STATUS_UPDATED_MESSAGE)).toBe(
      true,
    );
    expect(element().textContent).toContain('Mark as Processing');
  });

  it('keeps the order unchanged and shows "This status change is not allowed" on a refusal', () => {
    flushOrder();
    button('Mark as Confirmed').click();

    http
      .expectOne('/api/v1/admin/orders/11/status')
      .flush(
        { error: { code: 'invalid_transition', message: INVALID_TRANSITION_MESSAGE } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();

    const alert = element().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(INVALID_TRANSITION_MESSAGE);
    // The order is unchanged: it is still pending and still offers the same action.
    expect(element().textContent).toContain('Mark as Confirmed');
    expect(toasts.toasts().some((toast) => toast.message === ORDER_STATUS_UPDATED_MESSAGE)).toBe(
      false,
    );
  });

  it('cancels an unshipped order and shows the success toast', () => {
    flushOrder();
    button('Cancel order').click();

    const request = http.expectOne('/api/v1/admin/orders/11/status');
    expect(request.request.body).toEqual({ status: 'cancelled' });
    request.flush({ ...ORDER, status: 'cancelled' });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === ORDER_CANCELLED_MESSAGE)).toBe(true);
    expect(button('Cancel order')).toBeUndefined();
  });

  it('refunds a delivered order and shows the success toast', () => {
    flushOrder({ ...ORDER, status: 'delivered' });
    button('Refund order').click();

    const request = http.expectOne('/api/v1/admin/orders/11/refund');
    expect(request.request.method).toBe('POST');
    request.flush({ ...ORDER, status: 'refunded' });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === ORDER_REFUNDED_MESSAGE)).toBe(true);
  });
});
