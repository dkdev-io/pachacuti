// Test setup configuration
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { server } from '../mocks/server'

// Global test configuration
beforeAll(() => {
  // Setup global test environment
  global.console = {
    ...console,
    // Suppress console.log in tests unless CI environment
    log: process.env.CI ? console.log : () => {},
    warn: console.warn,
    error: console.error,
  }
  
  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  // Cleanup after all tests
  server.close()
})

beforeEach(() => {
  // Setup before each test
})

afterEach(() => {
  // Cleanup after each test
  server.resetHandlers()
  vi.clearAllMocks()
})

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})