# APME Church Star Rating System - Requirements Document

## Introduction

The APME Church Star Rating System enables missionaries to evaluate church engagement and hospitality during their visits using Romanian-specific criteria. This system transforms subjective missionary experiences into quantifiable star ratings (1-5 stars) for organizational decision-making and outreach effectiveness tracking.

**Goals:**
- Provide standardized evaluation criteria for church visits
- Enable data-driven decisions for missionary outreach planning
- Track church engagement and support over time
- Generate actionable insights for APME leadership

## Requirements

### Requirement 1: Combined Visit Logging and Rating Submission
**User Story:** As a missionary, I want to log a new church visit and submit a comprehensive rating in a single step, so that I can efficiently document my experience and contribute to the church's evaluation without filling out multiple forms.

#### Acceptance Criteria
1. Missionary can fill out a single form that includes:
    - Basic visit details (date, attendees)
    - All required Romanian-specific rating criteria
    - Optional notes field
2. All required fields (date, attendees, rating criteria) are validated before submission
3. Upon successful submission, the system creates a new visit record and saves the rating together, generating a unique visit_id
4. Missionary receives a confirmation that the visit and rating have been successfully saved

### Requirement 2: Romanian-Specific Rating Criteria
**User Story:** As a missionary, I want to rate churches using criteria that reflect Romanian cultural and mission-specific values so that ratings are relevant to our local context.

#### Acceptance Criteria
1. Rating form includes "Deschidere generală pentru misiune" (1-5 scale), with the following descriptions:
    - **1 (Poor)**: Resistent la lucrarea de misiune, nu este interesat de outreach
    - **2 (Below Average)**: Interes minim, doar cooperare de bază
    - **3 (Average)**: Interes moderat, conștientizare de misiune
    - **4 (Good)**: Interes activ în lucrarea de misiune, cooperare bună
    - **5 (Excellent)**: Foarte orientat spre misiune, proactiv în evanghelizare

2. Rating form includes "Ospitalitate" (1-5 scale), with the following descriptions:
    - **1 (Poor)**: Neospitalier, necooperant, mediu ostil
    - **2 (Below Average)**: Ospitalitate minimală, doar curtoazie de bază
    - **3 (Average)**: Ospitalitate standard, îndeplinește așteptările de bază
    - **4 (Good)**: Atmosferă primitoare, cooperare bună
    - **5 (Excellent)**: Ospitalitate excepțională, depășește așteptările
3. System captures number of missionaries supported by the church
4. System records offerings amount collected during visit
5. System calculates per-member and per-attendee financial ratios
6. All rating criteria use clearly defined scales with Romanian descriptions

### Requirement 3: Star Rating Calculation
**User Story:** As a missionary, I want the system to automatically calculate a fair star rating based on my inputs so that ratings are consistent and unbiased.

#### Acceptance Criteria
1. System calculates star rating using the defined weighted formula
2. Missionary support bonus contributes 35% to the final rating (max 2 points)
3. Mission openness contributes 25% to the final rating
4. Financial generosity contributes 25% to the final rating
5. Hospitality contributes 15% to the final rating
6. Final rating is rounded to nearest whole star (1-5)
7. System displays calculated rating before final submission

---

**Theory/Explanation:**  
The weights in a composite rating system determine how much each factor influences the final score. By making "missionary support" the largest contributor (35%), the system emphasizes the importance of churches actively supporting missionaries, which aligns with your new priority. "Mission openness" and "financial generosity" are next (25% each), reflecting their significant but secondary roles. "Hospitality" is still valued but is now the smallest factor (15%). This approach ensures that the most missionally supportive churches are rated highest, while still considering other important aspects of church engagement. The sum of all weights remains 100%, which is important for a fair and interpretable scoring system.

### Requirement 4: Church Rating Aggregation
**User Story:** As an APME leader, I want to see each church's overall star rating based on all visits so that I can make informed decisions about outreach priorities.

#### Acceptance Criteria
1. System calculates average star rating across all visits for each church
2. Rating includes breakdown by individual criteria (mission openness, hospitality, etc.)
3. System tracks total number of visits per church
4. System displays last visit date for each church
5. Ratings update automatically when new visits are added
6. Historical rating data is preserved for trend analysis

### Requirement 5: Rating Display and Analytics
**User Story:** As a missionary or APME leader, I want to view church ratings and analytics so that I can understand engagement patterns and make strategic decisions.

#### Acceptance Criteria
1. Church profile displays overall star rating prominently
2. Rating breakdown shows individual category scores
3. System displays visit history with individual ratings
4. Analytics dashboard shows top-rated churches
5. Regional comparison view displays ratings on map
6. Financial summary shows total and average offerings by church

### Requirement 6: Data Validation and Error Handling
**User Story:** As a system administrator, I want robust data validation so that rating data remains accurate and consistent.

#### Acceptance Criteria
1. All rating values must be within defined ranges (1-5 for scales)
2. Financial amounts must be positive numbers
3. Church member and attendee counts must be positive integers
4. System prevents duplicate ratings for the same visit
5. Error messages are user-friendly and in Romanian where appropriate
6. System handles edge cases (zero members, missing data) gracefully

### Requirement 7: Performance and Scalability
**User Story:** As a user, I want the rating system to respond quickly even with large amounts of data so that my workflow is not interrupted.

#### Acceptance Criteria
1. Rating submission completes within 200ms
2. Church rating calculations update in real-time
3. Analytics queries return results within 1 second
4. System handles 1000+ churches and 10,000+ visits efficiently
5. Database queries are optimized with proper indexing
6. System scales to support growing missionary network

### Requirement 8: Security and Access Control
**User Story:** As an APME administrator, I want to ensure that only authorized missionaries can submit ratings so that data integrity is maintained.

#### Acceptance Criteria
1. Only authenticated missionaries can create visits and ratings
2. Missionaries can only rate visits they personally conducted
3. Church ratings are publicly viewable within the organization
4. Personal notes in ratings remain private to the creating missionary
5. System prevents rating manipulation or deletion by unauthorized users
6. Audit trail tracks all rating changes with timestamps

### Requirement 9: Mobile Responsiveness
**User Story:** As a missionary working in the field, I want to submit ratings from my mobile device so that I can document visits immediately.

#### Acceptance Criteria
1. Rating form is fully functional on mobile devices
2. Touch-friendly interface for star ratings and number inputs
3. Form layout adapts to different screen sizes
4. Offline capability to save ratings when connection is unavailable
5. Data synchronization when connection is restored
6. Mobile-optimized display of church ratings and analytics

### Requirement 10: Future Extensibility
**User Story:** As an APME leader, I want the system to support future enhancements so that we can adapt to changing mission needs.

#### Acceptance Criteria
1. Database schema supports adding new rating criteria
2. API endpoints are versioned for backward compatibility
3. Rating formula can be adjusted without major system changes
4. System supports additional financial metrics (faith promises)
5. Export functionality for data analysis in external tools
6. Integration points for future third-party systems