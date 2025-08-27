/**
 * Load Testing Suite
 * Performance tests for API endpoints under load
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app, { startServer, stopServer } from '../../backend/server.js';
import { generateToken } from '../../middleware/auth.js';
import { DatabaseService } from '../../database/supabaseClient.js';

// Mock database service for performance tests
vi.mock('../../database/supabaseClient.js');

describe('Load Testing', () => {
  let server;
  let authToken;
  let testUser;
  let mockDbService;

  beforeAll(async () => {
    server = await startServer();
    
    testUser = {
      id: 'load-test-user',
      email: 'load.test@example.com',
      role: 'user',
      status: 'active',
      permissions: ['create_campaigns', 'manage_campaigns']
    };
    
    authToken = generateToken(testUser);
    
    // Mock database responses
    mockDbService = {
      getCampaigns: vi.fn(),
      getCampaign: vi.fn(),
      createCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      deleteCampaign: vi.fn(),
      getContributions: vi.fn(),
      createContribution: vi.fn(),
      getUserById: vi.fn()
    };
    
    vi.mocked(DatabaseService).mockImplementation(() => mockDbService);
  });

  afterAll(async () => {
    await stopServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockDbService.getUserById.mockResolvedValue(testUser);
    mockDbService.getCampaigns.mockResolvedValue([]);
    mockDbService.getCampaign.mockResolvedValue({
      id: 'test-campaign',
      name: 'Test Campaign',
      type: 'fundraising',
      status: 'active',
      userId: testUser.id
    });
  });

  describe('API Response Times', () => {
    it('should respond to GET /api/campaigns within acceptable time', async () => {
      const iterations = 100;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`GET /api/campaigns - Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms, Min: ${minResponseTime}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms
      expect(responseTimes.filter(time => time > 200)).toHaveLength(0); // No requests over 200ms
    });

    it('should respond to POST /api/campaigns within acceptable time', async () => {
      const campaignData = {
        name: 'Load Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000
      };

      mockDbService.createCampaign.mockResolvedValue({
        id: 'test-campaign-id',
        ...campaignData,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString()
      });

      const iterations = 50;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send(campaignData)
          .expect(201);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`POST /api/campaigns - Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);

      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
    });

    it('should handle authentication efficiently under load', async () => {
      const iterations = 200;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;

      // Authentication shouldn't add significant overhead
      expect(avgResponseTime).toBeLessThan(150);
      
      // Verify auth was called for each request
      expect(mockDbService.getUserById).toHaveBeenCalledTimes(iterations);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent GET requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`);

      // All requests should succeed
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
    });

    it('should handle concurrent POST requests', async () => {
      const concurrentRequests = 25;
      const promises = [];

      const campaignData = {
        name: 'Concurrent Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000
      };

      mockDbService.createCampaign.mockResolvedValue({
        id: 'concurrent-campaign-id',
        ...campaignData,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString()
      });

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...campaignData, name: `${campaignData.name} ${i}` })
          .expect(201);
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`${concurrentRequests} concurrent POST requests completed in ${totalTime}ms`);

      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(totalTime).toBeLessThan(10000); // Under 10 seconds
    });

    it('should handle mixed concurrent requests', async () => {
      const totalRequests = 100;
      const promises = [];

      mockDbService.createCampaign.mockResolvedValue({
        id: 'mixed-campaign-id',
        name: 'Mixed Test Campaign',
        type: 'fundraising',
        status: 'draft',
        userId: testUser.id
      });

      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        let promise;
        
        if (i % 3 === 0) {
          // GET request
          promise = request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${authToken}`);
        } else if (i % 3 === 1) {
          // POST request
          promise = request(app)
            .post('/api/campaigns')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Mixed Campaign ${i}`,
              type: 'fundraising',
              duration: 30,
              budget: 1000
            });
        } else {
          // GET specific campaign
          promise = request(app)
            .get('/api/campaigns/test-campaign')
            .set('Authorization', `Bearer ${authToken}`);
        }
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      console.log(`${totalRequests} mixed concurrent requests completed in ${totalTime}ms`);

      expect(responses).toHaveLength(totalRequests);
      
      // Check response statuses
      responses.forEach((response, index) => {
        if (index % 3 === 1) {
          expect(response.status).toBe(201); // POST requests
        } else {
          expect(response.status).toBe(200); // GET requests
        }
      });

      expect(totalTime).toBeLessThan(15000); // Under 15 seconds
    });
  });

  describe('Memory Usage and Resource Cleanup', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage after ${iterations} requests:`);
      console.log(`Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 50MB for 1000 requests)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle request timeouts gracefully', async () => {
      // Mock slow database response
      mockDbService.getCampaigns.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const startTime = Date.now();
      
      try {
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .timeout(1000); // 1 second timeout
        
        expect.fail('Request should have timed out');
      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        expect(elapsedTime).toBeLessThan(1500); // Should timeout around 1 second
      }

      // Reset mock
      mockDbService.getCampaigns.mockResolvedValue([]);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should efficiently handle rate limiting checks', async () => {
      const iterations = 100;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;

      // Rate limiting shouldn't add significant overhead
      expect(avgResponseTime).toBeLessThan(150);

      // Check that responses times are consistent (no sudden spikes)
      const maxDeviation = Math.max(...responseTimes.map(time => Math.abs(time - avgResponseTime)));
      expect(maxDeviation).toBeLessThan(avgResponseTime * 2); // Within 200% of average
    });

    it('should handle rate limit exceeded scenario efficiently', async () => {
      const iterations = 150; // Assuming rate limit is 100 per 15 minutes
      const responses = [];

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`);
        
        responses.push(response);
      }

      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      console.log(`Successful requests: ${successfulRequests.length}`);
      console.log(`Rate limited requests: ${rateLimitedRequests.length}`);

      // Should handle rate limiting gracefully
      expect(successfulRequests.length).toBeGreaterThan(90); // Most requests should succeed
      
      if (rateLimitedRequests.length > 0) {
        // Rate limited responses should be quick
        rateLimitedRequests.forEach(response => {
          expect(response.body.error).toBe('Too Many Requests');
        });
      }
    });
  });

  describe('Database Connection Performance', () => {
    it('should handle database connection efficiently', async () => {
      let dbCallCount = 0;
      
      mockDbService.getCampaigns.mockImplementation(async () => {
        dbCallCount++;
        // Simulate database query time
        await new Promise(resolve => setTimeout(resolve, 10));
        return [];
      });

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerRequest = totalTime / iterations;

      console.log(`${iterations} database requests in ${totalTime}ms (avg: ${avgTimePerRequest}ms per request)`);

      expect(dbCallCount).toBe(iterations);
      expect(avgTimePerRequest).toBeLessThan(50); // Should average under 50ms per request
    });

    it('should handle database errors gracefully under load', async () => {
      let errorCount = 0;
      
      mockDbService.getCampaigns.mockImplementation(async () => {
        // Simulate intermittent database errors
        if (Math.random() < 0.1) { // 10% error rate
          errorCount++;
          throw new Error('Database connection failed');
        }
        return [];
      });

      const iterations = 100;
      const responses = [];

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${authToken}`);
        
        responses.push(response);
      }

      const successfulRequests = responses.filter(r => r.status === 200);
      const errorRequests = responses.filter(r => r.status === 500);

      console.log(`Database errors: ${errorCount}, Error responses: ${errorRequests.length}`);

      // Should handle errors gracefully
      expect(successfulRequests.length + errorRequests.length).toBe(iterations);
      expect(errorCount).toBeGreaterThan(0); // Should have some errors for this test
      
      errorRequests.forEach(response => {
        expect(response.body.error).toBe('Internal Server Error');
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load without crashing', async () => {
      const concurrentBatches = 10;
      const requestsPerBatch = 50;
      const totalRequests = concurrentBatches * requestsPerBatch;

      console.log(`Starting stress test with ${totalRequests} total requests in ${concurrentBatches} batches`);

      const startTime = Date.now();
      const batchPromises = [];

      for (let batch = 0; batch < concurrentBatches; batch++) {
        const batchRequests = [];
        
        for (let i = 0; i < requestsPerBatch; i++) {
          batchRequests.push(
            request(app)
              .get('/api/campaigns')
              .set('Authorization', `Bearer ${authToken}`)
          );
        }
        
        batchPromises.push(Promise.all(batchRequests));
      }

      const batchResults = await Promise.all(batchPromises);
      const totalTime = Date.now() - startTime;

      console.log(`Stress test completed in ${totalTime}ms`);

      // Flatten results
      const allResponses = batchResults.flat();
      
      expect(allResponses).toHaveLength(totalRequests);
      
      // Count response statuses
      const statusCounts = allResponses.reduce((counts, response) => {
        counts[response.status] = (counts[response.status] || 0) + 1;
        return counts;
      }, {});

      console.log('Response status distribution:', statusCounts);

      // Should have mostly successful responses
      expect(statusCounts[200] || 0).toBeGreaterThan(totalRequests * 0.8); // At least 80% success

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(30000); // Under 30 seconds
    });
  });
});