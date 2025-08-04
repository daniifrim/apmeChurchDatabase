import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Function to dynamically import and execute serverless functions
async function executeServerlessFunction(functionPath: string, req: express.Request, res: express.Response) {
  try {
    // Import the serverless function
    const module = await import(functionPath);
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
      status: (code: number) => {
        res.status(code);
        return nextRes;
      },
      json: (data: any) => {
        res.json(data);
        return nextRes;
      },
      send: (data: any) => {
        res.send(data);
        return nextRes;
      },
      end: (data?: any) => {
        res.end(data);
        return nextRes;
      },
      setHeader: (name: string, value: string | number | readonly string[]) => {
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
function findServerlessFunction(apiPath: string): string | null {
  const basePath = path.resolve(__dirname, '../api');
  
  // Remove /api prefix and split path
  const pathParts = apiPath.replace(/^\/api/, '').split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
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
      return filePath;
    }
  }
  
  return null;
}

function generateDynamicRoutePaths(basePath: string, pathParts: string[]): string[] {
  const paths: string[] = [];
  
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
function extractRouteParams(requestPath: string, functionPath: string): Record<string, string> {
  const basePath = path.resolve(__dirname, '../api');
  const relativeFunctionPath = path.relative(basePath, functionPath);
  
  // Remove .ts extension and split into parts
  const functionParts = relativeFunctionPath.replace(/\.ts$/, '').split(path.sep);
  
  // Remove /api prefix and split request path
  const requestParts = requestPath.replace(/^\/api/, '').split('/').filter(Boolean);
  
  const params: Record<string, string> = {};
  
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
  const apiPath = req.path;
  console.log(`[${new Date().toISOString()}] ${req.method} ${apiPath}`);
  
  const functionPath = findServerlessFunction(apiPath);
  
  if (!functionPath) {
    console.error(`No serverless function found for ${apiPath}`);
    return res.status(404).json({ 
      error: 'Not Found',
      message: `API endpoint ${apiPath} not found`
    });
  }
  
  console.log(`Executing serverless function: ${functionPath}`);
  await executeServerlessFunction(functionPath, req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'serverless-development'
  });
});

// Catch-all for non-API routes (let Vite handle them)
app.get('*', (req, res) => {
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
