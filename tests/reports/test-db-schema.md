# Database Schema Update Required

## Issue
The `visit_ratings` table is missing the `attendees_count` column which is required by the API.

## Manual SQL to Execute in Supabase Dashboard

```sql
-- Add attendees_count column to visit_ratings table
ALTER TABLE visit_ratings 
ADD COLUMN attendees_count INTEGER NOT NULL DEFAULT 1;

-- Remove default after adding the column
ALTER TABLE visit_ratings 
ALTER COLUMN attendees_count DROP DEFAULT;
```

## Verification Query
```sql
-- Check if column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'visit_ratings' 
AND column_name = 'attendees_count';
```

## Test Data Structure

The API now expects this clean structure:

```json
{
  "visitDate": "2025-08-02",
  "attendeesCount": 50,
  "notes": "Visit notes",
  "rating": {
    "missionOpennessRating": 4,
    "hospitalityRating": 3,
    "missionarySupportCount": 0,
    "offeringsAmount": 3000,
    "churchMembers": 20,
    "visitDurationMinutes": 120,
    "notes": "Rating notes"
  }
}
```

The `attendeesCount` from the visit level will be used for the rating calculation.