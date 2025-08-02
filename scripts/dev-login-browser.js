#!/usr/bin/env node

/**
 * Browser auto-login script
 * Automatically logs in and opens browser with token set
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEV_CREDENTIALS = {
  email: 'office@apme.ro',
  password: 'admin1234'
};

const API_BASE = 'http://localhost:3000';
const CLIENT_URL = 'http://localhost:5173';

async function loginAndOpenBrowser() {
  console.log('🔐 Getting dev login token...');
  
  try {
    // Get login token
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(DEV_CREDENTIALS),
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.session?.access_token) {
      throw new Error(data.message || 'Login failed');
    }
    
    const token = data.session.access_token;
    console.log('✅ Login token obtained');
    
    // Create a temporary HTML file that sets the token and redirects
    const tempHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>APME Dev Login</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #f5f5f5;
        }
        .container { 
            text-align: center; 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .spinner { 
            border: 3px solid #f3f3f3; 
            border-top: 3px solid #3498db; 
            border-radius: 50%; 
            width: 30px; 
            height: 30px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 1rem;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>🔐 APME Dev Login</h2>
        <p>Setting up authentication...</p>
        <p><small>You will be redirected automatically</small></p>
    </div>
    <script>
        console.log('🔑 Setting auth token...');
        localStorage.setItem('auth_token', '${token}');
        console.log('✅ Auth token set, redirecting...');
        setTimeout(() => {
            window.location.href = '${CLIENT_URL}';
        }, 1500);
    </script>
</body>
</html>`;
    
    // Write temp file
    const fs = await import('fs');
    const path = await import('path');
    const tempFile = path.join(process.cwd(), 'temp-dev-login.html');
    
    fs.writeFileSync(tempFile, tempHtml);
    console.log('📄 Created temporary login page');
    
    // Open browser
    const platform = process.platform;
    let openCommand;
    
    if (platform === 'darwin') {
      openCommand = `open "${tempFile}"`;
    } else if (platform === 'win32') {
      openCommand = `start "${tempFile}"`;
    } else {
      openCommand = `xdg-open "${tempFile}"`;
    }
    
    console.log('🌐 Opening browser...');
    await execAsync(openCommand);
    
    // Clean up temp file after a delay
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
        console.log('🧹 Cleaned up temporary file');
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 10000);
    
    console.log('✅ Browser opened with dev login token!');
    console.log('💡 The app should automatically log you in as office@apme.ro');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    console.log('🔍 Checking if servers are running...');
    
    // Check API server
    const apiResponse = await fetch(`${API_BASE}/health`);
    if (!apiResponse.ok) {
      throw new Error('API server not responding');
    }
    console.log('✅ API server is running');
    
    // Check client server
    const clientResponse = await fetch(CLIENT_URL);
    if (!clientResponse.ok) {
      throw new Error('Client server not responding');
    }
    console.log('✅ Client server is running');
    
    return true;
  } catch (error) {
    console.error('❌ Servers not running. Please start them with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 APME Church Database - Browser Auto-Login');
  console.log('=============================================');
  
  const serversRunning = await checkServers();
  if (!serversRunning) {
    process.exit(1);
  }
  
  await loginAndOpenBrowser();
}

main().catch(console.error);