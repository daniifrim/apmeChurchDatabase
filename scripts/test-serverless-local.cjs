#!/usr/bin/env node
require('dotenv').config();

/**
 * Comprehensive test script for serverless migration validation
 * Tests all API endpoints and authentication flow
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// Test configuration
const TEST_CONFIG = {
  baseUrl: BASE_URL,
  timeout: 10000,
  retries: 3,
  delay: 1000,
};

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

// Helper functions
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

function logTest(name, passed, details = '') {
  const result = {
    name,
    passed,
    details,
    timestamp: new Date().toISOString(),
  };
  
  TEST_RESULTS.push(result);
  
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ` - ${details}` : ''}`);
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Endpoints...\n');
  
  // Test registration
  console.log('Testing registration...');
  const registerResponse = await makeRequest('POST', '/api/auth/register', TEST_USER);
  logTest(
    'User Registration',
    registerResponse.ok,
    registerResponse.ok ? 'User created successfully' : registerResponse.data?.message || registerResponse.error
  );
  
  if (!registerResponse.ok && registerResponse.data?.message?.includes('already exists')) {
    logTest('User Registration', true, 'User already exists (expected)');
  }
  
  // Test login
  console.log('Testing login...');
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  
  let authToken = null;
  if (loginResponse.ok) {
    authToken = loginResponse.data.token;
    logTest('User Login', true, 'Login successful');
  } else {
    logTest('User Login', false, loginResponse.data?.message || loginResponse.error);
  }
  
  // Test fallback login with hardcoded credentials
  console.log('Testing fallback login...');
  const fallbackResponse = await makeRequest('POST', '/api/auth/login', {
    email: 'office@apme.ro',
    password: 'admin 1234',
  });
  
  let fallbackToken = null;
  if (fallbackResponse.ok) {
    fallbackToken = fallbackResponse.data.token;
    logTest('Fallback Login', true, 'Fallback login successful');
  } else {
    logTest('Fallback Login', false, fallbackResponse.data?.message || fallbackResponse.error);
  }
  
  // Test user profile
  if (authToken) {
    console.log('Testing user profile...');
    const profileResponse = await makeRequest('GET', '/api/auth/user', null, authToken);
    logTest(
      'User Profile',
      profileResponse.ok,
      profileResponse.ok ? `User: ${profileResponse.data.email}` : profileResponse.data?.message
    );
  }
  
  return { authToken, fallbackToken };
}

async function testChurchManagement(authToken) {
  console.log('\n🏛️ Testing Church Management Endpoints...\n');
  
  if (!authToken) {
    logTest('Church Management', false, 'No authentication token available');
    return;
  }
  
  // Test church listing
  console.log('Testing church listing...');
  const listResponse = await makeRequest('GET', '/api/churches', null, authToken);
  logTest(
    'Church Listing',
    listResponse.ok,
    listResponse.ok ? `Found ${listResponse.data.length || 0} churches` : listResponse.data?.message
  );
  
  let testChurchId = null;
  
  // Test church creation
  console.log('Testing church creation...');
  const newChurch = {
    name: 'Test Church Serverless',
    address: '123 Test Street',
    city: 'Test City',
    county: 'Test County',
    phone: '123-456-7890',
    email: 'test@church.com',
    website: 'https://testchurch.com',
    pastor: 'Test Pastor',
    denomination: 'Test Denomination',
    latitude: 40.7128,
    longitude: -74.0060,
  };
  
  const createResponse = await makeRequest('POST', '/api/churches', newChurch, authToken);
  if (createResponse.ok) {
    testChurchId = createResponse.data.id;
    logTest('Church Creation', true, `Created church with ID: ${testChurchId}`);
  } else {
    logTest('Church Creation', false, createResponse.data?.message || createResponse.error);
  }
  
  // Test individual church retrieval
  if (testChurchId) {
    console.log('Testing individual church retrieval...');
    const getResponse = await makeRequest('GET', `/api/churches/${testChurchId}`, null, authToken);
    logTest(
      'Individual Church',
      getResponse.ok,
      getResponse.ok ? `Retrieved church: ${getResponse.data.name}` : getResponse.data?.message
    );
    
    // Test church update
    console.log('Testing church update...');
    const updateResponse = await makeRequest('PUT', `/api/churches/${testChurchId}`, {
      ...newChurch,
      name: 'Updated Test Church',
    }, authToken);
    logTest(
      'Church Update',
      updateResponse.ok,
      updateResponse.ok ? 'Church updated successfully' : updateResponse.data?.message
    );
    
    // Test visit creation
    console.log('Testing visit creation...');
    const visitResponse = await makeRequest('POST', `/api/churches/${testChurchId}/visits`, {
      date: new Date().toISOString().split('T')[0],
      missionaryName: 'Test Missionary',
      purpose: 'Test visit',
      notes: 'This is a test visit from the serverless migration test',
    }, authToken);
    logTest(
      'Visit Creation',
      visitResponse.ok,
      visitResponse.ok ? `Created visit with ID: ${visitResponse.data.id}` : visitResponse.data?.message
    );
    
    // Test activity creation
    console.log('Testing activity creation...');
    const activityResponse = await makeRequest('POST', `/api/churches/${testChurchId}/activities`, {
      type: 'visit',
      description: 'Test activity from serverless migration test',
      date: new Date().toISOString().split('T')[0],
    }, authToken);
    logTest(
      'Activity Creation',
      activityResponse.ok,
      activityResponse.ok ? `Created activity with ID: ${activityResponse.data.id}` : activityResponse.data?.message
    );
    
    // Test analytics
    console.log('Testing analytics...');
    const analyticsResponse = await makeRequest('GET', '/api/analytics', null, authToken);
    logTest(
      'Analytics',
      analyticsResponse.ok,
      analyticsResponse.ok ? 'Analytics retrieved successfully' : analyticsResponse.data?.message
    );
    
    // Test church deletion (soft delete)
    console.log('Testing church deletion...');
    const deleteResponse = await makeRequest('DELETE', `/api/churches/${testChurchId}`, null, authToken);
    logTest(
      'Church Deletion',
      deleteResponse.ok,
      deleteResponse.ok ? 'Church deleted successfully' : deleteResponse.data?.message
    );
  }
  
  return testChurchId;
}

async function testEnvironment() {
  console.log('\n🌍 Testing Environment Configuration...\n');
  
  // Check if server is running
  try {
    const response = await makeRequest('GET', '/api/churches');
    logTest('Server Running', response.status !== 0, response.status === 0 ? 'Server not responding' : 'Server is running');
  } catch (error) {
    logTest('Server Running', false, 'Cannot connect to server');
  }
  
  // Check environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  logTest(
    'Environment Variables',
    missingVars.length === 0,
    missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : 'All required variables present'
  );
  
  // Check CORS
  console.log('Testing CORS...');
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/churches`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    logTest(
      'CORS Configuration',
      response.ok,
      response.ok ? 'CORS properly configured' : 'CORS issues detected'
    );
  } catch (error) {
    logTest('CORS Configuration', false, 'Cannot test CORS');
  }
}

async function runTests() {
  console.log('🚀 Starting Serverless Migration Test Suite...\n');
  console.log(`Testing against: ${TEST_CONFIG.baseUrl}\n`);
  
  // Test environment
  await testEnvironment();
  
  // Test authentication
  const { authToken, fallbackToken } = await testAuthentication();
  
  // Test church management
  await testChurchManagement(authToken || fallbackToken);
  
  // Generate test report
  console.log('\n📊 Test Results Summary:\n');
  
  const passed = TEST_RESULTS.filter(r => r.passed).length;
  const total = TEST_RESULTS.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(TEST_RESULTS, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest, TEST_CONFIG };
