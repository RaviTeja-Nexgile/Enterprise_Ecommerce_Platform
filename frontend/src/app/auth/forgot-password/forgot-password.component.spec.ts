import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AUTH_MESSAGES } from '../../core/auth/auth-messages';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('labels the email field and links its error text', () => {
    const component = fixture.componentInstance;
    component.form.controls.email.markAsTouched();
    component.form.controls.email.setValue('nope');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('label[for="forgot-email"]')?.textContent).toContain('Email');
    const email = element.querySelector('#forgot-email') as HTMLInputElement;
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('forgot-email-error');
    expect(element.querySelector('#forgot-email-error')).not.toBeNull();
  });

  it('shows the neutral confirmation after a request', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'customer@example.com' });
    component.submit();

    http
      .expectOne('/api/v1/auth/forgot-password')
      .flush({ message: AUTH_MESSAGES.resetSent });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const status = element.querySelector('[role="status"]');
    expect(status?.textContent).toContain(AUTH_MESSAGES.resetSent);
    expect(element.querySelector('form')).toBeNull();
  });

  it('shows the same confirmation for an unknown email', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'nobody@example.com' });
    component.submit();

    http
      .expectOne('/api/v1/auth/forgot-password')
      .flush({ message: AUTH_MESSAGES.resetSent });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      AUTH_MESSAGES.resetSent,
    );
  });
});
