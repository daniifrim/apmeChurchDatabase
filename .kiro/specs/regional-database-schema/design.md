# Design Document

## Overview

This design enhances the existing database schema to properly model the hierarchical relationship between RCCP regions, counties (judete), and churches. The solution adds two new tables and modifies the existing churches table to establish proper foreign key relationships instead of the current text-based county field.

## Architecture

The enhanced schema follows a simple hierarchical structure:
- **RCCP Regions** (11 administrative regions)
- **Counties** (41 Romanian counties, each belonging to one RCCP region)  
- **Churches** (existing table, modified to reference counties via foreign key)

## Components and Interfaces

### New Database Tables

#### RCCP Regions Table (`rccp_regions`)
```sql
CREATE TABLE rccp_regions (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Counties Table (`counties`)
```sql
CREATE TABLE counties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(2) NOT NULL UNIQUE,
  rccp_region_id INTEGER NOT NULL REFERENCES rccp_regions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Churches Table

The existing `churches` table will be updated to:
- Replace the text `county` field with `county_id` foreign key
- Add computed fields for backward compatibility during migration

```sql
-- Migration approach:
-- 1. Add county_id column
-- 2. Populate county_id based on existing county text
-- 3. Drop county text column after validation
ALTER TABLE churches 
ADD COLUMN county_id INTEGER REFERENCES counties(id);
```

## Data Models

### Drizzle Schema Updates

```typescript
// New tables
export const rccpRegions = pgTable("rccp_regions", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const counties = pgTable("counties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 2 }).notNull().unique(),
  rccpRegionId: integer("rccp_region_id").references(() => rccpRegions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Updated churches table
export const churches = pgTable("churches", {
  // ... existing fields ...
  countyId: integer("county_id").references(() => counties.id).notNull(),
  // Remove: county: varchar("county", { length: 100 }).notNull(),
});
```

### Relations

```typescript
export const rccpRegionsRelations = relations(rccpRegions, ({ many }) => ({
  counties: many(counties),
}));

export const countiesRelations = relations(counties, ({ one, many }) => ({
  rccpRegion: one(rccpRegions, {
    fields: [counties.rccpRegionId],
    references: [rccpRegions.id],
  }),
  churches: many(churches),
}));

export const churchesRelations = relations(churches, ({ one, many }) => ({
  county: one(counties, {
    fields: [churches.countyId],
    references: [counties.id],
  }),
  // ... existing relations ...
}));
```

## Error Handling

### Data Integrity
- Foreign key constraints ensure referential integrity
- Prevent deletion of counties/regions with associated churches
- Validate county-region relationships during data import

### Migration Safety
- Use transaction-based migration to ensure data consistency
- Validate all existing church records can be mapped to counties
- Provide rollback mechanism if migration fails

## Testing Strategy

### Data Migration Testing
1. **Pre-migration validation**: Verify all church county names match county data
2. **Migration testing**: Test county_id population logic with sample data
3. **Post-migration validation**: Ensure all churches have valid county references

### API Testing
1. **Query testing**: Verify joins work correctly for church-county-region queries
2. **Performance testing**: Ensure indexed queries perform well
3. **Integration testing**: Test existing API endpoints still function correctly

### Data Seeding
- Populate RCCP regions from `RCCP.csv` (11 regions)
- Populate counties from `counties.csv` (41 counties with region mappings)
- Update existing churches to reference proper county IDs

## Implementation Notes

### Migration Strategy
1. Create new tables (`rccp_regions`, `counties`)
2. Seed reference data from CSV files
3. Add `county_id` column to churches table
4. Populate `county_id` based on existing county text values
5. Add foreign key constraint
6. Remove old `county` text column

### Backward Compatibility
During migration, maintain both old and new fields temporarily to ensure API compatibility, then remove deprecated fields once migration is complete.