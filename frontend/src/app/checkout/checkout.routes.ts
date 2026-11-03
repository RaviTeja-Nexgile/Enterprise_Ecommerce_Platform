import { Routes } from '@angular/router';

/** Checkout routes. Task 8.1 adds the checkout wizard and the confirmation. */
export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Checkout', message: 'Checkout is being built.' },
    title: 'Checkout',
  },
  {
    path: 'confirmation/:orderNumber',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Order confirmation', message: 'The confirmation page is being built.' },
    title: 'Order confirmation',
  },
];
