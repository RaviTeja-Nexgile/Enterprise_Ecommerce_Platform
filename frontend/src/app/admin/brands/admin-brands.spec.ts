import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastService } from '../../shared/toast/toast.service';
import { AdminBrand, DUPLICATE_BRAND_MESSAGE } from './admin-brand.model';
import { AdminBrandsService } from './admin-brands.service';
import { BrandFormComponent } from './brand-form.component';
import { BrandListComponent } from './brand-list.component';

const LUMEN: AdminBrand = { id: 5, name: 'Lumen', description: 'Lighting' };

describe('AdminBrandsService', () => {
  let service: AdminBrandsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminBrandsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists brands', () => {
    service.list().subscribe();
    const request = http.expectOne('/api/v1/admin/brands');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [LUMEN] });
  });

  it('creates a brand', () => {
    service.create({ name: 'Lumen', description: 'Lighting' }).subscribe();
    const request = http.expectOne('/api/v1/admin/brands');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Lumen', description: 'Lighting' });
    request.flush(LUMEN);
  });
});

describe('BrandListComponent', () => {
  let fixture: ComponentFixture<BrandListComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BrandListComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lists brands with their name and description', () => {
    http.expectOne('/api/v1/admin/brands').flush({ data: [LUMEN] });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lumen');
    expect(text).toContain('Lighting');
  });
});

describe('BrandFormComponent', () => {
  let fixture: ComponentFixture<BrandFormComponent>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(BrandFormComponent);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture.componentRef.setInput('brand', null);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function submit(): void {
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('creates a brand with a name and description', () => {
    const name = element().querySelector('#brand-name') as HTMLInputElement;
    name.value = 'Lumen';
    name.dispatchEvent(new Event('input'));
    const description = element().querySelector('#brand-description') as HTMLTextAreaElement;
    description.value = 'Lighting';
    description.dispatchEvent(new Event('input'));
    submit();

    const request = http.expectOne('/api/v1/admin/brands');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Lumen', description: 'Lighting' });
    request.flush(LUMEN);
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === 'Brand created')).toBe(true);
  });

  it('edits a brand and saves the change', () => {
    fixture.componentRef.setInput('brand', LUMEN);
    fixture.detectChanges();

    const name = element().querySelector('#brand-name') as HTMLInputElement;
    expect(name.value).toBe('Lumen');
    name.value = 'Lumen Pro';
    name.dispatchEvent(new Event('input'));
    submit();

    const request = http.expectOne('/api/v1/admin/brands/5');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Lumen Pro', description: 'Lighting' });
    request.flush({ ...LUMEN, name: 'Lumen Pro' });
    fixture.detectChanges();

    expect(toasts.toasts().some((toast) => toast.message === 'Brand saved')).toBe(true);
  });

  it('shows "This brand already exists" and keeps the form open', () => {
    const name = element().querySelector('#brand-name') as HTMLInputElement;
    name.value = 'Lumen';
    name.dispatchEvent(new Event('input'));
    submit();

    const request = http.expectOne('/api/v1/admin/brands');
    request.flush(
      { error: { code: 'duplicate_brand', message: DUPLICATE_BRAND_MESSAGE } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(element().textContent).toContain(DUPLICATE_BRAND_MESSAGE);
    expect(element().querySelector('#brand-name')).not.toBeNull();
  });
});