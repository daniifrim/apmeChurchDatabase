import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CSV_FILE_PATH = '../attached_assets/churches.csv';
const ADMIN_EMAIL = 'office@apme.ro';
const ADMIN_PASSWORD = 'admin1234';

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const churches = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle multiline entries in CSV 
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
    
    if (values.length < 12) continue;
    
    const [na, nq, name, rccp, county, city, address, postalCode, fullAddress, pastor, phone, members] = values;
    
    if (name === 'Nume biserica' || !name || !county) continue;
    
    churches.push({
      name: name.trim(),
      rccp: parseInt(rccp) || 9,
      county: county.trim(),
      city: city.trim(),
      address: address.trim() || city.trim(),
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
  
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  
  const data = await response.json();
  const setCookieHeader = response.headers.get('set-cookie');
  
  console.log('✅ Login successful');
  return { user: data.user, cookies: setCookieHeader };
}

// Get all existing churches
async function getExistingChurches(cookies) {
  const response = await fetch(`${API_BASE_URL}/churches`, {
    headers: { 'Cookie': cookies || '' }
  });
  return await response.json();
}

// Update church via API
async function updateChurch(churchId, updateData, cookies) {
  const response = await fetch(`${API_BASE_URL}/churches/${churchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorData}`);
  }
  
  return await response.json();
}

// Match churches by name similarity
function findMatchingChurch(csvChurch, existingChurches) {
  // First try exact name match
  let match = existingChurches.find(existing => 
    existing.name.toLowerCase() === csvChurch.name.toLowerCase()
  );
  
  if (match) return match;
  
  // Try partial name match (remove common prefixes like "Bis Pent")
  const csvBaseName = csvChurch.name.replace(/^(Bis Pent|Biserica Penticostala)\s*/i, '').toLowerCase();
  match = existingChurches.find(existing => {
    const existingBaseName = existing.name.replace(/^(Bis Pent|Biserica Penticostala)\s*/i, '').toLowerCase();
    return existingBaseName === csvBaseName;
  });
  
  if (match) return match;
  
  // Try matching by city and county
  match = existingChurches.find(existing => 
    existing.city.toLowerCase() === csvChurch.city.toLowerCase() &&
    existing.counties?.name.toLowerCase() === csvChurch.county.toLowerCase()
  );
  
  return match;
}

// Main update function
async function updateChurchesFromCSV() {
  try {
    console.log('🚀 Starting church update process...\n');
    
    // Step 1: Login
    const auth = await login();
    
    // Step 2: Read CSV data
    console.log('🔍 Reading CSV file...');
    const csvPath = path.resolve(__dirname, CSV_FILE_PATH);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvChurches = parseCSV(csvContent);
    console.log(`Found ${csvChurches.length} churches in CSV\n`);
    
    // Step 3: Get existing churches
    console.log('🏛️ Fetching existing churches...');
    const existingChurches = await getExistingChurches(auth.cookies);
    console.log(`Found ${existingChurches.length} existing churches in database\n`);
    
    // Step 4: Match and update churches
    console.log('🔄 Matching CSV data with existing churches...\n');
    
    let updateCount = 0;
    let notFoundCount = 0;
    const notFound = [];
    
    for (const csvChurch of csvChurches) {
      console.log(`Processing: ${csvChurch.name} (${csvChurch.city}, ${csvChurch.county})`);
      
      const existingChurch = findMatchingChurch(csvChurch, existingChurches);
      
      if (existingChurch) {
        console.log(`  ✅ Found match: DB ID ${existingChurch.id} - ${existingChurch.name}`);
        
        // Prepare update data - only update fields that are missing or different
        const updateData = {};
        
        // Update pastor if missing or different
        if (csvChurch.pastor && (!existingChurch.pastor || existingChurch.pastor !== csvChurch.pastor)) {
          updateData.pastor = csvChurch.pastor;
        }
        
        // Update phone if missing or different  
        if (csvChurch.phone && (!existingChurch.phone || existingChurch.phone !== csvChurch.phone)) {
          updateData.phone = csvChurch.phone;
        }
        
        // Update member count if missing or different (using snake_case field name)
        if (csvChurch.memberCount && (!existingChurch.memberCount || existingChurch.memberCount !== csvChurch.memberCount)) {
          updateData.member_count = csvChurch.memberCount;
        }
        
        // Update address if current one is generic
        if (csvChurch.address && csvChurch.address !== csvChurch.city && 
            (!existingChurch.address || existingChurch.address === existingChurch.city)) {
          updateData.address = csvChurch.address;
        }
        
        if (Object.keys(updateData).length > 0) {
          try {
            console.log(`  📝 Updating with:`, updateData);
            await updateChurch(existingChurch.id, updateData, auth.cookies);
            console.log(`  ✅ Updated successfully`);
            updateCount++;
          } catch (error) {
            console.log(`  ❌ Update failed: ${error.message}`);
          }
        } else {
          console.log(`  ℹ️  No updates needed`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } else {
        console.log(`  ❌ No match found`);
        notFoundCount++;
        notFound.push(csvChurch);
      }
      
      console.log('');
    }
    
    // Step 5: Summary
    console.log('📊 Update Summary:');
    console.log(`  ✅ Churches updated: ${updateCount}`);
    console.log(`  ❌ Churches not found: ${notFoundCount}`);
    
    if (notFound.length > 0) {
      console.log('\n❌ Churches from CSV not found in database:');
      notFound.forEach(church => {
        console.log(`  - ${church.name} (${church.city}, ${church.county})`);
      });
    }
    
    console.log('\n🎉 Update process completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the update
if (import.meta.url === `file://${process.argv[1]}`) {
  updateChurchesFromCSV();
}

export { updateChurchesFromCSV };