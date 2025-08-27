/**
 * End-to-End Integration Tests
 * Tests complete workflows and system integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app, { startServer, stopServer } from '../../backend/server.js';
import { generateToken } from '../../middleware/auth.js';
import { DatabaseService } from '../../database/supabaseClient.js';
import { Web3Service } from '../../web3/contractService.js';

// Mock external dependencies
vi.mock('../../database/supabaseClient.js');
vi.mock('../../web3/contractService.js');

describe('End-to-End Integration Tests', () => {
  let server;
  let testUser;
  let authToken;
  let mockDbService;
  let mockWeb3Service;

  beforeAll(async () => {
    server = await startServer();
    
    testUser = {
      id: 'e2e-test-user',
      email: 'e2e.test@example.com',
      role: 'user',
      status: 'active',
      permissions: ['create_campaigns', 'manage_campaigns', 'create_contributions']
    };
    
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await stopServer();
  });

  beforeEach(() => {
    // Setup mocks
    mockDbService = {
      getUserById: vi.fn(),
      getCampaigns: vi.fn(),
      getCampaign: vi.fn(),
      createCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      deleteCampaign: vi.fn(),
      getContributions: vi.fn(),
      getContribution: vi.fn(),
      createContribution: vi.fn(),
      updateContribution: vi.fn(),
      hasActiveContributions: vi.fn(),
      getCampaignContributionSummary: vi.fn()
    };

    mockWeb3Service = {
      processContribution: vi.fn(),
      processRefund: vi.fn(),
      getTransactionDetails: vi.fn(),
      getCampaignBalance: vi.fn()
    };

    vi.mocked(DatabaseService).mockImplementation(() => mockDbService);
    vi.mocked(Web3Service).mockImplementation(() => mockWeb3Service);

    // Setup default mock responses
    mockDbService.getUserById.mockResolvedValue(testUser);
    
    vi.clearAllMocks();
  });

  describe('Campaign Lifecycle', () => {
    it('should complete full campaign creation and management workflow', async () => {
      const campaignData = {
        name: 'E2E Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 5000,
        description: 'End-to-end test campaign',
        targetAmount: 10000
      };

      const createdCampaign = {
        id: 'e2e-campaign-123',
        ...campaignData,
        status: 'draft',
        userId: testUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      };

      mockDbService.createCampaign.mockResolvedValue(createdCampaign);

      // Step 1: Create campaign
      const createResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(201);

      expect(createResponse.body.data).toMatchObject({
        name: campaignData.name,
        type: campaignData.type,
        status: 'draft'
      });

      const campaignId = createResponse.body.data.id;

      // Step 2: Update campaign
      const updates = {
        budget: 7500,
        description: 'Updated description'
      };

      const updatedCampaign = { ...createdCampaign, ...updates };
      mockDbService.getCampaign.mockResolvedValue(createdCampaign);
      mockDbService.updateCampaign.mockResolvedValue(updatedCampaign);

      const updateResponse = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(updateResponse.body.data.budget).toBe(7500);
      expect(updateResponse.body.data.description).toBe('Updated description');

      // Step 3: Activate campaign
      const activatedCampaign = { ...updatedCampaign, status: 'active', activatedAt: new Date().toISOString() };
      mockDbService.updateCampaign.mockResolvedValue(activatedCampaign);

      const activateResponse = await request(app)
        .post(`/api/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(activateResponse.body.data.status).toBe('active');
      expect(activateResponse.body.data.activatedAt).toBeDefined();

      // Step 4: Verify campaign status
      mockDbService.getCampaign.mockResolvedValue(activatedCampaign);

      const getResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data.status).toBe('active');
      expect(getResponse.body.data.activatedAt).toBeDefined();

      // Step 5: Pause campaign
      const pausedCampaign = { ...activatedCampaign, status: 'paused', pausedAt: new Date().toISOString() };
      mockDbService.updateCampaign.mockResolvedValue(pausedCampaign);

      const pauseResponse = await request(app)
        .post(`/api/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pauseResponse.body.data.status).toBe('paused');

      // Step 6: Delete campaign
      mockDbService.hasActiveContributions.mockResolvedValue(false);
      mockDbService.deleteCampaign.mockResolvedValue(true);
      mockDbService.getCampaign.mockResolvedValue(pausedCampaign);

      await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify delete calls
      expect(mockDbService.deleteCampaign).toHaveBeenCalledWith(campaignId, testUser.id);
    });
  });

  describe('Contribution Workflow', () => {
    it('should complete full contribution process with blockchain integration', async () => {
      const campaign = {
        id: 'contrib-campaign-456',
        name: 'Contribution Test Campaign',
        type: 'fundraising',
        status: 'active',
        userId: testUser.id
      };

      const contributionData = {
        campaignId: campaign.id,
        amount: 250,
        currency: 'ETH',
        walletAddress: '0x1234567890123456789012345678901234567890',
        message: 'Supporting this great cause!'
      };

      const pendingContribution = {
        id: 'contribution-789',
        ...contributionData,
        userId: testUser.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Setup mocks
      mockDbService.getCampaign.mockResolvedValue(campaign);
      mockDbService.getUserCampaignContributions.mockResolvedValue([]);
      mockDbService.createContribution.mockResolvedValue(pendingContribution);
      mockWeb3Service.processContribution.mockResolvedValue('0xabcdef123456789...');

      // Step 1: Create contribution
      const createResponse = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contributionData)
        .expect(201);

      expect(createResponse.body.data).toMatchObject({
        amount: contributionData.amount,
        currency: contributionData.currency,
        status: 'pending'
      });

      const contributionId = createResponse.body.data.id;

      // Step 2: Simulate blockchain transaction processing
      const processingContribution = {
        ...pendingContribution,
        status: 'processing',
        transactionHash: '0xabcdef123456789...'
      };

      mockDbService.getContribution.mockResolvedValue(processingContribution);
      mockDbService.updateContribution.mockResolvedValue(processingContribution);

      const statusUpdateResponse = await request(app)
        .put(`/api/contributions/${contributionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'processing',
          transactionHash: '0xabcdef123456789...'
        })
        .expect(200);

      expect(statusUpdateResponse.body.data.status).toBe('processing');
      expect(statusUpdateResponse.body.data.transactionHash).toBe('0xabcdef123456789...');

      // Step 3: Simulate blockchain confirmation
      const confirmedContribution = {
        ...processingContribution,
        status: 'confirmed',
        blockNumber: 12345678,
        confirmedAt: new Date().toISOString()
      };

      mockDbService.updateContribution.mockResolvedValue(confirmedContribution);

      const confirmResponse = await request(app)
        .put(`/api/contributions/${contributionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'confirmed',
          blockNumber: 12345678
        })
        .expect(200);

      expect(confirmResponse.body.data.status).toBe('confirmed');
      expect(confirmResponse.body.data.blockNumber).toBe(12345678);
      expect(confirmResponse.body.data.confirmedAt).toBeDefined();

      // Step 4: Verify contribution details with blockchain info
      mockDbService.getContribution.mockResolvedValue(confirmedContribution);
      mockWeb3Service.getTransactionDetails.mockResolvedValue({
        hash: '0xabcdef123456789...',
        status: 'success',
        confirmations: 12,
        gasUsed: '85000'
      });

      const detailsResponse = await request(app)
        .get(`/api/contributions/${contributionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(detailsResponse.body.data.status).toBe('confirmed');
      expect(detailsResponse.body.data.blockchainDetails).toBeDefined();
      expect(detailsResponse.body.data.blockchainDetails.confirmations).toBe(12);

      // Step 5: Get contribution summary for campaign
      mockDbService.getCampaignContributionSummary.mockResolvedValue({
        total: 1,
        confirmed: 1,
        pending: 0,
        failed: 0,
        totalAmount: 250,
        confirmedAmount: 250
      });

      const summaryResponse = await request(app)
        .get(`/api/contributions/campaign/${campaign.id}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(summaryResponse.body.data.confirmed).toBe(1);
      expect(summaryResponse.body.data.confirmedAmount).toBe(250);
    });

    it('should handle contribution refund workflow', async () => {
      const campaign = {
        id: 'refund-campaign',
        name: 'Refund Test Campaign',
        status: 'active',
        userId: testUser.id
      };

      const contribution = {
        id: 'refund-contribution',
        campaignId: campaign.id,
        userId: testUser.id,
        amount: 100,
        currency: 'ETH',
        status: 'confirmed',
        transactionHash: '0xoriginal123...',
        confirmedAt: new Date().toISOString()
      };

      mockDbService.getContribution.mockResolvedValue(contribution);
      mockDbService.getCampaign.mockResolvedValue(campaign);
      mockWeb3Service.processRefund.mockResolvedValue('0xrefund456...');

      // Step 1: Request refund
      const refundRequest = await request(app)
        .post(`/api/contributions/${contribution.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(refundRequest.body.message).toBe('Refund request submitted successfully');

      // Verify refund process was called
      expect(mockDbService.updateContribution).toHaveBeenCalledWith(
        contribution.id,
        expect.objectContaining({
          status: 'refund_requested',
          refundReason: 'Changed my mind'
        })
      );
    });
  });

  describe('User Registration and Authentication Flow', () => {
    it('should complete user registration and authentication workflow', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123',
        firstName: 'John',
        lastName: 'Doe',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const createdUser = {
        id: 'new-user-123',
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        wallet_address: userData.walletAddress,
        status: 'active',
        role: 'user',
        created_at: new Date().toISOString()
      };

      mockDbService.getUserByEmail = vi.fn().mockResolvedValue(null); // User doesn't exist
      mockDbService.createUser = vi.fn().mockResolvedValue(createdUser);

      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.data.user).toMatchObject({
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName
      });
      expect(registerResponse.body.data.token).toBeDefined();
      expect(registerResponse.body.data.user.password_hash).toBeUndefined(); // Should not expose password

      const newUserToken = registerResponse.body.data.token;

      // Step 2: Use token to access protected resource
      mockDbService.getUserById.mockResolvedValue(createdUser);
      mockDbService.getCampaigns.mockResolvedValue([]);

      const protectedResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(protectedResponse.body.data).toBeDefined();

      // Step 3: Update user profile
      const profileUpdates = {
        firstName: 'Jane',
        walletAddress: '0x9876543210987654321098765432109876543210'
      };

      const updatedUser = { ...createdUser, first_name: 'Jane', wallet_address: profileUpdates.walletAddress };
      mockDbService.updateUser = vi.fn().mockResolvedValue(updatedUser);

      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send(profileUpdates)
        .expect(200);

      expect(updateResponse.body.data.first_name).toBe('Jane');
      expect(updateResponse.body.data.wallet_address).toBe(profileUpdates.walletAddress);
    });
  });

  describe('Analytics and Reporting Integration', () => {
    it('should provide comprehensive analytics across campaigns', async () => {
      const campaigns = [
        {
          id: 'analytics-campaign-1',
          name: 'Campaign 1',
          status: 'active',
          type: 'fundraising',
          userId: testUser.id
        },
        {
          id: 'analytics-campaign-2',
          name: 'Campaign 2',
          status: 'completed',
          type: 'awareness',
          userId: testUser.id
        }
      ];

      mockDbService.getCampaigns.mockResolvedValue(campaigns);
      mockDbService.getCampaignAnalytics = vi.fn()
        .mockResolvedValueOnce({
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          spend: 500,
          revenue: 2500
        })
        .mockResolvedValueOnce({
          impressions: 2000,
          clicks: 200,
          conversions: 25,
          spend: 800,
          revenue: 5000
        });

      // Step 1: Get dashboard analytics
      const dashboardResponse = await request(app)
        .get('/api/analytics/dashboard?period=30d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.summary).toMatchObject({
        totalCampaigns: 2,
        activeCampaigns: 1,
        totalContributions: 35,
        totalAmount: 7500
      });

      expect(dashboardResponse.body.data.campaigns).toHaveLength(2);

      // Step 2: Get specific campaign analytics
      mockDbService.getCampaign.mockResolvedValue(campaigns[0]);
      mockDbService.getCampaignAnalytics.mockResolvedValue({
        impressions: 1000,
        clicks: 100,
        conversions: 10,
        spend: 500,
        revenue: 2500
      });

      const campaignAnalyticsResponse = await request(app)
        .get(`/api/analytics/campaigns/${campaigns[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(campaignAnalyticsResponse.body.data.analytics).toMatchObject({
        impressions: 1000,
        clicks: 100,
        conversions: 10,
        ctr: 10, // (100/1000) * 100
        conversionRate: 10 // (10/100) * 100
      });

      // Step 3: Compare campaign performance
      const compareResponse = await request(app)
        .get('/api/analytics/performance/compare')
        .query({
          campaignIds: campaigns.map(c => c.id),
          metric: 'ctr',
          period: '30d'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(compareResponse.body.data.campaigns).toHaveLength(2);
      expect(compareResponse.body.data.summary.bestPerforming).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading errors gracefully', async () => {
      const campaignData = {
        name: 'Error Test Campaign',
        type: 'fundraising',
        duration: 30,
        budget: 1000
      };

      // Step 1: Database error during creation
      mockDbService.createCampaign.mockRejectedValue(new Error('Database connection failed'));

      const errorResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(500);

      expect(errorResponse.body.error).toBe('Internal Server Error');
      expect(errorResponse.body.message).toBe('Failed to create campaign');

      // Step 2: Authentication error
      const invalidToken = 'invalid.jwt.token';

      const authErrorResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(authErrorResponse.body.error).toBe('Unauthorized');

      // Step 3: Validation error
      const invalidCampaignData = {
        name: 'ab', // Too short
        type: 'invalid-type',
        duration: -1
      };

      const validationErrorResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCampaignData)
        .expect(400);

      expect(validationErrorResponse.body.error).toBe('Validation Error');
      expect(validationErrorResponse.body.details).toBeInstanceOf(Array);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should coordinate between database and blockchain services', async () => {
      const campaign = {
        id: 'integration-campaign',
        status: 'active',
        userId: testUser.id
      };

      const contributionData = {
        campaignId: campaign.id,
        amount: 1.5,
        currency: 'ETH',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      // Setup mocks for integrated workflow
      mockDbService.getCampaign.mockResolvedValue(campaign);
      mockDbService.getUserCampaignContributions.mockResolvedValue([]);
      mockDbService.createContribution.mockResolvedValue({
        id: 'integration-contribution',
        ...contributionData,
        userId: testUser.id,
        status: 'pending'
      });

      // Mock blockchain interaction
      mockWeb3Service.processContribution.mockImplementation(async (contribution) => {
        // Simulate blockchain processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return '0xblockchain456...';
      });

      // Create contribution (should trigger blockchain interaction)
      const response = await request(app)
        .post('/api/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contributionData)
        .expect(201);

      expect(response.body.data.status).toBe('pending');

      // Verify blockchain service was called
      expect(mockWeb3Service.processContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: campaign.id,
          amount: contributionData.amount
        })
      );
    });
  });

  describe('Security Integration', () => {
    it('should maintain security across all endpoints', async () => {
      // Test 1: SQL injection protection
      const maliciousInput = "'; DROP TABLE campaigns; --";
      
      await request(app)
        .get('/api/campaigns')
        .query({ search: maliciousInput })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should not crash

      // Test 2: XSS protection
      const xssPayload = '<script>alert("xss")</script>';
      
      const campaignData = {
        name: xssPayload,
        type: 'fundraising',
        description: xssPayload
      };

      mockDbService.createCampaign.mockImplementation(async (data) => ({
        ...data,
        id: 'security-test',
        status: 'draft'
      }));

      const xssResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send(campaignData)
        .expect(400); // Should be rejected by validation

      expect(xssResponse.body.error).toBe('Validation Error');

      // Test 3: Rate limiting
      const requests = Array(10).fill().map(() =>
        request(app)
          .get('/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      // All health checks should succeed (not rate limited)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});