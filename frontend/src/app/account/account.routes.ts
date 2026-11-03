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
          import('./orders/order-history.component').then((m) => m.OrderHistoryComponent),
        title: 'Orders',
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./orders/order-details.component').then((m) => m.OrderDetailsComponent),
        title: 'Order details',
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./reviews/reviews.component').then((m) => m.ReviewsComponent),
        title: 'Reviews',
      },
    ],
  },
];
