-- Add missing columns to visits table
ALTER TABLE "visits" ADD COLUMN "attendees_count" integer;
ALTER TABLE "visits" ADD COLUMN "is_rated" boolean DEFAULT false;
ALTER TABLE "visits" ADD COLUMN "updated_at" timestamp DEFAULT now();

-- Create indexes for the new columns
CREATE INDEX "idx_visits_is_rated" ON "visits" USING btree ("is_rated");