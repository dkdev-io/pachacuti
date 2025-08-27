/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.js', './src/tests/setup/global-setup.js'],
    globalSetup: './src/tests/setup/global-setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/*.bench.{js,ts}',
        '**/*.benchmark.{js,ts}',
        '**/build/',
        '**/dist/',
        '**/coverage/',
        '**/.{eslint,prettier}rc.{js,cjs,yml}',
        '**/vite.config.{js,ts}',
        '**/vitest.config.{js,ts}',
        '**/scripts/',
        '**/mocks/',
        '**/benchmarks/',
        '.github/**',
        'docker-compose*.yml',
        'Dockerfile*'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/core/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/utils/': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/api/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/middleware/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/database/': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/web3/': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      skipFull: true,
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [75, 90],
        lines: [80, 95]
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2
      }
    },
    reporters: ['verbose', 'json', 'junit'],
    outputFile: {
      json: './test-results/test-results.json',
      junit: './test-results/junit.xml'
    },
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,ts}'],
      outputFile: './benchmarks/results.json'
    },
    // Test categorization
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/tests/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{git,cache,output,temp}/**'
    ]
  },
  esbuild: {
    target: 'node18'
  },
  optimizeDeps: {
    include: [
      'supertest',
      'jsonwebtoken',
      'bcryptjs',
      '@supabase/supabase-js',
      'ethers'
    ]
  },
  define: {
    // Define test environment variables
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.VITEST': JSON.stringify(true)
  }
})