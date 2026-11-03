import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/user.model';
import { ToastService } from '../../shared/toast/toast.service';
import { ProfileComponent } from './profile.component';

const CUSTOMER: User = {
  id: 7,
  email: 'casey@example.com',
  first_name: 'Casey',
  last_name: 'Customer',
  phone: '555-0100',
  roles: ['Customer'],
  permissions: [],
  is_active: true,
};

describe('ProfileComponent', () => {
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    // The signed-in person is already in memory, so the form fills without a request.
    TestBed.inject(AuthService).login({ email: CUSTOMER.email, password: 'x' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      access_token: 'token',
      user: CUSTOMER,
    });
  });

  afterEach(() => http.verify());

  let fixture: ComponentFixture<ProfileComponent>;

  function create(): HTMLElement {
    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function type(element: HTMLElement, selector: string, value: string): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(element: HTMLElement, formIndex: number): void {
    const forms = element.querySelectorAll('form');
    forms[formIndex].dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('fills the profile form from the signed-in person', () => {
    const element = create();
    expect((element.querySelector('#profile-first-name') as HTMLInputElement).value).toBe('Casey');
    expect((element.querySelector('#profile-last-name') as HTMLInputElement).value).toBe('Customer');
    expect((element.querySelector('#profile-phone') as HTMLInputElement).value).toBe('555-0100');
    expect((element.querySelector('#profile-email') as HTMLInputElement).value).toBe(
      'casey@example.com',
    );
  });

  it('saves the first name, last name and phone and shows "Profile updated"', () => {
    const element = create();
    type(element, '#profile-first-name', 'Casey');
    type(element, '#profile-last-name', 'Shopper');
    type(element, '#profile-phone', '555-0199');
    submit(element, 0);

    const request = http.expectOne('/api/v1/users/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      first_name: 'Casey',
      last_name: 'Shopper',
      phone: '555-0199',
    });
    request.flush({ ...CUSTOMER, last_name: 'Shopper', phone: '555-0199' });

    expect(toast.toasts().some((t) => t.message === 'Profile updated')).toBe(true);
  });

  it('shows the error beside an empty first name and links it to the field', () => {
    const element = create();
    type(element, '#profile-first-name', '');
    submit(element, 0);

    http.expectNone('/api/v1/users/me');
    const input = element.querySelector('#profile-first-name') as HTMLInputElement;
    const error = element.querySelector('#profile-first-name-error');
    expect(error?.textContent).toContain('Enter your first name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('profile-first-name-error');
  });

  it('changes the password and shows "Password changed"', () => {
    const element = create();
    type(element, '#password-current', 'Customer@12345');
    type(element, '#password-new', 'NewPassw0rd');
    type(element, '#password-confirm', 'NewPassw0rd');
    submit(element, 1);

    const request = http.expectOne('/api/v1/auth/change-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      current_password: 'Customer@12345',
      new_password: 'NewPassw0rd',
    });
    request.flush({ message: 'Password changed' });

    expect(toast.toasts().some((t) => t.message === 'Password changed')).toBe(true);
  });

  it('refuses a weak new password before calling the API', () => {
    const element = create();
    type(element, '#password-current', 'Customer@12345');
    type(element, '#password-new', 'short');
    type(element, '#password-confirm', 'short');
    submit(element, 1);

    http.expectNone('/api/v1/auth/change-password');
    const error = element.querySelector('#password-new-error');
    expect(error?.textContent).toContain('at least 8 characters');
    expect(
      (element.querySelector('#password-new') as HTMLInputElement).getAttribute('aria-describedby'),
    ).toBe('password-new-error');
  });

  it('refuses a confirmation that does not match the new password', () => {
    const element = create();
    type(element, '#password-current', 'Customer@12345');
    type(element, '#password-new', 'NewPassw0rd');
    type(element, '#password-confirm', 'Different1');
    submit(element, 1);

    http.expectNone('/api/v1/auth/change-password');
    expect(element.querySelector('#password-confirm-error')?.textContent).toContain(
      'Enter the new password again',
    );
  });
});
