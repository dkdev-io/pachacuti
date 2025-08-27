/**
 * Campaign API Endpoint Tests
 * Tests all campaign-related API endpoints using Supertest
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app, { startServer, stopServer } from '../../backend/server.js';
import { DatabaseService } from '../../database/supabaseClient.js';
import { generateToken } from '../../middleware/auth.js';

const dbService = new DatabaseService();

describe('Campaign API Endpoints', () => {
  let server;
  let authToken;
  let testUser;
  let testCampaign;

  beforeAll(async () => {
    server = await startServer();
    
    // Create test user
    testUser = {
      id: 'test-user-campaigns',
      email: 'campaigns.test@example.com',
      role: 'user',
      status: 'active',
      permissions: ['create_campaigns', 'manage_campaigns']
    };
    
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await stopServer();
  });

  beforeEach(async () => {
    // Clean up before each test
    try {
      await dbService.deleteCampaign(testCampaign?.id, testUser.id);
    } catch (error) {
      // Campaign might not exist, ignore error
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await dbService.deleteCampaign(testCampaign?.id, testUser.id);
    } catch (error) {
      // Campaign might not exist, ignore error
    }
  });

  describe('GET /api/campaigns', () => {
    it('should return empty list when no campaigns exist', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/campaigns')
        .expect(401);
    });

    it('should return campaigns with correct pagination', async () => {
      // Create multiple test campaigns
      const campaigns = [];
      for (let i = 0; i < 3; i++) {
        const campaign = {
          name: `Test Campaign ${i}`,
          type: 'fundraising',
          duration: 30,
          budget: 1000,
          userId: testUser.id
        };
        
        const created = await dbService.createCampaign({
          id: crypto.randomUUID(),
          ...campaign,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
        });
        campaigns.push(created);
      }

      const response = await request(app)
        .get('/api/campaigns?limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.hasMore).toBe(true);

      // Cleanup
      for (const campaign of campaigns) {
        await dbService.deleteCampaign(campaign.id, testUser.id);
      }
    });

    it('should filter campaigns by status', async () => {
      // Create campaigns with different statuses
      const activeCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Active Campaign',
        type: 'fundraising',
        status: 'active',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });

      const draftCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Draft Campaign',
        type: 'fundraising',
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });

      const response = await request(app)
        .get('/api/campaigns?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');

      // Cleanup
      await dbService.deleteCampaign(activeCampaign.id, testUser.id);
      await dbService.deleteCampaign(draftCampaign.id, testUser.id);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    beforeEach(async () => {
      testCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });
    });

    it('should return campaign by ID', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testCampaign.id);
      expect(response.body.data).toHaveProperty('name', 'Test Campaign');
      expect(response.body.data).toHaveProperty('type', 'fundraising');
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/campaigns/${testCampaign.id}`)
        .expect(401);
    });
  });

  describe('POST /api/campaigns', () => {
    const validCampaignData = {
      name: 'New Test Campaign',
      type: 'fundraising',
      duration: 30,
      budget: 5000,
      description: 'A test campaign for fundraising'
    };

    it('should create a new campaign with valid data', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validCampaignData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', validCampaignData.name);
      expect(response.body.data).toHaveProperty('type', validCampaignData.type);
      expect(response.body.data).toHaveProperty('status', 'draft');
      expect(response.body.message).toBe('Campaign created successfully');

      testCampaign = response.body.data; // For cleanup
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContain('Campaign name is required');
      expect(response.body.details).toContain('Campaign type is required');
    });

    it('should validate campaign name length', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'ab', // Too short
          type: 'fundraising'
        })
        .expect(400);

      expect(response.body.details).toContain('Campaign name must be between 3 and 100 characters');
    });

    it('should validate campaign type', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Valid Campaign Name',
          type: 'invalid-type'
        })
        .expect(400);

      expect(response.body.details).toContain('Campaign type must be one of: fundraising, awareness, advocacy, donation');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/campaigns')
        .send(validCampaignData)
        .expect(401);
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    beforeEach(async () => {
      testCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });
    });

    it('should update campaign with valid data', async () => {
      const updates = {
        name: 'Updated Campaign Name',
        budget: 2000,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toHaveProperty('name', updates.name);
      expect(response.body.data).toHaveProperty('budget', updates.budget);
      expect(response.body.data).toHaveProperty('description', updates.description);
      expect(response.body.message).toBe('Campaign updated successfully');
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .put('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget: -100 // Invalid negative budget
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContain('Budget must be a non-negative number');
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    beforeEach(async () => {
      testCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });
    });

    it('should delete campaign successfully', async () => {
      const response = await request(app)
        .delete(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Campaign deleted successfully');

      // Verify campaign is deleted
      await request(app)
        .get(`/api/campaigns/${testCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      testCampaign = null; // Prevent cleanup attempt
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .delete('/api/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('POST /api/campaigns/:id/activate', () => {
    beforeEach(async () => {
      testCampaign = await dbService.createCampaign({
        id: crypto.randomUUID(),
        name: 'Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      });
    });

    it('should activate campaign successfully', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'active');
      expect(response.body.data).toHaveProperty('activatedAt');
      expect(response.body.message).toBe('Campaign activated successfully');
    });

    it('should return 409 for already active campaign', async () => {
      // First activation
      await request(app)
        .post(`/api/campaigns/${testCampaign.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second activation should fail
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Campaign is already active');
    });
  });

  describe('POST /api/campaigns/:id/pause', () => {
    beforeEach(async () => {
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

    it('should pause campaign successfully', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'paused');
      expect(response.body.data).toHaveProperty('pausedAt');
      expect(response.body.message).toBe('Campaign paused successfully');
    });

    it('should return 409 for already paused campaign', async () => {
      // First pause
      await request(app)
        .post(`/api/campaigns/${testCampaign.id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second pause should fail
      const response = await request(app)
        .post(`/api/campaigns/${testCampaign.id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe('Campaign is already paused');
    });
  });
});