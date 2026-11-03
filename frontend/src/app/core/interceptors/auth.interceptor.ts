import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function isAuthRequest(url: string): boolean {
  return AUTH_PATHS.some((path) => url.includes(path));
}

/**
 * Adds the access token to every API request and, on a 401, tries one refresh
 * before giving up and sending the person to the sign-in page
 * (requirements 1.6 and 23.6).
 */
export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.accessToken;
  const authorized =
    token && !isAuthRequest(request.url)
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthRequest(request.url) &&
        auth.isSignedIn()
      ) {
        return auth.refresh().pipe(
          switchMap((tokens) =>
            next(
              request.clone({
                setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
              }),
            ),
          ),
          catchError((refreshError: unknown) => {
            auth.clearSession();
            void router.navigate(['/sign-in'], { queryParams: { reason: 'expired' } });
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
