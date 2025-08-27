/**
 * Test Environment Setup
 * Configures environment variables and global test settings
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Database configuration for testing
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/crypto_campaign_test';

// Web3 configuration for testing
process.env.RPC_URL = 'https://mainnet.infura.io/v3/test-api-key';
process.env.CAMPAIGN_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// Server configuration
process.env.PORT = '3001';

// Rate limiting configuration for tests
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // High limit for tests

// Logging configuration
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Disable external services in tests
process.env.DISABLE_EXTERNAL_SERVICES = 'true';

// Mock configuration
process.env.MOCK_DATABASE = 'true';
process.env.MOCK_WEB3 = 'true';
process.env.MOCK_EMAIL = 'true';

// Test-specific flags
process.env.ENABLE_TEST_HOOKS = 'true';
process.env.SKIP_SLOW_TESTS = process.env.CI ? 'true' : 'false';

// Performance test settings
process.env.LOAD_TEST_CONCURRENT_USERS = '50';
process.env.LOAD_TEST_DURATION_SECONDS = '30';
process.env.PERFORMANCE_THRESHOLD_MS = '1000';

// Security test settings
process.env.ENABLE_SECURITY_TESTS = 'true';
process.env.SECURITY_SCAN_TIMEOUT = '30000';

// Coverage settings
process.env.COVERAGE_THRESHOLD = '90';

console.log('Test environment configured');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`JWT_SECRET configured: ${!!process.env.JWT_SECRET}`);
console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
console.log(`Web3 RPC configured: ${!!process.env.RPC_URL}`);