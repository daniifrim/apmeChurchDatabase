# PWA Implementation Plan - APME Church Database

## Overview

This document outlines the implementation of Progressive Web App (PWA) functionality for the APME Church Database, specifically designed for Vercel-compatible deployment while maintaining the current Express.js backend architecture.

## Architecture Strategy: Hybrid Deployment

### Frontend PWA (Vercel)
- **Static Site**: React + Vite built as static files
- **Service Worker**: Offline caching and background sync
- **PWA Features**: App installation, offline mode, push notifications
- **CDN**: Vercel's global edge network for fast loading

### Backend API (Railway/Alternative)
- **Express.js**: Current architecture remains unchanged
- **Database**: Supabase PostgreSQL connection maintained
- **Authentication**: Session-based auth continues to work
- **APIs**: RESTful endpoints served over HTTPS

### Communication
- **CORS**: Configured for cross-origin requests
- **Environment Variables**: API_BASE_URL for different environments
- **Error Handling**: Graceful degradation when API unavailable

## PWA Requirements Analysis

### Core PWA Components
1. **Web App Manifest** - App metadata, icons, display mode
2. **Service Worker** - Offline functionality, background sync
3. **HTTPS** - Required for service worker registration
4. **Responsive Design** - Already implemented with Tailwind CSS
5. **App Shell** - Critical resources cached for offline use

### Church Database Specific Features
- **Offline Church Listings**: Cache church data for offline browsing
- **Visit Form Offline**: Store visit submissions until online
- **Map Tiles Caching**: Preload map data for offline viewing
- **User Authentication**: Handle offline/online auth states
- **Data Synchronization**: Sync offline changes when reconnected

## Technical Implementation

### 1. Vite PWA Plugin Configuration

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'assets/*'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.your-railway-app\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'APME Church Database',
        short_name: 'APME Churches',
        description: 'Church database and visit tracking for APME communities',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

### 2. Vercel Configuration

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/workbox-*.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Environment Configuration

```typescript
// .env.local (for local development)
VITE_API_BASE_URL=http://localhost:3000

// .env.production (for Vercel)
VITE_API_BASE_URL=https://your-railway-app.railway.app
```

### 4. API Service Layer Update

```typescript
// client/src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const apiClient = {
  async get(endpoint: string) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include', // Important for cross-origin cookies
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.json()
    } catch (error) {
      // Handle offline mode
      console.warn('API call failed, checking cache:', error)
      throw error
    }
  }
  // ... other methods
}
```

## Offline Strategy

### Critical Data Caching
1. **Church Listings**: Cache all church data for offline browsing
2. **User Profile**: Store user authentication state
3. **Recent Visits**: Cache recent visit history
4. **Form Data**: Store incomplete forms for later submission

### Background Sync
1. **Visit Submissions**: Queue offline visit forms
2. **Rating Updates**: Sync rating changes when online
3. **Photo Uploads**: Handle image uploads in background

### Offline UI Indicators
1. **Connection Status**: Show online/offline indicator
2. **Cached Data Warning**: Indicate when viewing cached data
3. **Sync Status**: Show pending sync operations

## Installation & App-like Experience

### Install Prompt
```typescript
// client/src/components/InstallPrompt.tsx
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  
  // ... install logic
}
```

### App Shell Architecture
- **Critical CSS**: Inline critical styles for instant loading
- **Navigation Shell**: Cache navigation components
- **Loading States**: Skeleton screens for better perceived performance

## Implementation Timeline

### Phase 1: Basic PWA Setup (2-3 days)
- [ ] Install and configure vite-plugin-pwa
- [ ] Create vercel.json configuration
- [ ] Generate PWA icons and manifest
- [ ] Test basic service worker functionality

### Phase 2: Offline Functionality (3-4 days)
- [ ] Implement church data caching strategy
- [ ] Add offline form submission queue
- [ ] Create connection status indicators
- [ ] Test offline/online transitions

### Phase 3: Enhanced Features (2-3 days)
- [ ] Add background sync for visits
- [ ] Implement install prompt component
- [ ] Optimize app shell caching
- [ ] Add push notification infrastructure

### Phase 4: Testing & Optimization (1-2 days)
- [ ] Lighthouse PWA audit (target 100% score)
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Deploy to Vercel staging

## Deployment Process

### Development
1. Run `npm run dev` - API server on Railway, frontend on localhost
2. Test PWA features with `npm run build && npm run preview`
3. Use Chrome DevTools Application tab for debugging

### Production
1. **Frontend**: Deploy to Vercel (automatic from GitHub)
2. **Backend**: Keep on Railway (no changes needed)
3. **Environment**: Configure VITE_API_BASE_URL for Vercel
4. **CORS**: Update backend to allow Vercel domain

## Testing Checklist

### PWA Audit
- [ ] Lighthouse PWA score 100%
- [ ] Service worker registered successfully
- [ ] Manifest properly configured
- [ ] Icons display correctly on all devices
- [ ] Offline functionality works

### Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Safari (iOS)
- [ ] Firefox (desktop & mobile)
- [ ] Edge

## Security Considerations

### HTTPS Requirement
- Vercel provides HTTPS by default
- Service workers require HTTPS in production
- Railway also provides HTTPS for API

### CORS Configuration
```typescript
// Backend CORS update (server/routes.ts)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app'
  ],
  credentials: true
}))
```

## Performance Optimizations

### Bundle Splitting
- Dynamic imports for route-based code splitting
- Separate chunks for maps and heavy dependencies
- Tree shaking for unused code elimination

### Caching Strategy
- App shell: Cache first
- API calls: Network first with fallback
- Static assets: Cache first with long TTL
- User data: Fresh content when possible

## Monitoring & Analytics

### PWA Metrics
- Installation rate
- Offline usage patterns
- Service worker performance
- Cache hit rates

### User Experience
- Time to interactive
- First contentful paint
- Offline form submissions
- Sync success rates

## Future Enhancements

### Push Notifications
- Visit reminders
- New church notifications
- Rating update prompts

### Advanced Offline Features
- Offline map tiles
- Image compression and caching
- Conflict resolution for data sync

### Native Features
- Geolocation for nearby churches
- Device contacts integration
- Calendar integration for visits

---

*Document created: 2025-01-31*
*Status: Implementation ready*
*Architecture: Hybrid deployment (Vercel + Railway)*