# APME Church Star Rating System - Design Document

## Overview
This document outlines the comprehensive design for the APME Church Star Rating System, which allows missionaries to evaluate church engagement and hospitality during their visits using Romanian-specific criteria.

**Purpose**: Transform subjective missionary experiences into quantifiable star ratings (1-5 stars) for organizational decision-making and outreach effectiveness tracking.

---

## 1. User Flow & Rating Process

### Visit Rating Flow
1. **Missionary visits a church** and logs the visit in the system
2. **System prompts for rating form** after visit is logged
3. **Missionary fills out Romanian rating criteria** with specific values
4. **System calculates star rating** (1-5 stars) using the rating formula
5. **Rating is stored** and contributes to church's average score
6. **Future visitors see aggregated star rating** based on all previous visits

### Rating Criteria (Romanian Context)
Based on APME's specific needs, the rating system evaluates:

#### Primary Rating Categories (1-5 scale each)
1. **Deschidere generală pentru misiune** (General openness to mission)
2. **Ospitalitate** (Hospitality)
3. **Sustine vreun misionar adoptat** (Supports adopted missionary)
   - Number of missionaries supported
4. **Colecta** (Offerings)
   - Amount collected
   - Per member ratio
   - Per attendee ratio
5. **Promisiuni prin credință** (Faith promises) - Future feature

---

## 2. Star Rating Formula

### Individual Visit Score Calculation
```typescript
interface VisitRatingData {
  mission_openness: number;        // 1-5 (Deschidere generală)
  hospitality: number;             // 1-5 (Ospitalitate)
  missionary_support_count: number; // Number of missionaries supported
  offerings_amount: number;        // Amount collected
  church_members: number;          // Total church members
  attendees_count: number;         // Number of attendees at visit
  notes?: string;
}

function calculateVisitStarRating(data: VisitRatingData): number {
  // Base scores from direct ratings
  const missionScore = data.mission_openness;
  const hospitalityScore = data.hospitality;
  
  // Missionary support bonus (0.5 points per missionary, max 2 points)
  const missionaryBonus = Math.min(data.missionary_support_count * 0.5, 2);
  
  // Financial contribution score (based on per-person ratio)
  const perMemberRatio = data.church_members > 0 ? 
    data.offerings_amount / data.church_members : 0;
  const perAttendeeRatio = data.attendees_count > 0 ? 
    data.offerings_amount / data.attendees_count : 0;
  
  // Financial score (1-5 scale based on generosity)
  const financialScore = calculateFinancialScore(perMemberRatio, perAttendeeRatio);
  
  // Weighted calculation for final star rating
  const weightedScore = (
    missionScore * 0.35 +      // 35% weight - most important
    hospitalityScore * 0.25 +   // 25% weight
    financialScore * 0.25 +     // 25% weight
    missionaryBonus * 0.15      // 15% weight (bonus)
  );
  
  // Convert to 1-5 star rating
  return Math.round(Math.min(Math.max(weightedScore, 1), 5));
}

function calculateFinancialScore(perMemberRatio: number, perAttendeeRatio: number): number {
  // Define generosity thresholds (in currency units)
  const thresholds = {
    poor: 10,      // Below 10 units per person
    below_avg: 25, // 10-25 units per person
    average: 50,   // 25-50 units per person
    good: 100,     // 50-100 units per person
    excellent: 100  // Above 100 units per person
  };
  
  const avgRatio = (perMemberRatio + perAttendeeRatio) / 2;
  
  if (avgRatio < thresholds.poor) return 1;
  if (avgRatio < thresholds.below_avg) return 2;
  if (avgRatio < thresholds.average) return 3;
  if (avgRatio < thresholds.good) return 4;
  return 5;
}
```

### Church Average Star Rating
```typescript
function calculateChurchAverageRating(visitRatings: VisitRating[]): ChurchStarRating {
  if (visitRatings.length === 0) {
    return {
      average_stars: 0,
      total_visits: 0,
      last_visit_date: null,
      rating_breakdown: {
        mission_openness: 0,
        hospitality: 0,
        financial_generosity: 0,
        missionary_support: 0
      }
    };
  }
  
  // Calculate averages for each category
  const missionAvg = average(visitRatings.map(r => r.mission_openness));
  const hospitalityAvg = average(visitRatings.map(r => r.hospitality));
  const financialAvg = average(visitRatings.map(r => r.financial_score));
  const missionarySupportAvg = average(visitRatings.map(r => r.missionary_bonus));
  
  // Calculate overall average star rating
  const overallAvg = (
    missionAvg * 0.35 +
    hospitalityAvg * 0.25 +
    financialAvg * 0.25 +
    missionarySupportAvg * 0.15
  );
  
  return {
    average_stars: Math.round(overallAvg * 10) / 10, // Round to 1 decimal
    total_visits: visitRatings.length,
    last_visit_date: getLatestVisitDate(visitRatings),
    rating_breakdown: {
      mission_openness: Math.round(missionAvg * 10) / 10,
      hospitality: Math.round(hospitalityAvg * 10) / 10,
      financial_generosity: Math.round(financialAvg * 10) / 10,
      missionary_support: Math.round(missionarySupportAvg * 10) / 10
    }
  };
}
```

---

## 3. Data Model Design

### Core Tables

#### `visit_ratings` Table
```sql
CREATE TABLE visit_ratings (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
  missionary_id INTEGER REFERENCES users(id),
  
  -- Romanian Rating Criteria (1-5 scale)
  mission_openness_rating INTEGER CHECK (mission_openness_rating >= 1 AND mission_openness_rating <= 5),
  hospitality_rating INTEGER CHECK (hospitality_rating >= 1 AND hospitality_rating <= 5),
  
  -- Missionary Support
  missionary_support_count INTEGER DEFAULT 0,
  
  -- Financial Data
  offerings_amount DECIMAL(10,2) DEFAULT 0.00,
  church_members_count INTEGER,
  attendees_count INTEGER,
  
  -- Calculated Scores
  financial_score DECIMAL(3,2),
  missionary_bonus DECIMAL(3,2),
  calculated_star_rating INTEGER CHECK (calculated_star_rating >= 1 AND calculated_star_rating <= 5),
  
  -- Additional Context
  visit_date DATE,
  visit_duration_minutes INTEGER,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_ratings CHECK (
    mission_openness_rating IS NOT NULL AND
    hospitality_rating IS NOT NULL
  )
);
```

#### `church_star_ratings` Table (Aggregated Data)
```sql
CREATE TABLE church_star_ratings (
  id SERIAL PRIMARY KEY,
  church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Overall Star Rating
  average_stars DECIMAL(2,1) CHECK (average_stars >= 0 AND average_stars <= 5),
  
  -- Visit Statistics
  total_visits INTEGER DEFAULT 0,
  visits_last_30_days INTEGER DEFAULT 0,
  visits_last_90_days INTEGER DEFAULT 0,
  
  -- Rating Breakdown
  avg_mission_openness DECIMAL(3,2),
  avg_hospitality DECIMAL(3,2),
  avg_financial_generosity DECIMAL(3,2),
  avg_missionary_support DECIMAL(3,2),
  
  -- Financial Totals
  total_offerings_collected DECIMAL(12,2) DEFAULT 0.00,
  avg_offerings_per_visit DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  last_visit_date DATE,
  last_calculated TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_church_star_rating (church_id),
  INDEX idx_average_stars (average_stars)
);
```

---

## 4. Rating Scale Definitions

### Deschidere generală pentru misiune (1-5)
- **1 (Poor)**: Resistent la lucrarea de misiune, nu este interesat de outreach
- **2 (Below Average)**: Interes minim, doar cooperare de bază
- **3 (Average)**: Interes moderat, conștientizare de misiune
- **4 (Good)**: Interes activ în lucrarea de misiune, cooperare bună
- **5 (Excellent)**: Foarte orientat spre misiune, proactiv în evanghelizare

### Ospitalitate (1-5)
- **1 (Poor)**: Neospitalier, necooperant, mediu ostil
- **2 (Below Average)**: Ospitalitate minimală, doar curtoazie de bază
- **3 (Average)**: Ospitalitate standard, îndeplinește așteptările de bază
- **4 (Good)**: Atmosferă primitoare, cooperare bună
- **5 (Excellent)**: Ospitalitate excepțională, depășește așteptările

### Financial Generosity Scoring
Based on per-member and per-attendee offering ratios:
- **1 Star**: < 10 units per person
- **2 Stars**: 10-25 units per person
- **3 Stars**: 25-50 units per person
- **4 Stars**: 50-100 units per person
- **5 Stars**: > 100 units per person

### Missionary Support Bonus
- **0.5 points** per missionary supported (up to 4 missionaries = 2 points max)
- This provides incentive for churches to support multiple missionaries

---

## 5. User Interface Design

### Rating Form Component (`VisitRatingForm.tsx`)

#### Form Structure
```typescript
interface RatingFormData {
  mission_openness: number;
  hospitality: number;
  missionary_support_count: number;
  offerings_amount: number;
  church_members: number;
  attendees_count: number;
  visit_duration_minutes?: number;
  notes?: string;
}
```

#### UI Elements
- **Star Rating System**: 5-star rating for mission openness and hospitality
- **Number Inputs**: For missionary support count, offerings, members, attendees
- **Real-time Calculation**: Show calculated star rating as user fills form
- **Validation**: Ensure all required fields are completed
- **Submit Button**: With loading state and confirmation

### Church Star Rating Display (`ChurchStarRating.tsx`)

#### Display Elements
- **Overall Star Rating**: Large star display (e.g., ⭐⭐⭐⭐☆ 4.2)
- **Rating Breakdown**: Individual category scores
- **Visit History**: Timeline of recent visits with ratings
- **Financial Summary**: Total and average offerings
- **Missionary Support**: Number of missionaries supported

### Rating Analytics Dashboard (`RatingAnalytics.tsx`)

#### Dashboard Sections
- **Top Rated Churches**: Churches with highest star ratings
- **Regional Comparison**: Map view with star ratings
- **Rating Trends**: Charts showing rating changes over time
- **Financial Reports**: Offering collection summaries by region

---

## 6. API Endpoints Design

### Rating Management Endpoints

#### `POST /api/churches/[id]/visits/[visitId]/ratings`
**Purpose**: Create a new rating for a visit
```typescript
interface CreateRatingRequest {
  mission_openness: number;
  hospitality: number;
  missionary_support_count: number;
  offerings_amount: number;
  church_members: number;
  attendees_count: number;
  visit_duration_minutes?: number;
  notes?: string;
}

interface CreateRatingResponse {
  calculated_star_rating: number;
  church_average_stars: number;
  message: string;
}
```

#### `GET /api/churches/[id]/star-rating`
**Purpose**: Get church's current star rating and breakdown
```typescript
interface ChurchStarRatingResponse {
  average_stars: number;
  total_visits: number;
  last_visit_date: string;
  rating_breakdown: {
    mission_openness: number;
    hospitality: number;
    financial_generosity: number;
    missionary_support: number;
  };
  recent_visits: VisitRating[];
}
```

---

## 7. Implementation Phases

### Phase 1: Core Rating System (Week 1-2)
- [ ] Database schema creation
- [ ] Rating calculation formula implementation
- [ ] Basic rating form component
- [ ] API endpoints for rating submission
- [ ] Star rating display component

### Phase 2: Analytics & Aggregation (Week 3-4)
- [ ] Church average calculation
- [ ] Rating breakdown analytics
- [ ] Financial reporting
- [ ] Regional comparison features

### Phase 3: Advanced Features (Week 5-6)
- [ ] Rating trends and history
- [ ] Export functionality
- [ ] Performance optimization
- [ ] Mobile responsiveness

---

## 8. Success Metrics

### Technical Metrics
- **Rating Accuracy**: 100% calculation validation
- **Response Time**: < 200ms for rating submissions
- **Data Consistency**: No orphaned ratings

### Business Metrics
- **Rating Coverage**: 90% of visits have ratings
- **User Adoption**: 80% of missionaries using rating system
- **Rating Distribution**: Balanced spread across 1-5 stars
- **Financial Tracking**: 100% of offerings recorded

---

*This document serves as the foundation for implementing the APME Church Star Rating System. The formula ensures fair and consistent evaluation of church engagement and mission support.*

**Last Updated**: 2025-01-31  
**Next Review**: 2025-02-07