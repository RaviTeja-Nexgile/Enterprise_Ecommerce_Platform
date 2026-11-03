'use strict';

/**
 * `npm run db:upgrade` / `npm run db:seed` in the backend workspace.
 *
 * Runs `flask <args>` with the backend's virtualenv interpreter.
 */

const { spawnSync } = require('child_process');
const { BACKEND_DIR, pythonCommand, backendEnv } = require('./python-env');

const args = ['-m', 'flask', ...process.argv.slice(2)];
const result = spawnSync(pythonCommand(), args, {
  cwd: BACKEND_DIR,
  env: backendEnv(),
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not start Python: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
