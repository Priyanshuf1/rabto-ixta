import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkStatus(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/api/status`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Status check failed with code: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('--- Running Localhost Smoke Test ---');

  // Verify frontend build exists
  if (!fs.existsSync(path.join(process.cwd(), 'frontend', 'dist', 'index.html'))) {
    console.error('Error: frontend/dist/index.html is missing. Run build first.');
    process.exit(1);
  }

  // Start the server using the CLI
  console.log('Starting server via CLI...');
  const child = spawn('node', ['./cli.js', '--no-open', '--port', '4100'], { stdio: 'pipe' });

  let output = '';
  child.stdout.on('data', data => {
    output += data.toString();
  });
  child.stderr.on('data', data => {
    output += data.toString();
  });

  // Wait for the ready message
  let ready = false;
  for (let i = 0; i < 20; i++) {
    if (output.includes('✅ Rabto Ixta is running:')) {
      ready = true;
      break;
    }
    await delay(500);
  }

  if (!ready) {
    console.error('Server failed to report ready state. Output so far:');
    console.error(output);
    child.kill();
    process.exit(1);
  }

  console.log('Server is ready. Sending status request...');
  try {
    await checkStatus(4100);
    console.log('Status request successful.');
  } catch (err) {
    console.error('Failed to contact server API:', err.message);
    child.kill();
    process.exit(1);
  }

  // Graceful shutdown
  console.log('Testing shutdown process...');
  child.kill('SIGINT');

  await delay(1000);
  
  // Verify port is freed by starting a temporary server on it
  const net = await import('net');
  const server = net.createServer();
  server.once('error', (err) => {
    console.error('Error: Port 4100 was not released properly.');
    process.exit(1);
  });
  server.once('listening', () => {
    console.log('Port released successfully.');
    server.close();
    console.log('✅ Smoke test passed.');
    process.exit(0);
  });
  server.listen(4100);
}

runTest().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
