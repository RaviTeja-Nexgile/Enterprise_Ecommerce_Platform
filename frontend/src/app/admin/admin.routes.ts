import { Routes } from '@angular/router';

/**
 * Admin routes. Task 11.1 adds the admin shell and overview; the other admin
 * tasks add their screens. Until then each path opens a placeholder.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Admin dashboard', message: 'The admin dashboard is being built.' },
    title: 'Admin dashboard',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./products/product-table.component').then((m) => m.ProductTableComponent),
    title: 'Admin products',
  },
  {
    path: 'products/new',
    loadComponent: () =>
      import('./products/product-form.component').then((m) => m.ProductFormComponent),
    title: 'New product',
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./products/product-form.component').then((m) => m.ProductFormComponent),
    title: 'Edit product',
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./categories/category-tree.component').then((m) => m.CategoryTreeComponent),
    title: 'Admin categories',
  },
  {
    path: 'brands',
    loadComponent: () =>
      import('./brands/brand-list.component').then((m) => m.BrandListComponent),
    title: 'Admin brands',
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Customers', message: 'Customer management is being built.' },
    title: 'Admin customers',
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Orders', message: 'Order management is being built.' },
    title: 'Admin orders',
  },
  {
    path: 'orders/:id/invoice',
    loadComponent: () =>
      import('./orders/invoice/invoice.component').then((m) => m.InvoiceComponent),
    title: 'Invoice',
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Inventory', message: 'Inventory management is being built.' },
    title: 'Admin inventory',
  },
  {
    path: 'coupons',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Coupons', message: 'Coupon management is being built.' },
    title: 'Admin coupons',
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Reports', message: 'Reports are being built.' },
    title: 'Admin reports',
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Reviews', message: 'Review moderation is being built.' },
    title: 'Admin reviews',
  },
  {
    path: 'users',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Users', message: 'Admin users are being built.' },
    title: 'Admin users',
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('../shell/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent),
    data: { heading: 'Audit log', message: 'The audit log is being built.' },
    title: 'Admin audit log',
  },
];
