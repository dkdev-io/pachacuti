/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
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
        '**/benchmarks/'
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
    testTimeout: 10000,
    hookTimeout: 10000,
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
    }
  },
  esbuild: {
    target: 'node14'
  }
})