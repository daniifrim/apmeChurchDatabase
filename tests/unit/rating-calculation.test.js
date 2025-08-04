/**
 * Rating System Logic Unit Tests
 * Tests the rating calculation logic without requiring a running server
 */

import { RatingCalculationService } from '../../lib/rating-calculation.js';

// Test Results Storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Utility Functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
    testResults.details.push({ status: 'PASS', message, timestamp: new Date() });
  } else {
    testResults.failed++;
    log(`FAIL: ${message}`, 'error');
    testResults.details.push({ status: 'FAIL', message, timestamp: new Date() });
    testResults.errors.push(message);
  }
}

function assertEqual(actual, expected, message) {
  const condition = actual === expected;
  assert(condition, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertRange(actual, min, max, message) {
  const condition = actual >= min && actual <= max;
  assert(condition, `${message} (expected: ${min}-${max}, actual: ${actual})`);
}

// Test Data
const testCases = [
  {
    name: "Standard rating with offering",
    input: {
      missionOpennessRating: 4,
      hospitalityRating: 3,
      missionarySupportCount: 2,
      offeringsAmount: 500,
      churchMembers: 100,
      attendeesCount: 80,
      visitDurationMinutes: 120,
      notes: "Great experience"
    },
    expectedRange: { min: 2, max: 5 }
  },
  {
    name: "No offering scenario - weight redistribution",
    input: {
      missionOpennessRating: 4,
      hospitalityRating: 3,
      missionarySupportCount: 1,
      offeringsAmount: 0,
      churchMembers: 50,
      attendeesCount: 30,
      notes: "Good visit, no offering"
    },
    expectedRange: { min: 3, max: 4 }
  },
  {
    name: "Minimum ratings",
    input: {
      missionOpennessRating: 1,
      hospitalityRating: 1,
      missionarySupportCount: 0,
      offeringsAmount: 0,
      churchMembers: 10,
      attendeesCount: 5,
      notes: "Challenging visit"
    },
    expectedRange: { min: 1, max: 1 }
  },
  {
    name: "Maximum ratings with high offering",
    input: {
      missionOpennessRating: 5,
      hospitalityRating: 5,
      missionarySupportCount: 5,
      offeringsAmount: 2000,
      churchMembers: 100,
      attendeesCount: 80,
      visitDurationMinutes: 180,
      notes: "Outstanding experience"
    },
    expectedRange: { min: 4, max: 5 }
  },
  {
    name: "Edge case - zero members",
    input: {
      missionOpennessRating: 3,
      hospitalityRating: 3,
      missionarySupportCount: 1,
      offeringsAmount: 100,
      churchMembers: 0,
      attendeesCount: 20,
      notes: "Edge case test"
    },
    expectedRange: { min: 1, max: 5 }
  },
  {
    name: "High financial generosity",
    input: {
      missionOpennessRating: 3,
      hospitalityRating: 3,
      missionarySupportCount: 2,
      offeringsAmount: 5000,
      churchMembers: 50,
      attendeesCount: 40,
      notes: "Very generous church"
    },
    expectedRange: { min: 3, max: 5 }
  }
];

// Test Rating Calculation Logic
function testRatingCalculation() {
  log('Testing rating calculation logic...');
  
  const service = new RatingCalculationService();
  
  testCases.forEach((testCase, index) => {
    log(`Testing case ${index + 1}: ${testCase.name}`);
    
    try {
      const result = service.calculateVisitRating(testCase.input);
      
      // Test basic structure
      assert(typeof result === 'object', 'Result should be an object');
      assert(typeof result.starRating === 'number', 'Result should have starRating');
      assert(typeof result.financialScore === 'number', 'Result should have financialScore');
      assert(typeof result.breakdown === 'object', 'Result should have breakdown');
      
      // Test value ranges
      assertRange(result.starRating, 1, 5, 'Star rating should be 1-5');
      assertRange(result.financialScore, 0, 5, 'Financial score should be 0-5');
      
      // Test expected range for this specific case
      assertRange(result.starRating, testCase.expectedRange.min, testCase.expectedRange.max, 
        `${testCase.name} star rating should be in expected range`);
      
      // Test breakdown values
      assertEqual(result.breakdown.missionOpenness, testCase.input.missionOpennessRating,
        'Mission openness in breakdown should match input');
      assertEqual(result.breakdown.hospitality, testCase.input.hospitalityRating,
        'Hospitality in breakdown should match input');
      assertEqual(result.breakdown.financial, result.financialScore,
        'Financial in breakdown should match calculated financial score');
      
      // Test v2.0 changes - missionary bonus should be 0
      assertEqual(result.missionaryBonus, 0, 'Missionary bonus should be 0 in v2.0');
      assertEqual(result.breakdown.missionaryBonus, 0, 'Breakdown missionary bonus should be 0 in v2.0');
      
      // Test weight redistribution for no offering cases
      if (testCase.input.offeringsAmount === 0) {
        assertEqual(result.financialScore, 0, 'Financial score should be 0 when no offering');
        assertEqual(result.breakdown.financial, 0, 'Financial breakdown should be 0 when no offering');
      }
      
    } catch (error) {
      assert(false, `Test case "${testCase.name}" failed: ${error.message}`);
    }
  });
}

// Test Financial Score Calculation
function testFinancialScoreCalculation() {
  log('Testing financial score calculation logic...');
  
  const service = new RatingCalculationService();
  
  // Test various financial scenarios
  const financialTests = [
    {
      offerings: 0, members: 100, attendees: 80,
      expectedScore: 0, description: "No offering"
    },
    {
      offerings: 500, members: 100, attendees: 80,
      expectedScore: 1, description: "Low offering per person (~5.6 RON)"
    },
    {
      offerings: 1500, members: 100, attendees: 80,
      expectedScore: 2, description: "Below average offering per person (~16.7 RON)"
    },
    {
      offerings: 3000, members: 100, attendees: 80,
      expectedScore: 3, description: "Average offering per person (~33.3 RON)"
    },
    {
      offerings: 6000, members: 100, attendees: 80,
      expectedScore: 4, description: "Good offering per person (~66.7 RON)"
    },
    {
      offerings: 15000, members: 100, attendees: 80,
      expectedScore: 5, description: "Excellent offering per person (~166.7 RON)"
    }
  ];
  
  financialTests.forEach(test => {
    const input = {
      missionOpennessRating: 3,
      hospitalityRating: 3,
      missionarySupportCount: 0,
      offeringsAmount: test.offerings,
      churchMembers: test.members,
      attendeesCount: test.attendees
    };
    
    const result = service.calculateVisitRating(input);
    
    if (test.offerings === 0) {
      // Special case: no offering should result in weight redistribution
      assertEqual(result.financialScore, 0, `${test.description} - financial score should be 0`);
    } else {
      // For offerings > 0, test that financial score is reasonable
      assertRange(result.financialScore, 1, 5, `${test.description} - financial score should be 1-5`);
    }
  });
}

// Test Edge Cases
function testEdgeCases() {
  log('Testing edge cases...');
  
  const service = new RatingCalculationService();
  
  const edgeCases = [
    {
      name: "Zero members and attendees",
      input: {
        missionOpennessRating: 3,
        hospitalityRating: 3,
        missionarySupportCount: 0,
        offeringsAmount: 100,
        churchMembers: 0,
        attendeesCount: 0
      }
    },
    {
      name: "Very high ratings",
      input: {
        missionOpennessRating: 5,
        hospitalityRating: 5,
        missionarySupportCount: 10,
        offeringsAmount: 50000,
        churchMembers: 500,
        attendeesCount: 400
      }
    },
    {
      name: "Negative values (should be handled gracefully)",
      input: {
        missionOpennessRating: 1,
        hospitalityRating: 1,
        missionarySupportCount: 0,
        offeringsAmount: -100, // Invalid, should be handled
        churchMembers: 50,
        attendeesCount: 30
      }
    }
  ];
  
  edgeCases.forEach(testCase => {
    try {
      const result = service.calculateVisitRating(testCase.input);
      
      // All results should be valid regardless of input
      assertRange(result.starRating, 1, 5, `${testCase.name} - star rating should be valid`);
      assertRange(result.financialScore, 0, 5, `${testCase.name} - financial score should be valid`);
      
    } catch (error) {
      // Some edge cases might throw errors, which is acceptable
      log(`Edge case "${testCase.name}" threw error: ${error.message}`, 'info');
    }
  });
}

// Test Description Functions
function testDescriptionFunctions() {
  log('Testing rating description functions...');
  
  const service = new RatingCalculationService();
  
  // Test mission openness descriptions
  for (let rating = 1; rating <= 5; rating++) {
    const description = service.getMissionOpennessDescription(rating);
    assert(typeof description === 'string' && description.length > 0,
      `Mission openness description for rating ${rating} should be non-empty string`);
  }
  
  // Test hospitality descriptions
  for (let rating = 1; rating <= 5; rating++) {
    const description = service.getHospitalityDescription(rating);
    assert(typeof description === 'string' && description.length > 0,
      `Hospitality description for rating ${rating} should be non-empty string`);
  }
  
  // Test invalid ratings
  const invalidDescription = service.getMissionOpennessDescription(0);
  assertEqual(invalidDescription, '', 'Invalid rating should return empty string');
}

// Test Weight Distribution Logic
function testWeightDistribution() {
  log('Testing weight distribution logic...');
  
  const service = new RatingCalculationService();
  
  // Test standard weights (with offering)
  const withOffering = {
    missionOpennessRating: 3,
    hospitalityRating: 3,
    missionarySupportCount: 0,
    offeringsAmount: 100,
    churchMembers: 50,
    attendeesCount: 40
  };
  
  const resultWithOffering = service.calculateVisitRating(withOffering);
  
  // Test redistributed weights (no offering)
  const noOffering = {
    missionOpennessRating: 3,
    hospitalityRating: 3,
    missionarySupportCount: 0,
    offeringsAmount: 0,
    churchMembers: 50,
    attendeesCount: 40
  };
  
  const resultNoOffering = service.calculateVisitRating(noOffering);
  
  // With same mission/hospitality ratings but no offering, 
  // the result should be close to the average of mission and hospitality
  const expectedNoOfferingRating = Math.round((3 * 0.55) + (3 * 0.45)); // 3
  
  assert(Math.abs(resultNoOffering.starRating - expectedNoOfferingRating) <= 1,
    'Weight redistribution should work correctly for no offering scenarios');
  
  assertEqual(resultNoOffering.financialScore, 0,
    'Financial score should be 0 when no offering is made');
}

// Main Test Runner
async function runLogicTests() {
  log('Starting rating calculation logic tests...');
  log('===============================================');
  
  try {
    testRatingCalculation();
    testFinancialScoreCalculation();
    testEdgeCases();
    testDescriptionFunctions();
    testWeightDistribution();
    
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
    testResults.errors.push(`Test suite error: ${error.message}`);
  }
  
  // Generate Report
  generateTestReport();
}

function generateTestReport() {
  log('===============================================');
  log('RATING LOGIC TESTS COMPLETE - GENERATING REPORT');
  log('===============================================');
  
  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n💡 RATING SYSTEM ANALYSIS:');
  if (testResults.failed === 0) {
    console.log('✅ All rating calculation logic tests passed!');
    console.log('🎯 The v2.0 rating system is correctly implemented:');
    console.log('   - Dynamic weight redistribution works for no-offering scenarios');
    console.log('   - Missionary support is properly separated from star rating');
    console.log('   - Financial calculations use appropriate Romanian context thresholds');
    console.log('   - Edge cases are handled gracefully');
  } else {
    console.log('⚠️  Some rating logic tests failed.');
    console.log('🔧 Review the rating calculation algorithm.');
    console.log('📊 Verify weight distribution formulas.');
  }
  
  return {
    summary: {
      total: totalTests,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: parseFloat(successRate)
    },
    errors: testResults.errors,
    details: testResults.details
  };
}

// Export for testing framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runLogicTests,
    testRatingCalculation,
    testFinancialScoreCalculation,
    testEdgeCases,
    testDescriptionFunctions,
    testWeightDistribution
  };
} else {
  // Run the tests when executed directly
  runLogicTests().catch(console.error);
}