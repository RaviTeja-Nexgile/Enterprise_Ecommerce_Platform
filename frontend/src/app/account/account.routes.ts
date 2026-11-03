import { Routes } from '@angular/router';

/**
 * Account routes. Task 9.1 adds the overview, profile and address book;
 * task 9.2 adds order history, order details and reviews.
 */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./overview/account-layout.component').then((m) => m.AccountLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./overview/account-overview.component').then((m) => m.AccountOverviewComponent),
        title: 'My account',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/profile.component').then((m) => m.ProfileComponent),
        title: 'Profile',
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./addresses/addresses.component').then((m) => m.AddressesComponent),
        title: 'Addresses',
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
      {
        path: 'reviews',
        loadComponent: () =>
          import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
        data: { heading: 'Reviews', message: 'Your reviews are being built.' },
        title: 'Reviews',
      },
    ],
  },
];
