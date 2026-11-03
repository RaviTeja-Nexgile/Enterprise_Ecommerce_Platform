import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AUTH_MESSAGES } from '../../core/auth/auth-messages';
import { isStrongPassword } from '../../core/auth/password.validator';
import { RegisterComponent } from './register.component';

const VALID = {
  first_name: 'Casey',
  last_name: 'Customer',
  email: 'new-customer@example.com',
  phone: '555-0100',
  password: 'Customer@12345',
};

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('labels every field with a visible label', () => {
    const element: HTMLElement = fixture.nativeElement;
    for (const id of [
      'register-first-name',
      'register-last-name',
      'register-email',
      'register-phone',
      'register-password',
    ]) {
      expect(element.querySelector(`label[for="${id}"]`)).not.toBeNull();
      expect(element.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('applies the password strength rule', () => {
    expect(isStrongPassword('short1A')).toBe(false);
    expect(isStrongPassword('alllowercase1')).toBe(false);
    expect(isStrongPassword('ALLUPPERCASE1')).toBe(false);
    expect(isStrongPassword('NoDigitsHere')).toBe(false);
    expect(isStrongPassword('Customer@12345')).toBe(true);
  });

  it('shows the password rule message and keeps the form open for a weak password', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ ...VALID, password: 'weakpass' });
    component.submit();
    fixture.detectChanges();

    http.expectNone('/api/v1/auth/register');
    const element: HTMLElement = fixture.nativeElement;
    const password = element.querySelector('#register-password') as HTMLInputElement;
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-describedby')).toBe('register-password-error');
    expect(element.querySelector('#register-password-error')?.textContent).toContain(
      AUTH_MESSAGES.passwordRule,
    );
  });

  it('shows "An account with this email already exists" on a 409', () => {
    const component = fixture.componentInstance;
    component.form.setValue(VALID);
    component.submit();

    http
      .expectOne('/api/v1/auth/register')
      .flush(
        { error: { code: 'email_taken', message: 'An account with this email already exists' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      AUTH_MESSAGES.emailTaken,
    );
    expect(element.querySelector('form')).not.toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('signs the new Customer in and opens the home page', () => {
    const component = fixture.componentInstance;
    component.form.setValue(VALID);
    component.submit();

    http.expectOne('/api/v1/auth/register').flush({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
      user: {
        id: 9,
        email: VALID.email,
        first_name: VALID.first_name,
        last_name: VALID.last_name,
        roles: ['Customer'],
        permissions: [],
        is_active: true,
      },
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
