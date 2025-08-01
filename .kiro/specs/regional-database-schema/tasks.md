# Implementation Plan

- [x] 1. Create new database tables and schema definitions
  - Add `rccpRegions` and `counties` tables to Drizzle schema
  - Define proper TypeScript types and Zod validation schemas
  - Create relations between new tables and existing churches table
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 2. Create database migration for new tables using Supabase MCP
  - Use Supabase MCP to create `rccp_regions` and `counties` tables
  - Add indexes for performance optimization
  - Include proper foreign key constraints
  - _Requirements: 4.3, 4.5_

- [x] 3. Populate RCCP regions and counties data using Supabase MCP
  - Use Supabase MCP to insert RCCP regions data from RCCP.csv
  - Use Supabase MCP to insert counties data from counties.csv with region relationships
  - Validate data integrity after insertion
  - _Requirements: 1.4, 4.5_

- [x] 4. Add county_id column to churches table using Supabase MCP
  - Use Supabase MCP to add county_id column to existing churches table
  - Create mapping logic to match existing county text to county IDs
  - Validate all churches can be mapped to counties
  - _Requirements: 1.1, 1.4_

- [x] 5. Replace sample church data with real data from churches.csv
  - Clear existing sample church data from database
  - Parse churches.csv and map columns to database schema
  - Insert real church data using Supabase MCP, filling available columns
  - Leave empty fields for data not available in CSV (email, foundedYear, etc.)
  - _Requirements: 1.4_

- [x] 6. Update churches table schema and relations
  - Modify churches table definition in Drizzle schema
  - Add foreign key relationship to counties table
  - Update existing relations to include county and region joins
  - _Requirements: 1.1, 3.1_

- [x] 7. Create API endpoints for county and region management
  - Implement GET endpoints for listing counties and regions
  - Add filtering capabilities by region for counties endpoint
  - Include proper error handling and validation
  - _Requirements: 4.1, 4.2_

- [x] 8. Update existing church API endpoints
  - Modify church queries to include county and region data via joins
  - Update church creation/update endpoints to use county_id
  - Ensure backward compatibility during transition period
  - _Requirements: 1.1, 3.1, 3.4_

- [x] 9. Add filtering and search capabilities
  - Implement church filtering by county and RCCP region
  - Add search functionality for churches by county or region name
  - Update existing search endpoints to include regional context
  - _Requirements: 1.2, 3.3_

- [x] 10. Update frontend components to display regional information
  - Modify church detail views to show county and RCCP region
  - Update church list components to display regional information
  - Add filtering controls for county and region selection
  - _Requirements: 1.1, 3.1, 3.4_

- [x] 11. Validate data migration and cleanup
  - Verify all churches have valid county_id references
  - Remove old county text column from churches table
  - Run data integrity checks on all relationships
  - Test queries with new schema structure
  - _Requirements: 1.4, 4.3, 4.5_

- [x] 12. Update analytics and reporting features
  - Modify analytics queries to group by RCCP region and county
  - Update dashboard components to show regional statistics
  - Add export functionality that includes regional information
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Write comprehensive tests for new functionality
  - Create unit tests for new schema relations and queries
  - Write integration tests for API endpoints with regional data
  - Test data migration logic with sample datasets
  - Add end-to-end tests for filtering and search functionality
  - _Requirements: All requirements_