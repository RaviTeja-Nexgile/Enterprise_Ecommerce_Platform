import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiClient } from '../../core/api/api-client.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/** Forgot-password screen. Task 2.1 completes the states and the tests. */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Reset your password">
        @if (sent()) {
          <p role="status">If the email is registered, a reset link has been sent</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <app-field label="Email" controlId="forgot-email" required>
              <input id="forgot-email" type="email" formControlName="email" autocomplete="email" />
            </app-field>
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
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);

  readonly submitting = signal(false);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
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
      error: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
    });
  }
}
