/**
 * Test fixtures and mock data for testing
 */

export const mockChurches = [
  {
    id: 1,
    name: "Biserica Betel",
    address: "Str. Principala nr. 10, Cluj-Napoca",
    county: "Cluj",
    region: "Transilvania",
    latitude: 46.7712,
    longitude: 23.6236,
    contactPhone: "+40123456789",
    pastor: "Pastor Ion Popescu",
    denomination: "Penticostal",
    foundedYear: 1995,
    memberCount: 100,
    services: ["Duminica 10:00", "Miercuri 19:00"],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: "Biserica Elim",
    address: "Str. Libertatii nr. 5, Bucuresti",
    county: "Bucuresti",
    region: "Muntenia",
    latitude: 44.4268,
    longitude: 26.1025,
    contactPhone: "+40123456790",
    pastor: "Pastor Maria Ionescu",
    denomination: "Baptist",
    foundedYear: 1998,
    memberCount: 150,
    services: ["Duminica 10:30", "Joi 19:00"],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const mockUsers = [
  {
    id: 1,
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    role: "administrator",
    regionId: null,
    countyId: null,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    email: "mobilizer@test.com",
    firstName: "Mobilizer",
    lastName: "User",
    role: "mobilizer",
    regionId: 1,
    countyId: 1,
    createdAt: new Date('2024-01-01')
  },
  {
    id: 3,
    email: "missionary@test.com",
    firstName: "Missionary",
    lastName: "User",
    role: "missionary",
    regionId: 1,
    countyId: 1,
    createdAt: new Date('2024-01-01')
  }
];

export const mockVisits = [
  {
    id: 1,
    churchId: 1,
    missionaryId: 3,
    visitDate: new Date('2024-01-15'),
    purpose: "Initial contact",
    outcome: "Positive reception",
    followUpNeeded: true,
    followUpDate: new Date('2024-02-15'),
    notes: "Great first meeting with the pastor",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    churchId: 2,
    missionaryId: 3,
    visitDate: new Date('2024-01-20'),
    purpose: "Follow-up meeting",
    outcome: "Scheduled presentation",
    followUpNeeded: true,
    followUpDate: new Date('2024-02-20'),
    notes: "Pastor interested in APME partnership",
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];

export const mockVisitRatings = [
  {
    id: 1,
    visitId: 1,
    missionaryId: 3,
    missionOpennessRating: 4,
    hospitalityRating: 5,
    missionarySupportCount: 2,
    offeringsAmount: 500,
    churchMembers: 100,
    attendeesCount: 80,
    financialScore: 2,
    missionaryBonus: 0,
    calculatedStarRating: 4,
    visitDurationMinutes: 120,
    notes: "Excellent visit with great reception",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    visitId: 2,
    missionaryId: 3,
    missionOpennessRating: 3,
    hospitalityRating: 4,
    missionarySupportCount: 1,
    offeringsAmount: 0,
    churchMembers: 150,
    attendeesCount: 120,
    financialScore: 0,
    missionaryBonus: 0,
    calculatedStarRating: 3,
    visitDurationMinutes: 90,
    notes: "Good visit, no offering collected",
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];

export const mockChurchStarRatings = [
  {
    id: 1,
    churchId: 1,
    averageStars: 4.0,
    missionarySupportCount: 2,
    totalVisits: 1,
    visitsLast30Days: 1,
    visitsLast90Days: 1,
    avgMissionOpenness: 4.0,
    avgHospitality: 5.0,
    avgFinancialGenerosity: 2.0,
    totalOfferingsCollected: 500,
    avgOfferingsPerVisit: 500,
    lastVisitDate: new Date('2024-01-15'),
    lastCalculated: new Date('2024-01-15')
  },
  {
    id: 2,
    churchId: 2,
    averageStars: 3.0,
    missionarySupportCount: 1,
    totalVisits: 1,
    visitsLast30Days: 1,
    visitsLast90Days: 1,
    avgMissionOpenness: 3.0,
    avgHospitality: 4.0,
    avgFinancialGenerosity: 0.0,
    totalOfferingsCollected: 0,
    avgOfferingsPerVisit: 0,
    lastVisitDate: new Date('2024-01-20'),
    lastCalculated: new Date('2024-01-20')
  }
];

export const testApiResponses = {
  starRatingSuccess: {
    success: true,
    data: {
      churchId: 1,
      averageStars: 4.0,
      missionarySupportCount: 2,
      totalVisits: 1,
      visitsLast30Days: 1,
      visitsLast90Days: 1,
      ratingBreakdown: {
        missionOpenness: 4.0,
        hospitality: 5.0,
        financialGenerosity: 2.0
      },
      financialSummary: {
        totalOfferings: 500,
        averagePerVisit: 500
      },
      lastVisitDate: "2024-01-15T00:00:00.000Z"
    }
  },
  ratingHistorySuccess: {
    success: true,
    data: {
      ratings: [
        {
          id: 1,
          visitDate: "2024-01-15T00:00:00.000Z",
          missionOpennessRating: 4,
          hospitalityRating: 5,
          calculatedStarRating: 4,
          offeringsAmount: 500,
          missionarySupportCount: 2,
          notes: "Excellent visit with great reception"
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    }
  },
  errorResponse: {
    success: false,
    error: "Church not found",
    code: "CHURCH_NOT_FOUND"
  }
};

export const testRatingCalculationInputs = {
  standard: {
    missionOpennessRating: 4,
    hospitalityRating: 3,
    missionarySupportCount: 2,
    offeringsAmount: 500,
    churchMembers: 100,
    attendeesCount: 80,
    visitDurationMinutes: 120,
    notes: "Standard visit test case"
  },
  noOffering: {
    missionOpennessRating: 3,
    hospitalityRating: 4,
    missionarySupportCount: 1,
    offeringsAmount: 0,
    churchMembers: 50,
    attendeesCount: 30,
    visitDurationMinutes: 90,
    notes: "No offering test case"
  },
  minimum: {
    missionOpennessRating: 1,
    hospitalityRating: 1,
    missionarySupportCount: 0,
    offeringsAmount: 0,
    churchMembers: 10,
    attendeesCount: 5,
    notes: "Minimum values test case"
  },
  maximum: {
    missionOpennessRating: 5,
    hospitalityRating: 5,
    missionarySupportCount: 5,
    offeringsAmount: 2000,
    churchMembers: 200,
    attendeesCount: 150,
    visitDurationMinutes: 180,
    notes: "Maximum values test case"
  },
  edgeCase: {
    missionOpennessRating: 3,
    hospitalityRating: 3,
    missionarySupportCount: 1,
    offeringsAmount: 100,
    churchMembers: 0,
    attendeesCount: 20,
    notes: "Edge case with zero members"
  }
};

export const testConfiguration = {
  baseUrl: 'http://localhost:3000',
  testChurchId: 1,
  testUserId: 3,
  timeout: 5000,
  retries: 3
};

export const authHeaders = {
  mock: {
    'Authorization': 'Bearer mock-jwt-token',
    'Content-Type': 'application/json'
  },
  invalid: {
    'Authorization': 'Bearer invalid-token',
    'Content-Type': 'application/json'
  }
};