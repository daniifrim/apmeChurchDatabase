#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting memory-optimized development...');

// Environment variables for memory optimization
const env = {
  ...process.env,
  NODE_ENV: 'development',
  NODE_OPTIONS: '--max-old-space-size=1024',
  VITE_CJS_IGNORE_WARNING: 'true',
  VITE_DISABLE_MEMORY_CHECK: 'true'
};

// Start API server
const apiProcess = spawn('tsx', ['server/dev-serverless.ts'], {
  env,
  stdio: 'pipe'
});

apiProcess.stdout.on('data', (data) => {
  const message = data.toString();
  if (message.includes('Serverless development server running')) {
    console.log('✅ API server ready');
    
    // Start Vite after API is ready
    const viteProcess = spawn('vite', ['--config', 'vite.config.optimized.ts'], {
      env: { ...env, NODE_OPTIONS: '--max-old-space-size=2048' },
      stdio: 'inherit'
    });

    viteProcess.on('close', () => {
      apiProcess.kill();
      process.exit(0);
    });
  }
});

apiProcess.stderr.on('data', (data) => {
  console.error('API Error:', data.toString());
});

// Cleanup on exit
process.on('SIGINT', () => {
  apiProcess.kill();
  process.exit(0);
});