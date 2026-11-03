import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiClient } from '../../core/api/api-client.service';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/user.model';
import { ButtonComponent } from '../../shared/button/button.component';
import { CardComponent } from '../../shared/card/card.component';
import { FieldComponent } from '../../shared/field/field.component';
import { ToastService } from '../../shared/toast/toast.service';

/** The password rule of requirement 1.3, shared by the register and profile forms. */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * `/account/profile` — the personal information form (requirement 9.2) and the
 * change password form (requirement 9.3).
 */
@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Profile</h1>

    <app-card title="Personal information">
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
        <div class="form-grid">
          <app-field
            label="First name"
            controlId="profile-first-name"
            [error]="profileError('first_name')"
            required
          >
            <input
              id="profile-first-name"
              type="text"
              formControlName="first_name"
              autocomplete="given-name"
              [attr.aria-invalid]="profileError('first_name') ? 'true' : null"
              [attr.aria-describedby]="profileError('first_name') ? 'profile-first-name-error' : null"
            />
          </app-field>
          <app-field
            label="Last name"
            controlId="profile-last-name"
            [error]="profileError('last_name')"
            required
          >
            <input
              id="profile-last-name"
              type="text"
              formControlName="last_name"
              autocomplete="family-name"
              [attr.aria-invalid]="profileError('last_name') ? 'true' : null"
              [attr.aria-describedby]="profileError('last_name') ? 'profile-last-name-error' : null"
            />
          </app-field>
        </div>
        <app-field label="Phone" controlId="profile-phone" [error]="profileError('phone')">
          <input
            id="profile-phone"
            type="tel"
            formControlName="phone"
            autocomplete="tel"
            [attr.aria-invalid]="profileError('phone') ? 'true' : null"
            [attr.aria-describedby]="profileError('phone') ? 'profile-phone-error' : null"
          />
        </app-field>
        <app-field label="Email" controlId="profile-email" hint="Your email address cannot be changed here.">
          <input id="profile-email" type="email" [value]="email()" readonly />
        </app-field>
        <app-button type="submit" variant="primary" [loading]="savingProfile()">
          Save changes
        </app-button>
      </form>
    </app-card>

    <app-card title="Change password">
      <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
        <app-field
          label="Current password"
          controlId="password-current"
          [error]="passwordError('current_password')"
          required
        >
          <input
            id="password-current"
            type="password"
            formControlName="current_password"
            autocomplete="current-password"
            [attr.aria-invalid]="passwordError('current_password') ? 'true' : null"
            [attr.aria-describedby]="
              passwordError('current_password') ? 'password-current-error' : null
            "
          />
        </app-field>
        <app-field
          label="New password"
          controlId="password-new"
          [error]="passwordError('new_password')"
          hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit."
          required
        >
          <input
            id="password-new"
            type="password"
            formControlName="new_password"
            autocomplete="new-password"
            [attr.aria-invalid]="passwordError('new_password') ? 'true' : null"
            [attr.aria-describedby]="
              passwordError('new_password') ? 'password-new-error' : 'password-new-hint'
            "
          />
        </app-field>
        <app-field
          label="Confirm new password"
          controlId="password-confirm"
          [error]="passwordError('confirm_password')"
          required
        >
          <input
            id="password-confirm"
            type="password"
            formControlName="confirm_password"
            autocomplete="new-password"
            [attr.aria-invalid]="passwordError('confirm_password') ? 'true' : null"
            [attr.aria-describedby]="
              passwordError('confirm_password') ? 'password-confirm-error' : null
            "
          />
        </app-field>
        <app-button type="submit" variant="primary" [loading]="savingPassword()">
          Change password
        </app-button>
      </form>
    </app-card>
  `,
  styles: [
    `
      .page-title {
        margin: 0 0 var(--space-6);
        font-size: var(--font-size-24);
      }
      app-card {
        display: block;
        margin-bottom: var(--space-6);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }
      input {
        height: 44px;
        width: 100%;
        padding: 0 var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-field);
        background: var(--color-surface);
        font: inherit;
        color: var(--color-text);
      }
      input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
        outline: none;
      }
      input[readonly] {
        background: var(--color-bg);
        color: var(--color-text-muted);
      }
      @media (max-width: 767px) {
        .form-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 0;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly email = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(40)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirm_password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.fill(user);
      return;
    }
    this.api.get<User>('users/me').subscribe((profile) => this.fill(profile));
  }

  profileError(control: 'first_name' | 'last_name' | 'phone'): string | null {
    const field = this.profileForm.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    if (control === 'phone') {
      return 'Enter a phone number of 40 characters or fewer';
    }
    return control === 'first_name' ? 'Enter your first name' : 'Enter your last name';
  }

  passwordError(
    control: 'current_password' | 'new_password' | 'confirm_password',
  ): string | null {
    const field = this.passwordForm.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }
    if (control === 'current_password') {
      return 'Enter your current password';
    }
    if (control === 'new_password') {
      return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit';
    }
    return 'Enter the new password again';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const value = this.profileForm.getRawValue();
    this.api
      .put<User>('users/me', {
        first_name: value.first_name,
        last_name: value.last_name,
        phone: value.phone || null,
      })
      .subscribe({
        next: (user) => {
          this.savingProfile.set(false);
          this.fill(user);
          this.toast.success('Profile updated');
        },
        error: () => this.savingProfile.set(false),
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const value = this.passwordForm.getRawValue();
    if (value.new_password !== value.confirm_password) {
      this.passwordForm.controls.confirm_password.setErrors({ mismatch: true });
      this.passwordForm.controls.confirm_password.markAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.api
      .post<{ message: string }>('auth/change-password', {
        current_password: value.current_password,
        new_password: value.new_password,
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordForm.reset();
          this.toast.success('Password changed');
        },
        error: () => this.savingPassword.set(false),
      });
  }

  private fill(user: User): void {
    this.email.set(user.email);
    this.profileForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone ?? '',
    });
  }
}
