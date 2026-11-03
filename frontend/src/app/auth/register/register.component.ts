import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage, readApiError } from '../../core/api/api-error';
import { AUTH_MESSAGES, FIELD_MESSAGES } from '../../core/auth/auth-messages';
import { AuthService } from '../../core/auth/auth.service';
import { strongPasswordValidator } from '../../core/auth/password.validator';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

type RegisterField = 'first_name' | 'last_name' | 'email' | 'phone' | 'password';

/**
 * Registration screen (requirements 1.1, 1.2, 1.3 and 1.11).
 *
 * A duplicate email and a weak password keep the form open with the exact
 * message of requirement 1; a successful registration signs the person in and
 * opens the first screen of their role.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Create an account">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-field
            label="First name"
            controlId="register-first-name"
            [error]="errorFor('first_name')"
            required
          >
            <input
              id="register-first-name"
              type="text"
              formControlName="first_name"
              autocomplete="given-name"
              [attr.aria-invalid]="errorFor('first_name') ? 'true' : null"
              [attr.aria-describedby]="errorFor('first_name') ? 'register-first-name-error' : null"
            />
          </app-field>
          <app-field
            label="Last name"
            controlId="register-last-name"
            [error]="errorFor('last_name')"
            required
          >
            <input
              id="register-last-name"
              type="text"
              formControlName="last_name"
              autocomplete="family-name"
              [attr.aria-invalid]="errorFor('last_name') ? 'true' : null"
              [attr.aria-describedby]="errorFor('last_name') ? 'register-last-name-error' : null"
            />
          </app-field>
          <app-field label="Email" controlId="register-email" [error]="errorFor('email')" required>
            <input
              id="register-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="errorFor('email') ? 'true' : null"
              [attr.aria-describedby]="errorFor('email') ? 'register-email-error' : null"
            />
          </app-field>
          <app-field label="Phone" controlId="register-phone" [error]="errorFor('phone')">
            <input
              id="register-phone"
              type="tel"
              formControlName="phone"
              autocomplete="tel"
              [attr.aria-invalid]="errorFor('phone') ? 'true' : null"
              [attr.aria-describedby]="errorFor('phone') ? 'register-phone-error' : null"
            />
          </app-field>
          <app-field
            label="Password"
            controlId="register-password"
            [error]="errorFor('password')"
            hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit"
            required
          >
            <input
              id="register-password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              [attr.aria-invalid]="errorFor('password') ? 'true' : null"
              [attr.aria-describedby]="
                errorFor('password') ? 'register-password-error' : 'register-password-hint'
              "
            />
          </app-field>
          @if (formError()) {
            <p class="auth-page__notice" role="alert">{{ formError() }}</p>
          }
          <app-button type="submit" variant="primary" [block]="true" [loading]="submitting()">
            Create account
          </app-button>
        </form>
        <p class="auth-page__links"><a routerLink="/sign-in">Already have an account? Sign in</a></p>
      </app-card>
    </div>
  `,
  styles: [
    `
      .auth-page {
        max-width: 480px;
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, strongPasswordValidator]],
  });

  errorFor(control: RegisterField): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    if (control === 'email') {
      return FIELD_MESSAGES.email;
    }
    if (control === 'password') {
      return AUTH_MESSAGES.passwordRule;
    }
    return FIELD_MESSAGES.required;
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        const apiError = readApiError(error);
        if (apiError.code === 'email_taken') {
          this.formError.set(AUTH_MESSAGES.emailTaken);
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
