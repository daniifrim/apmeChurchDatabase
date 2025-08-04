-- Migration: Add rating system tables (visit_ratings and church_star_ratings)
-- Date: 2025-08-04
-- Version: 2.0

-- Add RCCP regions table
CREATE TABLE "rccp_regions" (
    "id" integer PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Add counties table
CREATE TABLE "counties" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "abbreviation" varchar(2) NOT NULL UNIQUE,
    "rccp_region_id" integer NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Add county_id to churches table
ALTER TABLE "churches" ADD COLUMN "county_id" integer;

-- Add visit_ratings table
CREATE TABLE "visit_ratings" (
    "id" serial PRIMARY KEY NOT NULL,
    "visit_id" integer NOT NULL UNIQUE,
    "missionary_id" varchar,
    
    -- Core ratings (1-5 scale)
    "mission_openness_rating" integer NOT NULL,
    "hospitality_rating" integer NOT NULL,
    
    -- Missionary support
    "missionary_support_count" integer DEFAULT 0 NOT NULL,
    
    -- Financial data
    "offerings_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "church_members" integer NOT NULL,
    "attendees_count" integer NOT NULL,
    
    -- Calculated fields
    "financial_score" numeric(3, 2) NOT NULL,
    "missionary_bonus" numeric(3, 2) NOT NULL,
    "calculated_star_rating" integer NOT NULL,
    
    -- Additional context
    "visit_duration_minutes" integer,
    "notes" text,
    
    -- Metadata
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Add church_star_ratings table (Version 2.0)
CREATE TABLE "church_star_ratings" (
    "id" serial PRIMARY KEY NOT NULL,
    "church_id" integer NOT NULL UNIQUE,
    
    -- Overall Star Rating (Average of all visit ratings)
    "average_stars" numeric(2, 1),
    
    -- Church-Level Attribute (Displayed as a separate badge)
    "missionary_support_count" integer DEFAULT 0 NOT NULL,
    
    -- Visit Statistics
    "total_visits" integer DEFAULT 0 NOT NULL,
    "visits_last_30_days" integer DEFAULT 0 NOT NULL,
    "visits_last_90_days" integer DEFAULT 0 NOT NULL,
    
    -- Rating Breakdown (Reflects the visit experience)
    "avg_mission_openness" numeric(3, 2),
    "avg_hospitality" numeric(3, 2),
    "avg_financial_generosity" numeric(3, 2),
    
    -- Financial summary
    "total_offerings_collected" numeric(12, 2) DEFAULT 0.00 NOT NULL,
    "avg_offerings_per_visit" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    
    -- Metadata
    "last_visit_date" timestamp,
    "last_calculated" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "counties" ADD CONSTRAINT "counties_rccp_region_id_rccp_regions_id_fk" 
    FOREIGN KEY ("rccp_region_id") REFERENCES "public"."rccp_regions"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "churches" ADD CONSTRAINT "churches_county_id_counties_id_fk" 
    FOREIGN KEY ("county_id") REFERENCES "public"."counties"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_visit_id_visits_id_fk" 
    FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_missionary_id_users_id_fk" 
    FOREIGN KEY ("missionary_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "church_star_ratings" ADD CONSTRAINT "church_star_ratings_church_id_churches_id_fk" 
    FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;

-- Add performance indexes
CREATE INDEX "idx_ratings_visit" ON "visit_ratings" USING btree ("visit_id");
CREATE INDEX "idx_ratings_missionary" ON "visit_ratings" USING btree ("missionary_id");
CREATE INDEX "idx_church_stars" ON "church_star_ratings" USING btree ("church_id");
CREATE INDEX "idx_average_stars" ON "church_star_ratings" USING btree ("average_stars");
CREATE INDEX "idx_last_visit" ON "church_star_ratings" USING btree ("last_visit_date");

-- Add constraints for rating values
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_mission_openness_rating_check" 
    CHECK ("mission_openness_rating" >= 1 AND "mission_openness_rating" <= 5);

ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_hospitality_rating_check" 
    CHECK ("hospitality_rating" >= 1 AND "hospitality_rating" <= 5);

ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_calculated_star_rating_check" 
    CHECK ("calculated_star_rating" >= 1 AND "calculated_star_rating" <= 5);

ALTER TABLE "church_star_ratings" ADD CONSTRAINT "church_star_ratings_average_stars_check" 
    CHECK ("average_stars" >= 0 AND "average_stars" <= 5);

-- Create function to calculate church star rating
CREATE OR REPLACE FUNCTION calculate_church_star_rating(church_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    rating_data RECORD;
    avg_stars NUMERIC(2,1);
    total_visits_count INTEGER;
    total_offerings NUMERIC(12,2);
    avg_offerings NUMERIC(10,2);
    last_visit TIMESTAMP;
    visits_30_days INTEGER;
    visits_90_days INTEGER;
    missionary_support INTEGER;
    avg_mission_openness NUMERIC(3,2);
    avg_hospitality NUMERIC(3,2);
    avg_financial NUMERIC(3,2);
BEGIN
    -- Calculate aggregated statistics
    SELECT 
        AVG(vr.calculated_star_rating)::NUMERIC(2,1) as average_stars,
        COUNT(*) as total_visits,
        SUM(vr.offerings_amount)::NUMERIC(12,2) as total_offerings,
        AVG(vr.offerings_amount)::NUMERIC(10,2) as avg_offerings_per_visit,
        MAX(v.visit_date) as last_visit_date,
        AVG(vr.mission_openness_rating)::NUMERIC(3,2) as avg_mission_openness,
        AVG(vr.hospitality_rating)::NUMERIC(3,2) as avg_hospitality,
        AVG(vr.financial_score)::NUMERIC(3,2) as avg_financial_generosity,
        -- Get the most recent missionary support count
        (SELECT vr2.missionary_support_count 
         FROM visit_ratings vr2 
         JOIN visits v2 ON vr2.visit_id = v2.id 
         WHERE v2.church_id = church_id_param 
         ORDER BY v2.visit_date DESC 
         LIMIT 1) as missionary_support_count
    INTO avg_stars, total_visits_count, total_offerings, avg_offerings, last_visit,
         avg_mission_openness, avg_hospitality, avg_financial, missionary_support
    FROM visit_ratings vr
    JOIN visits v ON vr.visit_id = v.id
    WHERE v.church_id = church_id_param;

    -- Calculate visits in last 30 days
    SELECT COUNT(*)
    INTO visits_30_days
    FROM visits v
    JOIN visit_ratings vr ON vr.visit_id = v.id
    WHERE v.church_id = church_id_param 
    AND v.visit_date >= NOW() - INTERVAL '30 days';

    -- Calculate visits in last 90 days
    SELECT COUNT(*)
    INTO visits_90_days
    FROM visits v
    JOIN visit_ratings vr ON vr.visit_id = v.id
    WHERE v.church_id = church_id_param 
    AND v.visit_date >= NOW() - INTERVAL '90 days';

    -- Upsert church star rating
    INSERT INTO church_star_ratings (
        church_id, average_stars, missionary_support_count, total_visits,
        visits_last_30_days, visits_last_90_days, avg_mission_openness,
        avg_hospitality, avg_financial_generosity, total_offerings_collected,
        avg_offerings_per_visit, last_visit_date, last_calculated
    ) VALUES (
        church_id_param, avg_stars, COALESCE(missionary_support, 0), COALESCE(total_visits_count, 0),
        visits_30_days, visits_90_days, avg_mission_openness,
        avg_hospitality, avg_financial, COALESCE(total_offerings, 0),
        COALESCE(avg_offerings, 0), last_visit, NOW()
    )
    ON CONFLICT (church_id) DO UPDATE SET
        average_stars = EXCLUDED.average_stars,
        missionary_support_count = EXCLUDED.missionary_support_count,
        total_visits = EXCLUDED.total_visits,
        visits_last_30_days = EXCLUDED.visits_last_30_days,
        visits_last_90_days = EXCLUDED.visits_last_90_days,
        avg_mission_openness = EXCLUDED.avg_mission_openness,
        avg_hospitality = EXCLUDED.avg_hospitality,
        avg_financial_generosity = EXCLUDED.avg_financial_generosity,
        total_offerings_collected = EXCLUDED.total_offerings_collected,
        avg_offerings_per_visit = EXCLUDED.avg_offerings_per_visit,
        last_visit_date = EXCLUDED.last_visit_date,
        last_calculated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update church ratings when visit ratings change
CREATE OR REPLACE FUNCTION trigger_calculate_church_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the church_id from the visit
    DECLARE
        target_church_id INTEGER;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            SELECT v.church_id INTO target_church_id
            FROM visits v
            WHERE v.id = OLD.visit_id;
        ELSE
            SELECT v.church_id INTO target_church_id
            FROM visits v
            WHERE v.id = NEW.visit_id;
        END IF;
        
        -- Recalculate the church rating
        PERFORM calculate_church_star_rating(target_church_id);
        
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on visit_ratings table
DROP TRIGGER IF EXISTS update_church_rating_on_visit_rating_change ON visit_ratings;
CREATE TRIGGER update_church_rating_on_visit_rating_change
    AFTER INSERT OR UPDATE OR DELETE ON visit_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_church_rating();

-- Add comments
COMMENT ON TABLE visit_ratings IS 'Individual visit ratings (Version 2.0)';
COMMENT ON TABLE church_star_ratings IS 'Aggregated church ratings (Version 2.0)';
COMMENT ON FUNCTION calculate_church_star_rating IS 'Recalculates aggregated church rating statistics';