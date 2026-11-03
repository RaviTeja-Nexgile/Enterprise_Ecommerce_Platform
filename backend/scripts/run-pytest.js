'use strict';

/**
 * `npm test --workspace backend -- tests/test_health.py`
 *
 * Runs pytest with the backend's virtualenv interpreter. Arguments after
 * `--` are passed to pytest unchanged.
 */

const { spawnSync } = require('child_process');
const { BACKEND_DIR, pythonCommand, backendEnv } = require('./python-env');

const args = ['-m', 'pytest', ...process.argv.slice(2)];
const result = spawnSync(pythonCommand(), args, {
  cwd: BACKEND_DIR,
  env: backendEnv(),
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not start Python: ${result.error.message}`);
  console.error('Run `npm run install:all` from the repository root first.');
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
