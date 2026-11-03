import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiClient } from '../../core/api/api-client.service';
import { apiErrorMessage } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { Address, Order, OrderStatus } from '../../core/models/order.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ToastService } from '../../shared/toast/toast.service';

const CANCELLABLE: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'pending',
  'confirmed',
  'processing',
]);

/**
 * `/account/orders/:id` — one order with its items, totals, addresses, delivery
 * method, payment status and status history, plus the Cancel action
 * (requirements 9.6, 9.7 and 9.8).
 */
@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [RouterLink, MoneyPipe, ButtonComponent, CardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="details__header">
      <div>
        <a class="details__back" routerLink="/account/orders">← Back to orders</a>
        <h1 class="page-title">
          @if (order(); as current) {
            Order {{ current.order_number }}
          } @else {
            Order details
          }
        </h1>
      </div>
      @if (order(); as current) {
        @if (canCancel(current)) {
          <app-button variant="destructive" [loading]="cancelling()" (click)="cancel(current)">
            Cancel order
          </app-button>
        }
      }
    </div>

    @if (cancelError()) {
      <p class="details__error" role="alert">{{ cancelError() }}</p>
    }

    @if (loading()) {
      <app-card>
        <app-skeleton height="20px" width="40%" />
        <div class="skeleton-gap"></div>
        <app-skeleton height="20px" width="70%" />
        <div class="skeleton-gap"></div>
        <app-skeleton height="20px" width="55%" />
      </app-card>
    } @else if (loadError()) {
      <div class="details__load-error" role="alert">
        <p class="details__error">{{ loadError() }}</p>
        <app-button variant="primary" (click)="retry()">Try again</app-button>
      </div>
    } @else if (order(); as current) {
      <div class="details__grid">
        <app-card title="Items">
          <ul class="items">
            @for (item of current.items; track item.product_id + '-' + (item.variant_id ?? 0)) {
              <li class="item">
                <div class="item__info">
                  <p class="item__name">{{ item.name }}</p>
                  <p class="item__meta">SKU {{ item.sku }} · Qty {{ item.quantity }}</p>
                </div>
                <div class="item__price">
                  <p>{{ item.unit_price_cents | money }} each</p>
                  <p class="item__total">{{ item.total_cents | money }}</p>
                </div>
              </li>
            }
          </ul>
          <dl class="totals">
            <div class="totals__row">
              <dt>Subtotal</dt>
              <dd>{{ current.subtotal_cents | money }}</dd>
            </div>
            @if (current.discount_cents > 0) {
              <div class="totals__row">
                <dt>Discount</dt>
                <dd>-{{ current.discount_cents | money }}</dd>
              </div>
            }
            <div class="totals__row">
              <dt>Shipping</dt>
              <dd>{{ current.shipping_cents | money }}</dd>
            </div>
            <div class="totals__row">
              <dt>Tax</dt>
              <dd>{{ current.tax_cents | money }}</dd>
            </div>
            <div class="totals__row totals__row--grand">
              <dt>Total</dt>
              <dd>{{ current.total_cents | money }}</dd>
            </div>
          </dl>
        </app-card>

        <div class="details__side">
          <app-card title="Summary">
            <dl class="summary">
              <div class="summary__row">
                <dt>Status</dt>
                <dd>
                  <span class="badge" [attr.data-status]="current.status">
                    {{ statusLabel(current.status) }}
                  </span>
                </dd>
              </div>
              <div class="summary__row">
                <dt>Payment status</dt>
                <dd>{{ statusLabel(current.payment_status) }}</dd>
              </div>
              <div class="summary__row">
                <dt>Delivery method</dt>
                <dd>{{ deliveryLabel(current.delivery_method) }}</dd>
              </div>
              <div class="summary__row">
                <dt>Placed</dt>
                <dd>{{ formatDate(current.placed_at) }}</dd>
              </div>
            </dl>
          </app-card>

          <app-card title="Shipping address">
            @if (current.shipping_address; as address) {
              <address class="address">{{ addressText(address) }}</address>
            } @else {
              <p class="muted">No shipping address on file.</p>
            }
          </app-card>

          <app-card title="Billing address">
            @if (current.billing_address; as address) {
              <address class="address">{{ addressText(address) }}</address>
            } @else {
              <p class="muted">No billing address on file.</p>
            }
          </app-card>

          <app-card title="Status history">
            @if (current.status_history && current.status_history.length > 0) {
              <ol class="history">
                @for (entry of current.status_history; track entry.changed_at + entry.status) {
                  <li class="history__entry">
                    <span class="history__status">{{ statusLabel(entry.status) }}</span>
                    <span class="history__date">{{ formatDate(entry.changed_at) }}</span>
                  </li>
                }
              </ol>
            } @else {
              <p class="muted">No status changes recorded yet.</p>
            }
          </app-card>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .details__header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
        flex-wrap: wrap;
      }
      .details__back {
        display: inline-block;
        margin-bottom: var(--space-2);
        color: var(--color-primary);
        font-size: var(--font-size-14);
        text-decoration: none;
      }
      .details__back:hover {
        text-decoration: underline;
      }
      .page-title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .details__error {
        margin: 0 0 var(--space-4);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-field);
        background: var(--color-error-soft, #fee2e2);
        color: var(--color-error);
        font-weight: 600;
      }
      .details__load-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-12) var(--space-4);
        text-align: center;
      }
      .details__load-error .details__error {
        margin: 0;
      }
      .details__grid {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: var(--space-6);
        align-items: start;
      }
      .details__side {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .items {
        list-style: none;
        margin: 0 0 var(--space-4);
        padding: 0;
      }
      .item {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-3) 0;
        border-bottom: 1px solid var(--color-border);
      }
      .item__name {
        margin: 0;
        font-weight: 600;
      }
      .item__meta {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .item__price {
        text-align: right;
        font-size: var(--font-size-14);
      }
      .item__price p {
        margin: 0;
      }
      .item__total {
        font-weight: 600;
      }
      .totals {
        margin: 0;
      }
      .totals__row,
      .summary__row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-1) 0;
      }
      .totals__row dt,
      .summary__row dt {
        color: var(--color-text-muted);
      }
      .totals__row dd,
      .summary__row dd {
        margin: 0;
        font-weight: 600;
      }
      .totals__row--grand {
        margin-top: var(--space-2);
        padding-top: var(--space-3);
        border-top: 1px solid var(--color-border);
        font-size: var(--font-size-18);
      }
      .summary {
        margin: 0;
      }
      .address {
        font-style: normal;
        line-height: var(--line-height-body);
        color: var(--color-text-muted);
        white-space: pre-line;
      }
      .muted {
        margin: 0;
        color: var(--color-text-muted);
      }
      .history {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .history__entry {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-14);
      }
      .history__entry:last-child {
        border-bottom: 0;
      }
      .history__status {
        font-weight: 600;
      }
      .history__date {
        color: var(--color-text-muted);
      }
      .badge {
        display: inline-block;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-size: var(--font-size-12);
        font-weight: 600;
      }
      .badge[data-status='cancelled'],
      .badge[data-status='refunded'] {
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
      .skeleton-gap {
        height: var(--space-3);
      }
      @media (max-width: 767px) {
        .details__grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class OrderDetailsComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly cancelling = signal(false);
  readonly order = signal<Order | null>(null);
  readonly cancelError = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);

  private orderId: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  canCancel(order: Order): boolean {
    return CANCELLABLE.has(order.status);
  }

  cancel(order: Order): void {
    if (!this.canCancel(order) || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.api.post<Order>(`orders/${order.id}/cancel`).subscribe({
      next: (updated) => {
        this.cancelling.set(false);
        this.order.set(updated);
        this.toast.success('Order cancelled');
      },
      error: (error) => {
        this.cancelling.set(false);
        this.cancelError.set(apiErrorMessage(error));
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  deliveryLabel(method: string): string {
    switch (method) {
      case 'standard':
        return 'Standard';
      case 'express':
        return 'Express';
      case 'next_day':
        return 'Next day';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
    }
  }

  addressText(address: Address): string {
    const lines = [address.line1];
    if (address.line2) {
      lines.push(address.line2);
    }
    const region = [address.city, address.state].filter(Boolean).join(', ');
    lines.push(`${region} ${address.postal_code}`.trim());
    lines.push(address.country);
    return lines.join('\n');
  }

  retry(): void {
    if (this.orderId) {
      this.load(this.orderId);
    }
  }

  private load(id: string): void {
    this.orderId = id;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get<Order>(`orders/${id}`).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error) => {
        // A failed request (a rate-limited sign-in, a dropped connection) is
        // not a missing order: say so and offer a retry.
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
