import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { ApiClient } from '../../core/api/api-client.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';

/** Reset-password screen. Task 2.1 completes the states and the tests. */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <app-card title="Choose a new password">
        @if (invalidLink()) {
          <p class="text-error" role="alert">This reset link is no longer valid</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <app-field label="New password" controlId="reset-password" required>
              <input id="reset-password" type="password" formControlName="password" autocomplete="new-password" />
            </app-field>
            @if (formError()) {
              <p class="text-error" role="alert">{{ formError() }}</p>
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
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly invalidLink = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
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
          this.formError.set(apiErrorMessage(error));
          this.invalidLink.set(true);
        },
      });
  }
}
