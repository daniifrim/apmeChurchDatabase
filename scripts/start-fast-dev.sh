#!/bin/bash

echo "🚀 Starting APME Church Database - FAST MODE..."

# Kill any existing processes on these ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Clean Vite cache for fresh start
rm -rf node_modules/.vite client/node_modules/.vite 2>/dev/null || true

# Start API server in background with minimal logging
    NODE_ENV=development NODE_OPTIONS="--max-old-space-size=1024" node server/dev-serverless.js > /tmp/api.log 2>&1 &API_PID=$!

# Wait for API to be ready
echo "⏳ Waiting for API server..."
for i in {1..10}; do
  if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API server ready!"
    break
  fi
  sleep 1
done

# Start Vite with optimized settings
echo "🎨 Starting Vite dev server..."
NODE_ENV=development NODE_OPTIONS="--max-old-space-size=2048" vite --config vite.config.optimized.ts --host 0.0.0.0 --port 5173

# Cleanup when Vite exits
echo "🛑 Stopping development servers..."
kill $API_PID 2>/dev/null || true
rm -f /tmp/api.log