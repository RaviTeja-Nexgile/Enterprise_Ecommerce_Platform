import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/** Sign-in screen. Task 2.1 completes the form states and the tests. */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Sign in">
        @if (expired()) {
          <p class="text-error" role="alert">Your session has expired. Please sign in again</p>
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
            <p class="text-error" role="alert">{{ formError() }}</p>
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
      .auth-page__links {
        display: flex;
        justify-content: space-between;
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
        outline: none;
      }
    `,
  ],
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
    return control === 'email' ? 'Enter a valid email address' : 'Enter your password';
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
        this.formError.set(apiErrorMessage(error));
      },
    });
  }
}
