import { vi } from 'vitest'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  }
}))

// Mock console methods to avoid noise in tests (can be overridden per test)
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock window location and other browser APIs (only if window exists)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  })
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})