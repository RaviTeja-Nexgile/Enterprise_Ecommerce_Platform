import { Routes } from '@angular/router';

/** Cart routes. Task 6.1 adds the cart page. */
export const CART_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Cart', message: 'The cart is being built.' },
    title: 'Cart',
  },
];
