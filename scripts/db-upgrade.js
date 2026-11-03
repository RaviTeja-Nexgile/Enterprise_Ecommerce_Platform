'use strict';

/**
 * `npm run db:upgrade` applies the Flask-Migrate migrations to the database.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { pythonCommand, backendEnv, BACKEND_DIR } = require('../backend/scripts/python-env');

const result = spawnSync(pythonCommand(), ['-m', 'flask', 'db', 'upgrade'], {
  cwd: BACKEND_DIR,
  env: backendEnv({ FLASK_APP: 'wsgi.py' }),
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not start Python: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
