import { bench, describe } from 'vitest'
import { CampaignManager } from './campaign.js'

describe('Campaign Manager Performance Benchmarks', () => {
  let campaignManager

  // Setup with various campaign counts
  const setupManager = (campaignCount = 0) => {
    const manager = new CampaignManager({ maxCampaigns: 1000 })
    
    for (let i = 0; i < campaignCount; i++) {
      manager.createCampaign({
        name: `Campaign ${i}`,
        type: i % 2 === 0 ? 'display' : 'video',
        budget: Math.random() * 10000,
        duration: 30 + (i % 60)
      })
    }
    
    return manager
  }

  bench('createCampaign - single campaign', () => {
    const manager = new CampaignManager()
    manager.createCampaign({
      name: 'Test Campaign',
      type: 'display',
      budget: 1000,
      duration: 30
    })
  })

  bench('createCampaign - batch create 100 campaigns', () => {
    const manager = new CampaignManager({ maxCampaigns: 1000 })
    
    for (let i = 0; i < 100; i++) {
      manager.createCampaign({
        name: `Campaign ${i}`,
        type: i % 2 === 0 ? 'display' : 'video',
        budget: Math.random() * 10000
      })
    }
  })

  bench('getCampaign - from 100 campaigns', () => {
    const manager = setupManager(100)
    const campaigns = manager.listCampaigns()
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)]
    
    manager.getCampaign(randomCampaign.id)
  })

  bench('getCampaign - from 500 campaigns', () => {
    const manager = setupManager(500)
    const campaigns = manager.listCampaigns()
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)]
    
    manager.getCampaign(randomCampaign.id)
  })

  bench('listCampaigns - no filter (100 campaigns)', () => {
    const manager = setupManager(100)
    manager.listCampaigns()
  })

  bench('listCampaigns - no filter (500 campaigns)', () => {
    const manager = setupManager(500)
    manager.listCampaigns()
  })

  bench('listCampaigns - status filter (100 campaigns)', () => {
    const manager = setupManager(100)
    // Activate some campaigns
    const campaigns = manager.listCampaigns()
    campaigns.slice(0, 20).forEach(campaign => {
      manager.activateCampaign(campaign.id)
    })
    
    manager.listCampaigns({ status: 'active' })
  })

  bench('listCampaigns - type filter (100 campaigns)', () => {
    const manager = setupManager(100)
    manager.listCampaigns({ type: 'display' })
  })

  bench('updateCampaign - single update', () => {
    const manager = setupManager(50)
    const campaigns = manager.listCampaigns()
    const campaign = campaigns[0]
    
    manager.updateCampaign(campaign.id, {
      name: 'Updated Campaign',
      budget: 2000
    })
  })

  bench('updateMetrics - single campaign', () => {
    const manager = setupManager(50)
    const campaigns = manager.listCampaigns()
    const campaign = campaigns[0]
    
    manager.updateMetrics(campaign.id, {
      impressions: 10000,
      clicks: 500,
      conversions: 25,
      spend: 1000
    })
  })

  bench('bulk operations - create, update, activate 50 campaigns', () => {
    const manager = new CampaignManager({ maxCampaigns: 1000 })
    
    // Create 50 campaigns
    const campaignIds = []
    for (let i = 0; i < 50; i++) {
      const campaign = manager.createCampaign({
        name: `Bulk Campaign ${i}`,
        type: 'display',
        budget: 1000
      })
      campaignIds.push(campaign.id)
    }
    
    // Update all campaigns
    campaignIds.forEach(id => {
      manager.updateCampaign(id, { budget: 2000 })
    })
    
    // Activate all campaigns
    campaignIds.forEach(id => {
      manager.activateCampaign(id)
    })
  })

  bench('memory usage - large campaign management', () => {
    const manager = setupManager(200)
    
    // Simulate realistic usage pattern
    const campaigns = manager.listCampaigns()
    
    // Update metrics for random campaigns
    for (let i = 0; i < 50; i++) {
      const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)]
      manager.updateMetrics(randomCampaign.id, {
        impressions: Math.floor(Math.random() * 100000),
        clicks: Math.floor(Math.random() * 5000),
        conversions: Math.floor(Math.random() * 250),
        spend: Math.floor(Math.random() * 5000)
      })
    }
    
    // List campaigns with different filters
    manager.listCampaigns({ status: 'draft' })
    manager.listCampaigns({ type: 'display' })
  })
})