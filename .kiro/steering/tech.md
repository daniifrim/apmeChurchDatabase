# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with custom components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Maps**: Mapbox GL JS and Leaflet for interactive mapping
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React and Heroicons

## Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Currently Replit Auth (migrating to Supabase)
- **Session Management**: Express sessions with PostgreSQL store
- **Validation**: Zod schemas for API validation

## Build System & Tools
- **Bundler**: Vite for frontend build
- **Backend Build**: esbuild for server bundling
- **Database Migrations**: Drizzle Kit
- **Package Manager**: npm
- **Development**: tsx for TypeScript execution

## Common Commands

### Development
```bash
npm run dev          # Start development server (port 5000)
npm run check        # TypeScript type checking
```

### Database
```bash
npm run db:push      # Push schema changes to database
```

### Production Build
```bash
npm run build        # Build both frontend and backend
npm start           # Start production server
```

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session secret
- `NODE_ENV`: Environment (development/production)
- `SUPABASE_*`: Supabase configuration (migration in progress)

## Architecture Notes
- Mobile-first responsive design
- Single port deployment (5000) serving both API and client
- Development mode includes sample data generation
- Role-based access control with middleware
- RESTful API design with `/api` prefix