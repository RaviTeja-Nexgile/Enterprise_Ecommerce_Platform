import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiClient } from '../../core/api/api-client.service';
import { apiErrorMessage } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { PageMeta, Paginated } from '../../core/models/api.model';
import { Order } from '../../core/models/order.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

const PAGE_SIZE = 10;

/**
 * `/account/orders` — the customer's order history, newest first, 10 per page
 * with order number, date, status, payment status and total (requirement 9.5).
 */
@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    RouterLink,
    MoneyPipe,
    ButtonComponent,
    EmptyStateComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orders__header">
      <h1 class="page-title">Orders</h1>
    </div>

    @if (loading()) {
      <div class="orders__skeleton" aria-busy="true">
        @for (row of skeletonRows; track row) {
          <app-skeleton height="64px" />
        }
      </div>
    } @else if (loadError()) {
      <div class="orders__error" role="alert">
        <p class="orders__error-message">{{ loadError() }}</p>
        <app-button variant="primary" (click)="retry()">Try again</app-button>
      </div>
    } @else if (orders().length === 0) {
      <app-empty-state
        icon="🧾"
        message="You have not placed any orders yet."
        actionLabel="Start shopping"
        (action)="goShopping()"
      />
    } @else {
      <div class="orders__table-wrap">
        <table class="orders__table">
          <caption class="visually-hidden">Your orders</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date</th>
              <th scope="col">Status</th>
              <th scope="col">Payment</th>
              <th scope="col" class="align-right">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
              <tr [attr.data-order-id]="order.id">
                <td>
                  <a class="orders__link" [routerLink]="['/account/orders', order.id]">
                    {{ order.order_number }}
                  </a>
                </td>
                <td>{{ formatDate(order.placed_at) }}</td>
                <td>
                  <span class="badge" [attr.data-status]="order.status">
                    {{ statusLabel(order.status) }}
                  </span>
                </td>
                <td>{{ paymentLabel(order.payment_status) }}</td>
                <td class="align-right">{{ order.total_cents | money }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination
        [page]="meta().page"
        [totalPages]="meta().total_pages"
        (pageChange)="load($event)"
      />
    }
  `,
  styles: [
    `
      .orders__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .page-title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .orders__skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .orders__error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-12) var(--space-4);
        text-align: center;
      }
      .orders__error-message {
        margin: 0;
        color: var(--color-error);
        font-weight: 600;
      }
      .orders__table-wrap {
        overflow-x: auto;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
      }
      .orders__table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-14);
      }
      th {
        background: var(--color-bg);
        padding: var(--space-3) var(--space-4);
        font-weight: 600;
        text-align: left;
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }
      td {
        padding: var(--space-3) var(--space-4);
        height: 56px;
        border-bottom: 1px solid var(--color-border);
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      .align-right {
        text-align: right;
      }
      .orders__link {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
      }
      .orders__link:hover {
        text-decoration: underline;
      }
      .orders__link:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
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
      @media (max-width: 767px) {
        .orders__table {
          font-size: var(--font-size-12);
        }
        th,
        td {
          padding: var(--space-2) var(--space-3);
        }
      }
    `,
  ],
})
export class OrderHistoryComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly loading = signal(true);
  readonly orders = signal<Order[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly meta = signal<PageMeta>({ page: 1, per_page: PAGE_SIZE, total: 0, total_pages: 1 });
  readonly skeletonRows = [1, 2, 3, 4, 5];

  private currentPage = 1;

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get<Paginated<Order>>('orders', { page, per_page: PAGE_SIZE }).subscribe({
      next: (response) => {
        this.orders.set(response.data ?? []);
        this.meta.set(
          response.meta ?? { page, per_page: PAGE_SIZE, total: 0, total_pages: 1 },
        );
        this.loading.set(false);
      },
      error: (error) => {
        // A failed request (a rate-limited sign-in, a dropped connection) is
        // not an empty order history: say so and offer a retry.
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load(this.currentPage);
  }

  goShopping(): void {
    // The empty state's action opens the catalog; kept as a method so the
    // template stays declarative.
    window.location.assign('/products');
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

  paymentLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
