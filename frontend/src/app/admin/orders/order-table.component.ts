import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { MoneyPipe } from '../../core/format/money.pipe';
import { PageMeta } from '../../core/models/api.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import {
  AdminOrder,
  ORDER_STATUSES,
  ORDERS_LOAD_ERROR_MESSAGE,
  orderStatusLabel,
} from './admin-order.model';
import { AdminOrdersService } from './admin-orders.service';
import { OrderExportService } from './order-export.service';

const EMPTY_META: PageMeta = { page: 1, per_page: 20, total: 0, total_pages: 0 };

/**
 * `/admin/orders`: a table of 20 orders per page with order number, customer,
 * date, status, payment status and total, a search by order number and filters
 * by status and date (requirement 15.1), plus the CSV export of the current
 * filters (requirement 15.8).
 */
@Component({
  selector: 'app-order-table',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    PaginationComponent,
    SkeletonComponent,
    TableComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Orders</h1>
          <p class="page__subtitle">Find orders, move them through their statuses and refund them.</p>
        </div>
        <app-button variant="secondary" (click)="exportCsv()">Export CSV</app-button>
      </header>

      <form class="filters" role="search" (ngSubmit)="applyFilters()">
        <label class="filters__field">
          <span class="filters__label">Search</span>
          <input
            id="order-search"
            type="search"
            name="q"
            placeholder="Search by order number"
            [(ngModel)]="search"
          />
        </label>
        <label class="filters__field">
          <span class="filters__label">Status</span>
          <select id="order-status" name="status" [(ngModel)]="status">
            <option value="">All statuses</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ label(option) }}</option>
            }
          </select>
        </label>
        <label class="filters__field">
          <span class="filters__label">From</span>
          <input id="order-from" type="date" name="from" [(ngModel)]="from" />
        </label>
        <label class="filters__field">
          <span class="filters__label">To</span>
          <input id="order-to" type="date" name="to" [(ngModel)]="to" />
        </label>
        <app-button type="submit" variant="secondary">Apply filters</app-button>
      </form>

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading orders">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="load-error" role="alert">
          <p class="load-error__message">{{ loadError() }}</p>
          <app-button variant="secondary" (click)="retry()">Try again</app-button>
        </div>
      } @else if (orders().length === 0) {
        <app-empty-state
          message="No orders match your search."
          icon="🧾"
          actionLabel="Clear filters"
          (action)="clearFilters()"
        />
      } @else {
        <app-table [columns]="columns" caption="Orders">
          @for (order of orders(); track order.id) {
            <tr>
              <td>
                <a class="cell__link" [routerLink]="['/admin/orders', order.id]">
                  {{ order.order_number }}
                </a>
              </td>
              <td>{{ customerName(order) }}</td>
              <td>{{ formatDate(order.placed_at) }}</td>
              <td>
                <span class="status" [attr.data-status]="order.status">
                  {{ label(order.status) }}
                </span>
              </td>
              <td>{{ label(order.payment_status) }}</td>
              <td class="cell--right">{{ order.total_cents | money }}</td>
            </tr>
          }
        </app-table>
        <app-pagination
          [page]="meta().page"
          [totalPages]="meta().total_pages"
          (pageChange)="goToPage($event)"
        />
      }
    </div>
  `,
  styles: [
    `
      .page {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .page__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      .page__title {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .page__subtitle {
        margin: var(--space-1) 0 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: var(--space-3);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-4);
      }
      .filters__field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 160px;
        flex: 1 1 160px;
      }
      .filters__label {
        font-size: var(--font-size-12);
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .filters input,
      .filters select {
        height: 44px;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      .filters input:focus,
      .filters select:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      .loading {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .load-error {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-3);
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-4);
      }
      .load-error__message {
        margin: 0;
        color: var(--color-error);
        font-size: var(--font-size-14);
      }
      .cell--right {
        text-align: right;
      }
      .cell__link {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
      }
      .cell__link:hover {
        text-decoration: underline;
      }
      .status {
        display: inline-block;
        padding: 2px var(--space-3);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-12);
        font-weight: 600;
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .status[data-status='cancelled'],
      .status[data-status='refunded'] {
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class OrderTableComponent implements OnInit {
  private readonly service = inject(AdminOrdersService);
  private readonly exporter = inject(OrderExportService);

  readonly columns: TableColumn[] = [
    { key: 'number', label: 'Order number' },
    { key: 'customer', label: 'Customer' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'payment', label: 'Payment status' },
    { key: 'total', label: 'Total', align: 'right' },
  ];

  readonly statuses = ORDER_STATUSES;
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly orders = signal<AdminOrder[]>([]);
  readonly meta = signal<PageMeta>(EMPTY_META);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  search = '';
  status = '';
  from = '';
  to = '';
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  label(status: string): string {
    return orderStatusLabel(status);
  }

  customerName(order: AdminOrder): string {
    return order.customer?.name || order.customer?.email || 'Guest';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US');
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.from = '';
    this.to = '';
    this.applyFilters();
  }

  /** Retry the list after a failed load. */
  retry(): void {
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  /** Download the CSV of the orders matching the current search and filters. */
  exportCsv(): void {
    this.exporter.exportCsv(this.filters());
  }

  private filters(): { q?: string; status?: string; from?: string; to?: string } {
    return {
      q: this.search.trim() || undefined,
      status: this.status || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    };
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({ ...this.filters(), page: this.page, per_page: 20 })
      .subscribe({
        next: (answer) => {
          this.orders.set(answer.data ?? []);
          this.meta.set(answer.meta ?? EMPTY_META);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          // A failed request is not an empty list: keep the message and offer
          // a retry instead of the "no orders" empty state.
          this.orders.set([]);
          this.meta.set(EMPTY_META);
          this.loadError.set(apiErrorMessage(error) || ORDERS_LOAD_ERROR_MESSAGE);
          this.loading.set(false);
        },
      });
  }
}
