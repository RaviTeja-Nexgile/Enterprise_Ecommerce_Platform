import { Routes } from '@angular/router';

/**
 * Product routes. Task 4.1 adds the catalog and task 5.1 the details page;
 * until then the paths open a placeholder that keeps the shell navigable.
 */
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Products', message: 'The product catalog is being built.' },
    title: 'Products',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./details/product-details.component').then((m) => m.ProductDetailsComponent),
    title: 'Product details',
  },
];
