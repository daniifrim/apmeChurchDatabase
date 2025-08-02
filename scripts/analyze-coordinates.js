/**
 * Script to analyze coordinate data in the database
 * Helps identify if churches have identical coordinates or data quality issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCoordinates() {
  console.log('🔍 Analyzing church coordinate data...\n');

  try {
    // Fetch all churches with their coordinates and county information
    const { data: churches, error } = await supabase
      .from('churches')
      .select(`
        id, 
        name, 
        address, 
        city, 
        county_id,
        latitude, 
        longitude, 
        is_active,
        counties(name)
      `)
      .eq('is_active', true)
      .order('id');

    if (error) {
      throw error;
    }

    if (!churches || churches.length === 0) {
      console.log('❌ No active churches found in database');
      return;
    }

    console.log(`📊 Total active churches: ${churches.length}\n`);

    // Group churches by coordinates to find duplicates
    const coordGroups = new Map();
    const coordinateIssues = [];

    churches.forEach(church => {
      const lat = parseFloat(church.latitude);
      const lng = parseFloat(church.longitude);
      
      // Check for invalid coordinates
      if (isNaN(lat) || isNaN(lng)) {
        coordinateIssues.push({
          ...church,
          issue: 'Invalid coordinates (NaN)',
          lat: church.latitude,
          lng: church.longitude
        });
        return;
      }

      // Check for coordinates outside Romania's approximate bounds
      // Romania bounds: 43.6-48.3 latitude, 20.2-29.7 longitude
      if (lat < 43.6 || lat > 48.3 || lng < 20.2 || lng > 29.7) {
        coordinateIssues.push({
          ...church,
          issue: 'Coordinates outside Romania bounds',
          lat,
          lng
        });
      }

      const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      
      if (!coordGroups.has(coordKey)) {
        coordGroups.set(coordKey, []);
      }
      coordGroups.get(coordKey).push({
        ...church,
        lat,
        lng
      });
    });

    // Find coordinate clusters (multiple churches at same location)
    const clusters = Array.from(coordGroups.entries())
      .filter(([_, churches]) => churches.length > 1)
      .sort((a, b) => b[1].length - a[1].length);

    console.log('🎯 COORDINATE CLUSTERING ANALYSIS:');
    console.log('=====================================');
    
    if (clusters.length === 0) {
      console.log('✅ No coordinate clusters found - all churches have unique locations');
    } else {
      console.log(`❌ Found ${clusters.length} coordinate clusters with multiple churches:`);
      
      clusters.forEach(([coords, churchList], index) => {
        const [lat, lng] = coords.split(',').map(Number);
        console.log(`\n${index + 1}. Location: ${lat}, ${lng} (${churchList.length} churches)`);
        churchList.forEach(church => {
          const countyName = church.counties?.name || 'Unknown County';
          console.log(`   - ${church.name} (${church.city}, ${countyName})`);
        });
      });
    }

    console.log('\n🚨 COORDINATE ISSUES:');
    console.log('=====================');
    
    if (coordinateIssues.length === 0) {
      console.log('✅ No coordinate issues found');
    } else {
      console.log(`❌ Found ${coordinateIssues.length} churches with coordinate issues:`);
      
      coordinateIssues.forEach((church, index) => {
        const countyName = church.counties?.name || 'Unknown County';
        console.log(`\n${index + 1}. ${church.name} (${church.city}, ${countyName})`);
        console.log(`   Issue: ${church.issue}`);
        console.log(`   Coordinates: ${church.lat}, ${church.lng}`);
        console.log(`   Address: ${church.address}`);
      });
    }

    // Most common coordinates
    const mostCommon = Array.from(coordGroups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    console.log('\n📍 MOST COMMON COORDINATES:');
    console.log('============================');
    mostCommon.forEach(([coords, churchList], index) => {
      const [lat, lng] = coords.split(',').map(Number);
      console.log(`${index + 1}. ${lat}, ${lng} (${churchList.length} churches)`);
    });

    // Summary statistics
    const uniqueCoordinates = coordGroups.size;
    const averageChurchesPerLocation = churches.length / uniqueCoordinates;
    const maxChurchesAtOneLocation = Math.max(...Array.from(coordGroups.values()).map(list => list.length));

    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('======================');
    console.log(`Total churches: ${churches.length}`);
    console.log(`Unique coordinate pairs: ${uniqueCoordinates}`);
    console.log(`Average churches per location: ${averageChurchesPerLocation.toFixed(2)}`);
    console.log(`Max churches at one location: ${maxChurchesAtOneLocation}`);
    console.log(`Churches with coordinate issues: ${coordinateIssues.length}`);
    console.log(`Coordinate clusters (>1 church): ${clusters.length}`);

    // Check if most churches are at the default Romania center
    const romaniaCenter = coordGroups.get('45.943200,24.966800') || 
                          coordGroups.get('45.943220,24.966780') ||
                          coordGroups.get('45.943000,24.967000');
    
    if (romaniaCenter && romaniaCenter.length > churches.length * 0.5) {
      console.log(`\n⚠️  WARNING: ${romaniaCenter.length} churches (${((romaniaCenter.length / churches.length) * 100).toFixed(1)}%) appear to be at the default Romania center coordinates!`);
      console.log('This suggests that most churches need proper geocoding.');
    }

  } catch (error) {
    console.error('❌ Error analyzing coordinates:', error.message);
  }
}

// Run the analysis
analyzeCoordinates().then(() => {
  console.log('\n✅ Analysis complete');
}).catch(error => {
  console.error('💥 Failed to analyze coordinates:', error);
  process.exit(1);
});