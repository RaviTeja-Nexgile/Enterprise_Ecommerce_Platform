import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Order } from '../../core/models/order.model';
import { ToastService } from '../../shared/toast/toast.service';
import { OrderDetailsComponent } from './order-details.component';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 5,
    order_number: 'ORD-2005',
    status: 'pending',
    payment_status: 'success',
    subtotal_cents: 20000,
    discount_cents: 1000,
    shipping_cents: 500,
    tax_cents: 1560,
    total_cents: 21060,
    delivery_method: 'express',
    placed_at: '2026-02-03T09:30:00',
    items: [
      {
        product_id: 1,
        variant_id: null,
        name: 'Wireless Headphones',
        sku: 'WH-001',
        quantity: 2,
        unit_price_cents: 10000,
        total_cents: 20000,
      },
    ],
    shipping_address: {
      type: 'shipping',
      line1: '1 Market Street',
      line2: null,
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94105',
      country: 'United States',
    },
    billing_address: {
      type: 'billing',
      line1: '9 Office Park',
      line2: 'Suite 4',
      city: 'Austin',
      state: 'TX',
      postal_code: '73301',
      country: 'United States',
    },
    payment: { status: 'success', method: 'card', transaction_id: 'txn_1' },
    status_history: [
      { status: 'pending', changed_at: '2026-02-03T09:30:00', changed_by: null },
    ],
    ...overrides,
  };
}

describe('OrderDetailsComponent', () => {
  let http: HttpTestingController;
  let toast: ToastService;
  let fixture: ComponentFixture<OrderDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  function create(order: Order): HTMLElement {
    fixture = TestBed.createComponent(OrderDetailsComponent);
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/orders/5');
    expect(request.request.method).toBe('GET');
    request.flush(order);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function clickButton(element: HTMLElement, label: string): void {
    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  it('shows items, totals, addresses, delivery method, payment status and history', () => {
    const element = create(makeOrder());
    const text = element.textContent ?? '';

    expect(text).toContain('Order ORD-2005');
    expect(text).toContain('Wireless Headphones');
    expect(text).toContain('WH-001');
    expect(text).toContain('$200.00');
    expect(text).toContain('$10.00');
    expect(text).toContain('$5.00');
    expect(text).toContain('$15.60');
    expect(text).toContain('$210.60');

    expect(text).toContain('1 Market Street');
    expect(text).toContain('9 Office Park');
    expect(text).toContain('Express');
    expect(text).toContain('Success');
    expect(element.querySelector('.history')?.textContent).toContain('Pending');
  });

  it('cancels a pending order and shows the cancelled status', () => {
    const element = create(makeOrder({ status: 'pending' }));
    clickButton(element, 'Cancel order');

    const request = http.expectOne('/api/v1/orders/5/cancel');
    expect(request.request.method).toBe('POST');
    request.flush(makeOrder({ status: 'cancelled', payment_status: 'refunded' }));
    fixture.detectChanges();

    expect(toast.toasts().some((t) => t.message === 'Order cancelled')).toBe(true);
    expect(element.querySelector('.badge')?.textContent).toContain('Cancelled');
    expect(
      Array.from(element.querySelectorAll('button')).some(
        (button) => button.textContent?.trim() === 'Cancel order',
      ),
    ).toBe(false);
  });

  it('offers cancellation for confirmed and processing orders', () => {
    const element = create(makeOrder({ status: 'processing' }));
    expect(
      Array.from(element.querySelectorAll('button')).some(
        (button) => button.textContent?.trim() === 'Cancel order',
      ),
    ).toBe(true);
  });

  it('shows "This order can no longer be cancelled" when the API refuses', () => {
    const element = create(makeOrder({ status: 'pending' }));
    clickButton(element, 'Cancel order');

    const request = http.expectOne('/api/v1/orders/5/cancel');
    request.flush(
      { error: { code: 'cannot_cancel', message: 'This order can no longer be cancelled' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'This order can no longer be cancelled',
    );
  });

  it('shows the API message and a retry when the order cannot be loaded', () => {
    fixture = TestBed.createComponent(OrderDetailsComponent);
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/orders/5');
    request.flush(
      { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Too many requests. Please try again later.',
    );

    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Try again',
    ) as HTMLButtonElement;
    expect(retry).toBeDefined();
    retry.click();
    fixture.detectChanges();

    const again = http.expectOne('/api/v1/orders/5');
    again.flush(makeOrder());
    fixture.detectChanges();

    expect(element.textContent).toContain('Order ORD-2005');
  });

  it('hides the Cancel button for shipped, delivered, cancelled and refunded orders', () => {
    for (const status of ['shipped', 'delivered', 'cancelled', 'refunded'] as const) {
      const element = create(makeOrder({ status }));
      expect(
        Array.from(element.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === 'Cancel order',
        ),
      ).toBe(false);
      fixture.destroy();
    }
  });
});
