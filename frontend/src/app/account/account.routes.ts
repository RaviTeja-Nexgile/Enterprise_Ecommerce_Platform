import { Routes } from '@angular/router';

/** Account routes. Tasks 9.1 and 9.2 add the account screens. */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Account', message: 'The account area is being built.' },
    title: 'Account',
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Orders', message: 'Order history is being built.' },
    title: 'Orders',
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Order details', message: 'Order details are being built.' },
    title: 'Order details',
  },
];
