import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Order } from '../../core/models/order.model';
import { OrderHistoryComponent } from './order-history.component';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    order_number: 'ORD-1001',
    status: 'pending',
    payment_status: 'success',
    subtotal_cents: 10000,
    discount_cents: 0,
    shipping_cents: 500,
    tax_cents: 800,
    total_cents: 11300,
    delivery_method: 'standard',
    placed_at: '2026-01-02T10:00:00',
    items: [],
    ...overrides,
  };
}

describe('OrderHistoryComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<OrderHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderHistoryComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(orders: Order[], meta = { page: 1, per_page: 10, total: orders.length, total_pages: 1 }): HTMLElement {
    fixture = TestBed.createComponent(OrderHistoryComponent);
    fixture.detectChanges();
    const request = http.expectOne((req) => req.url === '/api/v1/orders');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('per_page')).toBe('10');
    request.flush({ data: orders, meta });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists orders with number, date, status, payment status and total', () => {
    const element = create([
      makeOrder({ id: 1, order_number: 'ORD-1001', status: 'pending', payment_status: 'success' }),
      makeOrder({
        id: 2,
        order_number: 'ORD-1002',
        status: 'delivered',
        payment_status: 'refunded',
        total_cents: 25000,
      }),
    ]);

    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('ORD-1001');
    expect(rows[0].textContent).toContain('Pending');
    expect(rows[0].textContent).toContain('Success');
    expect(rows[0].textContent).toContain('$113.00');

    expect(rows[1].textContent).toContain('ORD-1002');
    expect(rows[1].textContent).toContain('Delivered');
    expect(rows[1].textContent).toContain('Refunded');
    expect(rows[1].textContent).toContain('$250.00');
  });

  it('links each order to its details page', () => {
    const element = create([makeOrder({ id: 7, order_number: 'ORD-1007' })]);
    const link = element.querySelector('tbody tr a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('ORD-1007');
    expect(link.getAttribute('href')).toBe('/account/orders/7');
  });

  it('shows an empty state when the customer has no orders', () => {
    const element = create([]);
    expect(element.querySelector('.empty-state')?.textContent).toContain(
      'You have not placed any orders yet.',
    );
  });

  it('shows the API message and a retry instead of an empty state when the request fails', () => {
    fixture = TestBed.createComponent(OrderHistoryComponent);
    fixture.detectChanges();
    const request = http.expectOne((req) => req.url === '/api/v1/orders');
    request.flush(
      { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Too many requests. Please try again later.',
    );
    expect(element.querySelector('.empty-state')).toBeNull();

    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Try again',
    ) as HTMLButtonElement;
    expect(retry).toBeDefined();
    retry.click();
    fixture.detectChanges();

    const again = http.expectOne((req) => req.url === '/api/v1/orders');
    expect(again.request.params.get('page')).toBe('1');
    again.flush({ data: [makeOrder({ order_number: 'ORD-1009' })], meta: { page: 1, per_page: 10, total: 1, total_pages: 1 } });
    fixture.detectChanges();

    expect(element.querySelector('tbody tr')?.textContent).toContain('ORD-1009');
  });

  it('requests the next page when pagination moves forward', () => {
    const element = create([makeOrder()], { page: 1, per_page: 10, total: 25, total_pages: 3 });
    const next = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Next',
    ) as HTMLButtonElement;
    expect(next).toBeDefined();
    next.click();
    fixture.detectChanges();

    const request = http.expectOne((req) => req.url === '/api/v1/orders');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({
      data: [makeOrder({ id: 11, order_number: 'ORD-1011' })],
      meta: { page: 2, per_page: 10, total: 25, total_pages: 3 },
    });
    fixture.detectChanges();

    expect(element.querySelector('tbody tr')?.textContent).toContain('ORD-1011');
  });
});
