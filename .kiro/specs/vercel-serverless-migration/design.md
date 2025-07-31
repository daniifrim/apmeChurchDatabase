# Design Document

## Overview

This design outlines the architectural transformation of the APME Church Database System from a traditional Express.js monolithic server to a serverless architecture compatible with Vercel deployment. The migration will maintain all existing functionality while adapting to serverless constraints and implementing JWT-based authentication to replace session-based authentication.

## Architecture

### Current Architecture (Express.js Monolithic)
```
┌─────────────────────────────────────────┐
│              Express Server             │
├─────────────────────────────────────────┤
│  Session Store (PostgreSQL)            │
│  Auth Middleware (Session-based)       │
│  Monolithic Routes (/api/*)            │
│  Database Connection (Persistent)      │
└─────────────────────────────────────────┘
```

### Target Architecture (Vercel Serverless)
```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
├─────────────────────────────────────────┤
│  Individual Serverless Functions       │
│  ├── /api/auth/login.ts                │
│  ├── /api/auth/register.ts             │
│  ├── /api/churches/index.ts            │
│  ├── /api/churches/[id].ts             │
│  └── /api/analytics.ts                 │
├─────────────────────────────────────────┤
│  JWT Authentication (Stateless)        │
│  Supabase Client (Connection Pooling)  │
│  Environment-based Configuration       │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Authentication System Redesign

#### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: 'administrator' | 'missionary' | 'mobilizer';
  region: string;     // User's assigned region
  iat: number;        // Issued at
  exp: number;        // Expires at
}
```

#### Authentication Middleware (Serverless)
```typescript
// lib/auth.ts
export async function validateJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    
    return {
      sub: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'missionary',
      region: user.user_metadata?.region || 'Romania',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
  } catch {
    return null;
  }
}

export function withAuth<T extends NextApiRequest>(
  handler: (req: T & { user: JWTPayload }, res: NextApiResponse) => Promise<void>
) {
  return async (req: T, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const user = await validateJWT(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    (req as any).user = user;
    return handler(req as T & { user: JWTPayload }, res);
  };
}
```

### 2. Serverless Function Structure

#### API Route Organization
```
api/
├── auth/
│   ├── login.ts          # POST /api/auth/login
│   ├── register.ts       # POST /api/auth/register
│   ├── logout.ts         # POST /api/auth/logout
│   └── user.ts           # GET /api/auth/user
├── churches/
│   ├── index.ts          # GET/POST /api/churches
│   ├── [id].ts           # GET/PUT/DELETE /api/churches/:id
│   └── [id]/
│       ├── visits.ts     # GET/POST /api/churches/:id/visits
│       └── activities.ts # GET/POST /api/churches/:id/activities
└── analytics.ts          # GET /api/analytics
```

#### Example Serverless Function Implementation
```typescript
// api/churches/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/auth';
import { storage } from '../../lib/storage';
import { insertChurchSchema } from '@shared/schema';

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return handleGetChurches(req, res);
    case 'POST':
      return handleCreateChurch(req, res);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetChurches(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  try {
    const { search, county, engagementLevel } = req.query;
    const churches = await storage.getChurches({
      search: search as string,
      county: county as string,
      engagementLevel: engagementLevel as string,
    });
    res.json(churches);
  } catch (error) {
    console.error('Error fetching churches:', error);
    res.status(500).json({ message: 'Failed to fetch churches' });
  }
}

async function handleCreateChurch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  try {
    const churchData = insertChurchSchema.parse({
      ...req.body,
      createdBy: req.user.sub,
    });
    
    const church = await storage.createChurch(churchData);
    
    // Create activity for church creation
    await storage.createActivity({
      churchId: church.id,
      userId: req.user.sub,
      type: 'note',
      title: 'Church added to database',
      description: `Church ${church.name} was added to the database`,
      activityDate: new Date(),
    });
    
    res.status(201).json(church);
  } catch (error) {
    console.error('Error creating church:', error);
    res.status(500).json({ message: 'Failed to create church' });
  }
}

export default withAuth(handler);
```

### 3. Database Connection Management

#### Serverless-Optimized Storage Layer
```typescript
// lib/storage.ts
import { createClient } from '@supabase/supabase-js';

class ServerlessStorage {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Connection is managed by Supabase client
  // No persistent connections needed
  
  async getChurches(filters?: {
    search?: string;
    county?: string;
    engagementLevel?: string;
  }) {
    let query = this.supabase
      .from('churches')
      .select('*')
      .eq('isActive', true);
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,pastor.ilike.%${filters.search}%`);
    }
    
    if (filters?.county) {
      query = query.eq('county', filters.county);
    }
    
    if (filters?.engagementLevel) {
      query = query.eq('engagementLevel', filters.engagementLevel);
    }
    
    const { data, error } = await query.order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  // ... other methods using Supabase client
}

export const storage = new ServerlessStorage();
```

### 4. Frontend Integration Updates

#### Updated AuthContext for JWT
```typescript
// client/src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Store JWT token in localStorage
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    
    if (data.session?.access_token) {
      setToken(data.session.access_token);
      localStorage.setItem('auth_token', data.session.access_token);
      await fetchUser();
    }
  };

  const fetchUser = async () => {
    if (!token) return;
    
    const response = await fetch('/api/auth/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
    }
  };

  // ... rest of implementation
}
```

#### Updated API Client
```typescript
// client/src/lib/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api${queryKey[0]}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        return response.json();
      },
    },
  },
});
```

## Data Models

### JWT Token Storage
- **Client-side**: localStorage for token persistence
- **Server-side**: Stateless validation via Supabase
- **Expiration**: 7 days with automatic refresh

### Database Schema (Unchanged)
The existing database schema remains the same:
- `users` table for user management
- `churches` table for church data
- `visits` table for visit tracking
- `activities` table for activity logging
- `sessions` table (to be deprecated)

## Error Handling

### Serverless Error Patterns
```typescript
// lib/errorHandler.ts
export function handleServerlessError(error: unknown, res: NextApiResponse) {
  console.error('Serverless function error:', error);
  
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
  
  if (error instanceof Error) {
    return res.status(500).json({
      message: error.message,
    });
  }
  
  return res.status(500).json({
    message: 'Internal server error',
  });
}
```

### Cold Start Optimization
- Use Supabase client for connection pooling
- Minimize function initialization time
- Cache frequently accessed data
- Implement proper error boundaries

## Testing Strategy

### Unit Testing
- Test individual serverless functions
- Mock Supabase client for isolated testing
- Validate JWT token handling
- Test error scenarios

### Integration Testing
- Test complete authentication flow
- Verify database operations work correctly
- Test API endpoint compatibility
- Validate frontend integration

### Performance Testing
- Measure cold start times
- Test concurrent request handling
- Validate database connection limits
- Monitor memory usage

### Migration Testing
- Test backward compatibility during transition
- Validate data integrity
- Test rollback procedures
- Verify all existing functionality works

## Deployment Configuration

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3"
    }
  },
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  },
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "@supabase-url",
      "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  }
}
```

### Environment Variables
```bash
# Production Environment Variables
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
NODE_ENV=production

# Frontend Build Variables
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

## Migration Strategy

### Phase 1: Prepare Serverless Functions
1. Create new `api/` directory structure
2. Implement JWT authentication middleware
3. Convert existing routes to serverless functions
4. Update storage layer for Supabase client usage

### Phase 2: Update Frontend
1. Modify AuthContext for JWT token handling
2. Update API client to include Bearer tokens
3. Remove session-based authentication code
4. Test authentication flow end-to-end

### Phase 3: Deploy and Test
1. Deploy to Vercel staging environment
2. Run comprehensive testing suite
3. Validate all functionality works correctly
4. Monitor performance and error rates

### Phase 4: Production Cutover
1. Update DNS to point to Vercel
2. Monitor application health
3. Implement rollback plan if needed
4. Clean up old Express server code

## Security Considerations

### JWT Security
- Use secure token storage (httpOnly cookies in production)
- Implement token refresh mechanism
- Validate token expiration on each request
- Use strong signing algorithms

### API Security
- Implement rate limiting per function
- Validate all input data with Zod schemas
- Use CORS policies appropriately
- Log security events for monitoring

### Database Security
- Use Row Level Security (RLS) policies
- Limit database permissions per role
- Encrypt sensitive data at rest
- Monitor for suspicious queries

## Performance Optimization

### Cold Start Mitigation
- Keep functions warm with scheduled pings
- Minimize bundle size per function
- Use connection pooling effectively
- Cache frequently accessed data

### Database Optimization
- Implement proper indexing
- Use connection pooling
- Optimize query patterns
- Monitor query performance

### Frontend Optimization
- Implement proper caching strategies
- Use React Query for state management
- Optimize bundle splitting
- Implement progressive loading