import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { ApiClient } from './core/api/api-client.service';
import { AuthService } from './core/auth/auth.service';
import { homeForRoles } from './core/models/user.model';
import { MoneyPipe } from './core/format/money.pipe';
import { ToastService } from './shared/toast/toast.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('creates the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the skip link and the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.skip-link')?.textContent).toContain('Skip to main content');
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });
});

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formats integer cents as USD', () => {
    expect(pipe.transform(12999)).toBe('$129.99');
    expect(pipe.transform(500)).toBe('$5.00');
    expect(pipe.transform(0)).toBe('$0.00');
  });

  it('formats thousands and negatives', () => {
    expect(pipe.transform(123456)).toBe('$1,234.56');
    expect(pipe.transform(-250)).toBe('-$2.50');
  });

  it('handles missing values', () => {
    expect(pipe.transform(null)).toBe('$0.00');
    expect(pipe.transform(undefined)).toBe('$0.00');
  });
});

describe('homeForRoles', () => {
  it('sends each role to its first screen', () => {
    expect(homeForRoles(['Super Admin'])).toBe('/admin');
    expect(homeForRoles(['Admin'])).toBe('/admin');
    expect(homeForRoles(['Inventory Manager'])).toBe('/admin/inventory');
    expect(homeForRoles(['Order Manager'])).toBe('/admin/orders');
    expect(homeForRoles(['Customer'])).toBe('/');
  });

  it('falls back to the home page for an unknown role', () => {
    expect(homeForRoles([])).toBe('/');
  });
});

describe('ToastService', () => {
  it('uses role="alert" for errors and role="status" for success', () => {
    const service = new ToastService();
    service.error('Something failed');
    service.success('Saved');
    const [error, success] = service.toasts();
    expect(error.role).toBe('alert');
    expect(success.role).toBe('status');
  });

  it('keeps a toast visible for at least 5 seconds', () => {
    const service = new ToastService();
    service.success('Saved', 100);
    expect(service.toasts()[0].durationMs).toBeGreaterThanOrEqual(5000);
  });
});

describe('ApiClient', () => {
  let api: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the versioned API path', () => {
    api.get('products').subscribe();
    const request = http.expectOne('/api/v1/products');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { page: 1, per_page: 12, total: 0, total_pages: 0 } });
  });

  it('sends list filters as query parameters', () => {
    api.get('products', { q: 'lamp', page: 2, category: 'home-kitchen' }).subscribe();
    const request = http.expectOne(
      (req) => req.url === '/api/v1/products' && req.params.get('q') === 'lamp',
    );
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('category')).toBe('home-kitchen');
    request.flush({ data: [], meta: { page: 2, per_page: 12, total: 0, total_pages: 0 } });
  });

  it('checks the health endpoint', () => {
    api.health().subscribe();
    const request = http.expectOne('/api/health');
    request.flush({ status: 'ok', service: 'e-commerce-api' });
  });
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the access token in memory after sign-in', () => {
    auth
      .login({ email: 'customer@example.com', password: 'Customer@12345' })
      .subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    request.flush({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: {
        id: 1,
        email: 'customer@example.com',
        first_name: 'Casey',
        last_name: 'Customer',
        roles: ['Customer'],
        permissions: [],
        is_active: true,
      },
    });

    expect(auth.accessToken).toBe('access-1');
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.homeRoute()).toBe('/');
  });

  it('clears the session on sign-out', () => {
    auth
      .login({ email: 'admin@example.com', password: 'Admin@12345' })
      .subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      access_token: 'access-2',
      user: {
        id: 2,
        email: 'admin@example.com',
        first_name: 'Avery',
        last_name: 'Admin',
        roles: ['Super Admin'],
        permissions: ['dashboard.view'],
        is_active: true,
      },
    });

    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isSignedIn()).toBe(false);
    expect(auth.accessToken).toBeNull();
  });
});
