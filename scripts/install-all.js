'use strict';

/**
 * `npm run install:all`
 *
 * Installs the root and frontend npm dependencies (the frontend is an npm
 * workspace, so the root install covers it) and the backend's Python packages
 * into `backend/.venv`.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const VENV_DIR = path.join(BACKEND_DIR, '.venv');
const REQUIREMENTS = path.join(BACKEND_DIR, 'requirements.txt');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
}

function venvPython() {
  const candidates =
    process.platform === 'win32'
      ? [path.join(VENV_DIR, 'Scripts', 'python.exe')]
      : [path.join(VENV_DIR, 'bin', 'python3'), path.join(VENV_DIR, 'bin', 'python')];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function systemPython() {
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
    if (probe.status === 0) {
      return candidate;
    }
  }
  return null;
}

function installNodeDependencies() {
  console.log('> Installing npm dependencies (root and frontend workspace)');
  run('npm', ['install', '--no-audit', '--no-fund']);
}

function installPythonDependencies() {
  console.log('> Installing backend Python dependencies into backend/.venv');
  let python = venvPython();
  if (!python) {
    const base = systemPython();
    if (!base) {
      throw new Error(
        'Python 3.11 or newer is required. Install it and run `npm run install:all` again.'
      );
    }
    run(base, ['-m', 'venv', VENV_DIR]);
    python = venvPython();
    if (!python) {
      throw new Error('Could not create backend/.venv');
    }
  }
  run(python, ['-m', 'pip', 'install', '--upgrade', 'pip', '--quiet']);
  run(python, ['-m', 'pip', 'install', '-r', REQUIREMENTS, '--quiet']);
}

function main() {
  installNodeDependencies();
  installPythonDependencies();
  console.log('> All dependencies installed.');
}

try {
  main();
} catch (error) {
  console.error(`install:all failed: ${error.message}`);
  process.exit(1);
}
