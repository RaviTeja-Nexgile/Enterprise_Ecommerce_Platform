import { Routes } from '@angular/router';

/** Wishlist routes. Task 7.1 adds the wishlist page. */
export const WISHLIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Wishlist', message: 'The wishlist is being built.' },
    title: 'Wishlist',
  },
];
