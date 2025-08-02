#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🧹 Optimizing development environment...');

// Directories to clean
const cacheDirs = [
  path.join(rootDir, 'node_modules/.vite'),
  path.join(rootDir, 'client/node_modules/.vite'),
  path.join(rootDir, '.vite'),
  path.join(rootDir, 'client/.vite'),
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'client/dist'),
];

// Clean cache directories
for (const dir of cacheDirs) {
  if (fs.existsSync(dir)) {
    console.log(`🗑️  Removing ${path.relative(rootDir, dir)}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Clear npm cache for this project
console.log('🧽 Clearing npm cache...');
try {
  const { execSync } = await import('child_process');
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Could not clear npm cache:', error.message);
}

console.log('✅ Development environment optimized!');
console.log('💡 Now run: npm run dev');