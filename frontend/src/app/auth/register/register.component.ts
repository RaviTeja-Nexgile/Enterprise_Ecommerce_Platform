import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/** Registration screen. Task 2.1 completes the form states and the tests. */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Create an account">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-field label="First name" controlId="register-first-name" [error]="errorFor('first_name')" required>
            <input id="register-first-name" type="text" formControlName="first_name" autocomplete="given-name" />
          </app-field>
          <app-field label="Last name" controlId="register-last-name" [error]="errorFor('last_name')" required>
            <input id="register-last-name" type="text" formControlName="last_name" autocomplete="family-name" />
          </app-field>
          <app-field label="Email" controlId="register-email" [error]="errorFor('email')" required>
            <input id="register-email" type="email" formControlName="email" autocomplete="email" />
          </app-field>
          <app-field label="Phone" controlId="register-phone" [error]="errorFor('phone')">
            <input id="register-phone" type="tel" formControlName="phone" autocomplete="tel" />
          </app-field>
          <app-field
            label="Password"
            controlId="register-password"
            [error]="errorFor('password')"
            hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit"
            required
          >
            <input id="register-password" type="password" formControlName="password" autocomplete="new-password" />
          </app-field>
          @if (formError()) {
            <p class="text-error" role="alert">{{ formError() }}</p>
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
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  errorFor(control: 'first_name' | 'last_name' | 'email' | 'phone' | 'password'): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    return control === 'email' ? 'Enter a valid email address' : 'This field is required';
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
        this.formError.set(apiErrorMessage(error));
      },
    });
  }
}
