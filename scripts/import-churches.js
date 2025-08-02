import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CSV_FILE_PATH = '../attached_assets/churches.csv';

// Parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
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

// Get county ID from county name
async function getCountyId(countyName) {
  try {
    const response = await fetch(`${API_BASE_URL}/counties`);
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
async function createChurch(churchData, authToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/churches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': authToken // if using session-based auth
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
    console.log('🔍 Reading CSV file...');
    const csvPath = path.resolve(__dirname, CSV_FILE_PATH);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('📊 Parsing CSV data...');
    const churches = parseCSV(csvContent);
    console.log(`Found ${churches.length} churches in CSV`);
    
    // Group by county to get unique counties
    const uniqueCounties = [...new Set(churches.map(c => c.county))];
    console.log('Counties found:', uniqueCounties);
    
    console.log('🏛️ Fetching county mappings...');
    const countyMappings = {};
    for (const countyName of uniqueCounties) {
      const countyId = await getCountyId(countyName);
      countyMappings[countyName] = countyId;
      console.log(`${countyName} -> ${countyId}`);
    }
    
    // Filter out churches with unmapped counties
    const validChurches = churches.filter(church => {
      const hasValidCounty = countyMappings[church.county];
      if (!hasValidCounty) {
        console.warn(`⚠️  Skipping church ${church.name} - county ${church.county} not found in database`);
      }
      return hasValidCounty;
    });
    
    console.log(`✅ ${validChurches.length} churches have valid county mappings`);
    
    // Prepare church data for API
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
    
    console.log('\n🚀 Ready to insert churches. Sample data:');
    console.log(JSON.stringify(churchesToInsert[0], null, 2));
    
    console.log('\n⚠️  AUTH REQUIRED: This script needs authentication to insert churches.');
    console.log('Please ensure your dev server is running (npm run dev:api) and you are logged in.');
    console.log('\nTo proceed with insertion, uncomment the insertion loop below and provide auth credentials.');
    
    /*
    // Uncomment this section when ready to insert
    console.log('\n📥 Starting church insertion...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < churchesToInsert.length; i++) {
      const church = churchesToInsert[i];
      try {
        console.log(`[${i + 1}/${churchesToInsert.length}] Creating: ${church.name}`);
        
        // You'll need to provide authentication here
        const authToken = 'YOUR_AUTH_TOKEN_HERE';
        const result = await createChurch(church, authToken);
        
        console.log(`✅ Created church ID: ${result.id}`);
        successCount++;
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to create ${church.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Import completed: ${successCount} success, ${errorCount} errors`);
    */
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importChurches();
}

export { parseCSV, getCountyId, createChurch, importChurches };