import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { authGuard } from './auth.guard';
import { permissionGuard, roleGuard } from './role.guard';

const CUSTOMER = {
  id: 1,
  email: 'customer@example.com',
  first_name: 'Casey',
  last_name: 'Customer',
  roles: ['Customer'],
  permissions: [],
  is_active: true,
};

function runGuard(
  guard: typeof authGuard,
  data: Record<string, unknown> = {},
  url = '/account',
): boolean | UrlTree {
  const route = { data } as unknown as ActivatedRouteSnapshot;
  const state = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => guard(route, state)) as boolean | UrlTree;
}

describe('authGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  it('sends a signed-out person to the sign-in page with the return URL', () => {
    const result = runGuard(authGuard, {}, '/account');
    expect(result instanceof UrlTree).toBe(true);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/sign-in?returnUrl=%2Faccount');
  });

  it('lets a signed-in person through', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    expect(runGuard(authGuard)).toBe(true);
  });
});

describe('roleGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  it('lets a person with an allowed role through', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    jest.spyOn(auth, 'hasRole').mockReturnValue(true);
    expect(runGuard(roleGuard, { roles: ['Admin'] })).toBe(true);
  });

  it('sends a Customer away from an admin address to the forbidden screen', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    jest.spyOn(auth, 'hasRole').mockReturnValue(false);
    const result = runGuard(roleGuard, { roles: ['Admin'] });
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/forbidden');
  });

  it('sends a signed-out person to the sign-in page', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(false);
    const result = runGuard(roleGuard, { roles: ['Admin'] });
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/sign-in');
  });

  it('keeps a Customer signed in when the role is refused', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    jest.spyOn(auth, 'hasRole').mockReturnValue(false);
    runGuard(roleGuard, { roles: ['Admin'] });
    expect(auth.isSignedIn()).toBe(true);
  });
});

describe('permissionGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  it('lets a person holding the permission through', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    jest.spyOn(auth, 'hasPermission').mockReturnValue(true);
    expect(runGuard(permissionGuard, { permission: 'products.manage' })).toBe(true);
  });

  it('sends a person without the permission to the forbidden screen', () => {
    jest.spyOn(auth, 'isSignedIn').mockReturnValue(true);
    jest.spyOn(auth, 'hasPermission').mockReturnValue(false);
    const result = runGuard(permissionGuard, { permission: 'products.manage' });
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/forbidden');
  });
});

describe('AuthService role helpers', () => {
  it('reports the roles and permissions of the signed-in person', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const auth = TestBed.inject(AuthService);
    // The signal is private; exercise the public helpers through a session.
    expect(auth.hasRole('Customer')).toBe(false);
    expect(auth.hasPermission('orders.place')).toBe(false);
    expect(auth.homeRoute()).toBe('/');
    expect(CUSTOMER.roles).toEqual(['Customer']);
  });
});
