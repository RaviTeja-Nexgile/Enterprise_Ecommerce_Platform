import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from '../models/api.model';

export const SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again';

/** Read the error envelope out of a failed HTTP response. */
export function readApiError(error: unknown): ApiErrorBody {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: ApiErrorBody } | null;
    if (body && typeof body === 'object' && body.error && body.error.message) {
      return body.error;
    }
    if (error.status === 0) {
      return {
        code: 'network_error',
        message: 'The server could not be reached. Please try again.',
      };
    }
    if (error.status >= 500) {
      return { code: 'server_error', message: SERVER_ERROR_MESSAGE };
    }
    return {
      code: `http_${error.status}`,
      message: error.statusText || SERVER_ERROR_MESSAGE,
    };
  }
  return { code: 'unknown_error', message: SERVER_ERROR_MESSAGE };
}

/** The message to show a person for a failed request. */
export function apiErrorMessage(error: unknown): string {
  return readApiError(error).message;
}
