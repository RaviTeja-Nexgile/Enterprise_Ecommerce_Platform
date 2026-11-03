import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { ApiClient } from '../../core/api/api-client.service';
import { AUTH_MESSAGES, FIELD_MESSAGES } from '../../core/auth/auth-messages';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/**
 * Forgot-password screen (requirements 1.8 and 1.11).
 *
 * Whatever the API answers, the screen shows the same confirmation so it never
 * reveals whether an email is registered.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Reset your password">
        @if (sent()) {
          <p class="auth-page__notice" role="status">{{ resetSentMessage }}</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <app-field label="Email" controlId="forgot-email" [error]="errorFor()" required>
              <input
                id="forgot-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                [attr.aria-invalid]="errorFor() ? 'true' : null"
                [attr.aria-describedby]="errorFor() ? 'forgot-email-error' : null"
              />
            </app-field>
            @if (formError()) {
              <p class="auth-page__notice" role="alert">{{ formError() }}</p>
            }
            <app-button type="submit" variant="primary" [block]="true" [loading]="submitting()">
              Send reset link
            </app-button>
          </form>
        }
        <p class="auth-page__links"><a routerLink="/sign-in">Back to sign in</a></p>
      </app-card>
    </div>
  `,
  styles: [
    `
      .auth-page {
        max-width: 440px;
        margin: var(--space-8) auto;
      }
      .auth-page__notice {
        margin: 0 0 var(--space-4);
        padding: var(--space-3);
        border-radius: var(--radius-field);
        background: var(--color-primary-soft);
        color: var(--color-text);
        font-size: var(--font-size-14);
      }
      .auth-page__links {
        margin-top: var(--space-4);
        font-size: var(--font-size-14);
      }
      input {
        height: 44px;
        width: 100%;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
      }
      input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
      input[aria-invalid='true'] {
        border-color: var(--color-error);
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);

  readonly resetSentMessage = AUTH_MESSAGES.resetSent;
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  errorFor(): string | null {
    const field = this.form.controls.email;
    if (!field.touched || field.valid) {
      return null;
    }
    return FIELD_MESSAGES.email;
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.api.post('auth/forgot-password', this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        // A rate limit or a server failure is shown; anything else still shows
        // the neutral confirmation so the screen never reveals an account.
        const message = apiErrorMessage(error);
        if (message === AUTH_MESSAGES.resetSent) {
          this.sent.set(true);
          return;
        }
        this.formError.set(message);
      },
    });
  }
}
