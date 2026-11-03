'use strict';

/**
 * `npm run start --workspace frontend`
 *
 * Reads the port from the environment (PORT, default 4200) and starts the
 * Angular dev server on 127.0.0.1 at that port. package.json scripts run in
 * cmd.exe on Windows, which cannot read `$PORT`, so the port is read here.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const PORT = Number(process.env.PORT || 4200);
const FRONTEND_DIR = path.resolve(__dirname, '..');

/**
 * npm workspaces hoist `@angular/cli` into the root `node_modules`, so it is
 * not necessarily under `frontend/node_modules`. Resolve it the way Node does
 * (walking up the directory tree) and fall back to the local path.
 */
function resolveNgBin() {
  try {
    return require.resolve('@angular/cli/bin/ng.js', { paths: [FRONTEND_DIR] });
  } catch (error) {
    return path.join(FRONTEND_DIR, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  }
}

const ngBin = resolveNgBin();

const args = [
  ngBin,
  'serve',
  '--host',
  '127.0.0.1',
  '--port',
  String(PORT),
  '--proxy-config',
  'proxy.conf.json',
];

const result = spawnSync(process.execPath, args, {
  cwd: FRONTEND_DIR,
  env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not start the Angular dev server: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
