#!/usr/bin/env node

/**
 * Test Suite for Safe Serializer
 * Verifies that the SafeSerializer handles large data without crashing
 */

const SafeSerializer = require('./lib/safe-serializer');
const { logger } = require('./lib/logger');

// Create test data of various sizes
function createLargeString(sizeKB) {
  const size = sizeKB * 1024;
  return 'x'.repeat(size);
}

function createLargeObject(numProperties) {
  const obj = {};
  for (let i = 0; i < numProperties; i++) {
    obj[`prop_${i}`] = `value_${i}_${'data'.repeat(100)}`;
  }
  return obj;
}

function createLargeArray(numItems) {
  const arr = [];
  for (let i = 0; i < numItems; i++) {
    arr.push({
      id: i,
      data: `item_${i}_${'content'.repeat(50)}`,
      nested: {
        level1: {
          level2: `deep_data_${i}`
        }
      }
    });
  }
  return arr;
}

async function runTests() {
  console.log('🧪 Starting SafeSerializer Tests...\n');
  
  const serializer = new SafeSerializer();
  let passed = 0;
  let failed = 0;

  // Test 1: Normal data should work
  try {
    const normalData = { message: 'Hello World', count: 42 };
    const result = serializer.safeStringify(normalData);
    
    if (result.includes('Hello World')) {
      console.log('✅ Test 1 PASSED: Normal data serialization');
      passed++;
    } else {
      console.log('❌ Test 1 FAILED: Normal data serialization');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED: Normal data serialization -', error.message);
    failed++;
  }

  // Test 2: Large string should be truncated
  try {
    const largeString = createLargeString(20); // 20KB string
    const data = { content: largeString };
    const result = serializer.safeStringify(data);
    
    if (result.includes('truncated') && !result.includes('xxxxxxxxxxxx')) {
      console.log('✅ Test 2 PASSED: Large string truncation');
      passed++;
    } else {
      console.log('❌ Test 2 FAILED: Large string truncation');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED: Large string truncation -', error.message);
    failed++;
  }

  // Test 3: Large object should be handled
  try {
    const largeObject = createLargeObject(2000); // 2000 properties
    const result = serializer.safeStringify(largeObject);
    
    if (result.includes('truncated') || result.length < 1000000) {
      console.log('✅ Test 3 PASSED: Large object handling');
      passed++;
    } else {
      console.log('❌ Test 3 FAILED: Large object handling');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED: Large object handling -', error.message);
    failed++;
  }

  // Test 4: Large array should be handled
  try {
    const largeArray = createLargeArray(1500); // 1500 items
    const result = serializer.safeStringify(largeArray);
    
    if (result.includes('truncated') || result.length < 5000000) {
      console.log('✅ Test 4 PASSED: Large array handling');
      passed++;
    } else {
      console.log('❌ Test 4 FAILED: Large array handling');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED: Large array handling -', error.message);
    failed++;
  }

  // Test 5: Circular reference should be handled
  try {
    const circularData = { name: 'test' };
    circularData.self = circularData;
    const result = serializer.safeStringify(circularData);
    
    if (result.includes('Circular Reference') && !result.includes('[object Object]')) {
      console.log('✅ Test 5 PASSED: Circular reference handling');
      passed++;
    } else {
      console.log('❌ Test 5 FAILED: Circular reference handling');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED: Circular reference handling -', error.message);
    failed++;
  }

  // Test 6: Extremely large data should trigger circuit breaker eventually
  try {
    let circuitBreakerTriggered = false;
    const testSerializer = new SafeSerializer({
      circuitBreakerThreshold: 2,
      maxStringLength: 1000 // Very small limit
    });

    // Trigger failures to test circuit breaker
    for (let i = 0; i < 5; i++) {
      const result = testSerializer.safeStringify(createLargeString(100)); // 100KB
      if (result.includes('circuit breaker')) {
        circuitBreakerTriggered = true;
        break;
      }
    }

    if (circuitBreakerTriggered) {
      console.log('✅ Test 6 PASSED: Circuit breaker activation');
      passed++;
    } else {
      console.log('❌ Test 6 FAILED: Circuit breaker activation');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6 FAILED: Circuit breaker activation -', error.message);
    failed++;
  }

  // Test 7: Session-like data structure
  try {
    const sessionData = {
      sessionId: 'test-session',
      activities: createLargeArray(800), // Large activities array
      fileChanges: createLargeArray(200),
      largeContent: createLargeString(50), // 50KB content
      metadata: {
        timestamp: new Date().toISOString(),
        nested: {
          deep: {
            data: createLargeObject(100)
          }
        }
      }
    };

    const result = serializer.safeStringify(sessionData);
    
    if (result.length > 0 && !result.includes('RangeError')) {
      console.log('✅ Test 7 PASSED: Session-like data structure');
      passed++;
    } else {
      console.log('❌ Test 7 FAILED: Session-like data structure');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 7 FAILED: Session-like data structure -', error.message);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! SafeSerializer is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. SafeSerializer may need adjustments.');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };