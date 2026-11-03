import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { apiErrorMessage } from '../../core/api/api-error';
import { ButtonComponent } from '../../shared/button/button.component';
import { FieldComponent } from '../../shared/field/field.component';
import { StorefrontService } from '../storefront.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The newsletter form on the home page (requirements 3.5 and 3.6).
 *
 * A valid email shows "Thanks for subscribing"; an empty or invalid email
 * keeps the form open and shows "Enter a valid email address".
 */
@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [FormsModule, FieldComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="newsletter" aria-labelledby="newsletter-heading">
      <h2 id="newsletter-heading" class="newsletter__title">Stay in the loop</h2>
      <p class="newsletter__lead">Get new arrivals and offers in your inbox.</p>

      <form class="newsletter__form" #newsletterForm="ngForm" (ngSubmit)="submit()" novalidate>
        <app-field
          label="Email address"
          controlId="newsletter-email"
          [error]="error()"
          [required]="true"
        >
          <input
            id="newsletter-email"
            class="newsletter__input"
            type="email"
            [value]="email()"
            (input)="onInput($event)"
            [attr.aria-invalid]="error() ? 'true' : null"
            [attr.aria-describedby]="error() ? 'newsletter-email-error' : null"
            placeholder="you@example.com"
          />
        </app-field>

        @if (message()) {
          <p class="newsletter__message" role="status">{{ message() }}</p>
        }

        <app-button type="submit" [loading]="submitting()" [block]="true">Subscribe</app-button>
      </form>
    </section>
  `,
  styles: [
    `
      .newsletter {
        background: var(--color-primary-soft);
        border-radius: var(--radius-card);
        padding: var(--space-8);
        text-align: center;
      }
      .newsletter__title {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-24);
      }
      .newsletter__lead {
        margin: 0 0 var(--space-6);
        color: var(--color-text-muted);
      }
      .newsletter__form {
        max-width: 420px;
        margin: 0 auto;
        text-align: left;
      }
      .newsletter__input {
        width: 100%;
        min-height: 44px;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        font-size: var(--font-size-16);
        background: var(--color-surface);
        color: var(--color-text);
      }
      .newsletter__input:focus {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
        border-color: var(--color-primary);
      }
      .newsletter__message {
        margin: 0 0 var(--space-4);
        color: var(--color-success);
        font-weight: 600;
      }
    `,
  ],
})
export class NewsletterComponent {
  private readonly storefront = inject(StorefrontService);

  readonly email = signal('');
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly submitting = signal(false);

  onInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  submit(): void {
    const value = this.email().trim();
    if (!value || !EMAIL_PATTERN.test(value)) {
      this.error.set('Enter a valid email address');
      this.message.set(null);
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.storefront.subscribeNewsletter(value).subscribe({
      next: () => {
        this.message.set('Thanks for subscribing');
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err));
        this.submitting.set(false);
      },
    });
  }
}