/**
 * The exact messages requirement 1 shows on the auth screens.
 *
 * They are kept in one place so the forms, the tests and the API contract
 * (`design.md` "Auth") cannot drift apart.
 */
export const AUTH_MESSAGES = {
  emailTaken: 'An account with this email already exists',
  passwordRule:
    'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit',
  invalidCredentials: 'Invalid email or password',
  resetSent: 'If the email is registered, a reset link has been sent',
  resetLinkInvalid: 'This reset link is no longer valid',
  sessionExpired: 'Your session has expired. Please sign in again',
} as const;

/** Field-level messages the forms show before a request is sent. */
export const FIELD_MESSAGES = {
  required: 'This field is required',
  email: 'Enter a valid email address',
  password: 'Enter your password',
} as const;
