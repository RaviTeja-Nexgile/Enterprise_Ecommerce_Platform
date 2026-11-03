import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { AUTH_MESSAGES } from '../../core/auth/auth-messages';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let http: HttpTestingController;
  let router: Router;
  let token: string | null;

  beforeEach(async () => {
    token = 'reset-token-1';
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(token ? { token } : {}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('labels the password field and links its error text', () => {
    const component = fixture.componentInstance;
    component.form.controls.password.markAsTouched();
    component.form.controls.password.setValue('weak');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('label[for="reset-password"]')?.textContent).toContain(
      'New password',
    );
    const password = element.querySelector('#reset-password') as HTMLInputElement;
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-describedby')).toBe('reset-password-error');
    expect(element.querySelector('#reset-password-error')?.textContent).toContain(
      AUTH_MESSAGES.passwordRule,
    );
  });

  it('sets the new password and opens the sign-in page', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ password: 'NewPassword@1' });
    component.submit();

    const request = http.expectOne('/api/v1/auth/reset-password');
    expect(request.request.body).toEqual({ token: 'reset-token-1', password: 'NewPassword@1' });
    request.flush({ message: 'Your password has been reset' });

    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('shows "This reset link is no longer valid" for an expired or used link', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ password: 'NewPassword@1' });
    component.submit();

    http
      .expectOne('/api/v1/auth/reset-password')
      .flush(
        { error: { code: 'invalid_token', message: 'This reset link is no longer valid' } },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      AUTH_MESSAGES.resetLinkInvalid,
    );
    expect(element.querySelector('form')).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows the invalid-link state when the URL carries no token', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    const noTokenFixture = TestBed.createComponent(ResetPasswordComponent);
    noTokenFixture.detectChanges();
    noTokenFixture.componentInstance.submit();
    noTokenFixture.detectChanges();

    const element: HTMLElement = noTokenFixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      AUTH_MESSAGES.resetLinkInvalid,
    );
  });
});
