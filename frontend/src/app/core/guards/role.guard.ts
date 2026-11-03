import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

/**
 * Allows only the roles named in the route's `data.roles`. A signed-in person
 * without the role sees the "You do not have access to this page" screen
 * (requirement 2.6) and stays signed in.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/sign-in']);
  }

  const allowed = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (allowed.length === 0 || auth.hasRole(...allowed)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};

/** Allows only a person holding the permission named in `data.permission`. */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/sign-in']);
  }

  const permission = route.data?.['permission'] as string | undefined;
  if (!permission || auth.hasPermission(permission)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};
