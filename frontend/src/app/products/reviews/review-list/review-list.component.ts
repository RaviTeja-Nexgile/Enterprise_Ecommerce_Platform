import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RatingSummary, Review } from '../../../core/models/catalog.model';

/**
 * The rating summary and the approved reviews of a product (requirement 5.1).
 *
 * The summary shows the average, the number of reviews and how many reviews
 * gave each star; the list shows each approved review with its stars, the
 * verified-purchase badge and the date.
 */
@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" class="reviews__heading">Customer reviews</h2>

      <div class="reviews__summary">
        <div class="reviews__average">
          <span class="reviews__average-value">{{ average() }}</span>
          <span class="reviews__stars" [attr.aria-label]="average() + ' out of 5 stars'">
            {{ stars(average()) }}
          </span>
          <span class="reviews__count">{{ count() }} {{ count() === 1 ? 'review' : 'reviews' }}</span>
        </div>
        <ul class="reviews__breakdown" aria-label="Rating breakdown">
          @for (star of starRows(); track star.star) {
            <li class="reviews__row">
              <span class="reviews__row-label">{{ star.star }} star</span>
              <span class="reviews__bar">
                <span class="reviews__bar-fill" [style.width.%]="star.percent"></span>
              </span>
              <span class="reviews__row-count">{{ star.count }}</span>
            </li>
          }
        </ul>
      </div>

      @if (reviews().length === 0) {
        <p class="reviews__empty">No reviews yet.</p>
      } @else {
        <ul class="reviews__list">
          @for (review of reviews(); track review.id) {
            <li class="reviews__item">
              <header class="reviews__item-header">
                <span class="reviews__stars" [attr.aria-label]="review.rating + ' out of 5 stars'">
                  {{ stars(review.rating) }}
                </span>
                @if (review.is_verified_purchase) {
                  <span class="reviews__badge">Verified purchase</span>
                }
                <time class="reviews__date" [attr.datetime]="review.created_at">
                  {{ review.created_at | slice: 0 : 10 }}
                </time>
              </header>
              <p class="reviews__comment">{{ review.comment }}</p>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .reviews {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .reviews__heading {
        margin: 0;
        font-size: var(--font-size-24);
      }
      .reviews__summary {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-6);
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
      }
      .reviews__average {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
        min-width: 120px;
      }
      .reviews__average-value {
        font-size: var(--font-size-32);
        font-weight: 600;
      }
      .reviews__stars {
        color: var(--color-warning);
        letter-spacing: 2px;
      }
      .reviews__count {
        font-size: var(--font-size-14);
        color: var(--color-text-muted);
      }
      .reviews__breakdown {
        flex: 1;
        min-width: 200px;
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .reviews__row {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-14);
      }
      .reviews__row-label {
        width: 52px;
        color: var(--color-text-muted);
      }
      .reviews__bar {
        flex: 1;
        height: 8px;
        border-radius: var(--radius-pill);
        background: var(--color-bg);
        overflow: hidden;
      }
      .reviews__bar-fill {
        display: block;
        height: 100%;
        background: var(--color-warning);
      }
      .reviews__row-count {
        width: 32px;
        text-align: right;
        color: var(--color-text-muted);
      }
      .reviews__empty {
        margin: 0;
        color: var(--color-text-muted);
      }
      .reviews__list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .reviews__item {
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
      }
      .reviews__item-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .reviews__badge {
        font-size: var(--font-size-12);
        font-weight: 600;
        padding: 2px var(--space-2);
        border-radius: var(--radius-field);
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .reviews__date {
        margin-left: auto;
        font-size: var(--font-size-12);
        color: var(--color-text-muted);
      }
      .reviews__comment {
        margin: var(--space-2) 0 0;
      }
    `,
  ],
})
export class ReviewListComponent {
  readonly reviews = input<Review[]>([]);
  readonly summary = input<RatingSummary | null>(null);

  readonly average = computed(() => {
    const summary = this.summary();
    if (summary) {
      return summary.average;
    }
    const list = this.reviews();
    if (list.length === 0) {
      return 0;
    }
    return Math.round((list.reduce((sum, review) => sum + review.rating, 0) / list.length) * 10) / 10;
  });

  readonly count = computed(() => this.summary()?.count ?? this.reviews().length);

  readonly starRows = computed(() => {
    const counts = this.summary()?.counts ?? this.countsFromReviews();
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return [5, 4, 3, 2, 1].map((star) => {
      const count = counts[String(star)] ?? 0;
      return { star, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
  });

  stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  private countsFromReviews(): Record<string, number> {
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const review of this.reviews()) {
      counts[String(review.rating)] = (counts[String(review.rating)] ?? 0) + 1;
    }
    return counts;
  }
}
