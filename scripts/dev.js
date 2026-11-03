'use strict';

/**
 * `npm run dev`
 *
 * 1. starts Mailpit (the local development mail inbox),
 * 2. applies the database migrations,
 * 3. seeds an empty database (a seeded one is left untouched),
 * 4. starts the Flask API on 127.0.0.1:API_PORT (default 5001),
 * 5. starts the Angular dev server on 127.0.0.1:PORT (default 4200).
 *
 * The port is read from the environment here and handed to the Angular dev
 * server, so no package.json script has to read a shell variable.
 */

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { pythonCommand, backendEnv, BACKEND_DIR } = require('../backend/scripts/python-env');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');

const PORT = Number(process.env.PORT || 4200);
const API_PORT = Number(process.env.API_PORT || 5001);
const MAILPIT_UI_PORT = Number(process.env.MAILPIT_UI_PORT || 8025);
const MAILPIT_SMTP_PORT = Number(process.env.MAIL_PORT || 1025);

const children = [];
let shuttingDown = false;

function log(message) {
  console.log(`[dev] ${message}`);
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

function runSync(command, args, options = {}) {
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

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push(child);
  child.on('error', (error) => {
    if (options.optional) {
      log(`${options.name || command} could not start (${error.message}); continuing without it`);
      return;
    }
    if (!shuttingDown) {
      log(`${options.name || command} could not start: ${error.message}`);
      shutdown(1);
    }
  });
  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }
    if (options.optional) {
      // Mailpit is a convenience inbox: the app must still start without it.
      log(`${options.name || command} exited with ${code}; continuing without it`);
      return;
    }
    log(`${options.name || command} exited with ${code}`);
    shutdown(code === null ? 1 : code);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          child.kill('SIGTERM');
        }
      } catch (error) {
        // The process is already gone.
      }
    }
  }
  process.exit(code);
}

async function startMailpit() {
  if (await portInUse(MAILPIT_UI_PORT)) {
    log(`Mailpit already running on 127.0.0.1:${MAILPIT_UI_PORT}`);
    return;
  }
  log(`Starting Mailpit (SMTP 127.0.0.1:${MAILPIT_SMTP_PORT}, inbox http://127.0.0.1:${MAILPIT_UI_PORT})`);
  start('mailpit', ['--smtp', `127.0.0.1:${MAILPIT_SMTP_PORT}`, '--listen', `127.0.0.1:${MAILPIT_UI_PORT}`], {
    name: 'mailpit',
    optional: true,
  });
}

function migrateAndSeed() {
  const env = backendEnv({ FLASK_APP: 'wsgi.py' });
  log('Applying database migrations');
  runSync(pythonCommand(), ['-m', 'flask', 'db', 'upgrade'], { cwd: BACKEND_DIR, env });
  log('Seeding the database when it is empty');
  runSync(pythonCommand(), ['-m', 'flask', 'seed'], { cwd: BACKEND_DIR, env });
}

function startApi() {
  log(`Starting the API on http://127.0.0.1:${API_PORT}`);
  start(pythonCommand(), ['run.py'], {
    cwd: BACKEND_DIR,
    env: backendEnv({ API_PORT: String(API_PORT), API_HOST: '127.0.0.1' }),
    name: 'api',
  });
}

function startFrontend() {
  log(`Starting the Angular dev server on http://127.0.0.1:${PORT}`);
  start('npm', ['run', 'start', '--workspace', 'frontend'], {
    cwd: ROOT,
    env: {
      PORT: String(PORT),
      API_PORT: String(API_PORT),
      NG_CLI_ANALYTICS: 'false',
    },
    name: 'frontend',
  });
}

function frontendDependenciesInstalled() {
  // npm workspaces hoist packages into the root node_modules, so check both.
  const candidates = [
    path.join(FRONTEND_DIR, 'node_modules', '@angular', 'cli'),
    path.join(ROOT, 'node_modules', '@angular', 'cli'),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

async function main() {
  if (!frontendDependenciesInstalled()) {
    log('Frontend dependencies are missing; run `npm run install:all` first.');
  }
  await startMailpit();
  migrateAndSeed();
  startApi();
  startFrontend();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(`[dev] ${error.message}`);
  shutdown(1);
});
