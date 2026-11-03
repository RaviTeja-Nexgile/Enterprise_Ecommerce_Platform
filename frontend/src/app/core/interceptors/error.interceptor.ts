import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../api/api-error';

/**
 * Turns a failed API request into an error toast with the message the API
 * returned (requirement 23.1 and 23.5), then rethrows so callers can react.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // A 401 on the auth endpoints is shown by the form itself.
        const isAuthCall = request.url.includes('/auth/');
        if (!(error.status === 401 && isAuthCall)) {
          toast.error(apiErrorMessage(error));
        }
      }
      return throwError(() => error);
    }),
  );
};
