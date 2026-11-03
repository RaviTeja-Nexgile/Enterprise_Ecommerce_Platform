/**
 * Production build settings. The app is still served locally: the same origin
 * serves the built files and proxies `/api` to the Flask API.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  healthUrl: '/api/health',
  appName: 'E-Commerce Platform',
  accessTokenRefreshSkewSeconds: 30,
};
