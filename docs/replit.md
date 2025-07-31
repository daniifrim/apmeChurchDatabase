# APME Church Database System

## Overview

This is a full-stack web application designed for APME (Romanian Pentecostal churches) to manage and track church data across Romania. The system provides an interactive map-based interface for church management, visit tracking, and engagement monitoring with role-based access control.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite with custom configuration
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with centralized route handling
- **Session Management**: Express sessions with PostgreSQL storage
- **Build Process**: ESBuild for production bundling

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema pushing
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication & Authorization
- **Authentication Provider**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-Based Access**: Three user roles (administrator, mobilizer, missionary)
- **Session Security**: HTTP-only cookies with CSRF protection

### Database Schema
- **Users Table**: Mandatory for Replit Auth integration
- **Churches Table**: Core entity with geolocation, engagement levels, and metadata
- **Visits Table**: Track ministry visits to churches
- **Activities Table**: Log various church interactions and events
- **Sessions Table**: Required for session persistence

### Interactive Mapping
- **Map Library**: Leaflet for interactive church mapping
- **Geolocation**: Latitude/longitude coordinates for precise positioning
- **Visual Indicators**: Color-coded markers based on engagement levels
- **Search & Filters**: Real-time filtering by location, engagement, and text search

### UI/UX Architecture
- **Design System**: Custom theme with APME brand colors
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Component Library**: Comprehensive shadcn/ui implementation
- **Form Handling**: React Hook Form with Zod validation

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit Auth → Session created in PostgreSQL → User data stored/retrieved
2. **Church Management**: CRUD operations flow through Express routes → Drizzle ORM → PostgreSQL
3. **Real-time Updates**: TanStack Query manages cache invalidation and optimistic updates
4. **Map Interaction**: Client-side filtering → API queries → Database lookups → Map marker updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **leaflet**: Interactive mapping functionality
- **wouter**: Lightweight React routing

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **react-hook-form**: Performant form handling

### Authentication Dependencies
- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **tsx**: TypeScript execution for development
- **vite**: Frontend build tool and dev server
- **esbuild**: Fast bundling for production

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR for frontend
- **Backend**: tsx for TypeScript execution with nodemon-like behavior
- **Database**: Neon serverless PostgreSQL with local development support

### Production Build
- **Frontend**: Vite build → static assets in dist/public
- **Backend**: ESBuild bundle → single dist/index.js file
- **Database**: Drizzle Kit migrations for schema deployment
- **Deployment**: Node.js server serving both API and static files

### Environment Configuration
- **DATABASE_URL**: Required PostgreSQL connection string
- **SESSION_SECRET**: Required for session security
- **REPL_ID**: Required for Replit Auth integration
- **ISSUER_URL**: OpenID Connect issuer endpoint

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
- July 05, 2025. Updated authentication flow to bypass landing page and use simple email/password login (office@apme.ro / admin 1234)
- July 05, 2025. Implemented session-based authentication for production deployment
- July 05, 2025. Fixed church popup z-index stacking and positioning issues
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```