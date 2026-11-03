import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { ApiClient } from '../../core/api/api-client.service';
import { apiErrorMessage } from '../../core/api/api-error';
import { ButtonComponent } from '../../shared/button/button.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerReview {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  created_at: string | null;
}

/**
 * `/account/reviews` — the customer's reviews with each review's status
 * Pending, Approved or Rejected (requirement 9.9).
 */
@Component({
  selector: 'app-account-reviews',
  standalone: true,
  imports: [ButtonComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reviews__header">
      <h1 class="page-title">Reviews</h1>
    </div>

    @if (loading()) {
      <div class="reviews__skeleton" aria-busy="true">
        @for (row of skeletonRows; track row) {
          <app-skeleton height="72px" />
        }
      </div>
    } @else if (loadError()) {
      <div class="reviews__error" role="alert">
        <p class="reviews__error-message">{{ loadError() }}</p>
        <app-button variant="primary" (click)="retry()">Try again</app-button>
      </div>
    } @else if (reviews().length === 0) {
      <app-empty-state
        icon="⭐"
        message="You have not written any reviews yet."
        actionLabel="Browse products"
        (action)="goShopping()"
      />
    } @else {
      <ul class="reviews">
        @for (review of reviews(); track review.id) {
          <li class="review" [attr.data-review-id]="review.id">
            <div class="review__body">
              <p class="review__rating" [attr.aria-label]="review.rating + ' out of 5 stars'">
                <span aria-hidden="true">{{ stars(review.rating) }}</span>
              </p>
              <p class="review__comment">{{ review.comment }}</p>
              <p class="review__meta">
                {{ formatDate(review.created_at) }}
                @if (review.is_verified_purchase) {
                  <span class="review__verified">Verified purchase</span>
                }
              </p>
            </div>
            <span class="status" [attr.data-status]="review.status">
              {{ statusLabel(review.status) }}
            </span>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .reviews__header {
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
      .reviews__skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .reviews__error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-12) var(--space-4);
        text-align: center;
      }
      .reviews__error-message {
        margin: 0;
        color: var(--color-error);
        font-weight: 600;
      }
      .reviews {
        list-style: none;
        margin: 0;
        padding: 0;
        background: var(--color-surface);
        border-radius: var(--radius-card);
        box-shadow: var(--elevation-resting);
      }
      .review {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-6);
        border-bottom: 1px solid var(--color-border);
      }
      .review:last-child {
        border-bottom: 0;
      }
      .review__rating {
        margin: 0 0 var(--space-1);
        color: var(--color-warning, #b45309);
        letter-spacing: 2px;
      }
      .review__comment {
        margin: 0 0 var(--space-1);
        line-height: var(--line-height-body);
      }
      .review__meta {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-14);
      }
      .review__verified {
        margin-left: var(--space-2);
        color: var(--color-success, #15803d);
        font-weight: 600;
      }
      .status {
        flex-shrink: 0;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        font-size: var(--font-size-12);
        font-weight: 600;
      }
      .status[data-status='pending'] {
        background: #fef3c7;
        color: #92400e;
      }
      .status[data-status='approved'] {
        background: #dcfce7;
        color: #166534;
      }
      .status[data-status='rejected'] {
        background: #fee2e2;
        color: #991b1b;
      }
      @media (max-width: 767px) {
        .review {
          flex-direction: column;
          padding: var(--space-4);
        }
      }
    `,
  ],
})
export class ReviewsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly loading = signal(true);
  readonly reviews = signal<CustomerReview[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly skeletonRows = [1, 2, 3];

  ngOnInit(): void {
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get<{ data: CustomerReview[] }>('users/me/reviews').subscribe({
      next: (response) => {
        this.reviews.set(response.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        // A failed request (a rate-limited sign-in, a dropped connection) is
        // not "no reviews": say so and offer a retry.
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  goShopping(): void {
    window.location.assign('/products');
  }

  stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  statusLabel(status: ReviewStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
}
