-- Migration: Add attendees_count column to visit_ratings table
-- Date: 2025-08-02

-- Add the attendees_count column to the visit_ratings table
ALTER TABLE visit_ratings 
ADD COLUMN attendees_count INTEGER NOT NULL DEFAULT 1;

-- Update the column to remove the default after adding it
ALTER TABLE visit_ratings 
ALTER COLUMN attendees_count DROP DEFAULT;

-- Add a comment to the column
COMMENT ON COLUMN visit_ratings.attendees_count IS 'Number of attendees present during the visit';