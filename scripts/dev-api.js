'use strict';

/**
 * `npm run dev:api` starts only the Flask API (migrations and seed included).
 */

const { spawnSync } = require('child_process');
const { pythonCommand, backendEnv, BACKEND_DIR } = require('../backend/scripts/python-env');

const API_PORT = process.env.API_PORT || '5001';
const env = backendEnv({ FLASK_APP: 'wsgi.py', API_PORT, API_HOST: '127.0.0.1' });

for (const args of [['-m', 'flask', 'db', 'upgrade'], ['-m', 'flask', 'seed']]) {
  const result = spawnSync(pythonCommand(), args, { cwd: BACKEND_DIR, env, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

const api = spawnSync(pythonCommand(), ['run.py'], { cwd: BACKEND_DIR, env, stdio: 'inherit' });
process.exit(api.status === null ? 1 : api.status);
