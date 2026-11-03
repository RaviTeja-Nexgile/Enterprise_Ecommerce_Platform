import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

const CUSTOMER = {
  id: 1,
  email: 'customer@example.com',
  first_name: 'Casey',
  last_name: 'Customer',
  roles: ['Customer'],
  permissions: [],
  is_active: true,
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  function signIn(): void {
    auth.login({ email: 'customer@example.com', password: 'Customer@12345' }).subscribe();
    controller.expectOne('/api/v1/auth/login').flush({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: CUSTOMER,
    });
  }

  it('adds the access token to an API request', () => {
    signIn();
    http.get('/api/v1/cart').subscribe();
    const request = controller.expectOne('/api/v1/cart');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({});
  });

  it('refreshes once on a 401 and retries the request', () => {
    signIn();
    http.get('/api/v1/cart').subscribe();
    controller
      .expectOne('/api/v1/cart')
      .flush({ error: { code: 'unauthenticated', message: 'Unauthenticated' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    controller.expectOne('/api/v1/auth/refresh').flush({ access_token: 'access-2' });

    const retried = controller.expectOne('/api/v1/cart');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
    retried.flush({});

    expect(auth.accessToken).toBe('access-2');
    expect(auth.isSignedIn()).toBe(true);
  });

  it('clears the session and opens the sign-in page when the refresh fails', () => {
    signIn();
    http.get('/api/v1/cart').subscribe({ error: () => undefined });
    controller
      .expectOne('/api/v1/cart')
      .flush({ error: { code: 'unauthenticated', message: 'Unauthenticated' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    controller
      .expectOne('/api/v1/auth/refresh')
      .flush(
        { error: { code: 'session_expired', message: 'Your session has expired. Please sign in again' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(auth.isSignedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { reason: 'expired' },
    });
  });

  it('does not refresh a failed sign-in', () => {
    http
      .post('/api/v1/auth/login', { email: 'x@example.com', password: 'bad' })
      .subscribe({ error: () => undefined });
    controller
      .expectOne('/api/v1/auth/login')
      .flush(
        { error: { code: 'invalid_credentials', message: 'Invalid email or password' } },
        { status: 401, statusText: 'Unauthorized' },
      );

    controller.expectNone('/api/v1/auth/refresh');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
