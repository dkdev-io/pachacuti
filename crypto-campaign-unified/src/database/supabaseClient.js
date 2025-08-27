/**
 * Supabase Database Service
 * Handles database operations using Supabase client
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export class DatabaseService {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Campaign operations
  async getCampaigns(filters = {}, options = {}) {
    let query = this.supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
    
    return data || [];
  }

  async getCampaign(id, userId = null) {
    let query = this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }
    
    return data;
  }

  async createCampaign(campaignData) {
    const { data, error } = await this.supabase
      .from('campaigns')
      .insert([{
        id: campaignData.id,
        name: campaignData.name,
        type: campaignData.type,
        duration: campaignData.duration,
        budget: campaignData.budget,
        status: campaignData.status,
        user_id: campaignData.userId,
        created_at: campaignData.createdAt,
        updated_at: campaignData.updatedAt,
        metrics: campaignData.metrics
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
    
    return data;
  }

  async updateCampaign(id, updates, userId = null) {
    let query = this.supabase
      .from('campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();
    
    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
    
    return data;
  }

  async deleteCampaign(id, userId) {
    const { error } = await this.supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
    
    return true;
  }

  async getCampaignCount(filters = {}) {
    let query = this.supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { count, error } = await query;
    
    if (error) {
      throw new Error(`Failed to count campaigns: ${error.message}`);
    }
    
    return count || 0;
  }

  // Contribution operations
  async getContributions(filters = {}, options = {}) {
    let query = this.supabase
      .from('contributions')
      .select(`
        *,
        campaigns(name, type)
      `)
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch contributions: ${error.message}`);
    }
    
    return data || [];
  }

  async getContribution(id, userId = null) {
    let query = this.supabase
      .from('contributions')
      .select(`
        *,
        campaigns(name, type)
      `)
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch contribution: ${error.message}`);
    }
    
    return data;
  }

  async createContribution(contributionData) {
    const { data, error } = await this.supabase
      .from('contributions')
      .insert([{
        id: contributionData.id,
        campaign_id: contributionData.campaignId,
        user_id: contributionData.userId,
        amount: contributionData.amount,
        currency: contributionData.currency,
        wallet_address: contributionData.walletAddress,
        status: contributionData.status,
        created_at: contributionData.createdAt,
        updated_at: contributionData.updatedAt
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create contribution: ${error.message}`);
    }
    
    return data;
  }

  async updateContribution(id, updates) {
    const { data, error } = await this.supabase
      .from('contributions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update contribution: ${error.message}`);
    }
    
    return data;
  }

  // User operations
  async getUserById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    
    return data;
  }

  async createUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
    
    return data;
  }

  // Utility methods
  async hasActiveContributions(campaignId) {
    const { count, error } = await this.supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'processing', 'confirmed']);

    if (error) {
      throw new Error(`Failed to check active contributions: ${error.message}`);
    }
    
    return count > 0;
  }

  async getUserCampaignContributions(userId, campaignId) {
    const { data, error } = await this.supabase
      .from('contributions')
      .select('amount, status')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .eq('status', 'confirmed');

    if (error) {
      throw new Error(`Failed to fetch user contributions: ${error.message}`);
    }
    
    return data || [];
  }

  async getCampaignContributionSummary(campaignId) {
    const { data, error } = await this.supabase
      .from('contributions')
      .select('amount, status, created_at')
      .eq('campaign_id', campaignId);

    if (error) {
      throw new Error(`Failed to fetch contribution summary: ${error.message}`);
    }

    const summary = {
      total: 0,
      confirmed: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0,
      confirmedAmount: 0
    };

    data.forEach(contribution => {
      summary.total += 1;
      if (contribution.status === 'confirmed') {
        summary.confirmed += 1;
        summary.confirmedAmount += contribution.amount;
      } else if (contribution.status === 'pending' || contribution.status === 'processing') {
        summary.pending += 1;
      } else if (contribution.status === 'failed') {
        summary.failed += 1;
      }
      summary.totalAmount += contribution.amount;
    });

    return summary;
  }

  raw(expression) {
    // Helper for raw SQL expressions
    return { _raw: expression };
  }
}