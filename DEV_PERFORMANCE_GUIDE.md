# 🚀 Development Performance Guide

## Quick Start - Fastest Options

### Option 1: Fast Dev Script (Recommended)
```bash
npm run dev:fast
```
- Kills existing processes
- Cleans Vite cache
- Starts servers in parallel
- Memory optimized

### Option 2: Memory Optimized
```bash
npm run dev:memory
```
- Uses less RAM
- Good for older machines
- Sequential startup

### Option 3: Quick Start (Existing)
```bash
npm run dev:quick
```
- Uses existing cache
- Faster if cache is clean

## Performance Issues & Solutions

### 1. **Slow Initial Load**
**Problem**: Vite rebuilding large dependency graph
**Solution**: 
```bash
npm run dev:optimize  # Clean cache
npm run dev:fast      # Start fresh
```

### 2. **High Memory Usage**
**Problem**: TypeScript server + multiple Node processes
**Solution**: 
- Use `npm run dev:memory`
- Close other VS Code instances
- Restart TS server: Cmd+Shift+P → "TypeScript: Restart TS Server"

### 3. **API Response Slowness**
**Problem**: Remote database queries
**Solution**: 
- This is expected with remote DB
- Check internet connection
- Monitor: `curl http://localhost:3000/health`

### 4. **Vite HMR Slow**
**Problem**: Large component tree
**Solution**: 
- Use optimized config: `vite --config vite.config.optimized.ts`
- Exclude heavy deps from optimization

## Monitoring Performance

### Check what's running:
```bash
# See all Node processes
ps aux | grep node

# Check port usage
lsof -ti:3000  # API
lsof -ti:5173  # Vite
```

### Memory usage:
```bash
# Check memory usage
npm run dev:memory  # Uses ~1GB instead of ~3GB
```

## Troubleshooting

### If ports are blocked:
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### If Vite cache is corrupted:
```bash
npm run dev:optimize
npm run dev:fast
```

### If TypeScript is slow:
1. Restart TS server in VS Code
2. Use `npm run dev:memory` for lower memory usage
3. Check for circular imports

## Environment Variables for Speed

Add to your `.env.local`:
```bash
# Reduce logging
VITE_LOG_LEVEL=error

# Skip type checking during dev
VITE_SKIP_TYPE_CHECK=true

# Optimize memory
NODE_OPTIONS="--max-old-space-size=2048"
```

## Quick Commands Summary

| Command | Use Case | Speed |
|---------|----------|-------|
| `npm run dev:fast` | Fresh start, clean cache | 🚀🚀🚀 |
| `npm run dev:memory` | Low memory usage | 🚀🚀 |
| `npm run dev:quick` | Existing cache | 🚀 |
| `npm run dev` | Standard (slowest) | 🐌 |