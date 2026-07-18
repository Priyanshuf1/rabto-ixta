#!/usr/bin/env node

/**
 * rabto-ixta CLI
 * Run `npx rabto-ixta` to launch the tool on your local machine.
 */

import { execSync, spawn } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;

// Banner
console.log(`
██████╗  █████╗ ██████╗ ████████╗ ██████╗      ██╗██╗  ██╗████████╗ █████╗ 
██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗     ██║╚██╗██╔╝╚══██╔══╝██╔══██╗
██████╔╝███████║██████╔╝   ██║   ██║   ██║     ██║ ╚███╔╝    ██║   ███████║
██╔══██╗██╔══██║██╔══██╗   ██║   ██║   ██║     ██║ ██╔██╗    ██║   ██╔══██║
██║  ██║██║  ██║██████╔╝   ██║   ╚██████╔╝     ██║██╔╝ ██╗   ██║   ██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝    ╚═╝    ╚═════╝      ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
                                                                              
  Instagram Data Extraction Tool — by Priyanshu Awasthi
  Version: 1.0.0
`);

// Check if a frontend dist build exists in the package directory
const distPath = path.join(__dirname, 'frontend', 'dist');
const distExists = fs.existsSync(distPath);

if (!distExists) {
  console.log('📦 First run detected! Building frontend...');
  try {
    execSync('npm run build --prefix frontend', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (e) {
    console.error('❌ Build failed. Please run: npm install && npm run build');
    process.exit(1);
  }
}

// Start the backend
console.log(`🚀 Starting rabto-ixta on http://localhost:${PORT}`);

const serverProcess = spawn('node', [
  '--loader', 'ts-node/esm',
  path.join(__dirname, 'backend', 'src', 'server.ts')
], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) }
});

serverProcess.on('error', () => {
  // Fallback: try tsx
  const tsxProcess = spawn('npx', ['tsx', path.join(__dirname, 'backend', 'src', 'server.ts')], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) }
  });
  tsxProcess.on('error', (err) => {
    console.error('❌ Could not start server:', err.message);
    process.exit(1);
  });
});

// Open browser after 1.5s
setTimeout(() => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n✅ rabto-ixta is running! Opening browser at ${url}\n`);
  const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    execSync(`${open} ${url}`);
  } catch(_) {}
}, 1500);
