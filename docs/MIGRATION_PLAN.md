# APME Church Database - Migration Plan: Replit → Supabase + Vercel

## Overview
This document outlines the complete migration plan for moving the APME Church Database System from Replit to Supabase (database + auth) and Vercel (deployment).

**Status**: Planning Phase
**Last Updated**: 2025-07-29

---

## Pre-Migration Checklist
- [ ] Backup current Replit database
- [ ] Document current environment variables
- [ ] Create new Supabase project
- [ ] Set up Vercel account
- [ ] Create feature branch for migration

---

## Phase 1: Database & Supabase Setup (Day 1)

### 1.1 Create Supabase Project

**Tasks**:
- [ ] Create new Supabase project at https://supabase.com
- [ ] Enable PostgreSQL database
- [ ] Enable Authentication (email/password)
- [ ] Configure project settings
- [ ] Save project credentials securely

**Required Settings**:
- Project name: `apme-church-database`
- Region: Closest to target users
- Authentication providers: Email/Password only. Available on /.env
- Enable Row Level Security (RLS)

### 1.2 Database Schema Migration

**Tasks**:
- [ ] Export current Drizzle schema from `/shared/schema.ts`
- [ ] Apply schema to Supabase via SQL or Drizzle migrations
- [ ] Create indexes for performance optimization
- [ ] Set up database relationships
- [ ] Test basic CRUD operations

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

---

## Phase 2: Backend Refactoring (Day 2)

### 2.1 Authentication Migration

**Files to Modify**:
- [ ] **DELETE** `/server/replitAuth.ts` - Remove Replit OpenID Connect
- [ ] **CREATE** `/server/authMiddleware.ts` - New Supabase Auth middleware
- [ ] **UPDATE** `/server/routes.ts` - Update auth middleware usage

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

### 2.2 Database Connection Update

**Files to Modify**:
- [ ] **UPDATE** `/server/db.ts` - Replace Neon with Supabase PostgreSQL
- [ ] **UPDATE** `/drizzle.config.ts` - Update database URL
- [ ] **TEST** Connection pooling and performance

**Database Connection Changes**:
```typescript
// /server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString)
export const db = drizzle(client)
```

### 2.3 API Route Updates
**Time Estimate**: 3 hours

**Endpoints to Test**:
- [ ] GET `/api/churches` - List churches with filtering
- [ ] POST `/api/churches` - Create new church
- [ ] PUT `/api/churches/:id` - Update church
- [ ] DELETE `/api/churches/:id` - Delete church
- [ ] POST `/api/churches/:id/visits` - Add visit
- [ ] GET `/api/analytics` - Dashboard data

---

## Phase 3: Frontend Updates (Day 3)

### 3.1 Install Supabase Client

**Dependencies to Add**:
```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react
```

**Dependencies to Remove**:
```bash
npm remove @replit/repl-auth
```

### 3.2 Update Authentication Flow
**Time Estimate**: 3 hours

**Files to Modify**:
- [ ] **UPDATE** `/client/src/hooks/useAuth.ts` - Replace Replit auth with Supabase
- [ ] **UPDATE** `/client/src/lib/queryClient.ts` - Update API calls
- [ ] **UPDATE** `/client/src/components/auth/LoginForm.tsx` - New login UI
- [ ] **UPDATE** `/client/src/contexts/AuthContext.tsx` - New auth context

### 3.3 Remove Replit Dependencies
**Time Estimate**: 2 hours

**Files to Clean**:
- [ ] **UPDATE** `/vite.config.ts` - Remove Replit plugins
- [ ] **UPDATE** `/client/src/main.tsx` - Remove Replit auth provider
- [ ] **CLEAN** Any Replit-specific environment variables

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
- [ ] Connection to Supabase PostgreSQL
- [ ] All CRUD operations work correctly
- [ ] RLS policies are properly enforced
- [ ] Indexes are optimized for queries

### Authentication Tests
- [ ] User registration works
- [ ] User login works
- [ ] Session management works correctly
- [ ] Password reset flow works

### API Tests
- [ ] All endpoints return correct data
- [ ] Authentication is required for protected routes
- [ ] Error handling works correctly
- [ ] Rate limiting is in place

### Frontend Tests
- [ ] Login/logout flow works
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

---

**Next Steps**: Review and approve this plan, then begin Phase 1.