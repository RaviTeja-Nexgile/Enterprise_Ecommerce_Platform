'use strict';

/**
 * `npm run dev --workspace backend` starts the Flask API on 127.0.0.1:API_PORT.
 */

const { spawnSync } = require('child_process');
const { BACKEND_DIR, pythonCommand, backendEnv } = require('./python-env');

const result = spawnSync(pythonCommand(), ['run.py'], {
  cwd: BACKEND_DIR,
  env: backendEnv(),
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not start Python: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
