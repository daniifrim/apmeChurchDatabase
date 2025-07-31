# APME Church Database - Migration Plan: Replit → Supabase + Vercel

## Overview
This document outlines the complete migration plan for moving the APME Church Database System from Replit to Supabase (database + auth) and Vercel (deployment).

**Status**: Phase 3 In Progress - Frontend Integration 🔄
**Last Updated**: 2025-01-31

---

## Pre-Migration Checklist
- [x] Backup current Replit database
- [x] Document current environment variables
- [x] Create new Supabase project
- [ ] Set up Vercel account
- [x] Create feature branch for migration

---

## Phase 1: Database & Supabase Setup (Day 1)

### 1.1 Create Supabase Project ✅

**Tasks**:
- [x] Create new Supabase project at https://supabase.com
- [x] Enable PostgreSQL database
- [x] Enable Authentication (email/password)
- [x] Configure project settings
- [x] Save project credentials securely

**Required Settings**:
- Project name: `apme-church-database`
- Region: Closest to target users
- Authentication providers: Email/Password only. Available on /.env
- Enable Row Level Security (RLS)

### 1.2 Database Schema Migration ✅

**Tasks**:
- [x] Export current Drizzle schema from `/shared/schema.ts`
- [x] Apply schema to Supabase via SQL or Drizzle migrations
- [x] Create indexes for performance optimization
- [x] Set up database relationships
- [x] Test basic CRUD operations

**Schema Files to Migrate**:
```
/shared/schema.ts → Supabase tables
- users (Supabase Auth integration)
- churches (core entity)
- visits (visit records)
- activities (church timeline)
- sessions (session persistence)
```

### 1.3 Row Level Security (RLS) Setup

**Policies to Implement**:
- [ ] Churches: Users can only read/update their assigned churches
- [ ] Visits: Users can only access their own visits
- [ ] Activities: Read-only for assigned churches
- [ ] Sessions: Restricted to authenticated users only

*Note: RLS policies deferred to Phase 3 - currently using application-level security*

---

## Phase 2: Backend Refactoring (Day 2)

### 2.1 Authentication Migration ✅

**Files to Modify**:
- [x] **DELETE** `/server/replitAuth.ts` - Remove Replit OpenID Connect
- [x] **CREATE** `/server/authMiddleware.ts` - New Supabase Auth middleware
- [x] **UPDATE** `/server/routes.ts` - Update auth middleware usage

**New Auth Middleware Structure**:
```typescript
// /server/authMiddleware.ts
import { createClient } from '@supabase/supabase-js'

export const authMiddleware = async (req, res, next) => {
  // Supabase auth validation
  // Extract user from JWT token
  // Attach user to request object
}
```

### 2.2 Database Connection Update ✅

**Files to Modify**:
- [x] **UPDATE** `/server/db.ts` - Replace Neon with Supabase PostgreSQL
- [x] **UPDATE** `/drizzle.config.ts` - Update database URL
- [x] **TEST** Connection pooling and performance

**Database Connection Changes**:
```typescript
// /server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString)
export const db = drizzle(client)
```

### 2.3 API Route Updates ✅
**Time Estimate**: 3 hours

**Endpoints to Test**:
- [x] GET `/api/churches` - List churches with filtering
- [x] POST `/api/churches` - Create new church
- [x] PUT `/api/churches/:id` - Update church
- [x] DELETE `/api/churches/:id` - Delete church
- [x] POST `/api/churches/:id/visits` - Add visit
- [x] GET `/api/analytics` - Dashboard data

---

## Phase 3: Frontend Updates (Day 3)

### 3.1 Install Supabase Client ✅

**Dependencies to Add**:
```bash
npm install @supabase/supabase-js ✅
npm install @supabase/auth-helpers-react (not needed - using custom context)
```

**Dependencies to Remove**:
```bash
npm remove @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal ✅
```

### 3.2 Update Authentication Flow ✅
**Time Estimate**: 3 hours

**Files to Modify**:
- [x] **CREATE** `/client/src/lib/supabase.ts` - Supabase client configuration
- [x] **CREATE** `/client/src/contexts/AuthContext.tsx` - New auth context with hybrid support
- [x] **UPDATE** `/client/src/hooks/useAuth.ts` - Legacy compatibility wrapper
- [x] **UPDATE** `/client/src/lib/queryClient.ts` - Added Supabase auth headers
- [x] **UPDATE** `/client/src/pages/LoginPage.tsx` - Updated for new auth flow
- [x] **UPDATE** `/client/src/App.tsx` - Added AuthProvider

### 3.3 Remove Replit Dependencies ✅
**Time Estimate**: 2 hours

**Files to Clean**:
- [x] **UPDATE** `/vite.config.ts` - Removed Replit plugins
- [x] **UPDATE** `/client/index.html` - Removed Replit banner script
- [x] **UPDATE** `/server/vite.ts` - Fixed Node.js compatibility issues
- [x] **CLEAN** Replit-specific environment variables and dependencies

---

## Phase 4: Deployment Configuration (Day 4)

### 4.1 Vercel Setup
**Time Estimate**: 3 hours

**Frontend Deployment**:
- [ ] Create Vercel project for frontend
- [ ] Configure build settings (Vite)
- [ ] Set environment variables
- [ ] Deploy and test

**Backend Deployment**:
- [ ] Create Vercel project for backend API
- [ ] Configure serverless functions
- [ ] Set up proper routing
- [ ] Test all API endpoints

### 4.2 Environment Variables Setup
**Time Estimate**: 1 hour

**Required Variables**:
```bash
# Supabase Configuration
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
DATABASE_URL=postgresql://[user]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Application Configuration
SESSION_SECRET=[your-session-secret]
NODE_ENV=production
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### 4.3 Build Optimization
**Time Estimate**: 2 hours

**Build Configuration**:
- [ ] Update `vite.config.ts` for production
- [ ] Configure proper routing for SPA
- [ ] Optimize bundle size
- [ ] Set up proper caching headers

---

## Testing Checklist

### Database Tests
- [x] Connection to Supabase PostgreSQL (via Supabase client)
- [x] Basic database operations work correctly
- [x] Test user created and accessible
- [ ] All CRUD operations tested end-to-end
- [ ] RLS policies are properly enforced
- [x] Indexes are optimized for queries

### Authentication Tests
- [x] User registration works
- [x] User login works (both Supabase and fallback)
- [x] Session management works correctly
- [ ] Password reset flow works

### API Tests
- [x] All endpoints return correct data
- [x] Authentication is required for protected routes
- [x] Error handling works correctly
- [ ] Rate limiting is in place

### Frontend Tests
- [x] Supabase client integration works
- [x] AuthContext provides authentication state
- [ ] Login/logout flow works end-to-end
- [ ] Church listing and filtering works
- [ ] Visit logging works correctly
- [ ] Map displays churches correctly
- [ ] Analytics dashboard loads data
- [ ] Mobile responsiveness maintained

### Integration Tests
- [ ] Full user journey works end-to-end
- [ ] Data persistence across sessions
- [ ] Real-time updates work (if implemented)
- [ ] Performance is acceptable

---

## Rollback Plan

### Emergency Rollback
If critical issues are discovered:

1. **Immediate Actions**:
   - Revert DNS to Replit deployment
   - Notify users of temporary issues
   - Document problems encountered

2. **Data Rollback**:
   - Restore database from pre-migration backup
   - Verify data integrity
   - Test all functionality

3. **Communication**:
   - Inform stakeholders of rollback
   - Schedule new migration window
   - Update migration plan based on lessons learned

### Gradual Rollback
- Keep Replit deployment active for 7 days post-migration
- Use feature flags for gradual rollout
- Monitor error rates and performance metrics
- Switch back if error rate > 2%

---

## Post-Migration Tasks

### Week 1
- [ ] Monitor error logs and performance
- [ ] Gather user feedback
- [ ] Address any critical bugs
- [ ] Optimize slow queries

### Week 2
- [ ] Implement monitoring and alerting
- [ ] Set up automated backups
- [ ] Performance optimization
- [ ] Security audit

### Week 3
- [ ] Clean up Replit deployment
- [ ] Update documentation
- [ ] Team knowledge transfer
- [ ] Celebrate successful migration! 🎉

---

## Contact Information

**Migration Lead**: [Your Name]
**Supabase Support**: https://supabase.com/support
**Vercel Support**: https://vercel.com/support
**Emergency Contact**: [Your Phone/Email]

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-07-29 | 1.0 | Initial migration plan created | Claude |
| 2025-01-31 | 1.1 | Updated with Phase 1 & 2 completion status | Claude |

---

**Next Steps**: Complete Phase 3 testing - Authentication flow and CRUD operations. Begin Phase 4 - Vercel deployment preparation.

**Current Status**: 
- ✅ Phase 1 & 2 Complete - Database and backend successfully migrated to Supabase
- 🔄 Phase 3 In Progress - Frontend integration implemented, testing required
- ✅ Database connection resolved via Supabase client
- ✅ Authentication context implemented with hybrid support
- ✅ Server running on port 3000 with functional API endpoints
---


## Current Issues and Resolutions

### Resolved Issues ✅
1. **Database Connection**: Resolved by using Supabase client instead of direct postgres-js connection
2. **Environment Variables**: Fixed .env file format issues
3. **Vite Route Interference**: Fixed middleware to not intercept API routes
4. **Replit Dependencies**: Successfully removed all Replit-specific code
5. **Frontend Auth Integration**: Implemented hybrid authentication system

### Known Issues ⚠️
1. **Drizzle ORM Connection**: postgres-js driver incompatible with Supabase pooler (workaround: use Supabase client)
2. **Node.js Version**: Using deprecated Node.js 18 (recommendation: upgrade to Node.js 20+)

### Technical Decisions Made
- **Database Access**: Using Supabase client for all database operations instead of Drizzle ORM
- **Authentication**: Hybrid system supporting both Supabase auth and legacy hardcoded credentials
- **Frontend Architecture**: Custom AuthContext instead of Supabase auth helpers for better control