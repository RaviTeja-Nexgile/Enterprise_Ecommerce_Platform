import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { Address, OrderStatus } from '../../core/models/order.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ToastService } from '../../shared/toast/toast.service';
import {
  AdminOrder,
  ORDER_CANCELLED_MESSAGE,
  ORDER_LOAD_ERROR_MESSAGE,
  ORDER_REFUNDED_MESSAGE,
  ORDER_STATUS_UPDATED_MESSAGE,
  canCancelOrder,
  canRefundOrder,
  nextStatus,
  orderStatusLabel,
} from './admin-order.model';
import { AdminOrdersService } from './admin-orders.service';

/**
 * `/admin/orders/:id` — one order with its items, totals, customer, shipping
 * and billing addresses, payment and full status history (requirement 15.2),
 * plus the next-status action (15.3, 15.4), the cancel (15.5) and the refund
 * (15.6).
 */
@Component({
  selector: 'app-admin-order-details',
  standalone: true,
  imports: [RouterLink, MoneyPipe, ButtonComponent, CardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="details__header">
      <div>
        <a class="details__back" routerLink="/admin/orders">← Back to orders</a>
        <h1 class="page-title">
          @if (order(); as current) {
            Order {{ current.order_number }}
          } @else {
            Order details
          }
        </h1>
      </div>
      @if (order(); as current) {
        <div class="details__actions">
          @if (nextStatusFor(current); as next) {
            <app-button variant="primary" [loading]="busy()" (click)="advance(current)">
              Mark as {{ label(next) }}
            </app-button>
          }
          @if (canCancel(current)) {
            <app-button variant="destructive" [loading]="busy()" (click)="cancel(current)">
              Cancel order
            </app-button>
          }
          @if (canRefund(current)) {
            <app-button variant="secondary" [loading]="busy()" (click)="refund(current)">
              Refund order
            </app-button>
          }
          <a class="details__invoice" [routerLink]="['/admin/orders', current.id, 'invoice']">
            Print invoice
          </a>
        </div>
      }
    </div>

    @if (actionError()) {
      <p class="details__error" role="alert">{{ actionError() }}</p>
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
          <app-card title="Customer">
            @if (current.customer; as customer) {
              <p class="customer__name">{{ customer.name }}</p>
              <p class="customer__email">{{ customer.email }}</p>
            } @else {
              <p class="muted">Guest</p>
            }
          </app-card>

          <app-card title="Summary">
            <dl class="summary">
              <div class="summary__row">
                <dt>Status</dt>
                <dd>
                  <span class="badge" [attr.data-status]="current.status">
                    {{ label(current.status) }}
                  </span>
                </dd>
              </div>
              <div class="summary__row">
                <dt>Payment status</dt>
                <dd>{{ label(current.payment_status) }}</dd>
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

          <app-card title="Payment">
            @if (current.payment; as payment) {
              <dl class="summary">
                <div class="summary__row">
                  <dt>Status</dt>
                  <dd>{{ label(payment.status) }}</dd>
                </div>
                <div class="summary__row">
                  <dt>Method</dt>
                  <dd>{{ payment.method }}</dd>
                </div>
                @if (payment.transaction_id) {
                  <div class="summary__row">
                    <dt>Transaction</dt>
                    <dd>{{ payment.transaction_id }}</dd>
                  </div>
                }
              </dl>
            } @else {
              <p class="muted">No payment recorded.</p>
            }
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
                    <span class="history__status">{{ label(entry.status) }}</span>
                    <span class="history__date">
                      {{ formatDate(entry.changed_at) }}
                      @if (entry.changed_by) {
                        · {{ entry.changed_by }}
                      }
                    </span>
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
      .details__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-3);
      }
      .details__invoice {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
      }
      .details__invoice:hover {
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
      .customer__name {
        margin: 0;
        font-weight: 600;
      }
      .customer__email {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
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
        text-align: right;
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
export class AdminOrderDetailsComponent implements OnInit {
  private readonly service = inject(AdminOrdersService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly order = signal<AdminOrder | null>(null);
  readonly actionError = signal<string | null>(null);
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

  label(status: string): string {
    return orderStatusLabel(status);
  }

  nextStatusFor(order: AdminOrder): OrderStatus | null {
    return nextStatus(order.status);
  }

  canCancel(order: AdminOrder): boolean {
    return canCancelOrder(order.status);
  }

  canRefund(order: AdminOrder): boolean {
    return canRefundOrder(order.status);
  }

  /** Move the order to its next status (requirements 15.3 and 15.4). */
  advance(order: AdminOrder): void {
    const next = nextStatus(order.status);
    if (!next || this.busy()) {
      return;
    }
    this.run(
      this.service.changeStatus(order.id, next),
      ORDER_STATUS_UPDATED_MESSAGE,
    );
  }

  /** Cancel an unshipped order (requirement 15.5). */
  cancel(order: AdminOrder): void {
    if (!canCancelOrder(order.status) || this.busy()) {
      return;
    }
    this.run(this.service.cancel(order.id), ORDER_CANCELLED_MESSAGE);
  }

  /** Refund a delivered order (requirement 15.6). */
  refund(order: AdminOrder): void {
    if (!canRefundOrder(order.status) || this.busy()) {
      return;
    }
    this.run(this.service.refund(order.id), ORDER_REFUNDED_MESSAGE);
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

  /**
   * Run a status action: on success show the action's toast and the updated
   * order; on a refusal (e.g. "This status change is not allowed") keep the
   * order unchanged and show the API message (requirements 15.4 and 23.1).
   */
  private run(request: ReturnType<AdminOrdersService['changeStatus']>, message: string): void {
    this.busy.set(true);
    this.actionError.set(null);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.order.set(updated);
        this.toast.success(message);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  private load(id: string): void {
    this.orderId = id;
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        // A failed request is not a missing order: say so and offer a retry.
        this.loadError.set(apiErrorMessage(error) || ORDER_LOAD_ERROR_MESSAGE);
        this.loading.set(false);
      },
    });
  }
}
