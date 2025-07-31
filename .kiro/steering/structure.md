# Project Structure

## Root Level
```
├── client/          # Frontend React application
├── server/          # Backend Express.js API
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
├── docs/           # Project documentation
├── attached_assets/ # Static assets and images
└── .kiro/          # Kiro IDE configuration
```

## Frontend Structure (`client/`)
```
client/
├── index.html                    # Vite entry point
├── src/
│   ├── components/              # React components
│   │   ├── ui/                 # Reusable UI components (Radix-based)
│   │   ├── AppHeader.tsx       # Main app header
│   │   ├── BottomNavigation.tsx # Mobile navigation
│   │   ├── InteractiveMap.tsx  # Map component
│   │   └── ...                 # Feature components
│   ├── pages/                  # Route components
│   │   ├── MapView.tsx         # Main map interface
│   │   ├── ListView.tsx        # Church list view
│   │   ├── AnalyticsView.tsx   # Dashboard analytics
│   │   └── LoginPage.tsx       # Authentication
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── types/                  # Frontend-specific types
│   └── main.tsx               # React app entry
└── public/sounds/              # Audio assets
```

## Backend Structure (`server/`)
```
server/
├── index.ts          # Express server entry point
├── routes.ts         # API route definitions
├── db.ts            # Database connection setup
├── storage.ts       # Database operations layer
├── authMiddleware.ts # Authentication middleware
├── replitAuth.ts    # Replit authentication (legacy)
└── vite.ts          # Vite development integration
```

## Shared Code (`shared/`)
```
shared/
└── schema.ts        # Drizzle database schema and Zod validation
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `ChurchForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `queryClient.ts`)
- **Pages**: PascalCase with descriptive names (e.g., `MapView.tsx`)

### Import Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Database Schema
- All tables defined in `shared/schema.ts` using Drizzle ORM
- Zod schemas for validation generated from Drizzle schemas
- Relations defined for type-safe joins

### API Routes
- All API endpoints prefixed with `/api`
- RESTful conventions (GET, POST, PUT, DELETE)
- Authentication middleware applied to protected routes
- Consistent error handling and response formats

### Component Organization
- UI components in `client/src/components/ui/` (shadcn/ui style)
- Feature components in `client/src/components/`
- Page components in `client/src/pages/`
- Shared hooks in `client/src/hooks/`

### Development Patterns
- Mobile-first responsive design
- TypeScript strict mode enabled
- Zod validation for all data inputs
- TanStack Query for server state management
- Express middleware for authentication and logging