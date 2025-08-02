#!/usr/bin/env node

/**
 * Development login bypass script
 * Automatically logs in with dev credentials and stores the token
 */

import fetch from 'node-fetch';

const DEV_CREDENTIALS = {
  email: 'office@apme.ro',
  password: 'admin1234'
};

const API_BASE = 'http://localhost:3000';

async function devLogin() {
  console.log('🔐 Attempting dev login bypass...');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(DEV_CREDENTIALS),
    });
    
    const duration = Date.now() - startTime;
    console.log(`📡 Login API call completed in ${duration}ms`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.session?.access_token) {
        console.log('✅ Dev login successful!');
        console.log(`👤 User: ${data.user?.email || 'Unknown'}`);
        console.log(`🔑 Token: ${data.session.access_token.substring(0, 20)}...`);
        console.log('');
        console.log('💡 To use this token in your browser:');
        console.log('1. Open browser dev tools (F12)');
        console.log('2. Go to Application/Storage > Local Storage');
        console.log('3. Add key: "auth_token"');
        console.log(`4. Add value: "${data.session.access_token}"`);
        console.log('5. Refresh the page');
        console.log('');
        console.log('Or run: npm run dev:login-browser');
      } else {
        console.error('❌ Login failed:', data.message || 'Unknown error');
        process.exit(1);
      }
    } else {
      const errorData = await response.json();
      console.error('❌ Login request failed:', errorData.message || response.statusText);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during dev login:', error.message);
    process.exit(1);
  }
}

// Check if API server is running
async function checkApiServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ API server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ API server is not running. Please start it with: npm run dev:api');
    console.error('   Or run the full dev environment with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 APME Church Database - Dev Login Bypass');
  console.log('==========================================');
  
  const serverRunning = await checkApiServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await devLogin();
}

main().catch(console.error);