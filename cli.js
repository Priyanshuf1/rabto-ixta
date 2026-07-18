#!/usr/bin/env node

/**
 * rabto-ixta CLI
 * Launches the Instagram data extraction tool on your local device.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import net from 'net';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let requestedPort = null;
let noOpen = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help') {
    console.log('Usage: rabto-ixta [options]');
    console.log('');
    console.log('Options:');
    console.log('  --port <number>   Specify the port to run the server on');
    console.log('  --no-open         Do not automatically open the browser');
    console.log('  --help            Show this help message');
    console.log('  --version         Show the version');
    process.exit(0);
  } else if (args[i] === '--version') {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    console.log(`v${pkg.version}`);
    process.exit(0);
  } else if (args[i] === '--port' && args[i + 1]) {
    requestedPort = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--no-open') {
    noOpen = true;
  }
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function getAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

function checkBackendReady(port, retries = 20) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/status`, (res) => {
      if (res.statusCode === 200) resolve(true);
      else retry();
    });
    req.on('error', retry);
    req.setTimeout(500, () => {
      req.destroy();
      retry();
    });

    function retry() {
      if (retries <= 0) resolve(false);
      else setTimeout(() => checkBackendReady(port, retries - 1).then(resolve), 500);
    }
  });
}

async function start() {
  console.log('\x1b[32m');
  console.log('  ██████╗  █████╗ ██████╗ ████████╗ ██████╗      ██╗██╗  ██╗████████╗ █████╗ ');
  console.log('  ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗     ██║╚██╗██╔╝╚══██╔══╝██╔══██╗');
  console.log('  ██████╔╝███████║██████╔╝   ██║   ██║   ██║     ██║ ╚███╔╝    ██║   ███████║');
  console.log('  ██╔══██╗██╔══██║██╔══██╗   ██║   ██║   ██║     ██║ ██╔██╗    ██║   ██╔══██║');
  console.log('  ██║  ██║██║  ██║██████╔╝   ██║   ╚██████╔╝     ██║██╔╝ ██╗   ██║   ██║  ██║');
  console.log('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝    ╚═╝    ╚═════╝      ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝');
  console.log('\x1b[0m');
  console.log('\x1b[90m  Instagram Data Extraction Tool — by Priyanshu Awasthi  v1.0.0\x1b[0m');
  console.log('');

  const distPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (!fs.existsSync(distPath)) {
    console.error('\x1b[31m❌ Rabto Ixta has not been built yet.\x1b[0m');
    console.error('Run:');
    console.error('  npm install');
    console.error('  npm run build');
    console.error('  npm start');
    process.exit(1);
  }

  let finalPort = requestedPort || 3002;
  const available = await isPortAvailable(finalPort);
  if (!available) {
    if (requestedPort) {
      console.error(`\x1b[31m❌ Error: Port ${requestedPort} is already occupied.\x1b[0m`);
      process.exit(1);
    } else {
      console.log(`⚠️  Port ${finalPort} is occupied. Finding another port...`);
      finalPort = await getAvailablePort(finalPort + 1);
    }
  }

  const serverFile = path.join(__dirname, 'backend', 'src', 'server.ts');
  const serverArgs = ['--import', 'tsx', serverFile];
  const serverProcess = spawn('node', serverArgs, {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env, PORT: String(finalPort) },
    shell: false
  });

  serverProcess.on('error', (err) => {
    console.error('\x1b[31m❌ Failed to start server:', err.message, '\x1b[0m');
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\x1b[31m❌ Server exited with code ${code}\x1b[0m`);
      process.exit(code);
    }
  });

  console.log(`\x1b[33m⏳ Waiting for server to become ready on http://localhost:${finalPort}...\x1b[0m`);
  const ready = await checkBackendReady(finalPort);

  if (!ready) {
    console.error('\x1b[31m❌ Server failed to respond in time.\x1b[0m');
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  const url = `http://localhost:${finalPort}`;
  console.log(`\n\x1b[32m✅ Rabto Ixta is running:\n${url}\x1b[0m`);
  console.log('\x1b[90m   Press Ctrl+C to stop\x1b[0m\n');

  if (!noOpen) {
    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(startCmd, [url], { shell: process.platform === 'win32' });
  }

  const shutdown = () => {
    console.log('\n\x1b[33m👋 Shutting down rabto-ixta...\x1b[0m');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(console.error);
