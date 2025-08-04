# APME Church Star Rating System - Design Document

## Overview

This document provides the technical architecture and implementation details for the APME Church Star Rating System. The system enables missionaries to evaluate church engagement using Romanian-specific criteria, transforming subjective experiences into quantifiable star ratings for organizational decision-making.

**Design Principles:**
- **Accuracy**: Precise calculation using weighted formulas
- **Scalability**: Efficient handling of large datasets
- **User Experience**: Intuitive interfaces for field missionaries
- **Data Integrity**: Robust validation and error handling
- **Performance**: Sub-200ms response times for critical operations

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   Rating Form   │  │  Rating Display  │  │  Analytics  │ │
│  │  (VisitRating)  │  │ (ChurchProfile)  │  │ Dashboard   │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│      (Monolithic Express Server - api/index.ts)             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │  Visit Routes   │  │  Rating Routes   │  │  Analytics  │ │
│  │   /api/visits   │  │ /api/ratings     │  │   Routes    │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Rating Service  │  │  Calculation     │  │  Validation │ │
│  │                 │  │  Engine          │  │   Service   │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   Visit Repo    │  │  Rating Repo     │  │  Church     │ │
│  │                 │  │                  │  │   Repo      │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │     visits      │  │  visit_ratings   │  │church_star_ │ │
│  │     table       │  │     table        │  │  ratings    │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- React Hook Form for form management
- React Query for data fetching
- Chart.js for analytics visualization

**Backend:**
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM for database operations
- PostgreSQL for data storage
- Redis for caching (future enhancement)

**Database:**
- PostgreSQL 15+
- Drizzle migrations for schema management
- Indexed columns for performance
- Foreign key constraints for data integrity

## Components and Interfaces

### Core Components

#### 1. Rating Calculation Engine
```typescript
// Core calculation service
class RatingCalculationService {
  calculateVisitRating(data: VisitRatingData): CalculatedRating {
    const weights = {
      missionOpenness: 0.35,
      hospitality: 0.25,
      financial: 0.25,
      missionaryBonus: 0.15
    };

    const financialScore = this.calculateFinancialScore(
      data.offeringsAmount,
      data.churchMembers,
      data.attendeesCount
    );

    const missionaryBonus = Math.min(data.missionarySupportCount * 0.5, 2);

    const weightedScore = 
      (data.missionOpenness * weights.missionOpenness) +
      (data.hospitality * weights.hospitality) +
      (financialScore * weights.financial) +
      (missionaryBonus * weights.missionaryBonus);

    return {
      starRating: Math.round(Math.min(Math.max(weightedScore, 1), 5)),
      financialScore,
      missionaryBonus,
      breakdown: {
        missionOpenness: data.missionOpenness,
        hospitality: data.hospitality,
        financial: financialScore,
        missionaryBonus
      }
    };
  }

  private calculateFinancialScore(
    offerings: number,
    members: number,
    attendees: number
  ): number {
    if (members === 0 || attendees === 0) return 1;
    
    const perMemberRatio = offerings / members;
    const perAttendeeRatio = offerings / attendees;
    const avgRatio = (perMemberRatio + perAttendeeRatio) / 2;

    const thresholds = { poor: 10, belowAvg: 25, avg: 50, good: 100 };
    
    if (avgRatio < thresholds.poor) return 1;
    if (avgRatio < thresholds.belowAvg) return 2;
    if (avgRatio < thresholds.avg) return 3;
    if (avgRatio < thresholds.good) return 4;
    return 5;
  }
}
```

#### 2. Data Validation Service
```typescript
class RatingValidationService {
  validateRatingData(data: RatingFormData): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate rating scales
    if (data.missionOpenness < 1 || data.missionOpenness > 5) {
      errors.push({ field: 'missionOpenness', message: 'Rating must be between 1-5' });
    }

    if (data.hospitality < 1 || data.hospitality > 5) {
      errors.push({ field: 'hospitality', message: 'Rating must be between 1-5' });
    }

    // Validate financial data
    if (data.offeringsAmount < 0) {
      errors.push({ field: 'offeringsAmount', message: 'Offerings must be positive' });
    }

    if (data.churchMembers < 1) {
      errors.push({ field: 'churchMembers', message: 'Must have at least 1 member' });
    }

    if (data.attendeesCount < 1) {
      errors.push({ field: 'attendeesCount', message: 'Must have at least 1 attendee' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

#### 3. Church Rating Aggregator
```typescript
class ChurchRatingAggregator {
  async calculateChurchAverage(churchId: number): Promise<ChurchRatingSummary> {
    const ratings = await this.ratingRepo.findByChurchId(churchId);
    
    if (ratings.length === 0) {
      return this.getEmptyRatingSummary();
    }

    const averages = {
      missionOpenness: this.average(ratings.map(r => r.missionOpenness)),
      hospitality: this.average(ratings.map(r => r.hospitality)),
      financial: this.average(ratings.map(r => r.financialScore)),
      missionarySupport: this.average(ratings.map(r => r.missionaryBonus))
    };

    const overallAverage = 
      (averages.missionOpenness * 0.35) +
      (averages.hospitality * 0.25) +
      (averages.financial * 0.25) +
      (averages.missionarySupport * 0.15);

    return {
      averageStars: Math.round(overallAverage * 10) / 10,
      totalVisits: ratings.length,
      lastVisitDate: this.getLatestVisitDate(ratings),
      ratingBreakdown: {
        missionOpenness: Math.round(averages.missionOpenness * 10) / 10,
        hospitality: Math.round(averages.hospitality * 10) / 10,
        financialGenerosity: Math.round(averages.financial * 10) / 10,
        missionarySupport: Math.round(averages.missionarySupport * 10) / 10
      },
      totalOfferings: this.sum(ratings.map(r => r.offeringsAmount)),
      averageOfferingsPerVisit: this.average(ratings.map(r => r.offeringsAmount))
    };
  }
}
```

## Data Models

### Database Schema

#### Core Tables

```sql
-- Visits table
CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  missionary_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Visit details
  visit_date DATE NOT NULL,
  attendees_count INTEGER CHECK (attendees_count > 0),
  notes TEXT,
  
  -- Status tracking
  is_rated BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_visits_church (church_id),
  INDEX idx_visits_missionary (missionary_id),
  INDEX idx_visits_date (visit_date)
);

-- Visit ratings table
CREATE TABLE visit_ratings (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  missionary_id INTEGER REFERENCES users(id),
  
  -- Core ratings (1-5 scale)
  mission_openness_rating INTEGER NOT NULL CHECK (mission_openness_rating BETWEEN 1 AND 5),
  hospitality_rating INTEGER NOT NULL CHECK (hospitality_rating BETWEEN 1 AND 5),
  
  -- Missionary support
  missionary_support_count INTEGER DEFAULT 0 CHECK (missionary_support_count >= 0),
  
  -- Financial data
  offerings_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (offerings_amount >= 0),
  
  -- Calculated fields
  financial_score DECIMAL(3,2) NOT NULL,
  missionary_bonus DECIMAL(3,2) NOT NULL,
  calculated_star_rating INTEGER NOT NULL CHECK (calculated_star_rating BETWEEN 1 AND 5),
  
  -- Additional context
  visit_duration_minutes INTEGER,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(visit_id),
  INDEX idx_ratings_visit (visit_id),
  INDEX idx_ratings_missionary (missionary_id)
);

-- Church star ratings (materialized view)
-- Note: This table is updated via a database trigger on the `visit_ratings` table to ensure data consistency.
CREATE TABLE church_star_ratings (
  id SERIAL PRIMARY KEY,
  church_id INTEGER NOT NULL UNIQUE REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Overall metrics
  average_stars DECIMAL(2,1) CHECK (average_stars BETWEEN 0 AND 5),
  total_visits INTEGER DEFAULT 0,
  visits_last_30_days INTEGER DEFAULT 0,
  visits_last_90_days INTEGER DEFAULT 0,
  
  -- Rating breakdowns
  avg_mission_openness DECIMAL(3,2),
  avg_hospitality DECIMAL(3,2),
  avg_financial_generosity DECIMAL(3,2),
  avg_missionary_support DECIMAL(3,2),
  
  -- Financial summary
  total_offerings_collected DECIMAL(12,2) DEFAULT 0.00,
  avg_offerings_per_visit DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  last_visit_date DATE,
  last_calculated TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_church_stars (church_id),
  INDEX idx_average_stars (average_stars),
  INDEX idx_last_visit (last_visit_date)
);
```

### TypeScript Interfaces

```typescript
// Core data types
interface Visit {
  id: number;
  churchId: number;
  missionaryId: number;
  visitDate: Date;
  attendeesCount: number;
  notes?: string;
  isRated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VisitRating {
  id: number;
  visitId: number;
  missionaryId: number;
  missionOpenness: number; // 1-5
  hospitality: number; // 1-5
  missionarySupportCount: number;
  offeringsAmount: number;
  financialScore: number;
  missionaryBonus: number;
  calculatedStarRating: number; // 1-5
  visitDurationMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChurchStarRating {
  id: number;
  churchId: number;
  averageStars: number; // 0-5
  totalVisits: number;
  visitsLast30Days: number;
  visitsLast90Days: number;
  ratingBreakdown: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number;
    missionarySupport: number;
  };
  totalOfferingsCollected: number;
  avgOfferingsPerVisit: number;
  lastVisitDate?: Date;
  lastCalculated: Date;
}

// API request/response types
interface CreateRatingRequest {
  missionOpenness: number;
  hospitality: number;
  missionarySupportCount: number;
  offeringsAmount: number;
  churchMembers: number;
  attendeesCount: number;
  visitDurationMinutes?: number;
  notes?: string;
}

interface CreateRatingResponse {
  calculatedStarRating: number;
  churchAverageStars: number;
  message: string;
}
```

## Error Handling

### Error Types and Handling Strategies

```typescript
// Custom error classes
class RatingValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'RatingValidationError';
  }
}

class ChurchNotFoundError extends Error {
  constructor(public churchId: number) {
    super(`Church with ID ${churchId} not found`);
    this.name = 'ChurchNotFoundError';
  }
}

class DuplicateRatingError extends Error {
  constructor(public visitId: number) {
    super(`Rating already exists for visit ${visitId}`);
    this.name = 'DuplicateRatingError';
  }
}

// Error handling middleware
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof RatingValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      field: error.field,
      message: error.message
    });
  }

  if (error instanceof ChurchNotFoundError) {
    return res.status(404).json({
      error: 'Church not found',
      churchId: error.churchId
    });
  }

  if (error instanceof DuplicateRatingError) {
    return res.status(409).json({
      error: 'Duplicate rating',
      visitId: error.visitId
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);
  return res.status(500).json({
    error: 'Internal server error'
  });
};
```

## Testing Strategy

### Test Categories

#### 1. Unit Tests
- **Rating Calculation**: Test all edge cases for star rating formula
- **Validation Service**: Test all validation rules and edge cases
- **Data Transformation**: Test data mapping and calculations

#### 2. Integration Tests
- **Database Operations**: Test CRUD operations for visits and ratings
- **API Endpoints**: Test all REST endpoints with various scenarios
- **Error Handling**: Test error responses and edge cases

#### 3. Performance Tests
- **Response Time**: Ensure <200ms for rating submissions
- **Database Performance**: Test with 10,000+ records
- **Concurrent Users**: Test system under load

### Test Examples

```typescript
// Unit test example
describe('RatingCalculationService', () => {
  it('should calculate correct star rating for perfect scores', () => {
    const service = new RatingCalculationService();
    const result = service.calculateVisitRating({
      missionOpenness: 5,
      hospitality: 5,
      missionarySupportCount: 4,
      offeringsAmount: 1000,
      churchMembers: 50,
      attendeesCount: 75
    });
    
    expect(result.starRating).toBe(5);
  });

  it('should handle edge case with zero members', () => {
    const service = new RatingCalculationService();
    const result = service.calculateVisitRating({
      missionOpenness: 3,
      hospitality: 3,
      missionarySupportCount: 0,
      offeringsAmount: 100,
      churchMembers: 0,
      attendeesCount: 50
    });
    
    expect(result.financialScore).toBe(1);
  });
});
```

## Deployment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/apme_churches

# API Configuration
API_PORT=3000
API_BASE_URL=https://api.apme-churches.com

# Security
JWT_SECRET=your-jwt-secret-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache (future enhancement)
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
```

### Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Database Migration Strategy
```bash
# Development
npm run db:generate
npm run db:migrate
npm run db:seed

# Production
npm run db:migrate:prod
npm run db:validate
```

### Monitoring and Logging
```typescript
// Structured logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Performance monitoring
const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    });
  });
  next();
};
```