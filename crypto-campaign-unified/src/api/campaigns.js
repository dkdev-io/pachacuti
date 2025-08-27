/**
 * Campaign API Routes
 * Handles CRUD operations for campaigns
 */

import express from 'express';
import { CampaignManager } from '../core/campaign.js';
import { DatabaseService } from '../database/supabaseClient.js';
import { validateCampaignData } from '../utils/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const campaignManager = new CampaignManager();
const dbService = new DatabaseService();

/**
 * GET /api/campaigns
 * List all campaigns with optional filtering
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status, type, limit = 50, offset = 0 } = req.query;
  const userId = req.user.id;

  try {
    const filters = { userId };
    if (status) filters.status = status;
    if (type) filters.type = type;

    const campaigns = await dbService.getCampaigns(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await dbService.getCampaignCount(filters);

    res.json({
      data: campaigns,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + campaigns.length) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaigns'
    });
  }
}));

/**
 * GET /api/campaigns/:id
 * Get specific campaign by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const campaign = await dbService.getCampaign(id, userId);
    
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    res.json({ data: campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaign'
    });
  }
}));

/**
 * POST /api/campaigns
 * Create new campaign
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const campaignData = { ...req.body, userId };

  try {
    // Validate input data
    const validation = validateCampaignData(campaignData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid campaign data',
        details: validation.errors
      });
    }

    // Create campaign using manager
    const campaign = campaignManager.createCampaign(campaignData);
    
    // Save to database
    const savedCampaign = await dbService.createCampaign(campaign);

    res.status(201).json({ 
      data: savedCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    
    if (error.message === 'Maximum number of campaigns reached') {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create campaign'
    });
  }
}));

/**
 * PUT /api/campaigns/:id
 * Update existing campaign
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updates = req.body;

  try {
    // Verify campaign exists and belongs to user
    const existingCampaign = await dbService.getCampaign(id, userId);
    if (!existingCampaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Validate update data
    const validation = validateCampaignData(updates, true);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid update data',
        details: validation.errors
      });
    }

    // Update campaign
    const updatedCampaign = await dbService.updateCampaign(id, updates, userId);

    res.json({
      data: updatedCampaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update campaign'
    });
  }
}));

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Verify campaign exists and belongs to user
    const existingCampaign = await dbService.getCampaign(id, userId);
    if (!existingCampaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Check if campaign can be deleted (e.g., not active with ongoing contributions)
    if (existingCampaign.status === 'active') {
      const hasContributions = await dbService.hasActiveContributions(id);
      if (hasContributions) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete campaign with active contributions'
        });
      }
    }

    await dbService.deleteCampaign(id, userId);

    res.json({
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete campaign'
    });
  }
}));

/**
 * POST /api/campaigns/:id/activate
 * Activate campaign
 */
router.post('/:id/activate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const campaign = await dbService.getCampaign(id, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    if (campaign.status === 'active') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Campaign is already active'
      });
    }

    const activatedCampaign = await dbService.updateCampaign(
      id, 
      { status: 'active', activatedAt: new Date().toISOString() }, 
      userId
    );

    res.json({
      data: activatedCampaign,
      message: 'Campaign activated successfully'
    });
  } catch (error) {
    console.error('Error activating campaign:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to activate campaign'
    });
  }
}));

/**
 * POST /api/campaigns/:id/pause
 * Pause campaign
 */
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const campaign = await dbService.getCampaign(id, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    if (campaign.status === 'paused') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Campaign is already paused'
      });
    }

    const pausedCampaign = await dbService.updateCampaign(
      id, 
      { status: 'paused', pausedAt: new Date().toISOString() }, 
      userId
    );

    res.json({
      data: pausedCampaign,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to pause campaign'
    });
  }
}));

export { router as campaignRoutes };