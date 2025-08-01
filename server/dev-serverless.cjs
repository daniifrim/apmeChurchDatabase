#!/usr/bin/env node

/**
 * Development server for testing serverless functions locally.
 * Uses Vercel's Node.js Serverless handler model.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { handler } = require('@vercel/node/dist/index'); // Vercel serverless handler

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, conf: { distDir: '.vercel_build_output/functions' } });
const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  return app.prepare().then(() => {
    // Delegate to Vercel serverless handler
    handler(req, res, {
      files: { }, // no static files in this test
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, (err) => {
  if (err) {
    console.error('Error starting dev-serverless:', err);
    process.exit(1);
  }
  console.log(`> Serverless dev server listening on http://localhost:${port}`);
});
