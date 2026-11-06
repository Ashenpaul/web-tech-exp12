// Cross-Platform Full-Stack Development Runner for OmniMarket
// Starts both Express.js backend (port 5000) and Vite React frontend (port 5173)

const { spawn, execSync } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWindows = process.platform === 'win32';

// Helper to kill any stale processes lingering on required ports
function freePort(port) {
  if (!isWindows) return;
  try {
    const res = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pids = new Set();
    res.trim().split('\n').forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && pid !== String(process.pid)) {
        pids.add(pid);
      }
    });
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } catch (_) {}
    });
  } catch (_) {}
}

// Free ports 5000 and 5173 before launching
freePort(5000);
freePort(5173);

console.log('\x1b[36m%s\x1b[0m', '===========================================================');
console.log('\x1b[36m%s\x1b[0m', '      STARTING OMNIMARKET FULL-STACK APPLICATION           ');
console.log('\x1b[36m%s\x1b[0m', '  Backend:  http://localhost:5000                          ');
console.log('\x1b[36m%s\x1b[0m', '  Frontend: http://localhost:5173                          ');
console.log('\x1b[36m%s\x1b[0m', '===========================================================');

// 1. Spawn Backend Process with --watch using current Node binary
const backend = spawn(process.execPath, ['--watch', 'server.js'], {
  cwd: backendDir,
  stdio: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' },
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[34m[BACKEND]\x1b[0m ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[BACKEND ERROR]\x1b[0m ${data}`);
});

backend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\x1b[33m[BACKEND]\x1b[0m Process exited with code ${code}`);
  }
});

// 2. Spawn Frontend Process via npm run dev
// On Windows, running npm as a single command string with shell: true is required
// by Node.js 20+ / 24+ to prevent EINVAL when executing .cmd batch files.
const frontend = spawn('npm run dev', {
  cwd: frontendDir,
  shell: true,
  stdio: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' },
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[FRONTEND ERROR]\x1b[0m ${data}`);
});

frontend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\x1b[33m[FRONTEND]\x1b[0m Process exited with code ${code}`);
  }
});

// Clean shutdown handler
let isShuttingDown = false;
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down OmniMarket processes...');

  if (backend && !backend.killed) {
    try {
      if (isWindows) {
        spawn('taskkill', ['/pid', String(backend.pid), '/f', '/t']);
      } else {
        backend.kill('SIGINT');
      }
    } catch (e) {}
  }

  if (frontend && !frontend.killed) {
    try {
      if (isWindows) {
        spawn('taskkill', ['/pid', String(frontend.pid), '/f', '/t']);
      } else {
        frontend.kill('SIGINT');
      }
    } catch (e) {}
  }

  setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
