import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MoneyPipe } from '../../core/format/money.pipe';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableColumn, TableComponent } from '../../shared/table/table.component';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/api/api-error';
import {
  AdminCustomerProfile,
  CUSTOMER_ACTIVATED_MESSAGE,
  CUSTOMER_DEACTIVATED_MESSAGE,
  CUSTOMER_LOAD_ERROR_MESSAGE,
  accountStatusLabel,
} from './admin-customer.model';
import { AdminCustomersService } from './admin-customers.service';

/**
 * `/admin/customers/:id`: a customer's details, addresses, order history and
 * spending summary, with the activate and deactivate action
 * (requirements 14.2, 14.3 and 14.4).
 */
@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonComponent,
    TableComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="back" routerLink="/admin/customers">← Back to customers</a>

      @if (loading()) {
        <div class="loading" aria-busy="true" aria-label="Loading customer">
          @for (row of skeletonRows; track row) {
            <app-skeleton height="56px" />
          }
        </div>
      } @else if (loadError()) {
        <div class="load-error" role="alert">
          <p class="load-error__message">{{ loadError() }}</p>
          <app-button variant="secondary" (click)="retry()">Try again</app-button>
        </div>
      } @else if (profile(); as customer) {
        <header class="page__header">
          <div>
            <h1 class="page__title">{{ customer.name }}</h1>
            <p class="page__subtitle">{{ customer.email }}</p>
          </div>
          <app-button
            [variant]="customer.is_active ? 'destructive' : 'primary'"
            (click)="toggleStatus()"
          >
            {{ customer.is_active ? 'Deactivate account' : 'Activate account' }}
          </app-button>
        </header>

        <section class="card" aria-labelledby="details-heading">
          <h2 id="details-heading" class="card__title">Details</h2>
          <dl class="details">
            <div>
              <dt>Name</dt>
              <dd>{{ customer.name }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ customer.email }}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{{ customer.phone || '—' }}</dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd>{{ formatDate(customer.registered_at) }}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>
                <span class="status" [attr.data-status]="customer.is_active ? 'active' : 'inactive'">
                  {{ label(customer.is_active) }}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section class="card" aria-labelledby="spending-heading">
          <h2 id="spending-heading" class="card__title">Spending summary</h2>
          <dl class="details">
            <div>
              <dt>Total spent</dt>
              <dd class="details__value">{{ customer.spending.total_cents | money }}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd class="details__value">{{ customer.order_count }}</dd>
            </div>
            <div>
              <dt>Average order</dt>
              <dd class="details__value">{{ averageOrderCents(customer) | money }}</dd>
            </div>
          </dl>
        </section>

        <section class="card" aria-labelledby="addresses-heading">
          <h2 id="addresses-heading" class="card__title">Addresses</h2>
          @if (customer.addresses.length === 0) {
            <p class="muted">This customer has no saved addresses.</p>
          } @else {
            <ul class="addresses">
              @for (address of customer.addresses; track address.id) {
                <li class="address">
                  <span class="address__type">{{ address.type }}</span>
                  @if (address.is_default) {
                    <span class="address__default">Default</span>
                  }
                  <span>{{ address.line1 }}</span>
                  @if (address.line2) {
                    <span>{{ address.line2 }}</span>
                  }
                  <span>
                    {{ address.city }}@if (address.state) {, {{ address.state }}} {{ address.postal_code }}
                  </span>
                  <span>{{ address.country }}</span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card" aria-labelledby="orders-heading">
          <h2 id="orders-heading" class="card__title">Order history</h2>
          @if (customer.orders.length === 0) {
            <p class="muted">This customer has no orders yet.</p>
          } @else {
            <app-table [columns]="orderColumns" caption="Order history">
              @for (order of customer.orders; track order.id) {
                <tr>
                  <td>{{ order.order_number }}</td>
                  <td>{{ formatDate(order.placed_at) }}</td>
                  <td>{{ order.status }}</td>
                  <td class="cell--right">{{ order.total_cents | money }}</td>
                </tr>
              }
            </app-table>
          }
        </section>
      } @else {
        <app-empty-state message="This customer could not be found." icon="👥" />
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
      .back {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
        align-self: flex-start;
      }
      .back:hover {
        text-decoration: underline;
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
      .card {
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
        padding: var(--space-4);
      }
      .card__title {
        margin: 0 0 var(--space-3);
        font-size: var(--font-size-16);
      }
      .details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--space-4);
        margin: 0;
      }
      .details dt {
        font-size: var(--font-size-12);
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .details dd {
        margin: var(--space-1) 0 0;
      }
      .details__value {
        font-weight: 600;
      }
      .addresses {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--space-3);
      }
      .address {
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        padding: var(--space-3);
        font-size: var(--font-size-14);
      }
      .address__type {
        font-weight: 600;
        text-transform: capitalize;
      }
      .address__default {
        align-self: flex-start;
        font-size: var(--font-size-12);
        font-weight: 600;
        color: var(--color-primary);
      }
      .muted {
        margin: 0;
        color: var(--color-text-muted);
      }
      .cell--right {
        text-align: right;
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
export class CustomerProfileComponent implements OnInit {
  private readonly service = inject(AdminCustomersService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  readonly orderColumns: TableColumn[] = [
    { key: 'number', label: 'Order' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total', align: 'right' },
  ];

  readonly skeletonRows = [1, 2, 3];

  readonly profile = signal<AdminCustomerProfile | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

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

  /** Retry the profile after a failed load. */
  retry(): void {
    this.load();
  }

  averageOrderCents(customer: AdminCustomerProfile): number {
    if (customer.order_count <= 0) {
      return 0;
    }
    return Math.round(customer.spending.total_cents / customer.order_count);
  }

  /**
   * Activate or deactivate the customer (requirements 14.3 and 14.4) and show
   * the success toast for the action (requirement 23.4). A failed request is
   * already shown by the error interceptor, so it only reloads the profile.
   */
  toggleStatus(): void {
    const customer = this.profile();
    if (!customer) {
      return;
    }
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
    this.service.profile(Number(this.id())).subscribe({
      next: (answer) => {
        this.profile.set(answer);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        // A failed request is not a missing customer: keep the message and
        // offer a retry instead of the "could not be found" empty state.
        this.profile.set(null);
        this.loadError.set(apiErrorMessage(error) || CUSTOMER_LOAD_ERROR_MESSAGE);
        this.loading.set(false);
      },
    });
  }
}
