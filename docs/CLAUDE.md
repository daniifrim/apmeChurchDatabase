# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**APME Church Database System** - A full-stack React/TypeScript application for managing Romanian Pentecostal church data with interactive mapping, visit tracking, and engagement monitoring.

## Architecture & Structure

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: PostgreSQL (Supabase) + Drizzle ORM
- **Auth**: Supabase Auth (session-based, dev bypass available)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **State**: TanStack Query for server state management

### Key Directories
- `client/` - React frontend (Vite root)
- `server/` - Express backend
- `shared/` - Database schema shared between client/server
- `attached_assets/` - Static assets and images

### Database Schema
- **users**: Supabase Auth integration (mandatory)
- **churches**: Core entity with geolocation, engagement tracking
- **visits**: Ministry visit records
- **activities**: Church interaction logging
- **sessions**: Session persistence

## Development Commands

### Local Development
```bash
# Development server (both frontend + backend)
npm run dev

# Type checking
npm run check

# Database migrations
npm run db:push

# Production build
npm run build

# Production server
npm run start
```

### Environment Setup
Required environment variables:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Set to "development" for dev bypass

### Authentication
- **Development**: Auto-bypass with mock user (`dev-user-123`)
- **Production**: Supabase Auth session-based auth
- **Login**: Supabase Auth with email/password

### API Structure
All routes under `/api/`:
- **Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/user`
- **Churches**: Full CRUD + filtering (`/api/churches`)
- **Visits**: Church-specific (`/api/churches/:id/visits`)
- **Activities**: Church timeline (`/api/churches/:id/activities`)
- **Analytics**: Dashboard data (`/api/analytics`)

### Development Patterns

#### Frontend
- **Routing**: Wouter for client-side routing
- **Queries**: TanStack Query with custom `apiRequest` utility
- **Forms**: React Hook Form + Zod validation
- **Components**: shadcn/ui pattern with `@/` alias
- **Styling**: Tailwind CSS with custom variants

#### Backend
- **Auth Middleware**: `authMiddleware` handles dev/prod auth with Supabase
- **Validation**: Zod schemas from `@shared/schema`
- **Database**: Drizzle ORM with Supabase PostgreSQL
- **Routes**: Centralized in `server/routes.ts`

#### Database Operations
- **Storage Layer**: `server/storage.ts` provides clean interface
- **Migrations**: Drizzle Kit (`drizzle.config.ts`)
- **Relations**: Drizzle relations for joins
- **Schema**: Shared TypeScript types in `@shared/schema`

### Key Features
- **Interactive Map**: Leaflet-based church mapping
- **Engagement Tracking**: Color-coded by engagement level
- **Visit Logging**: Track ministry visits with notes
- **Role-based Access**: Admin/mobilizer/missionary roles
- **Real-time Updates**: Automatic cache invalidation
- **Mobile-Responsive**: Bottom navigation for mobile

### Build Process
1. **Development**: Vite dev server + tsx for backend
2. **Production**: Vite build + ESBuild bundle server
3. **Deployment**: Single Node.js server serves both API and static files

### Common Tasks
- **Add new church**: POST `/api/churches` with validation
- **Log visit**: POST `/api/churches/:id/visits`
- **Update engagement**: PUT `/api/churches/:id`
- **Filter churches**: GET `/api/churches?county=Cluj&engagementLevel=high`
- **View analytics**: GET `/api/analytics`

### Development Tips
- Use dev bypass in development mode (no auth needed)
- Sample churches auto-created for testing
- Check `replit.md` for detailed architecture notes
- Database schema changes require `npm run db:push`
- Supabase configuration: ensure all required env variables are set
- Use Supabase CLI for local development setup