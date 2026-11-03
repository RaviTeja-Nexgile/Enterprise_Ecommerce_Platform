import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { AdminOrder, InvoiceComponent } from './invoice.component';

const ORDER: AdminOrder = {
  id: 7,
  order_number: 'ORD-2026-0007',
  status: 'delivered',
  payment_status: 'success',
  subtotal_cents: 25998,
  discount_cents: 1000,
  shipping_cents: 500,
  tax_cents: 2000,
  total_cents: 27498,
  delivery_method: 'standard',
  placed_at: '2026-02-14T10:30:00Z',
  items: [
    {
      product_id: 1,
      name: 'Wireless Headphones',
      sku: 'WH-001',
      quantity: 2,
      unit_price_cents: 12999,
      total_cents: 25998,
    },
  ],
  customer: { id: 3, name: 'Jane Customer', email: 'customer@example.com' },
};

function setup(id: string | null = '7') {
  TestBed.configureTestingModule({
    imports: [InvoiceComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(InvoiceComponent);
  const http = TestBed.inject(HttpTestingController);
  return { fixture, http };
}

describe('InvoiceComponent', () => {
  it('requests the order and renders the invoice content', () => {
    const { fixture, http } = setup();
    fixture.detectChanges();

    const request = http.expectOne('/api/v1/admin/orders/7');
    expect(request.request.method).toBe('GET');
    request.flush(ORDER);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Invoice ORD-2026-0007');
    expect(text).toContain('Jane Customer');
    expect(text).toContain('customer@example.com');
    expect(text).toContain('Wireless Headphones');
    expect(text).toContain('WH-001');
    expect(text).toContain('2026-02-14');
    expect(text).toContain('$259.98');
    expect(text).toContain('$274.98');
    http.verify();
  });

  it('shows an error when the order cannot be loaded', () => {
    const { fixture, http } = setup();
    fixture.detectChanges();

    http
      .expectOne('/api/v1/admin/orders/7')
      .flush({ error: { code: 'not_found', message: 'Not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'The requested order was not found',
    );
    http.verify();
  });

  it('does not request an order when the route has no id', () => {
    const { fixture, http } = setup(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe('The requested order was not found');
    http.expectNone('/api/v1/admin/orders/');
    http.verify();
  });
});
