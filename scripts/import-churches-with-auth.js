import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CSV_FILE_PATH = '../attached_assets/churches.csv';

// Admin credentials (fallback auth from login.ts)
const ADMIN_EMAIL = 'office@apme.ro';
const ADMIN_PASSWORD = 'admin1234';

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const churches = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle multiline entries in CSV (some addresses span multiple lines)
    let values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    // Skip if not enough values
    if (values.length < 12) continue;
    
    const [na, nq, name, rccp, county, city, address, postalCode, fullAddress, pastor, phone, members] = values;
    
    // Skip header row or invalid entries
    if (name === 'Nume biserica' || !name || !county) continue;
    
    churches.push({
      name: name.trim(),
      rccp: parseInt(rccp) || 9,
      county: county.trim(),
      city: city.trim(),
      address: address.trim() || city.trim(),
      postalCode: postalCode.trim(),
      fullAddress: fullAddress.trim(),
      pastor: pastor.trim(),
      phone: phone.trim().replace(/\s+/g, ''),
      memberCount: parseInt(members) || null
    });
  }
  
  return churches;
}

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
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Login failed: ${data.message}`);
    }
    
    // Extract session cookies from response headers
    const setCookieHeader = response.headers.get('set-cookie');
    
    console.log('✅ Login successful');
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

// Get county ID from county name
async function getCountyId(countyName, cookies) {
  try {
    const response = await fetch(`${API_BASE_URL}/counties`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    const counties = await response.json();
    
    const county = counties.find(c => 
      c.name.toLowerCase() === countyName.toLowerCase() ||
      c.name.toLowerCase().includes(countyName.toLowerCase()) ||
      countyName.toLowerCase().includes(c.name.toLowerCase())
    );
    
    return county ? county.id : null;
  } catch (error) {
    console.error('Error fetching counties:', error);
    return null;
  }
}

// Create church via API
async function createChurch(churchData, cookies) {
  try {
    const response = await fetch(`${API_BASE_URL}/churches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(churchData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating church:', error);
    throw error;
  }
}

// Main import function
async function importChurches() {
  try {
    console.log('🚀 Starting church import process...\n');
    
    // Step 1: Login
    const auth = await login();
    
    // Step 2: Read and parse CSV
    console.log('🔍 Reading CSV file...');
    const csvPath = path.resolve(__dirname, CSV_FILE_PATH);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('📊 Parsing CSV data...');
    const churches = parseCSV(csvContent);
    console.log(`Found ${churches.length} churches in CSV\n`);
    
    // Step 3: Get county mappings
    const uniqueCounties = [...new Set(churches.map(c => c.county))];
    console.log('🏛️ Fetching county mappings...');
    const countyMappings = {};
    for (const countyName of uniqueCounties) {
      const countyId = await getCountyId(countyName, auth.cookies);
      countyMappings[countyName] = countyId;
      console.log(`  ${countyName} -> County ID: ${countyId}`);
    }
    console.log('');
    
    // Step 4: Filter valid churches
    const validChurches = churches.filter(church => {
      const hasValidCounty = countyMappings[church.county];
      if (!hasValidCounty) {
        console.warn(`⚠️  Skipping church ${church.name} - county ${church.county} not found in database`);
      }
      return hasValidCounty;
    });
    
    console.log(`✅ ${validChurches.length} churches have valid county mappings\n`);
    
    // Step 5: Prepare church data for API
    const churchesToInsert = validChurches.map(church => ({
      name: church.name,
      address: church.address || church.city,
      city: church.city,
      county: church.county,
      countyId: countyMappings[church.county],
      country: 'Romania',
      latitude: '44.0', // Placeholder - will be updated later
      longitude: '25.0', // Placeholder - will be updated later
      pastor: church.pastor || null,
      phone: church.phone || null,
      memberCount: church.memberCount,
      engagementLevel: 'new',
      isActive: true
    }));
    
    // Step 6: Insert churches
    console.log('📥 Starting church insertion...');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < churchesToInsert.length; i++) {
      const church = churchesToInsert[i];
      try {
        console.log(`[${i + 1}/${churchesToInsert.length}] Creating: ${church.name} (${church.city}, ${church.county})`);
        
        const result = await createChurch(church, auth.cookies);
        
        console.log(`  ✅ Created church ID: ${result.id}`);
        successCount++;
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ❌ Failed to create ${church.name}:`, error.message);
        errorCount++;
        errors.push({
          church: church.name,
          error: error.message
        });
      }
    }
    
    // Step 7: Summary
    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Successfully created: ${successCount} churches`);
    console.log(`  ❌ Failed to create: ${errorCount} churches`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.church}: ${err.error}`);
      });
    }
    
    console.log('\n🎉 Import process completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importChurches();
}

export { parseCSV, getCountyId, createChurch, importChurches };