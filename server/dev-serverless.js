#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, '..'));
const app = express();

// Cache for serverless function paths to avoid repeated file system checks
const functionPathCache = new Map();
const moduleCache = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Function to dynamically import and execute serverless functions
async function executeServerlessFunction(functionPath, req, res) {
  try {
    // Check module cache first (with cache busting for development)
    let module = moduleCache.get(functionPath);
    
    if (!module || process.env.NODE_ENV === 'development') {
      // Import the serverless function with cache busting for development
      module = await import(`${functionPath}?t=${Date.now()}`);
      moduleCache.set(functionPath, module);
    }
    
    const handler = module.default;
    
    if (typeof handler !== 'function') {
      throw new Error('Serverless function must export a default function');
    }
    
    // Extract dynamic route parameters
    const routeParams = extractRouteParams(req.path, functionPath);
    
    // Create Next.js-like request/response objects
    const nextReq = {
      ...req,
      query: { ...req.query, ...req.params, ...routeParams },
      cookies: req.cookies || {},
    };
    
    const nextRes = {
      ...res,
      status: (code) => {
        res.status(code);
        return nextRes;
      },
      json: (data) => {
        res.json(data);
        return nextRes;
      },
      send: (data) => {
        res.send(data);
        return nextRes;
      },
      end: (data) => {
        res.end(data);
        return nextRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return nextRes;
      },
    };
    
    // Execute the serverless function
    await handler(nextReq, nextRes);
  } catch (error) {
    console.error(`Error executing serverless function ${functionPath}:`, error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Function to find the correct serverless function file
function findServerlessFunction(apiPath) {
  // Check cache first
  if (functionPathCache.has(apiPath)) {
    return functionPathCache.get(apiPath);
  }
  
  const basePath = path.resolve('api');
  
  // Remove /api prefix and split path
  const pathParts = apiPath.replace(/^\/api/, '').split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
    functionPathCache.set(apiPath, null);
    return null;
  }
  
  // Try different file patterns
  const possiblePaths = [
    // Direct file match: /api/analytics -> api/analytics.ts
    path.join(basePath, ...pathParts) + '.ts',
    // Index file: /api/churches -> api/churches/index.ts
    path.join(basePath, ...pathParts, 'index.ts'),
    // Dynamic route: /api/churches/123 -> api/churches/[id].ts
    ...generateDynamicRoutePaths(basePath, pathParts),
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      functionPathCache.set(apiPath, filePath);
      return filePath;
    }
  }
  
  functionPathCache.set(apiPath, null);
  return null;
}

function generateDynamicRoutePaths(basePath, pathParts) {
  const paths = [];
  
  // For each part of the path, try replacing it with [id], [slug], etc.
  for (let i = 0; i < pathParts.length; i++) {
    const dynamicParts = [...pathParts];
    
    // Try common dynamic route patterns
    const dynamicPatterns = ['[id]', '[slug]', '[...slug]'];
    
    for (const pattern of dynamicPatterns) {
      dynamicParts[i] = pattern;
      const filePath = path.join(basePath, ...dynamicParts) + '.ts';
      paths.push(filePath);
      
      // Also try with index.ts
      const indexPath = path.join(basePath, ...dynamicParts, 'index.ts');
      paths.push(indexPath);
    }
  }
  
  return paths;
}

// Extract route parameters from dynamic routes
function extractRouteParams(requestPath, functionPath) {
  const basePath = path.resolve('api');
  
  // Remove /api prefix and split request path
  const requestParts = requestPath.replace(/^\/api/, '').split('/').filter(Boolean);
  
  const params = {};
  
  // Match function parts with request parts
  for (let i = 0; i < functionParts.length; i++) {
    const functionPart = functionParts[i];
    const requestPart = requestParts[i];
    
    // Check if this is a dynamic route parameter
    if (functionPart.startsWith('[') && functionPart.endsWith(']')) {
      const paramName = functionPart.slice(1, -1); // Remove brackets
      if (requestPart) {
        params[paramName] = requestPart;
      }
    }
  }
  
  return params;
}

// API route handler
app.all('/api/*', async (req, res) => {
  const startTime = Date.now();
  const apiPath = req.path;
  console.log(`🚀 [${new Date().toISOString()}] ${req.method} ${apiPath} - Starting...`);
  
  const findStartTime = Date.now();
  const functionPath = findServerlessFunction(apiPath);
  const findDuration = Date.now() - findStartTime;
  
  if (!functionPath) {
    console.error(`❌ No serverless function found for ${apiPath} (${findDuration}ms)`);
    return res.status(404).json({ 
      error: 'Not Found',
      message: `API endpoint ${apiPath} not found`
    });
  }
  
  console.log(`📁 Function resolved: ${path.basename(functionPath)} (${findDuration}ms)`);
  
  const execStartTime = Date.now();
  await executeServerlessFunction(functionPath, req, res);
  const execDuration = Date.now() - execStartTime;
  const totalDuration = Date.now() - startTime;
  
  console.log(`✅ ${req.method} ${apiPath} completed in ${totalDuration}ms (exec: ${execDuration}ms)`);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'serverless-development'
  });
});

// Catch-all for non-API routes (let Vite handle them)
app.get('*', (_req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'This endpoint should be handled by Vite dev server'
  });
});

const port = process.env.API_PORT || 3000;
const server = createServer(app);

server.listen(port, () => {
  console.log(`🚀 Serverless development server running on port ${port}`);
  console.log(`📡 API endpoints available at http://localhost:${port}/api/*`);
  console.log(`🔍 Health check: http://localhost:${port}/health`);
  console.log('');
  console.log('Available API endpoints:');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/register');
  console.log('  GET  /api/auth/user');
  console.log('  POST /api/auth/logout');
  console.log('  GET  /api/churches');
  console.log('  POST /api/churches');
  console.log('  GET  /api/churches/:id');
  console.log('  PUT  /api/churches/:id');
  console.log('  DELETE /api/churches/:id');
  console.log('  GET  /api/churches/:id/visits');
  console.log('  POST /api/churches/:id/visits');
  console.log('  GET  /api/churches/:id/activities');
  console.log('  POST /api/churches/:id/activities');
  console.log('  GET  /api/analytics');
});

export default server;