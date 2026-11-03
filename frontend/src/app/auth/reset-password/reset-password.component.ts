import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage, readApiError } from '../../core/api/api-error';
import { ApiClient } from '../../core/api/api-client.service';
import { AUTH_MESSAGES, FIELD_MESSAGES } from '../../core/auth/auth-messages';
import { strongPasswordValidator } from '../../core/auth/password.validator';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/**
 * Reset-password screen (requirements 1.9, 1.10 and 1.11).
 *
 * A valid, unused link sets the new password and opens the sign-in page; an
 * expired or used link shows "This reset link is no longer valid".
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Choose a new password">
        @if (invalidLink()) {
          <p class="auth-page__notice" role="alert">{{ invalidLinkMessage }}</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <app-field
              label="New password"
              controlId="reset-password"
              [error]="errorFor()"
              hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit"
              required
            >
              <input
                id="reset-password"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                [attr.aria-invalid]="errorFor() ? 'true' : null"
                [attr.aria-describedby]="errorFor() ? 'reset-password-error' : 'reset-password-hint'"
              />
            </app-field>
            @if (formError()) {
              <p class="auth-page__notice" role="alert">{{ formError() }}</p>
            }
            <app-button type="submit" variant="primary" [block]="true" [loading]="submitting()">
              Save new password
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
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly invalidLinkMessage = AUTH_MESSAGES.resetLinkInvalid;
  readonly submitting = signal(false);
  readonly invalidLink = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, strongPasswordValidator]],
  });

  errorFor(): string | null {
    const field = this.form.controls.password;
    if (!field.touched || field.valid) {
      return null;
    }
    return field.value ? AUTH_MESSAGES.passwordRule : FIELD_MESSAGES.required;
  }

  submit(): void {
    this.formError.set(null);
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.invalidLink.set(true);
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.api
      .post('auth/reset-password', { token, password: this.form.getRawValue().password })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate(['/sign-in']);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const apiError = readApiError(error);
          if (apiError.code === 'invalid_token') {
            this.invalidLink.set(true);
            return;
          }
          if (apiError.code === 'weak_password') {
            this.formError.set(AUTH_MESSAGES.passwordRule);
            return;
          }
          this.formError.set(apiErrorMessage(error));
        },
      });
  }
}
