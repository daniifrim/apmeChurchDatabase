#!/bin/bash

echo "🚀 Starting APME Church Database development servers..."

# Start API server in background
echo "📡 Starting API server on port 3000..."
npm run api:start &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start Vite dev server
echo "🎨 Starting Vite dev server on port 5173..."
npm run dev:simple

# When Vite exits, kill the API server
kill $API_PID 2>/dev/null
echo "🛑 Development servers stopped"