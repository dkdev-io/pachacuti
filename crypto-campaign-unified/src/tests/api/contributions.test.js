/**
 * Contributions API Endpoint Tests
 * Tests all contribution-related API endpoints using Supertest
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app, { startServer, stopServer } from '../../backend/server.js';
import { DatabaseService } from '../../database/supabaseClient.js';
import { generateToken } from '../../middleware/auth.js';

const dbService = new DatabaseService();

describe('Contributions API Endpoints', () => {
  let server;
  let authToken;
  let testUser;
  let testCampaign;
  let testContribution;

  beforeAll(async () => {
    server = await startServer();
    
    // Create test user
    testUser = {
      id: 'test-user-contributions',
      email: 'contributions.test@example.com',
      role: 'user',
      status: 'active',
      permissions: ['create_contributions', 'manage_contributions']
    };
    
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await stopServer();
  });

  beforeEach(async () => {
    // Create test campaign
    testCampaign = await dbService.createCampaign({
      id: crypto.randomUUID(),
      name: 'Test Campaign',
      type: 'fundraising',
      duration: 30,
      budget: 1000,
      status: 'active',
      userId: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    });
  });

  afterEach(async () => {
    // Clean up
    try {
      if (testContribution) {
        await dbService.deleteContribution(testContribution.id);
      }
      if (testCampaign) {
        await dbService.deleteCampaign(testCampaign.id, testUser.id);
      }
    } catch (error) {
      // Resources might not exist, ignore errors
    }
  });

  describe('GET /api/contributions', () => {
    it('should return empty list when no contributions exist', async () => {
      const response = await request(app)
        .get('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/contributions')
        .expect(401);
    });

    it('should filter contributions by campaign', async () => {
      // Create another campaign
      const otherCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Other Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000,
        status: 'active',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });

      // Create contributions for both campaigns
      const contribution1 = await dbService.createContribution({
        id: crypto.randomUUID(),
        campaignId: testCampaign.id,
        userId: testUser.id,
        amount: 100,
        currency: 'USD',
        walletAddress: '0x1234567890123456789012345678901234567890',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const contribution2 = await dbService.createContribution({
        id: crypto.randomUUID(),
        campaignId: otherCampaign.id,
        userId: testUser.id,
        amount: 200,
        currency: 'USD',
        walletAddress: '0x1234567890123456789012345678901234567890',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const response = await request(app)
        .get(`/api/contributions?campaignId=${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].campaign_id).toBe(testCampaign.id);

      // Cleanup
      await dbService.deleteContribution(contribution1.id);
      await dbService.deleteContribution(contribution2.id);
      await dbService.deleteCampaign(otherCampaign.id, testUser.id);
    });

    it('should return contributions with pagination', async () => {
      // Create multiple contributions
      const contributions = [];
      for (let i = 0; i < 3; i++) {
        const contribution = await dbService.createContribution({
          id: crypto.randomUUID(),
          campaignId: testCampaign.id,
          userId: testUser.id,
          amount: 100 * (i + 1),
          currency: 'USD',
          walletAddress: '0x1234567890123456789012345678901234567890',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        contributions.push(contribution);
      }

      const response = await request(app)
        .get('/api/contributions?limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.hasMore).toBe(true);

      // Cleanup
      for (const contribution of contributions) {
        await dbService.deleteContribution(contribution.id);
      }
    });
  });

  describe('GET /api/contributions/:id', () => {
    beforeEach(async () => {
      testContribution = await dbService.createContribution({
        id: crypto.randomUUID(),
        campaignId: testCampaign.id,
        userId: testUser.id,
        amount: 500,
        currency: 'ETH',
        walletAddress: '0x1234567890123456789012345678901234567890',
        status: 'confirmed',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    it('should return contribution by ID', async () => {
      const response = await request(app)
        .get(`/api/contributions/${testContribution.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testContribution.id);
      expect(response.body.data).toHaveProperty('amount', 500);
      expect(response.body.data).toHaveProperty('currency', 'ETH');
      expect(response.body.data).toHaveProperty('status', 'confirmed');
    });

    it('should return 404 for non-existent contribution', async () => {
      const response = await request(app)
        .get('/api/contributions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/contributions/${testContribution.id}`)
        .expect(401);
    });
  });

  describe('POST /api/contributions', () => {
    const validContributionData = {
      campaignId: '',
      amount: 250,
      currency: 'ETH',
      walletAddress: '0x1234567890123456789012345678901234567890',
      message: 'Supporting this great cause!'
    };

    beforeEach(() => {
      validContributionData.campaignId = testCampaign.id;
    });

    it('should create a new contribution with valid data', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validContributionData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('amount', validContributionData.amount);
      expect(response.body.data).toHaveProperty('currency', validContributionData.currency);
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.message).toBe('Contribution initiated successfully');

      testContribution = response.body.data; // For cleanup
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContain('Campaign ID is required');
      expect(response.body.details).toContain('Amount is required and must be a number');
      expect(response.body.details).toContain('Currency is required');
      expect(response.body.details).toContain('Wallet address is required');
    });

    it('should validate amount', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validContributionData,
          amount: -100
        })
        .expect(400);

      expect(response.body.details).toContain('Amount must be greater than 0');
    });

    it('should validate currency', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validContributionData,
          currency: 'INVALID'
        })
        .expect(400);

      expect(response.body.details).toContain('Currency must be one of: USD, ETH, BTC, USDC, USDT');
    });

    it('should validate wallet address', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validContributionData,
          walletAddress: 'invalid-address'
        })
        .expect(400);

      expect(response.body.details).toContain('Invalid Ethereum wallet address');
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validContributionData,
          campaignId: 'non-existent-campaign'
        })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should return 409 for inactive campaign', async () => {
      // Pause the campaign
      await dbService.updateCampaign(testCampaign.id, { status: 'paused' }, testUser.id);

      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validContributionData)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Campaign is not accepting contributions');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/contributions')
        .send(validContributionData)
        .expect(401);
    });
  });

  describe('PUT /api/contributions/:id/status', () => {
    beforeEach(async () => {
      testContribution = await dbService.createContribution({
        id: crypto.randomUUID(),
        campaignId: testCampaign.id,
        userId: testUser.id,
        amount: 500,
        currency: 'ETH',
        walletAddress: '0x1234567890123456789012345678901234567890',
        status: 'processing',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    it('should update contribution status successfully', async () => {
      const statusUpdate = {
        status: 'confirmed',
        blockNumber: 12345678
      };

      const response = await request(app)
        .put(`/api/contributions/${testContribution.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'confirmed');
      expect(response.body.data).toHaveProperty('blockNumber', 12345678);
      expect(response.body.data).toHaveProperty('confirmedAt');
      expect(response.body.message).toBe('Contribution status updated successfully');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .put(`/api/contributions/${testContribution.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid status');
    });

    it('should return 404 for non-existent contribution', async () => {
      const response = await request(app)
        .put('/api/contributions/non-existent-id/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('GET /api/contributions/campaign/:campaignId/summary', () => {
    beforeEach(async () => {
      // Create multiple contributions with different statuses
      const contributions = [
        { status: 'confirmed', amount: 100 },
        { status: 'confirmed', amount: 200 },
        { status: 'pending', amount: 150 },
        { status: 'failed', amount: 75 }
      ];

      for (const contrib of contributions) {
        await dbService.createContribution({
          id: crypto.randomUUID(),
          campaignId: testCampaign.id,
          userId: testUser.id,
          amount: contrib.amount,
          currency: 'USD',
          walletAddress: '0x1234567890123456789012345678901234567890',
          status: contrib.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    it('should return contribution summary for campaign', async () => {
      const response = await request(app)
        .get(`/api/contributions/campaign/${testCampaign.id}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total', 4);
      expect(response.body.data).toHaveProperty('confirmed', 2);
      expect(response.body.data).toHaveProperty('pending', 1);
      expect(response.body.data).toHaveProperty('failed', 1);
      expect(response.body.data).toHaveProperty('confirmedAmount', 300);
      expect(response.body.data).toHaveProperty('totalAmount', 525);
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/contributions/campaign/non-existent-id/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('POST /api/contributions/:id/refund', () => {
    beforeEach(async () => {
      testContribution = await dbService.createContribution({
        id: crypto.randomUUID(),
        campaignId: testCampaign.id,
        userId: testUser.id,
        amount: 500,
        currency: 'ETH',
        walletAddress: '0x1234567890123456789012345678901234567890',
        status: 'confirmed',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        confirmedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    it('should request refund successfully', async () => {
      const refundData = {
        reason: 'Changed my mind about the contribution'
      };

      const response = await request(app)
        .post(`/api/contributions/${testContribution.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body.message).toBe('Refund request submitted successfully');

      // Verify status was updated
      const updatedContribution = await dbService.getContribution(testContribution.id, testUser.id);
      expect(updatedContribution.status).toBe('refund_requested');
    });

    it('should return 409 for non-confirmed contributions', async () => {
      // Update contribution to pending status
      await dbService.updateContribution(testContribution.id, { status: 'pending' });

      const response = await request(app)
        .post(`/api/contributions/${testContribution.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Can only refund confirmed contributions');
    });

    it('should return 409 for completed campaigns', async () => {
      // Update campaign to completed status
      await dbService.updateCampaign(testCampaign.id, { status: 'completed' }, testUser.id);

      const response = await request(app)
        .post(`/api/contributions/${testContribution.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Cannot refund contributions from completed campaigns');
    });

    it('should return 404 for non-existent contribution', async () => {
      const response = await request(app)
        .post('/api/contributions/non-existent-id/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });
});