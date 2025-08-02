# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript full-stack web application for managing churches and visits within the APME (Romanian Christian Communities) network. The app is built with React + Vite frontend, Express serverless backend, and PostgreSQL database via Supabase.

## Development Commands

### Core Development
- `npm run dev` - Start both API server and client in development mode (recommended)
- `npm run dev:api` - Start only the API server (port 3000)
- `npm run dev:client` - Start only the client dev server (port 5173)

### Build & Deploy
- `npm run build` - Build the client for production
- `npm run vercel-build` - Vercel-specific build command
- `npm run check` - Run TypeScript type checking

### Database
- `npm run db:push` - Push database schema changes to Supabase using Drizzle

## Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Router**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React Context for auth
- **UI**: Tailwind CSS + shadcn/ui components
- **Maps**: Mapbox GL for interactive maps
- **Mobile-first**: Bottom navigation pattern with tabbed interface

### Backend (Serverless Express)
- **Location**: `api/` directory contains serverless functions
- **Development Server**: `server/dev-serverless.ts` simulates Vercel's serverless environment
- **Route Pattern**: File-based routing (e.g., `api/churches/[id].ts`)
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: Express sessions with Supabase auth

### Database Schema (Drizzle + Supabase)
- **Schema**: `shared/schema.ts` - single source of truth for all database types
- **Main Tables**: users, churches, visits, activities, visit_ratings, church_star_ratings
- **Regional Structure**: rccp_regions → counties → churches hierarchy
- **Rating System**: Complex church rating calculation based on visit metrics

### Key Components Architecture

#### Pages Structure
- `MapView` - Interactive map with church markers and popups
- `ListView` - Filterable church list with search and regional filters  
- `VisitsView` - Visit management and rating system
- `AnalyticsView` - Dashboard with church and visit statistics

#### Data Flow
1. **API Layer**: Serverless functions in `api/` handle HTTP requests
2. **Storage Layer**: `lib/storage.ts` provides unified interface to Supabase
3. **Schema Layer**: `shared/schema.ts` defines types and validation
4. **Frontend**: React Query manages cache and API state

#### Authentication
- Context-based auth state in `AuthContext.tsx`
- User roles: administrator, mobilizer, missionary
- Session-based authentication with Supabase backend

#### Rating System
- Multi-factor church ratings: mission openness, hospitality, financial generosity
- Automated rating calculation in `lib/rating-calculation.ts`
- Aggregated church star ratings with historical tracking

## Environment Setup

Required environment variables:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## File Organization

### Key Directories
- `client/src/components/` - Reusable React components
- `client/src/pages/` - Page-level components
- `client/src/lib/` - Frontend utilities and configuration
- `api/` - Serverless API endpoints (Vercel functions)
- `shared/` - Shared types and schemas between frontend/backend
- `lib/` - Backend utilities and services
- `migrations/` - Drizzle database migrations

### Important Files
- `shared/schema.ts` - Database schema and types (central to understanding data model)
- `lib/storage.ts` - Primary database interface (1000+ lines)
- `client/src/App.tsx` - Main app router and context setup
- `server/dev-serverless.ts` - Development server simulating Vercel environment

## Common Development Patterns

### API Endpoints
- File-based routing: `api/churches/[id].ts` handles `/api/churches/:id`
- Dynamic imports in dev server for hot reloading
- Serverless function signature: `export default async function(req, res)`

### Database Operations
- Use `serverlessStorage` instance from `lib/storage.ts`
- All operations return typed results from `shared/schema.ts`
- Camel case frontend ↔ snake case database field mapping

### Frontend Data Fetching
- TanStack Query for all API calls
- Custom hooks in `client/src/hooks/`
- Optimistic updates for better UX

### Type Safety
- Strict TypeScript configuration
- Zod schemas for runtime validation
- Drizzle provides full type safety for database operations

## Testing & Quality

Run type checking before committing:
```bash
npm run check
```

The project uses strict TypeScript and requires clean builds for deployment.