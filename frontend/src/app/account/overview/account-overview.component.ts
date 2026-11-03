import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyPipe } from '../../core/format/money.pipe';
import { Paginated } from '../../core/models/api.model';
import { Order, OrderStatus } from '../../core/models/order.model';
import { User } from '../../core/models/user.model';
import { CardComponent } from '../../shared/card/card.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/**
 * `/account` — the customer's overview: name, email, order count, total spent
 * and the status of the latest order (requirement 9.1).
 */
@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [RouterLink, CardComponent, SkeletonComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">My account</h1>

    @if (loading()) {
      <div class="overview__grid" aria-busy="true">
        @for (i of [1, 2, 3, 4]; track i) {
          <app-card>
            <app-skeleton height="14px" width="60%" />
            <div class="overview__skeleton-gap"></div>
            <app-skeleton height="28px" width="40%" />
          </app-card>
        }
      </div>
    } @else {
      <div class="overview__grid">
        <app-card>
          <p class="stat__label">Name</p>
          <p class="stat__value">{{ fullName() }}</p>
        </app-card>
        <app-card>
          <p class="stat__label">Email</p>
          <p class="stat__value stat__value--small">{{ email() }}</p>
        </app-card>
        <app-card>
          <p class="stat__label">Orders</p>
          <p class="stat__value">{{ orderCount() }}</p>
        </app-card>
        <app-card>
          <p class="stat__label">Total spent</p>
          <p class="stat__value">{{ totalSpentCents() | money }}</p>
        </app-card>
      </div>

      <app-card title="Latest order">
        @if (latestOrder(); as order) {
          <dl class="latest">
            <div>
              <dt>Order number</dt>
              <dd>
                <a [routerLink]="['/account/orders', order.id]">{{ order.order_number }}</a>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span class="status" [attr.data-status]="order.status">
                  {{ statusLabel(order.status) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{{ order.total_cents | money }}</dd>
            </div>
          </dl>
        } @else {
          <p class="latest__empty">
            You have no orders yet.
            <a routerLink="/products">Start shopping</a>
          </p>
        }
      </app-card>
    }
  `,
  styles: [
    `
      .page-title {
        margin: 0 0 var(--space-6);
        font-size: var(--font-size-24);
      }
      .overview__grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .overview__skeleton-gap {
        height: var(--space-3);
      }
      .stat__label {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
      .stat__value {
        margin: 0;
        font-size: var(--font-size-24);
        font-weight: 600;
        color: var(--color-text);
        overflow-wrap: anywhere;
      }
      .stat__value--small {
        font-size: var(--font-size-16);
      }
      .latest {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--space-4);
        margin: 0;
      }
      .latest dt {
        font-size: var(--font-size-12);
        color: var(--color-text-muted);
        margin-bottom: var(--space-1);
      }
      .latest dd {
        margin: 0;
        font-weight: 600;
      }
      .latest a {
        color: var(--color-primary);
      }
      .latest__empty {
        margin: 0;
        color: var(--color-text-muted);
      }
      .status {
        display: inline-block;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--color-primary-soft);
        color: var(--color-primary);
        font-size: var(--font-size-12);
        font-weight: 600;
      }
      .status[data-status='pending'] {
        background: #fef3c7;
        color: var(--color-warning);
      }
      .status[data-status='cancelled'],
      .status[data-status='refunded'] {
        background: #fee2e2;
        color: var(--color-error);
      }
      .status[data-status='delivered'] {
        background: #d1fae5;
        color: var(--color-success);
      }
      @media (max-width: 1199px) {
        .overview__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 767px) {
        .overview__grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .latest {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class AccountOverviewComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly profile = signal<User | null>(null);
  readonly orders = signal<Order[]>([]);

  readonly fullName = computed(() => {
    const user = this.profile();
    return user ? `${user.first_name} ${user.last_name}`.trim() : '';
  });
  readonly email = computed(() => this.profile()?.email ?? '');
  readonly orderCount = computed(() => this.orders().length);
  readonly totalSpentCents = computed(() =>
    this.orders()
      .filter((order) => order.status !== 'cancelled' && order.status !== 'refunded')
      .reduce((sum, order) => sum + order.total_cents, 0),
  );
  readonly latestOrder = computed(() => this.orders()[0] ?? null);

  ngOnInit(): void {
    forkJoin({
      profile: this.api.get<User>('users/me'),
      orders: this.api.get<Paginated<Order>>('orders', { per_page: 100 }),
    }).subscribe({
      next: ({ profile, orders }) => {
        this.profile.set(profile);
        this.orders.set(orders.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: OrderStatus): string {
    return STATUS_LABELS[status] ?? status;
  }
}
