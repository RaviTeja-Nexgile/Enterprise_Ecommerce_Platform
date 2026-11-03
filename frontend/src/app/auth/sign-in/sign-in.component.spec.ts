import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { AUTH_MESSAGES } from '../../core/auth/auth-messages';
import { SignInComponent } from './sign-in.component';

const CUSTOMER = {
  id: 1,
  email: 'customer@example.com',
  first_name: 'Casey',
  last_name: 'Customer',
  roles: ['Customer'],
  permissions: [],
  is_active: true,
};

describe('SignInComponent', () => {
  let fixture: ComponentFixture<SignInComponent>;
  let http: HttpTestingController;
  let router: Router;
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    queryParams = {};
    await TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function fill(email: string, password: string): void {
    const form = fixture.componentInstance.form;
    form.setValue({ email, password });
    fixture.detectChanges();
  }

  it('labels every field with a visible label', () => {
    const element: HTMLElement = fixture.nativeElement;
    const email = element.querySelector('#sign-in-email') as HTMLInputElement;
    const password = element.querySelector('#sign-in-password') as HTMLInputElement;
    expect(element.querySelector('label[for="sign-in-email"]')?.textContent).toContain('Email');
    expect(element.querySelector('label[for="sign-in-password"]')?.textContent).toContain(
      'Password',
    );
    expect(email).not.toBeNull();
    expect(password).not.toBeNull();
  });

  it('marks an invalid field with aria-invalid and links its error text', () => {
    const component = fixture.componentInstance;
    component.form.controls.email.markAsTouched();
    component.form.controls.email.setValue('not-an-email');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const email = element.querySelector('#sign-in-email') as HTMLInputElement;
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('sign-in-email-error');
    const error = element.querySelector('#sign-in-email-error');
    expect(error?.textContent).toContain('Enter a valid email address');
  });

  it('shows "Invalid email or password" and keeps the form open on a 401', () => {
    fill('customer@example.com', 'wrong-password');
    fixture.componentInstance.submit();

    http
      .expectOne('/api/v1/auth/login')
      .flush(
        { error: { code: 'invalid_credentials', message: 'Invalid email or password' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      AUTH_MESSAGES.invalidCredentials,
    );
    expect(element.querySelector('form')).not.toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens the first screen of the role after sign-in', () => {
    fill('customer@example.com', 'Customer@12345');
    fixture.componentInstance.submit();

    http.expectOne('/api/v1/auth/login').flush({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: CUSTOMER,
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('sends an admin to the admin dashboard', () => {
    fill('admin@example.com', 'Admin@12345');
    fixture.componentInstance.submit();

    http.expectOne('/api/v1/auth/login').flush({
      access_token: 'access-2',
      user: { ...CUSTOMER, id: 2, roles: ['Super Admin'] },
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
  });

  it('shows the session-expired message when the refresh token is gone', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ reason: 'expired' }) },
          },
        },
      ],
    });
    const expiredFixture = TestBed.createComponent(SignInComponent);
    expiredFixture.detectChanges();
    const element: HTMLElement = expiredFixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      AUTH_MESSAGES.sessionExpired,
    );
  });
});
