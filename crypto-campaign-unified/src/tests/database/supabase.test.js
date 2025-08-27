/**
 * Supabase Database Service Tests
 * Tests database operations and integration with Supabase
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../../database/supabaseClient.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder)
  }))
}));

// Mock query builder
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: vi.fn()
};

describe('DatabaseService', () => {
  let dbService;
  let mockSupabase;

  beforeAll(() => {
    dbService = new DatabaseService();
    mockSupabase = dbService.supabase;
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
    mockQueryBuilder.then.mockResolvedValue({ data: [], error: null });
  });

  describe('Campaign Operations', () => {
    const mockCampaign = {
      id: 'test-campaign-id',
      name: 'Test Campaign',
      type: 'fundraising',
      status: 'draft',
      user_id: 'test-user-id',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    };

    describe('getCampaigns', () => {
      it('should fetch campaigns successfully', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockCampaign],
              error: null
            })
          })
        });

        const result = await dbService.getCampaigns();

        expect(mockSupabase.from).toHaveBeenCalledWith('campaigns');
        expect(result).toEqual([mockCampaign]);
      });

      it('should apply filters correctly', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [mockCampaign], error: null })
        };

        mockSupabase.from.mockReturnValue(mockQuery);

        const filters = { userId: 'test-user-id', status: 'active' };
        await dbService.getCampaigns(filters);

        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
      });

      it('should apply pagination options', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [mockCampaign], error: null })
        };

        mockSupabase.from.mockReturnValue(mockQuery);

        const options = { limit: 10, offset: 20 };
        await dbService.getCampaigns({}, options);

        expect(mockQuery.limit).toHaveBeenCalledWith(10);
        expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
      });

      it('should handle database errors', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        });

        await expect(dbService.getCampaigns()).rejects.toThrow('Failed to fetch campaigns: Database connection failed');
      });
    });

    describe('getCampaign', () => {
      it('should fetch single campaign successfully', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockCampaign,
                error: null
              })
            })
          })
        });

        const result = await dbService.getCampaign('test-campaign-id', 'test-user-id');

        expect(result).toEqual(mockCampaign);
      });

      it('should return null for not found campaign', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // Not found error code
              })
            })
          })
        });

        const result = await dbService.getCampaign('non-existent-id');

        expect(result).toBeNull();
      });

      it('should handle other database errors', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection timeout', code: 'TIMEOUT' }
              })
            })
          })
        });

        await expect(dbService.getCampaign('test-id')).rejects.toThrow('Failed to fetch campaign: Connection timeout');
      });
    });

    describe('createCampaign', () => {
      it('should create campaign successfully', async () => {
        const campaignData = {
          id: 'new-campaign-id',
          name: 'New Campaign',
          type: 'fundraising',
          userId: 'test-user-id'
        };

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...campaignData, user_id: campaignData.userId },
                error: null
              })
            })
          })
        });

        const result = await dbService.createCampaign(campaignData);

        expect(result.user_id).toBe(campaignData.userId);
        expect(result.name).toBe(campaignData.name);
      });

      it('should handle creation errors', async () => {
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Unique constraint violation' }
              })
            })
          })
        });

        const campaignData = { id: 'duplicate-id', name: 'Test', userId: 'test-user' };

        await expect(dbService.createCampaign(campaignData)).rejects.toThrow('Failed to create campaign: Unique constraint violation');
      });
    });

    describe('updateCampaign', () => {
      it('should update campaign successfully', async () => {
        const updates = { name: 'Updated Campaign', status: 'active' };
        const updatedCampaign = { ...mockCampaign, ...updates };

        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedCampaign,
                  error: null
                })
              })
            })
          })
        });

        const result = await dbService.updateCampaign('test-id', updates, 'test-user-id');

        expect(result.name).toBe('Updated Campaign');
        expect(result.status).toBe('active');
      });

      it('should include updated_at timestamp', async () => {
        const updates = { name: 'Updated' };
        let capturedUpdate = null;

        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockImplementation((data) => {
            capturedUpdate = data;
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockCampaign, ...data },
                    error: null
                  })
                })
              })
            };
          })
        });

        await dbService.updateCampaign('test-id', updates);

        expect(capturedUpdate).toHaveProperty('updated_at');
        expect(capturedUpdate.updated_at).toBeDefined();
      });
    });

    describe('deleteCampaign', () => {
      it('should delete campaign successfully', async () => {
        mockSupabase.from.mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null
              })
            })
          })
        });

        const result = await dbService.deleteCampaign('test-id', 'test-user-id');

        expect(result).toBe(true);
      });

      it('should handle deletion errors', async () => {
        mockSupabase.from.mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: 'Foreign key constraint' }
              })
            })
          })
        });

        await expect(dbService.deleteCampaign('test-id', 'test-user-id')).rejects.toThrow('Failed to delete campaign: Foreign key constraint');
      });
    });

    describe('getCampaignCount', () => {
      it('should return campaign count', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: 5,
            error: null
          })
        });

        const result = await dbService.getCampaignCount();

        expect(result).toBe(5);
      });

      it('should return 0 for null count', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: null,
            error: null
          })
        });

        const result = await dbService.getCampaignCount();

        expect(result).toBe(0);
      });
    });
  });

  describe('Contribution Operations', () => {
    const mockContribution = {
      id: 'test-contribution-id',
      campaign_id: 'test-campaign-id',
      user_id: 'test-user-id',
      amount: 100,
      currency: 'USD',
      status: 'confirmed',
      created_at: '2023-01-01T00:00:00Z'
    };

    describe('getContributions', () => {
      it('should fetch contributions with campaign info', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ ...mockContribution, campaigns: { name: 'Test Campaign', type: 'fundraising' } }],
              error: null
            })
          })
        });

        const result = await dbService.getContributions();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('campaigns');
        expect(result[0].campaigns.name).toBe('Test Campaign');
      });

      it('should apply filters correctly', async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [mockContribution], error: null })
        };

        mockSupabase.from.mockReturnValue(mockQuery);

        const filters = { userId: 'test-user-id', campaignId: 'test-campaign-id', status: 'confirmed' };
        await dbService.getContributions(filters);

        expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
        expect(mockQuery.eq).toHaveBeenCalledWith('campaign_id', 'test-campaign-id');
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'confirmed');
      });
    });

    describe('createContribution', () => {
      it('should create contribution successfully', async () => {
        const contributionData = {
          id: 'new-contribution-id',
          campaignId: 'test-campaign-id',
          userId: 'test-user-id',
          amount: 250,
          currency: 'ETH'
        };

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...contributionData,
                  campaign_id: contributionData.campaignId,
                  user_id: contributionData.userId
                },
                error: null
              })
            })
          })
        });

        const result = await dbService.createContribution(contributionData);

        expect(result.campaign_id).toBe(contributionData.campaignId);
        expect(result.user_id).toBe(contributionData.userId);
        expect(result.amount).toBe(contributionData.amount);
      });
    });

    describe('updateContribution', () => {
      it('should update contribution successfully', async () => {
        const updates = { status: 'confirmed', transactionHash: '0x123...' };

        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockContribution, ...updates },
                  error: null
                })
              })
            })
          })
        });

        const result = await dbService.updateContribution('test-id', updates);

        expect(result.status).toBe('confirmed');
        expect(result.transactionHash).toBe('0x123...');
      });
    });
  });

  describe('User Operations', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      status: 'active',
      role: 'user',
      created_at: '2023-01-01T00:00:00Z'
    };

    describe('getUserById', () => {
      it('should fetch user by ID successfully', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null
              })
            })
          })
        });

        const result = await dbService.getUserById('test-user-id');

        expect(result).toEqual(mockUser);
      });

      it('should return null for non-existent user', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        });

        const result = await dbService.getUserById('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('createUser', () => {
      it('should create user successfully', async () => {
        const userData = {
          id: 'new-user-id',
          email: 'new@example.com',
          first_name: 'Jane',
          last_name: 'Smith'
        };

        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: userData,
                error: null
              })
            })
          })
        });

        const result = await dbService.createUser(userData);

        expect(result).toEqual(userData);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('hasActiveContributions', () => {
      it('should return true when active contributions exist', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                count: 3,
                error: null
              })
            })
          })
        });

        const result = await dbService.hasActiveContributions('campaign-id');

        expect(result).toBe(true);
      });

      it('should return false when no active contributions exist', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                count: 0,
                error: null
              })
            })
          })
        });

        const result = await dbService.hasActiveContributions('campaign-id');

        expect(result).toBe(false);
      });
    });

    describe('getUserCampaignContributions', () => {
      it('should fetch user contributions for campaign', async () => {
        const contributions = [
          { amount: 100, status: 'confirmed' },
          { amount: 200, status: 'confirmed' }
        ];

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: contributions,
                  error: null
                })
              })
            })
          })
        });

        const result = await dbService.getUserCampaignContributions('user-id', 'campaign-id');

        expect(result).toEqual(contributions);
      });
    });

    describe('getCampaignContributionSummary', () => {
      it('should calculate contribution summary correctly', async () => {
        const contributions = [
          { amount: 100, status: 'confirmed', created_at: '2023-01-01T00:00:00Z' },
          { amount: 200, status: 'confirmed', created_at: '2023-01-02T00:00:00Z' },
          { amount: 150, status: 'pending', created_at: '2023-01-03T00:00:00Z' },
          { amount: 75, status: 'failed', created_at: '2023-01-04T00:00:00Z' }
        ];

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: contributions,
              error: null
            })
          })
        });

        const result = await dbService.getCampaignContributionSummary('campaign-id');

        expect(result).toEqual({
          total: 4,
          confirmed: 2,
          pending: 1,
          failed: 1,
          totalAmount: 525,
          confirmedAmount: 300
        });
      });

      it('should handle empty contribution list', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        });

        const result = await dbService.getCampaignContributionSummary('campaign-id');

        expect(result).toEqual({
          total: 0,
          confirmed: 0,
          pending: 0,
          failed: 0,
          totalAmount: 0,
          confirmedAmount: 0
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockRejectedValue(new Error('Network error'))
        })
      });

      await expect(dbService.getCampaigns()).rejects.toThrow('Network error');
    });

    it('should handle malformed responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(null) // Malformed response
        })
      });

      const result = await dbService.getCampaigns();
      expect(result).toEqual([]);
    });
  });
});