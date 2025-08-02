const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'office@apme.ro';
const ADMIN_PASSWORD = 'admin1234';

// Login
async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  
  const data = await response.json();
  return { cookies: response.headers.get('set-cookie') };
}

// Test updating a single church
async function testUpdate() {
  try {
    const auth = await login();
    
    // Test with church ID 32 (that was failing)
    const churchId = 32;
    const updateData = { 
      pastor: 'Lupu Vasile', 
      phone: '0762261194'
    };
    
    console.log('📤 Updating church ID:', churchId);
    console.log('📤 Update data:', JSON.stringify(updateData, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/churches/${churchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookies || ''
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Update successful!');
    } else {
      console.log('❌ Update failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUpdate();