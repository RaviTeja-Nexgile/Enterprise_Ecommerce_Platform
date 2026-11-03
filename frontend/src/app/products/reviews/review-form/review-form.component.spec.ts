import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Review } from '../../../core/models/catalog.model';
import { ToastService } from '../../../shared/toast/toast.service';
import {
  INVALID_REVIEW_MESSAGE,
  REVIEW_SUBMITTED_MESSAGE,
  ReviewFormComponent,
} from './review-form.component';

const PRODUCT_ID = 7;

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 1,
    product_id: PRODUCT_ID,
    user_id: 3,
    rating: 4,
    comment: 'Lovely product, works well',
    is_verified_purchase: false,
    status: 'pending',
    created_at: '2026-11-03T00:00:00Z',
    ...overrides,
  };
}

describe('ReviewFormComponent', () => {
  let fixture: ComponentFixture<ReviewFormComponent>;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    // A signed-in Customer, as the form is only shown to them.
    (auth as unknown as { userSignal: { set: (value: unknown) => void } }).userSignal.set({
      id: 3,
      email: 'customer@example.com',
      first_name: 'Casey',
      last_name: 'Customer',
      roles: ['Customer'],
      permissions: [],
      is_active: true,
    });

    fixture = TestBed.createComponent(ReviewFormComponent);
    fixture.componentRef.setInput('productId', PRODUCT_ID);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function chooseRating(star: number): void {
    const input = element().querySelector<HTMLInputElement>(`input[type="radio"][value="${star}"]`);
    expect(input).not.toBeNull();
    input!.click();
    fixture.detectChanges();
  }

  function typeComment(text: string): void {
    const textarea = element().querySelector<HTMLTextAreaElement>('#review-comment')!;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows the form to a signed-in Customer', () => {
    expect(element().querySelector('form')).not.toBeNull();
    expect(element().textContent).toContain('Write a review');
  });

  it('keeps the form open and shows the message when no rating is chosen', () => {
    typeComment('A long enough comment');
    submit();

    expect(element().textContent).toContain(INVALID_REVIEW_MESSAGE);
    expect(element().querySelector('form')).not.toBeNull();
    http.expectNone(() => true);
  });

  it('keeps the form open and shows the message when the comment is shorter than 10 characters', () => {
    chooseRating(4);
    typeComment('Too short');
    submit();

    expect(element().textContent).toContain(INVALID_REVIEW_MESSAGE);
    expect(element().querySelector('form')).not.toBeNull();
    http.expectNone(() => true);
  });

  it('links the comment error to the field for screen readers', () => {
    chooseRating(4);
    typeComment('Too short');
    submit();

    const textarea = element().querySelector<HTMLTextAreaElement>('#review-comment')!;
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toBe('review-comment-error');
    const error = element().querySelector('#review-comment-error');
    expect(error?.textContent).toContain(INVALID_REVIEW_MESSAGE);
  });

  it('shows the rating error beside the stars and links it to the radios', () => {
    typeComment('A long enough comment');
    submit();

    const error = element().querySelector('#review-rating-error');
    expect(error?.textContent).toContain(INVALID_REVIEW_MESSAGE);
    expect(error?.getAttribute('role')).toBe('alert');
    const radios = element().querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios.forEach((radio) => {
      expect(radio.getAttribute('aria-invalid')).toBe('true');
      expect(radio.getAttribute('aria-describedby')).toBe('review-rating-error');
    });
  });

  it('clears the rating error once a rating is chosen', () => {
    typeComment('A long enough comment');
    submit();
    expect(element().querySelector('#review-rating-error')).not.toBeNull();

    chooseRating(4);
    expect(element().querySelector('#review-rating-error')).toBeNull();
    element()
      .querySelectorAll<HTMLInputElement>('input[type="radio"]')
      .forEach((radio) => {
        expect(radio.getAttribute('aria-invalid')).toBeNull();
        expect(radio.getAttribute('aria-describedby')).toBeNull();
      });
  });

  it('posts a valid review and shows the awaiting-approval message', () => {
    const toast = TestBed.inject(ToastService);
    chooseRating(4);
    typeComment('Lovely product, works well');
    submit();

    const request = http.expectOne((req) => req.url.endsWith(`/products/${PRODUCT_ID}/reviews`));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ rating: 4, comment: 'Lovely product, works well' });

    request.flush({ review: review() });
    fixture.detectChanges();

    expect(element().textContent).toContain(REVIEW_SUBMITTED_MESSAGE);
    expect(toast.toasts().some((item) => item.message === REVIEW_SUBMITTED_MESSAGE)).toBe(true);
    expect(element().querySelector('form')).toBeNull();
  });

  it('shows the verified-purchase badge on the customer own review', () => {
    chooseRating(5);
    typeComment('Bought it last week, very happy');
    submit();

    http
      .expectOne((req) => req.url.endsWith(`/products/${PRODUCT_ID}/reviews`))
      .flush({
        review: review({
          rating: 5,
          comment: 'Bought it last week, very happy',
          is_verified_purchase: true,
        }),
      });
    fixture.detectChanges();

    const own = element().querySelector('.review-form__own');
    expect(own?.textContent).toContain('Verified purchase');
    expect(own?.textContent).toContain('Bought it last week, very happy');
  });

  it('does not show the verified-purchase badge when the purchase is not verified', () => {
    chooseRating(3);
    typeComment('It is an okay product');
    submit();

    http
      .expectOne((req) => req.url.endsWith(`/products/${PRODUCT_ID}/reviews`))
      .flush({ review: review({ rating: 3, is_verified_purchase: false }) });
    fixture.detectChanges();

    expect(element().querySelector('.review-form__own')).not.toBeNull();
    expect(element().textContent).not.toContain('Verified purchase');
  });
});
