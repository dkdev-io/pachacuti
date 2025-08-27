import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CampaignManager } from './campaign.js'

describe('CampaignManager', () => {
  let campaignManager

  beforeEach(() => {
    campaignManager = new CampaignManager()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(campaignManager.config.maxCampaigns).toBe(10)
      expect(campaignManager.config.defaultDuration).toBe(30)
      expect(campaignManager.campaigns.size).toBe(0)
    })

    it('should merge custom config with defaults', () => {
      const customManager = new CampaignManager({ maxCampaigns: 5 })
      expect(customManager.config.maxCampaigns).toBe(5)
      expect(customManager.config.defaultDuration).toBe(30)
    })
  })

  describe('createCampaign', () => {
    it('should create a campaign with required fields', () => {
      const campaignData = { name: 'Test Campaign', type: 'display' }
      const campaign = campaignManager.createCampaign(campaignData)

      expect(campaign.id).toBeDefined()
      expect(campaign.name).toBe('Test Campaign')
      expect(campaign.type).toBe('display')
      expect(campaign.duration).toBe(30)
      expect(campaign.status).toBe('draft')
      expect(campaign.createdAt).toBeDefined()
      expect(campaign.updatedAt).toBeDefined()
      expect(campaign.metrics).toEqual({
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      })
    })

    it('should create campaign with custom duration and budget', () => {
      const campaignData = { 
        name: 'Custom Campaign', 
        type: 'video',
        duration: 60,
        budget: 1000
      }
      const campaign = campaignManager.createCampaign(campaignData)

      expect(campaign.duration).toBe(60)
      expect(campaign.budget).toBe(1000)
    })

    it('should throw error if name is missing', () => {
      expect(() => {
        campaignManager.createCampaign({ type: 'display' })
      }).toThrow('Campaign name and type are required')
    })

    it('should throw error if type is missing', () => {
      expect(() => {
        campaignManager.createCampaign({ name: 'Test Campaign' })
      }).toThrow('Campaign name and type are required')
    })

    it('should throw error if max campaigns reached', () => {
      const limitedManager = new CampaignManager({ maxCampaigns: 1 })
      limitedManager.createCampaign({ name: 'First', type: 'display' })

      expect(() => {
        limitedManager.createCampaign({ name: 'Second', type: 'display' })
      }).toThrow('Maximum number of campaigns reached')
    })
  })

  describe('getCampaign', () => {
    it('should return campaign by ID', () => {
      const created = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const retrieved = campaignManager.getCampaign(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should return null for non-existent campaign', () => {
      const result = campaignManager.getCampaign('non-existent-id')
      expect(result).toBe(null)
    })
  })

  describe('updateCampaign', () => {
    it('should update campaign successfully', async () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const originalUpdatedAt = campaign.updatedAt
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const updates = { name: 'Updated Test', budget: 500 }
      const updated = campaignManager.updateCampaign(campaign.id, updates)

      expect(updated.name).toBe('Updated Test')
      expect(updated.budget).toBe(500)
      expect(updated.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('should throw error for non-existent campaign', () => {
      expect(() => {
        campaignManager.updateCampaign('non-existent', { name: 'Updated' })
      }).toThrow('Campaign not found')
    })
  })

  describe('deleteCampaign', () => {
    it('should delete campaign successfully', () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const deleted = campaignManager.deleteCampaign(campaign.id)

      expect(deleted).toBe(true)
      expect(campaignManager.getCampaign(campaign.id)).toBe(null)
    })

    it('should return false for non-existent campaign', () => {
      const deleted = campaignManager.deleteCampaign('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('listCampaigns', () => {
    beforeEach(() => {
      campaignManager.createCampaign({ name: 'Active Campaign', type: 'display' })
      const pausedId = campaignManager.createCampaign({ name: 'Paused Campaign', type: 'video' }).id
      campaignManager.updateCampaign(pausedId, { status: 'paused' })
    })

    it('should return all campaigns without filters', () => {
      const campaigns = campaignManager.listCampaigns()
      expect(campaigns.length).toBe(2)
    })

    it('should filter by status', () => {
      const activeCampaigns = campaignManager.listCampaigns({ status: 'draft' })
      const pausedCampaigns = campaignManager.listCampaigns({ status: 'paused' })

      expect(activeCampaigns.length).toBe(1)
      expect(pausedCampaigns.length).toBe(1)
      expect(activeCampaigns[0].name).toBe('Active Campaign')
      expect(pausedCampaigns[0].name).toBe('Paused Campaign')
    })

    it('should filter by type', () => {
      const displayCampaigns = campaignManager.listCampaigns({ type: 'display' })
      const videoCampaigns = campaignManager.listCampaigns({ type: 'video' })

      expect(displayCampaigns.length).toBe(1)
      expect(videoCampaigns.length).toBe(1)
    })
  })

  describe('activateCampaign', () => {
    it('should activate campaign', () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const activated = campaignManager.activateCampaign(campaign.id)

      expect(activated.status).toBe('active')
    })
  })

  describe('pauseCampaign', () => {
    it('should pause campaign', () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const paused = campaignManager.pauseCampaign(campaign.id)

      expect(paused.status).toBe('paused')
    })
  })

  describe('getCampaignMetrics', () => {
    it('should return campaign metrics', () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const metrics = campaignManager.getCampaignMetrics(campaign.id)

      expect(metrics).toEqual({
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      })
    })

    it('should throw error for non-existent campaign', () => {
      expect(() => {
        campaignManager.getCampaignMetrics('non-existent')
      }).toThrow('Campaign not found')
    })
  })

  describe('updateMetrics', () => {
    it('should update campaign metrics', () => {
      const campaign = campaignManager.createCampaign({ name: 'Test', type: 'display' })
      const newMetrics = { impressions: 1000, clicks: 50 }
      
      const updated = campaignManager.updateMetrics(campaign.id, newMetrics)

      expect(updated.metrics.impressions).toBe(1000)
      expect(updated.metrics.clicks).toBe(50)
      expect(updated.metrics.conversions).toBe(0) // unchanged
    })

    it('should throw error for non-existent campaign', () => {
      expect(() => {
        campaignManager.updateMetrics('non-existent', { impressions: 100 })
      }).toThrow('Campaign not found')
    })
  })
})