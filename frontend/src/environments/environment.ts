/**
 * Development environment. The Angular dev server proxies `/api` to the Flask
 * API, so the browser talks to one origin.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  healthUrl: '/api/health',
  appName: 'E-Commerce Platform',
  accessTokenRefreshSkewSeconds: 30,
};
