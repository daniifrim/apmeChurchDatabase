#!/usr/bin/env node

/**
 * Simple test script to validate serverless functions locally
 */

const API_BASE = 'http://localhost:3000';

async function testEndpoint(method, path, data = null, token = null) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    console.log(`\n🧪 Testing ${method} ${path}`);
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const json = JSON.parse(responseData);
      console.log(`   Response:`, JSON.stringify(json, null, 2));
      return { status: response.status, data: json };
    } else {
      console.log(`   Response: ${responseData}`);
      return { status: response.status, data: responseData };
    }
  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return { status: 0, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Serverless Functions Locally');
  console.log('=====================================');
  
  // Test health check
  await testEndpoint('GET', '/health');
  
  // Test login with fallback credentials
  console.log('\n📝 Testing Authentication Flow');
  const loginResult = await testEndpoint('POST', '/api/auth/login', {
    email: 'office@apme.ro',
    password: 'admin1234'
  });
  
  let token = null;
  if (loginResult.status === 200 && loginResult.data?.session?.access_token) {
    token = loginResult.data.session.access_token;
    console.log('   ✅ Login successful, token received');
  } else {
    console.log('   ❌ Login failed');
    return;
  }
  
  // Test authenticated endpoints
  console.log('\n🏛️ Testing Church Management');
  await testEndpoint('GET', '/api/churches', null, token);
  await testEndpoint('GET', '/api/auth/user', null, token);
  await testEndpoint('GET', '/api/analytics', null, token);
  
  // Test church creation
  const createChurchResult = await testEndpoint('POST', '/api/churches', {
    name: 'Test Church',
    address: 'Test Address 123',
    city: 'Test City',
    county: 'Test County',
    country: 'Romania',
    latitude: '44.4268',
    longitude: '26.1025',
    pastor: 'Test Pastor',
    phone: '+40 123 456 789',
    email: 'test@church.ro',
    memberCount: 50,
    foundedYear: 2020,
    engagementLevel: 'medium',
    notes: 'Test church created by serverless test'
  }, token);
  
  if (createChurchResult.status === 201 && createChurchResult.data?.id) {
    const churchId = createChurchResult.data.id;
    console.log(`   ✅ Church created with ID: ${churchId}`);
    
    // Test church-specific endpoints
    await testEndpoint('GET', `/api/churches/${churchId}`, null, token);
    await testEndpoint('GET', `/api/churches/${churchId}/visits`, null, token);
    await testEndpoint('GET', `/api/churches/${churchId}/activities`, null, token);
    
    // Test visit creation
    await testEndpoint('POST', `/api/churches/${churchId}/visits`, {
      visitDate: new Date(),
      purpose: 'Test visit',
      notes: 'This is a test visit',
      followUpRequired: false
    }, token);
    
    // Test activity creation
    await testEndpoint('POST', `/api/churches/${churchId}/activities`, {
      type: 'note',
      title: 'Test Activity',
      description: 'This is a test activity',
      activityDate: new Date()
    }, token);
  }
  
  // Test logout
  console.log('\n🚪 Testing Logout');
  await testEndpoint('POST', '/api/auth/logout', null, token);
  
  console.log('\n✅ Serverless function tests completed!');
  console.log('\nNext steps:');
  console.log('1. Start the development servers: npm run dev');
  console.log('2. Open http://localhost:5173 in your browser');
  console.log('3. Test the complete application flow');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch support');
  console.log('Please upgrade your Node.js version or install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);