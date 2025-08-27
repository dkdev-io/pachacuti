/**
 * Core Campaign Management Module
 * Handles crypto campaign lifecycle and operations
 */

export class CampaignManager {
  constructor(config = {}) {
    this.config = {
      maxCampaigns: 10,
      defaultDuration: 30, // days
      ...config
    }
    this.campaigns = new Map()
  }

  /**
   * Create a new campaign
   * @param {Object} campaignData - Campaign configuration
   * @returns {Object} Created campaign
   */
  createCampaign(campaignData) {
    const { name, type, duration, budget } = campaignData

    if (!name || !type) {
      throw new Error('Campaign name and type are required')
    }

    if (this.campaigns.size >= this.config.maxCampaigns) {
      throw new Error('Maximum number of campaigns reached')
    }

    const campaign = {
      id: crypto.randomUUID(),
      name,
      type,
      duration: duration || this.config.defaultDuration,
      budget: budget || 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      }
    }

    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  /**
   * Get campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Object|null} Campaign object or null
   */
  getCampaign(campaignId) {
    return this.campaigns.get(campaignId) || null
  }

  /**
   * Update campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated campaign
   */
  updateCampaign(campaignId, updates) {
    const campaign = this.campaigns.get(campaignId)
    
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const updatedCampaign = {
      ...campaign,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.campaigns.set(campaignId, updatedCampaign)
    return updatedCampaign
  }

  /**
   * Delete campaign
   * @param {string} campaignId - Campaign ID
   * @returns {boolean} Success status
   */
  deleteCampaign(campaignId) {
    return this.campaigns.delete(campaignId)
  }

  /**
   * List all campaigns
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of campaigns
   */
  listCampaigns(filters = {}) {
    const campaigns = Array.from(this.campaigns.values())
    
    if (filters.status) {
      return campaigns.filter(campaign => campaign.status === filters.status)
    }

    if (filters.type) {
      return campaigns.filter(campaign => campaign.type === filters.type)
    }

    return campaigns
  }

  /**
   * Activate campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Activated campaign
   */
  activateCampaign(campaignId) {
    return this.updateCampaign(campaignId, { status: 'active' })
  }

  /**
   * Pause campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Paused campaign
   */
  pauseCampaign(campaignId) {
    return this.updateCampaign(campaignId, { status: 'paused' })
  }

  /**
   * Get campaign metrics
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Campaign metrics
   */
  getCampaignMetrics(campaignId) {
    const campaign = this.getCampaign(campaignId)
    
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    return campaign.metrics
  }

  /**
   * Update campaign metrics
   * @param {string} campaignId - Campaign ID
   * @param {Object} metrics - Metrics to update
   * @returns {Object} Updated campaign
   */
  updateMetrics(campaignId, metrics) {
    const campaign = this.getCampaign(campaignId)
    
    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const updatedMetrics = {
      ...campaign.metrics,
      ...metrics
    }

    return this.updateCampaign(campaignId, { metrics: updatedMetrics })
  }
}