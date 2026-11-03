import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MoneyPipe } from '../../core/format/money.pipe';
import { PageMeta } from '../../core/models/api.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/api/api-error';
import {
  AdminCustomer,
  CUSTOMER_ACTIVATED_MESSAGE,
  CUSTOMER_DEACTIVATED_MESSAGE,
  CUSTOMERS_LOAD_ERROR_MESSAGE,
  accountStatusLabel,
} from './admin-customer.model';
import { AdminCustomersService } from './admin-customers.service';

const EMPTY_META: PageMeta = { page: 1, per_page: 20, total: 0, total_pages: 0 };

/**
 * `/admin/customers`: a searchable table of 20 customers per page with name,
 * email, registration date, account status and total spent, plus the activate
 * and deactivate actions (requirements 14.1, 14.3, 14.4 and 23.3).
 */
@Component({
  selector: 'app-customer-table',
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
          <h1 class="page__title">Customers</h1>
          <p class="page__subtitle">Find customers, see their orders and manage their accounts.</p>
        </div>
      </header>

      <form class="filters" role="search" (ngSubmit)="applyFilters()">
        <label class="filters__field">
          <span class="filters__label">Search</span>
          <input
            id="customer-search"
            type="search"
            name="q"
            placeholder="Search by name or email"
            [(ngModel)]="search"
          />
        </label>
        <app-button type="submit" variant="secondary">Search</app-button>
      </form>

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading customers">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="load-error" role="alert">
          <p class="load-error__message">{{ loadError() }}</p>
          <app-button variant="secondary" (click)="retry()">Try again</app-button>
        </div>
      } @else if (customers().length === 0) {
        <app-empty-state
          message="No customers match your search."
          icon="👥"
          actionLabel="Clear search"
          (action)="clearSearch()"
        />
      } @else {
        <app-table [columns]="columns" caption="Customers">
          @for (customer of customers(); track customer.id) {
            <tr>
              <td>
                <a class="cell__link" [routerLink]="['/admin/customers', customer.id]">
                  {{ customer.name }}
                </a>
              </td>
              <td>{{ customer.email }}</td>
              <td>{{ formatDate(customer.registered_at) }}</td>
              <td>
                <span class="status" [attr.data-status]="customer.is_active ? 'active' : 'inactive'">
                  {{ label(customer.is_active) }}
                </span>
              </td>
              <td class="cell--right">{{ customer.total_spent_cents | money }}</td>
              <td>
                <app-button
                  variant="ghost"
                  (click)="toggleStatus(customer)"
                >
                  {{ customer.is_active ? 'Deactivate' : 'Activate' }}
                </app-button>
              </td>
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
        min-width: 200px;
        flex: 1 1 200px;
      }
      .filters__label {
        font-size: var(--font-size-12);
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .filters input {
        height: 44px;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
      }
      .filters input:focus {
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
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
      .status[data-status='active'] {
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
    `,
  ],
})
export class CustomerTableComponent implements OnInit {
  private readonly service = inject(AdminCustomersService);
  private readonly toast = inject(ToastService);

  readonly columns: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'registered', label: 'Registered' },
    { key: 'status', label: 'Status' },
    { key: 'spent', label: 'Total spent', align: 'right' },
    { key: 'actions', label: 'Actions' },
  ];

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly customers = signal<AdminCustomer[]>([]);
  readonly meta = signal<PageMeta>(EMPTY_META);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  search = '';
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  label(isActive: boolean): string {
    return accountStatusLabel(isActive);
  }

  formatDate(value: string | null): string {
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

  clearSearch(): void {
    this.search = '';
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

  /**
   * Activate or deactivate a customer (requirements 14.3 and 14.4) and show
   * the success toast for the action (requirement 23.4). A failed request is
   * already shown by the error interceptor, so it only reloads the list.
   */
  toggleStatus(customer: AdminCustomer): void {
    const next = !customer.is_active;
    this.service.setActive(customer.id, next).subscribe({
      next: () => {
        this.toast.success(next ? CUSTOMER_ACTIVATED_MESSAGE : CUSTOMER_DEACTIVATED_MESSAGE);
        this.load();
      },
      error: () => this.load(),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({ q: this.search.trim() || undefined, page: this.page, per_page: 20 })
      .subscribe({
        next: (answer) => {
          this.customers.set(answer.data ?? []);
          this.meta.set(answer.meta ?? EMPTY_META);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          // A failed request is not an empty directory: keep the message and
          // offer a retry instead of the "no customers" empty state.
          this.customers.set([]);
          this.meta.set(EMPTY_META);
          this.loadError.set(apiErrorMessage(error) || CUSTOMERS_LOAD_ERROR_MESSAGE);
          this.loading.set(false);
        },
      });
  }
}
