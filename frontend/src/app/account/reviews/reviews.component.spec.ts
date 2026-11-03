import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CustomerReview, ReviewsComponent } from './reviews.component';

function makeReview(overrides: Partial<CustomerReview> = {}): CustomerReview {
  return {
    id: 1,
    product_id: 10,
    user_id: 3,
    rating: 4,
    comment: 'Great sound and comfortable to wear.',
    is_verified_purchase: false,
    status: 'pending',
    created_at: '2026-03-01T12:00:00',
    ...overrides,
  };
}

describe('ReviewsComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(reviews: CustomerReview[]): HTMLElement {
    fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/users/me/reviews');
    expect(request.request.method).toBe('GET');
    request.flush({ data: reviews });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists the customer reviews with Pending, Approved and Rejected statuses', () => {
    const element = create([
      makeReview({ id: 1, status: 'pending', comment: 'Awaiting moderation.' }),
      makeReview({ id: 2, status: 'approved', comment: 'Published review.' }),
      makeReview({ id: 3, status: 'rejected', comment: 'Rejected review.' }),
    ]);

    const items = element.querySelectorAll('.review');
    expect(items.length).toBe(3);

    expect(items[0].querySelector('.status')?.textContent?.trim()).toBe('Pending');
    expect(items[1].querySelector('.status')?.textContent?.trim()).toBe('Approved');
    expect(items[2].querySelector('.status')?.textContent?.trim()).toBe('Rejected');

    expect(items[0].textContent).toContain('Awaiting moderation.');
    expect(items[1].textContent).toContain('Published review.');
    expect(items[2].textContent).toContain('Rejected review.');
  });

  it('shows the rating as stars and marks a verified purchase', () => {
    const element = create([makeReview({ rating: 5, is_verified_purchase: true })]);
    const review = element.querySelector('.review') as HTMLElement;
    expect(review.querySelector('.review__rating')?.textContent).toContain('★★★★★');
    expect(review.textContent).toContain('Verified purchase');
  });

  it('shows an empty state when the customer has no reviews', () => {
    const element = create([]);
    expect(element.querySelector('.empty-state')?.textContent).toContain(
      'You have not written any reviews yet.',
    );
  });

  it('shows the API message and a retry when the request fails', () => {
    fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/users/me/reviews');
    request.flush(
      { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Too many requests. Please try again later.',
    );
    expect(element.querySelector('.empty-state')).toBeNull();

    const retry = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Try again',
    ) as HTMLButtonElement;
    expect(retry).toBeDefined();
    retry.click();
    fixture.detectChanges();

    const again = http.expectOne('/api/v1/users/me/reviews');
    again.flush({ data: [makeReview({ status: 'approved' })] });
    fixture.detectChanges();

    expect(element.querySelector('.status')?.textContent?.trim()).toBe('Approved');
  });
});
