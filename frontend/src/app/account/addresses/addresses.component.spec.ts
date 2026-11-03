import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Address } from '../../core/models/order.model';
import { ToastService } from '../../shared/toast/toast.service';
import { AddressesComponent } from './addresses.component';

const HOME: Address = {
  id: 11,
  type: 'shipping',
  line1: '1 Market Street',
  line2: null,
  city: 'San Francisco',
  state: 'CA',
  postal_code: '94105',
  country: 'United States',
  is_default: true,
};

const OFFICE: Address = {
  id: 12,
  type: 'billing',
  line1: '9 Office Park',
  line2: 'Suite 4',
  city: 'Austin',
  state: 'TX',
  postal_code: '73301',
  country: 'United States',
  is_default: false,
};

describe('AddressesComponent', () => {
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressesComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  let fixture: ComponentFixture<AddressesComponent>;

  function create(addresses: Address[]): HTMLElement {
    fixture = TestBed.createComponent(AddressesComponent);
    fixture.detectChanges();
    http.expectOne('/api/v1/users/me/addresses').flush({ data: addresses });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function type(element: HTMLElement, selector: string, value: string): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clickButton(element: HTMLElement, label: string): void {
    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  function tickCheckbox(element: HTMLElement, selector: string): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('lists the addresses with their default badge', () => {
    const element = create([HOME, OFFICE]);
    const items = element.querySelectorAll('.address');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('1 Market Street');
    expect(items[0].textContent).toContain('Default');
    expect(items[1].textContent).toContain('9 Office Park');
    expect(items[1].textContent).not.toContain('Default');
  });

  it('shows an empty state when the address book is empty', () => {
    const element = create([]);
    expect(element.querySelector('.empty-state')?.textContent).toContain(
      'You have no saved addresses yet.',
    );
  });

  it('adds an address and shows "Address added"', () => {
    const element = create([]);
    clickButton(element, 'Add your first address');

    type(element, '#address-line1', '22 New Road');
    type(element, '#address-city', 'Denver');
    type(element, '#address-postal', '80202');
    clickButton(element, 'Save address');

    const request = http.expectOne('/api/v1/users/me/addresses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      type: 'shipping',
      line1: '22 New Road',
      line2: null,
      city: 'Denver',
      state: null,
      postal_code: '80202',
      country: 'United States',
      is_default: false,
    });
    request.flush({ ...HOME, id: 13, line1: '22 New Road', city: 'Denver', postal_code: '80202' });
    http.expectOne('/api/v1/users/me/addresses').flush({ data: [] });

    expect(toast.toasts().some((t) => t.message === 'Address added')).toBe(true);
  });

  it('adds an address as the default when the checkbox is ticked', () => {
    const element = create([]);
    clickButton(element, 'Add your first address');

    type(element, '#address-line1', '22 New Road');
    type(element, '#address-city', 'Denver');
    type(element, '#address-postal', '80202');
    tickCheckbox(element, '#address-default');
    clickButton(element, 'Save address');

    const request = http.expectOne('/api/v1/users/me/addresses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      type: 'shipping',
      line1: '22 New Road',
      line2: null,
      city: 'Denver',
      state: null,
      postal_code: '80202',
      country: 'United States',
      is_default: true,
    });
    request.flush({ ...HOME, id: 13, line1: '22 New Road', city: 'Denver', postal_code: '80202' });
    http.expectOne('/api/v1/users/me/addresses').flush({ data: [] });

    expect(toast.toasts().some((t) => t.message === 'Address added')).toBe(true);
  });

  it('shows the error beside a missing street and links it to the field', () => {
    const element = create([]);
    clickButton(element, 'Add your first address');
    clickButton(element, 'Save address');

    http.expectNone('/api/v1/users/me/addresses');
    const input = element.querySelector('#address-line1') as HTMLInputElement;
    expect(element.querySelector('#address-line1-error')?.textContent).toContain(
      'Enter the street address',
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('address-line1-error');
  });

  it('edits an address and shows "Address updated"', () => {
    const element = create([HOME]);
    clickButton(element, 'Edit');

    expect((element.querySelector('#address-line1') as HTMLInputElement).value).toBe(
      '1 Market Street',
    );
    type(element, '#address-city', 'Oakland');
    clickButton(element, 'Save address');

    const request = http.expectOne('/api/v1/users/me/addresses/11');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ line1: '1 Market Street', city: 'Oakland' });
    request.flush({ ...HOME, city: 'Oakland' });
    http.expectOne('/api/v1/users/me/addresses').flush({ data: [{ ...HOME, city: 'Oakland' }] });

    expect(toast.toasts().some((t) => t.message === 'Address updated')).toBe(true);
  });

  it('sets an address as default', () => {
    const element = create([HOME, OFFICE]);
    const office = element.querySelector('[data-address-id="12"]') as HTMLElement;
    clickButton(office, 'Set default');

    const request = http.expectOne('/api/v1/users/me/addresses/12');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ is_default: true });
    request.flush({ ...OFFICE, is_default: true });
    http.expectOne('/api/v1/users/me/addresses').flush({ data: [HOME, { ...OFFICE, is_default: true }] });

    expect(toast.toasts().some((t) => t.message === 'Default address updated')).toBe(true);
  });

  it('deletes an address and shows "Address deleted"', () => {
    const element = create([HOME, OFFICE]);
    const office = element.querySelector('[data-address-id="12"]') as HTMLElement;
    clickButton(office, 'Delete');

    const request = http.expectOne('/api/v1/users/me/addresses/12');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/v1/users/me/addresses').flush({ data: [HOME] });

    expect(toast.toasts().some((t) => t.message === 'Address deleted')).toBe(true);
  });
});
