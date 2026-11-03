'use strict';

/**
 * Locate the backend's Python interpreter and build the environment for it.
 *
 * The backend installs its packages into `backend/.venv` (see
 * scripts/install-all.js). Every npm script that runs Python goes through
 * this module so the same interpreter is used everywhere.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const VENV_DIR = path.join(BACKEND_DIR, '.venv');

function venvPython() {
  const candidates =
    process.platform === 'win32'
      ? [path.join(VENV_DIR, 'Scripts', 'python.exe')]
      : [path.join(VENV_DIR, 'bin', 'python3'), path.join(VENV_DIR, 'bin', 'python')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function systemPython() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function pythonCommand() {
  return venvPython() || systemPython();
}

function backendEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  env.PYTHONPATH = [BACKEND_DIR, env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  env.PYTHONIOENCODING = 'utf-8';
  env.PYTHONUTF8 = '1';
  if (env.FLASK_APP === undefined) {
    env.FLASK_APP = 'wsgi.py';
  }
  return env;
}

module.exports = { BACKEND_DIR, VENV_DIR, venvPython, systemPython, pythonCommand, backendEnv };
