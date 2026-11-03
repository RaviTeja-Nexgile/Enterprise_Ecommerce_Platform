import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * The app shell routes. Every feature folder is a lazy-loaded route group;
 * the feature tasks add their own `*.routes.ts` files and the paths below
 * pick them up.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./storefront/home/home.component').then((m) => m.HomeComponent),
        title: 'E-Commerce Platform',
      },
      {
        path: 'sign-in',
        loadComponent: () =>
          import('./auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
        title: 'Sign in',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./auth/register/register.component').then((m) => m.RegisterComponent),
        title: 'Create an account',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
        title: 'Reset your password',
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
        title: 'Choose a new password',
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'cart',
        loadChildren: () => import('./cart/cart.routes').then((m) => m.CART_ROUTES),
      },
      {
        path: 'wishlist',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./wishlist/wishlist.routes').then((m) => m.WISHLIST_ROUTES),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./checkout/checkout.routes').then((m) => m.CHECKOUT_ROUTES),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['Super Admin', 'Admin', 'Inventory Manager', 'Order Manager'] },
        loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./shell/forbidden.component').then((m) => m.ForbiddenComponent),
        title: 'No access',
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shell/not-found.component').then((m) => m.NotFoundComponent),
        title: 'Page not found',
      },
    ],
  },
];
