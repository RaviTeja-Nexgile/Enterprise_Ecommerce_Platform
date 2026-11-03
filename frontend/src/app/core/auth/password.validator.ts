import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * The password strength rule of requirement 1.3: at least 8 characters with an
 * uppercase letter, a lowercase letter and a digit. It mirrors
 * `is_strong_password()` in `backend/app/security.py`.
 */
export function isStrongPassword(value: string | null | undefined): boolean {
  if (!value || value.length < 8) {
    return false;
  }
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
}

/** A reactive-forms validator that fails with `{ strongPassword: true }`. */
export const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => (isStrongPassword(control.value) ? null : { strongPassword: true });
