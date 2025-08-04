import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/fixtures/**',
        '**/mocks/**'
      ]
    },
    testTimeout: 10000,
    setupFiles: ['./tests/utils/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/lib': resolve(__dirname, './lib'),
      '@/shared': resolve(__dirname, './shared'),
      '@/client': resolve(__dirname, './client/src'),
      '@/tests': resolve(__dirname, './tests')
    }
  }
})