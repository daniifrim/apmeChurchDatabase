import fs from 'fs';

const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'office@apme.ro';
const ADMIN_PASSWORD = 'admin1234';

// Login and get session cookies
async function login() {
  console.log('🔐 Logging in...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
    
    const data = await response.json();
    const setCookieHeader = response.headers.get('set-cookie');
    
    console.log('✅ Login successful, user:', data.user?.id);
    return {
      user: data.user,
      session: data.session,
      cookies: setCookieHeader
    };
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

// Test creating a simple church
async function testChurchCreation() {
  try {
    const auth = await login();
    
    // Test data - matching existing church format exactly
    const testChurch = {
      name: "Test Church Harul",
      address: "Test Address",
      city: "Jirov", 
      county: "Mehedinți",
      countyId: 27,
      country: "Romania",
      latitude: "44.0",
      longitude: "25.0",
      pastor: "Test Pastor",
      phone: "0764494708",
      memberCount: 60,
      engagementLevel: "new",
      isActive: true
    };
    
    console.log('📤 Sending church data:');
    console.log(JSON.stringify(testChurch, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/churches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookies || ''
      },
      body: JSON.stringify(testChurch)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    const result = JSON.parse(responseText);
    console.log('✅ Church created successfully:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChurchCreation();