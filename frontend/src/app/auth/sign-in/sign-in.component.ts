import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage, readApiError } from '../../core/api/api-error';
import { AUTH_MESSAGES, FIELD_MESSAGES } from '../../core/auth/auth-messages';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/**
 * Sign-in screen (requirements 1.4, 1.5, 1.11, 2.1–2.5 and 23.6).
 *
 * A wrong password or an unknown email keeps the form open with
 * "Invalid email or password"; a successful sign-in opens the first screen of
 * the person's role.
 */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Sign in">
        @if (expired()) {
          <p class="auth-page__notice" role="alert">{{ sessionExpiredMessage }}</p>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-field label="Email" controlId="sign-in-email" [error]="errorFor('email')" required>
            <input
              id="sign-in-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="errorFor('email') ? 'true' : null"
              [attr.aria-describedby]="errorFor('email') ? 'sign-in-email-error' : null"
            />
          </app-field>
          <app-field label="Password" controlId="sign-in-password" [error]="errorFor('password')" required>
            <input
              id="sign-in-password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="errorFor('password') ? 'true' : null"
              [attr.aria-describedby]="errorFor('password') ? 'sign-in-password-error' : null"
            />
          </app-field>
          @if (formError()) {
            <p class="auth-page__notice" role="alert">{{ formError() }}</p>
          }
          <app-button type="submit" variant="primary" [block]="true" [loading]="submitting()">
            Sign in
          </app-button>
        </form>
        <p class="auth-page__links">
          <a routerLink="/forgot-password">Forgot your password?</a>
          <a routerLink="/register">Create an account</a>
        </p>
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
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
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
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly sessionExpiredMessage = AUTH_MESSAGES.sessionExpired;
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly expired = signal(this.route.snapshot.queryParamMap.get('reason') === 'expired');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  errorFor(control: 'email' | 'password'): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    return control === 'email' ? FIELD_MESSAGES.email : FIELD_MESSAGES.password;
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || this.auth.homeRoute());
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        const apiError = readApiError(error);
        // Requirement 1.5: a wrong password and an unknown email read the same.
        this.formError.set(
          apiError.code === 'invalid_credentials'
            ? AUTH_MESSAGES.invalidCredentials
            : apiErrorMessage(error),
        );
      },
    });
  }
}
