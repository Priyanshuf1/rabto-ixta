#!/usr/bin/env node

/**
 * rabto-ixta CLI
 * Launches the Instagram data extraction tool on your local device.
 * Usage: npx rabto-ixta
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;

// ─── Banner ───────────────────────────────────────────────────────────────────
console.log('\x1b[32m'); // Green
console.log('  ██████╗  █████╗ ██████╗ ████████╗ ██████╗      ██╗██╗  ██╗████████╗ █████╗ ');
console.log('  ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗     ██║╚██╗██╔╝╚══██╔══╝██╔══██╗');
console.log('  ██████╔╝███████║██████╔╝   ██║   ██║   ██║     ██║ ╚███╔╝    ██║   ███████║');
console.log('  ██╔══██╗██╔══██║██╔══██╗   ██║   ██║   ██║     ██║ ██╔██╗    ██║   ██╔══██║');
console.log('  ██║  ██║██║  ██║██████╔╝   ██║   ╚██████╔╝     ██║██╔╝ ██╗   ██║   ██║  ██║');
console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝    ╚═╝    ╚═════╝      ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝');
console.log('\x1b[0m');
console.log('\x1b[90m  Instagram Data Extraction Tool — by Priyanshu Awasthi  v1.0.0\x1b[0m');
console.log('');

// ─── Check Node version ───────────────────────────────────────────────────────
const nodeVer = parseInt(process.version.slice(1));
if (nodeVer < 18) {
  console.error('\x1b[31m❌ Node.js 18+ is required. Download it at https://nodejs.org\x1b[0m');
  process.exit(1);
}

// ─── Ensure backend dependencies are installed ────────────────────────────────
const backendModules = path.join(__dirname, 'backend', 'node_modules');
if (!fs.existsSync(backendModules)) {
  console.log('📦 Installing backend dependencies (first run only)...');
  try {
    execSync('npm install', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
  } catch (e) {
    console.error('\x1b[31m❌ Failed to install backend dependencies.\x1b[0m');
    process.exit(1);
  }
}

// ─── Build frontend if dist doesn't exist ─────────────────────────────────────
const distPath = path.join(__dirname, 'frontend', 'dist');
const indexHtml = path.join(distPath, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.log('📦 Building frontend (first run only — takes ~30 seconds)...');
  
  const frontendModules = path.join(__dirname, 'frontend', 'node_modules');
  if (!fs.existsSync(frontendModules)) {
    console.log('   Installing frontend dependencies...');
    execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
  }
  
  try {
    execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
    console.log('\x1b[32m✅ Frontend built successfully!\x1b[0m');
  } catch (e) {
    console.error('\x1b[31m❌ Frontend build failed.\x1b[0m');
    process.exit(1);
  }
}

// ─── Find tsx executable ──────────────────────────────────────────────────────
function findTsx(): string {
  // Try local backend node_modules first
  const localTsx = path.join(__dirname, 'backend', 'node_modules', '.bin', 'tsx');
  const localTsxCmd = process.platform === 'win32' ? localTsx + '.cmd' : localTsx;
  if (fs.existsSync(localTsxCmd)) return localTsxCmd;
  if (fs.existsSync(localTsx)) return localTsx;
  
  // Try global tsx
  try {
    execSync('tsx --version', { stdio: 'pipe' });
    return 'tsx';
  } catch (_) {}
  
  // Try npx tsx
  return 'npx tsx';
}

// ─── Start the backend server ─────────────────────────────────────────────────
const serverFile = path.join(__dirname, 'backend', 'src', 'server.ts');
const tsx = findTsx();

console.log(`\x1b[33m🚀 Starting rabto-ixta on http://localhost:${PORT}...\x1b[0m`);

const [cmd, ...args] = tsx.split(' ');
const serverProcess = spawn(cmd, [...args, serverFile], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
  shell: process.platform === 'win32'
});

serverProcess.on('error', (err) => {
  console.error('\x1b[31m❌ Failed to start server:', err.message, '\x1b[0m');
  console.error('   Try running manually: cd backend && npx tsx src/server.ts');
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m❌ Server exited with code ${code}\x1b[0m`);
  }
});

// ─── Open browser ─────────────────────────────────────────────────────────────
setTimeout(() => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n\x1b[32m✅ rabto-ixta is live! → ${url}\x1b[0m`);
  console.log('\x1b[90m   Press Ctrl+C to stop\x1b[0m\n');

  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { shell: true });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch (_) {
    // Browser open failed — user can manually open the URL
  }
}, 2000);

// ─── Handle exit ──────────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n\x1b[33m👋 Shutting down rabto-ixta...\x1b[0m');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});
