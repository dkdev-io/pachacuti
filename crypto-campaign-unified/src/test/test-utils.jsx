import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock providers for testing
const MockThemeProvider = ({ children }) => (
  <div data-testid="theme-provider">{children}</div>
)

const MockWeb3Provider = ({ children }) => (
  <div data-testid="web3-provider">{children}</div>
)

const MockSupabaseProvider = ({ children }) => (
  <div data-testid="supabase-provider">{children}</div>
)

// All-in-one wrapper for testing
const AllTheProviders = ({ children }) => {
  return (
    <MockThemeProvider>
      <MockWeb3Provider>
        <MockSupabaseProvider>
          {children}
        </MockSupabaseProvider>
      </MockWeb3Provider>
    </MockThemeProvider>
  )
}

// Custom render function
const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Mock Web3 functions
export const mockWeb3 = {
  connect: vi.fn(() => Promise.resolve({
    address: '0x1234567890123456789012345678901234567890',
    chainId: 1,
    provider: {}
  })),
  disconnect: vi.fn(() => Promise.resolve()),
  getBalance: vi.fn(() => Promise.resolve('1.5')),
  sendTransaction: vi.fn(() => Promise.resolve({
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    wait: () => Promise.resolve({ status: 1 })
  })),
  isConnected: vi.fn(() => true),
  getCurrentAccount: vi.fn(() => '0x1234567890123456789012345678901234567890')
}

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    })),
    signIn: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null }))
  }
}

// Mock form validation helpers
export const mockValidation = {
  validateEmail: vi.fn((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }),
  validateAmount: vi.fn((amount) => {
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0 && num <= 10000
  }),
  validateAddress: vi.fn((address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }),
  sanitizeInput: vi.fn((input) => {
    return input.replace(/<[^>]*>/g, '').trim()
  })
}

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockCampaign = (overrides = {}) => ({
  id: 'test-campaign-id',
  title: 'Test Campaign',
  description: 'A test campaign description',
  targetAmount: 10000,
  currentAmount: 2500,
  status: 'active',
  createdBy: 'test-user-id',
  createdAt: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z',
  ...overrides
})

export const createMockDonation = (overrides = {}) => ({
  id: 'test-donation-id',
  campaignId: 'test-campaign-id',
  donorId: 'test-user-id',
  amount: 100,
  currency: 'USD',
  txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  status: 'completed',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
})

// Custom matchers
expect.extend({
  toBeValidAddress(received) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received)
    return {
      message: () => `expected ${received} to be a valid Ethereum address`,
      pass
    }
  },
  toBeValidTxHash(received) {
    const pass = /^0x[a-fA-F0-9]{64}$/.test(received)
    return {
      message: () => `expected ${received} to be a valid transaction hash`,
      pass
    }
  }
})

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }