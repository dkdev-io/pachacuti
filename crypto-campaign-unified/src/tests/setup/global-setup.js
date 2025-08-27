/**
 * Global Test Setup
 * Runs before all test suites
 */

import './test-env.js';

// Global test utilities
global.testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random test data
   */
  generateId: () => `test-${Math.random().toString(36).substring(2, 15)}`,
  
  generateEmail: () => `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
  
  generateWalletAddress: () => {
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += hex[Math.floor(Math.random() * 16)];
    }
    return address;
  },

  /**
   * Create test campaign data
   */
  createCampaignData: (overrides = {}) => ({
    name: 'Test Campaign',
    type: 'fundraising',
    duration: 30,
    budget: 5000,
    description: 'A test campaign',
    targetAmount: 10000,
    maxIndividualContribution: 1000,
    ...overrides
  }),

  /**
   * Create test user data
   */
  createUserData: (overrides = {}) => ({
    id: global.testUtils.generateId(),
    email: global.testUtils.generateEmail(),
    role: 'user',
    status: 'active',
    permissions: ['create_campaigns', 'manage_campaigns'],
    ...overrides
  }),

  /**
   * Create test contribution data
   */
  createContributionData: (overrides = {}) => ({
    campaignId: global.testUtils.generateId(),
    amount: 250,
    currency: 'ETH',
    walletAddress: global.testUtils.generateWalletAddress(),
    message: 'Test contribution',
    ...overrides
  })
};

// Global test constants
global.TEST_CONSTANTS = {
  VALID_CURRENCIES: ['USD', 'ETH', 'BTC', 'USDC', 'USDT'],
  VALID_CAMPAIGN_TYPES: ['fundraising', 'awareness', 'advocacy', 'donation'],
  VALID_CAMPAIGN_STATUSES: ['draft', 'active', 'paused', 'completed', 'cancelled'],
  VALID_CONTRIBUTION_STATUSES: ['pending', 'processing', 'confirmed', 'failed', 'refund_requested', 'refunded'],
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_RESPONSE_TIME: 1000,
    MAX_AVERAGE_RESPONSE_TIME: 200,
    MAX_DB_QUERY_TIME: 100,
    MIN_THROUGHPUT_RPS: 50
  },

  // Security test patterns
  SECURITY: {
    XSS_PAYLOADS: [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert(1)',
      '<svg onload=alert(1)>'
    ],
    SQL_INJECTION_PAYLOADS: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; UPDATE users SET role='admin'; --",
      "' UNION SELECT * FROM users--"
    ],
    COMMAND_INJECTION_PAYLOADS: [
      '; ls -la',
      '&& cat /etc/passwd',
      '| whoami',
      '`id`'
    ]
  }
};

// Mock implementations for tests
global.mockImplementations = {
  /**
   * Create a mock Supabase client
   */
  createMockSupabase: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: {}, error: null }),
      update: () => ({ data: {}, error: null }),
      delete: () => ({ error: null }),
      single: () => ({ data: null, error: null })
    }),
    auth: {
      signUp: () => ({ data: { user: {} }, error: null }),
      signIn: () => ({ data: { user: {}, session: {} }, error: null }),
      signOut: () => ({ error: null })
    }
  }),

  /**
   * Create a mock Web3 provider
   */
  createMockWeb3Provider: () => ({
    getNetwork: () => Promise.resolve({ chainId: 1, name: 'mainnet' }),
    getBlockNumber: () => Promise.resolve(12345678),
    getFeeData: () => Promise.resolve({
      gasPrice: BigInt('20000000000'),
      maxFeePerGas: BigInt('25000000000')
    }),
    getTransaction: () => Promise.resolve({
      hash: '0x123...',
      from: '0xabc...',
      to: '0xdef...',
      value: BigInt('1000000000000000000')
    }),
    getTransactionReceipt: () => Promise.resolve({
      status: 1,
      blockNumber: 12345678,
      gasUsed: BigInt('21000')
    })
  }),

  /**
   * Create mock JWT token
   */
  createMockJWT: (payload = {}) => {
    const defaultPayload = {
      userId: global.testUtils.generateId(),
      email: global.testUtils.generateEmail(),
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    return { ...defaultPayload, ...payload };
  }
};

// Test database helpers
global.testDb = {
  /**
   * Clear all test data
   */
  cleanup: async () => {
    // This would connect to test database and clear tables
    // For now, just log the operation
    if (process.env.NODE_ENV === 'test') {
      console.log('Test database cleanup completed');
    }
  },

  /**
   * Seed test data
   */
  seed: async (data = {}) => {
    // This would seed the test database with initial data
    console.log('Test database seeded with:', Object.keys(data));
  },

  /**
   * Reset database to initial state
   */
  reset: async () => {
    await global.testDb.cleanup();
    await global.testDb.seed({
      users: [],
      campaigns: [],
      contributions: []
    });
  }
};

// Performance measurement helpers
global.perfUtils = {
  /**
   * Measure execution time of a function
   */
  measureTime: async (fn, label = 'operation') => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1000000;
    
    console.log(`${label} took ${durationMs.toFixed(2)}ms`);
    
    return { result, duration: durationMs };
  },

  /**
   * Run performance test
   */
  runPerformanceTest: async (fn, iterations = 100, label = 'test') => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const { duration } = await global.perfUtils.measureTime(fn, `${label}-${i}`);
      times.push(duration);
    }

    const avg = times.reduce((sum, time) => sum + time, 0) / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

    return {
      iterations,
      average: avg,
      minimum: min,
      maximum: max,
      p95: p95,
      times: times
    };
  }
};

// Error simulation helpers
global.errorUtils = {
  /**
   * Simulate network errors
   */
  networkError: () => {
    const error = new Error('Network request failed');
    error.code = 'ECONNRESET';
    error.errno = -54;
    return error;
  },

  /**
   * Simulate database errors
   */
  databaseError: () => {
    const error = new Error('Database connection failed');
    error.code = 'ECONNREFUSED';
    error.errno = -61;
    return error;
  },

  /**
   * Simulate timeout errors
   */
  timeoutError: () => {
    const error = new Error('Request timeout');
    error.code = 'ETIMEDOUT';
    error.timeout = 5000;
    return error;
  },

  /**
   * Simulate validation errors
   */
  validationError: (field, message) => {
    const error = new Error(`Validation failed for field: ${field}`);
    error.name = 'ValidationError';
    error.details = [{ field, message }];
    return error;
  }
};

// Test reporter configuration
if (process.env.CI) {
  console.log('Running in CI environment');
  console.log('Coverage reports will be generated');
  console.log('Performance tests will run with reduced load');
}

// Cleanup handlers
process.on('SIGINT', async () => {
  console.log('Cleaning up test environment...');
  await global.testDb.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cleaning up test environment...');
  await global.testDb.cleanup();
  process.exit(0);
});

export default async function globalSetup() {
  console.log('Global test setup completed');
  
  // Initialize test database if needed
  if (process.env.INIT_TEST_DB === 'true') {
    await global.testDb.reset();
  }
  
  return async () => {
    // Global teardown
    console.log('Global test teardown starting...');
    await global.testDb.cleanup();
    console.log('Global test teardown completed');
  };
}