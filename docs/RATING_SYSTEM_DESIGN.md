# APME Church Star Rating System - Design Document (Version 2.0)

## Overview
This document outlines the comprehensive design for the **Version 2.0** of the APME Church Star Rating System. This new model is designed to be more flexible, accurate, and context-aware.

**Core Principles**:
1.  **Separation of Concerns**: The system now distinguishes between a **Visit-Specific Rating** (the star rating) and a **Church-Level Attribute** (missionary support).
2.  **Dynamic Weighting**: The formula adapts to the context of a visit, ensuring that visits without a financial contribution are rated fairly.

---

## 1. Rating Components

The new system is built on two distinct types of metrics:

#### A. Visit-Specific Ratings (Contributes to the Star Rating)
These metrics are evaluated for each individual visit and are averaged together to create the church's overall star rating.
1.  **Deschidere pentru misiune** (Openness to Mission) - (1-5 scale)
2.  **Ospitalitate** (Hospitality) - (1-5 scale)
3.  **Generozitate Financiară** (Financial Generosity) - (1-5 scale, *only applicable if a "colectă" is made*)

#### B. Church-Level Attributes (Displayed as a Separate "Badge")
This metric reflects a church's long-term commitment and is not part of the visit-by-visit star rating.
1.  **Susținere Misionari** (Missionary Support) - A count of missionaries the church supports long-term.

---

## 2. Star Rating Formula

### Individual Visit Score Calculation (The Core Logic)
The formula now uses **dynamic weighting**. If no offering is collected, the financial component's weight is redistributed to the other components.

```typescript
interface VisitRatingData {
  missionOpennessRating: number;    // 1-5
  hospitalityRating: number;         // 1-5
  offeringsAmount?: number;        // The amount from a "colectă"
  churchMembers: number;
  attendeesCount: number;
}

function calculateVisitStarRating(data: VisitRatingData): number {
  const baseWeights = {
    missionOpenness: 0.40,
    hospitality: 0.30,
    financial: 0.30,
  };

  let financialScore = 0;
  let finalWeights = { ...baseWeights };

  const isFinancialApplicable = data.offeringsAmount && data.offeringsAmount > 0;

  if (isFinancialApplicable) {
    // Calculate financial score only if an offering was made
    financialScore = calculateFinancialScore(data.offeringsAmount, data.churchMembers, data.attendeesCount);
  } else {
    // Dynamically redistribute the financial weight if no offering was made
    const financialWeight = finalWeights.financial;
    finalWeights.financial = 0; // Remove financial weight
    // Distribute the unused weight proportionally
    finalWeights.missionOpenness += financialWeight / 2;
    finalWeights.hospitality += financialWeight / 2;
  }

  const weightedScore = 
    (data.missionOpennessRating * finalWeights.missionOpenness) +
    (data.hospitalityRating * finalWeights.hospitality) +
    (financialScore * finalWeights.financial);

  // Convert to a final 1-5 star rating
  return Math.round(Math.min(Math.max(weightedScore, 1), 5));
}

function calculateFinancialScore(offerings: number, members: number, attendees: number): number {
  // This function remains the same, defining generosity thresholds
  // It returns a score from 1 to 5 based on the offering-to-person ratio.
  // ... (implementation from lib/rating-calculation.ts)
}
```

### Church Average Star Rating
The church's main star rating is the simple mathematical **average of the `calculated_star_rating` from all its individual visits**.

### Missionary Support Badge
This is a direct display of the `missionary_support_count` from the latest visit record. It is **not** part of the star rating calculation but is displayed alongside it to provide a complete picture of the church's mission involvement.

---

## 3. Data Model Design

The core tables remain largely the same, with a key change in the aggregated data table.

#### `church_star_ratings` Table (Aggregated Data)
The `avg_missionary_support` field is removed from the rating breakdown, as it's now a separate top-level metric.

```sql
CREATE TABLE church_star_ratings (
  id SERIAL PRIMARY KEY,
  church_id INTEGER REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Overall Star Rating (Average of all visit ratings)
  average_stars DECIMAL(2,1),
  
  -- Church-Level Attribute
  missionary_support_count INTEGER DEFAULT 0, -- Displayed as a separate badge

  -- Visit Statistics
  total_visits INTEGER DEFAULT 0,
  
  -- Rating Breakdown (Reflects the visit experience)
  avg_mission_openness DECIMAL(3,2),
  avg_hospitality DECIMAL(3,2),
  avg_financial_generosity DECIMAL(3,2), -- Note: This average is only over visits where an offering was made.
  
  -- Metadata
  last_visit_date DATE,
  last_calculated TIMESTAMP DEFAULT NOW(),
  
  -- ... other fields
);
```

---

## 4. Rating Scale Definitions

The definitions for Hospitality and Mission Openness remain the same. The financial metrics are now clarified:

*   **Punctual Generosity (Colectă):** Rated on a 1-5 scale based on the offering-per-person ratio during a single visit. This score influences the visit's star rating.
*   **Strategic Commitment (Missionary Support):** A simple count of supported missionaries. This is a separate indicator of the church's long-term mission strategy.

---

## 5. User Interface Design

### Church Star Rating Display (`ChurchStarRating.tsx`)
The UI will be updated to show the two distinct components:

*   **Overall Star Rating**: Large star display (e.g., ⭐⭐⭐⭐☆ 4.2).
*   **Missionary Support Badge**: A clear, separate indicator (e.g., "Sustains 3 Missionaries").
*   **Rating Breakdown**: Shows the average scores for Hospitality, Mission Openness, and Financial Generosity.

---

## 6. API Endpoints Design

### `GET /api/churches/[id]/star-rating`
The response will be updated to reflect the new data structure.

```typescript
interface ChurchStarRatingResponse {
  average_stars: number;
  missionary_support_count: number; // The separate metric
  total_visits: number;
  last_visit_date: string;
  rating_breakdown: {
    mission_openness: number;
    hospitality: number;
    financial_generosity: number; // This is now the only financial metric in the breakdown
  };
  recent_visits: VisitRating[];
}
```

---

*This document serves as the foundation for implementing the new, more flexible APME Church Star Rating System.*

**Last Updated**: 2025-08-02
