/**
 * Contributions API Routes
 * Handles crypto contributions to campaigns
 */

import express from 'express';
import { DatabaseService } from '../database/supabaseClient.js';
import { Web3Service } from '../web3/contractService.js';
import { validateContributionData } from '../utils/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const dbService = new DatabaseService();
const web3Service = new Web3Service();

/**
 * GET /api/contributions
 * List contributions for a user or campaign
 */
router.get('/', asyncHandler(async (req, res) => {
  const { campaignId, status, limit = 50, offset = 0 } = req.query;
  const userId = req.user.id;

  try {
    const filters = { userId };
    if (campaignId) filters.campaignId = campaignId;
    if (status) filters.status = status;

    const contributions = await dbService.getContributions(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await dbService.getContributionCount(filters);

    res.json({
      data: contributions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + contributions.length) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contributions'
    });
  }
}));

/**
 * GET /api/contributions/:id
 * Get specific contribution by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const contribution = await dbService.getContribution(id, userId);
    
    if (!contribution) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contribution not found'
      });
    }

    // Get blockchain transaction details if available
    if (contribution.transactionHash) {
      try {
        const txDetails = await web3Service.getTransactionDetails(contribution.transactionHash);
        contribution.blockchainDetails = txDetails;
      } catch (txError) {
        console.warn('Could not fetch blockchain details:', txError.message);
      }
    }

    res.json({ data: contribution });
  } catch (error) {
    console.error('Error fetching contribution:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contribution'
    });
  }
}));

/**
 * POST /api/contributions
 * Create new contribution
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const contributionData = { ...req.body, userId };

  try {
    // Validate input data
    const validation = validateContributionData(contributionData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid contribution data',
        details: validation.errors
      });
    }

    // Verify campaign exists and is active
    const campaign = await dbService.getCampaign(contributionData.campaignId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'active') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Campaign is not accepting contributions'
      });
    }

    // Check contribution limits
    const userContributions = await dbService.getUserCampaignContributions(
      userId, 
      contributionData.campaignId
    );
    
    const totalContributed = userContributions.reduce((sum, c) => sum + c.amount, 0);
    const maxContribution = campaign.maxIndividualContribution || Number.MAX_SAFE_INTEGER;
    
    if (totalContributed + contributionData.amount > maxContribution) {
      return res.status(409).json({
        error: 'Limit Exceeded',
        message: 'Contribution would exceed individual limit for this campaign'
      });
    }

    // Create pending contribution record
    const contribution = {
      id: crypto.randomUUID(),
      ...contributionData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedContribution = await dbService.createContribution(contribution);

    // Initiate blockchain transaction (async)
    web3Service.processContribution(savedContribution)
      .then(async (txHash) => {
        await dbService.updateContribution(contribution.id, {
          transactionHash: txHash,
          status: 'processing',
          updatedAt: new Date().toISOString()
        });
      })
      .catch(async (error) => {
        console.error('Blockchain transaction failed:', error);
        await dbService.updateContribution(contribution.id, {
          status: 'failed',
          error: error.message,
          updatedAt: new Date().toISOString()
        });
      });

    res.status(201).json({ 
      data: savedContribution,
      message: 'Contribution initiated successfully'
    });
  } catch (error) {
    console.error('Error creating contribution:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create contribution'
    });
  }
}));

/**
 * PUT /api/contributions/:id/status
 * Update contribution status (for blockchain confirmations)
 */
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, transactionHash, blockNumber } = req.body;
  const userId = req.user.id;

  try {
    // Verify contribution exists and belongs to user
    const existingContribution = await dbService.getContribution(id, userId);
    if (!existingContribution) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contribution not found'
      });
    }

    // Validate status transition
    const validStatuses = ['pending', 'processing', 'confirmed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid status'
      });
    }

    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (transactionHash) updates.transactionHash = transactionHash;
    if (blockNumber) updates.blockNumber = blockNumber;
    if (status === 'confirmed') updates.confirmedAt = new Date().toISOString();

    const updatedContribution = await dbService.updateContribution(id, updates);

    // Update campaign metrics if confirmed
    if (status === 'confirmed') {
      await dbService.updateCampaignMetrics(existingContribution.campaignId, {
        totalContributions: dbService.raw('total_contributions + 1'),
        totalAmount: dbService.raw(`total_amount + ${existingContribution.amount}`)
      });
    }

    res.json({
      data: updatedContribution,
      message: 'Contribution status updated successfully'
    });
  } catch (error) {
    console.error('Error updating contribution status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update contribution status'
    });
  }
}));

/**
 * GET /api/contributions/campaign/:campaignId/summary
 * Get contribution summary for a campaign
 */
router.get('/campaign/:campaignId/summary', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  try {
    // Verify user has access to campaign
    const campaign = await dbService.getCampaign(campaignId, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    const summary = await dbService.getCampaignContributionSummary(campaignId);
    
    res.json({ data: summary });
  } catch (error) {
    console.error('Error fetching contribution summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contribution summary'
    });
  }
}));

/**
 * POST /api/contributions/:id/refund
 * Request refund for a contribution
 */
router.post('/:id/refund', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;

  try {
    const contribution = await dbService.getContribution(id, userId);
    if (!contribution) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contribution not found'
      });
    }

    if (contribution.status !== 'confirmed') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Can only refund confirmed contributions'
      });
    }

    // Check refund policy (e.g., within 24 hours, campaign not completed)
    const campaign = await dbService.getCampaign(contribution.campaignId);
    if (campaign.status === 'completed') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot refund contributions from completed campaigns'
      });
    }

    // Initiate refund process
    await dbService.updateContribution(id, {
      status: 'refund_requested',
      refundReason: reason,
      refundRequestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Process blockchain refund (async)
    web3Service.processRefund(contribution)
      .then(async (txHash) => {
        await dbService.updateContribution(id, {
          refundTransactionHash: txHash,
          status: 'refund_processing',
          updatedAt: new Date().toISOString()
        });
      })
      .catch(async (error) => {
        console.error('Refund transaction failed:', error);
        await dbService.updateContribution(id, {
          status: 'refund_failed',
          refundError: error.message,
          updatedAt: new Date().toISOString()
        });
      });

    res.json({
      message: 'Refund request submitted successfully'
    });
  } catch (error) {
    console.error('Error processing refund request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process refund request'
    });
  }
}));

export { router as contributionRoutes };