import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error';
import { ApiClient } from '../../../core/api/api-client.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Review } from '../../../core/models/catalog.model';
import { ButtonComponent } from '../../../shared/button/button.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { ToastService } from '../../../shared/toast/toast.service';

/** The message of requirement 10.3, shown when the form is invalid. */
export const INVALID_REVIEW_MESSAGE = 'Choose a rating and write at least 10 characters';
/** The message of requirement 10.1, shown once the review is saved. */
export const REVIEW_SUBMITTED_MESSAGE = 'Your review is awaiting approval';

const MIN_COMMENT_LENGTH = 10;

/**
 * The review form on the product details page (requirements 10.1, 10.2, 10.3,
 * 21.3 and 23.4).
 *
 * A signed-in Customer picks a rating from 1 to 5 and writes a comment of at
 * least 10 characters; the review is sent to
 * `POST /api/v1/products/{id}/reviews` and saved with status Pending. The
 * customer's own review is shown with the verified-purchase badge when the
 * API marks it as one.
 */
@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="review-form" aria-labelledby="review-form-heading">
      <h2 id="review-form-heading" class="review-form__heading">Write a review</h2>

      @if (!signedIn()) {
        <p class="review-form__sign-in">
          <a routerLink="/sign-in">Sign in</a> to write a review.
        </p>
      } @else if (submittedReview(); as review) {
        <div class="review-form__success" role="status">
          <p class="review-form__message">{{ submittedMessage }}</p>
          <article class="review-form__own" aria-label="Your review">
            <header class="review-form__own-header">
              <span class="review-form__stars" [attr.aria-label]="review.rating + ' out of 5 stars'">
                {{ stars(review.rating) }}
              </span>
              @if (review.is_verified_purchase) {
                <span class="review-form__badge">Verified purchase</span>
              }
              <span class="review-form__status">Pending</span>
            </header>
            <p class="review-form__comment">{{ review.comment }}</p>
          </article>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <fieldset class="review-form__rating">
            <legend class="review-form__legend">Rating</legend>
            <div class="review-form__stars-input" role="radiogroup" aria-label="Rating">
              @for (star of starOptions; track star) {
                <label class="review-form__star" [class.review-form__star--on]="star <= (rating() ?? 0)">
                  <input
                    type="radio"
                    [value]="star"
                    [attr.value]="star"
                    formControlName="rating"
                    [attr.aria-label]="star + (star === 1 ? ' star' : ' stars')"
                    [attr.aria-invalid]="ratingError() ? 'true' : null"
                    [attr.aria-describedby]="ratingError() ? 'review-rating-error' : null"
                  />
                  <span aria-hidden="true">★</span>
                </label>
              }
            </div>
            @if (ratingError()) {
              <p id="review-rating-error" class="review-form__error" role="alert">{{ ratingError() }}</p>
            }
          </fieldset>

          <app-field
            label="Comment"
            controlId="review-comment"
            [error]="commentError()"
            hint="At least 10 characters"
            required
          >
            <textarea
              id="review-comment"
              formControlName="comment"
              rows="4"
              [attr.aria-invalid]="commentError() ? 'true' : null"
              [attr.aria-describedby]="commentError() ? 'review-comment-error' : 'review-comment-hint'"
            ></textarea>
          </app-field>

          @if (formError()) {
            <p class="review-form__error" role="alert">{{ formError() }}</p>
          }

          <app-button type="submit" variant="primary" [loading]="submitting()">
            Submit review
          </app-button>
        </form>
      }
    </section>
  `,
  styles: [
    `
      .review-form {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
      }
      .review-form__heading {
        margin: 0;
        font-size: var(--font-size-20);
      }
      .review-form__legend {
        font-size: var(--font-size-14);
        font-weight: 600;
        margin-bottom: var(--space-1);
      }
      .review-form__rating {
        border: 0;
        padding: 0;
        margin: 0 0 var(--space-3);
      }
      .review-form__stars-input {
        display: flex;
        gap: var(--space-1);
      }
      .review-form__star {
        cursor: pointer;
        font-size: 28px;
        line-height: 1;
        color: var(--color-border);
      }
      .review-form__star--on {
        color: var(--color-warning, #f5a623);
      }
      .review-form__star input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .review-form__star:focus-within {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: var(--radius-field);
      }
      textarea {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
        resize: vertical;
      }
      .review-form__error {
        margin: 0 0 var(--space-3);
        color: var(--color-error);
        font-size: var(--font-size-14);
      }
      .review-form__success {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .review-form__message {
        margin: 0;
        color: var(--color-success, #1a7f37);
        font-weight: 600;
      }
      .review-form__own {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        padding: var(--space-3);
      }
      .review-form__own-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .review-form__stars {
        color: var(--color-warning, #f5a623);
        letter-spacing: 2px;
      }
      .review-form__badge {
        font-size: var(--font-size-12);
        font-weight: 600;
        padding: 2px var(--space-2);
        border-radius: var(--radius-field);
        background: var(--color-primary-soft);
        color: var(--color-primary);
      }
      .review-form__status {
        font-size: var(--font-size-12);
        color: var(--color-text-muted);
      }
      .review-form__comment {
        margin: var(--space-2) 0 0;
      }
    `,
  ],
})
export class ReviewFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** The product the review belongs to. */
  readonly productId = input.required<number>();

  readonly submittedMessage = REVIEW_SUBMITTED_MESSAGE;
  readonly starOptions = [1, 2, 3, 4, 5];

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly submittedReview = signal<Review | null>(null);

  readonly signedIn = this.auth.isSignedIn;

  readonly form = this.fb.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(MIN_COMMENT_LENGTH)]],
  });

  readonly rating = computed(() => {
    const value = this.form.controls.rating.value;
    return value >= 1 ? value : null;
  });

  /** The error beside the rating group, once the rating field has been touched. */
  ratingError(): string | null {
    const field = this.form.controls.rating;
    if (!field.touched || field.valid) {
      return null;
    }
    return INVALID_REVIEW_MESSAGE;
  }

  /** The error beside the comment field, once the field has been touched. */
  commentError(): string | null {
    const field = this.form.controls.comment;
    if (!field.touched || field.valid) {
      return null;
    }
    return INVALID_REVIEW_MESSAGE;
  }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set(INVALID_REVIEW_MESSAGE);
      return;
    }
    const { rating, comment } = this.form.getRawValue();
    this.submitting.set(true);
    this.api
      .post<{ review: Review }>(`products/${this.productId()}/reviews`, {
        rating,
        comment: comment.trim(),
      })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.submittedReview.set(response.review);
          this.toast.success(REVIEW_SUBMITTED_MESSAGE);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.formError.set(apiErrorMessage(error));
        },
      });
  }
}
