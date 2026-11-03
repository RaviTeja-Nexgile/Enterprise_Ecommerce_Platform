import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiClient } from '../../../core/api/api-client.service';
import { MoneyPipe } from '../../../core/format/money.pipe';
import { Order } from '../../../core/models/order.model';

/** The admin order payload adds the customer to the storefront order shape. */
export interface AdminOrder extends Order {
  customer?: { id: number; name: string; email: string } | null;
}

/**
 * The printable invoice for one order (requirement 15.7).
 *
 * It loads `GET /api/v1/admin/orders/{id}` and shows the order number, the
 * customer, the items, the totals and the date. The layout is print-friendly:
 * the "Print" button calls `window.print()` and the surrounding chrome is
 * hidden by the `@media print` rules.
 */
@Component({
  selector: 'app-admin-invoice',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="invoice-page">
      <div class="invoice-actions no-print">
        <button type="button" class="btn" (click)="print()">Print</button>
      </div>

      @if (loading()) {
        <p class="invoice-status" role="status">Loading invoice…</p>
      } @else if (error()) {
        <p class="invoice-status invoice-status--error" role="alert">{{ error() }}</p>
      } @else if (order(); as current) {
        <article class="invoice">
          <header class="invoice__head">
            <h1>Invoice {{ current.order_number }}</h1>
            <p class="invoice__date">Date: {{ formatDate(current.placed_at) }}</p>
          </header>

          <section class="invoice__customer">
            <h2>Customer</h2>
            <p class="invoice__customer-name">{{ customerName() }}</p>
            @if (customerEmail()) {
              <p class="invoice__customer-email">{{ customerEmail() }}</p>
            }
          </section>

          <table class="invoice__items">
            <caption class="visually-hidden">Invoice items</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">SKU</th>
                <th scope="col" class="num">Qty</th>
                <th scope="col" class="num">Unit price</th>
                <th scope="col" class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (item of current.items; track item.product_id + '-' + item.sku) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>{{ item.sku }}</td>
                  <td class="num">{{ item.quantity }}</td>
                  <td class="num">{{ item.unit_price_cents | money }}</td>
                  <td class="num">{{ item.total_cents | money }}</td>
                </tr>
              }
            </tbody>
          </table>

          <dl class="invoice__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{{ current.subtotal_cents | money }}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{{ current.discount_cents | money }}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{{ current.shipping_cents | money }}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{{ current.tax_cents | money }}</dd>
            </div>
            <div class="invoice__total">
              <dt>Total</dt>
              <dd>{{ current.total_cents | money }}</dd>
            </div>
          </dl>
        </article>
      }
    </section>
  `,
  styles: [
    `
      .invoice-page {
        max-width: 820px;
        margin: 0 auto;
        padding: var(--space-6);
      }
      .invoice-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: var(--space-4);
      }
      .btn {
        padding: var(--space-2) var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
        font: inherit;
        cursor: pointer;
      }
      .invoice {
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-6);
      }
      .invoice__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-4);
        border-bottom: 1px solid var(--color-border);
        padding-bottom: var(--space-4);
      }
      .invoice__head h1 {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .invoice__customer {
        margin: var(--space-4) 0;
      }
      .invoice__customer h2 {
        margin: 0 0 var(--space-1);
        font-size: var(--font-size-14);
        text-transform: uppercase;
        color: var(--color-text-muted);
      }
      .invoice__customer p {
        margin: 0;
      }
      .invoice__items {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-14);
      }
      .invoice__items th,
      .invoice__items td {
        text-align: left;
        padding: var(--space-2) var(--space-3);
        border-bottom: 1px solid var(--color-border);
      }
      .invoice__items .num {
        text-align: right;
      }
      .invoice__totals {
        margin: var(--space-4) 0 0 auto;
        width: 280px;
      }
      .invoice__totals div {
        display: flex;
        justify-content: space-between;
        padding: var(--space-1) 0;
      }
      .invoice__totals dt,
      .invoice__totals dd {
        margin: 0;
      }
      .invoice__total {
        border-top: 1px solid var(--color-border);
        font-weight: 600;
      }
      .invoice-status {
        padding: var(--space-4);
      }
      .invoice-status--error {
        color: var(--color-danger, #b91c1c);
      }
      @media print {
        .no-print {
          display: none;
        }
        .invoice-page {
          max-width: none;
          padding: 0;
        }
        .invoice {
          box-shadow: none;
          padding: 0;
        }
      }
    `,
  ],
})
export class InvoiceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClient);

  readonly order = signal<AdminOrder | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('The requested order was not found');
      return;
    }
    this.api.get<AdminOrder>(`admin/orders/${id}`).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('The requested order was not found');
      },
    });
  }

  customerName(): string {
    const customer = this.order()?.customer;
    return customer?.name || 'Guest';
  }

  customerEmail(): string {
    return this.order()?.customer?.email ?? '';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString().slice(0, 10);
  }

  print(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
}
