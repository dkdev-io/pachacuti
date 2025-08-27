/**
 * Analytics API Routes
 * Provides campaign analytics and reporting endpoints
 */

import express from 'express';
import { DatabaseService } from '../database/supabaseClient.js';
import { generateAnalyticsReport, compareAnalyticsPeriods } from '../utils/analytics.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const dbService = new DatabaseService();

/**
 * GET /api/analytics/campaigns/:id
 * Get analytics for a specific campaign
 */
router.get('/campaigns/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = '30d', compare = false } = req.query;
  const userId = req.user.id;

  try {
    // Verify campaign access
    const campaign = await dbService.getCampaign(id, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Get campaign analytics
    const analytics = await dbService.getCampaignAnalytics(id, period);
    
    const report = generateAnalyticsReport(analytics);

    let comparison = null;
    if (compare === 'true') {
      const previousPeriod = getPreviousPeriod(period);
      const previousAnalytics = await dbService.getCampaignAnalytics(id, previousPeriod);
      comparison = compareAnalyticsPeriods(analytics, previousAnalytics);
    }

    res.json({
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status
        },
        period,
        analytics: report,
        comparison
      }
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch campaign analytics'
    });
  }
}));

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics for all user campaigns
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const userId = req.user.id;

  try {
    // Get user's campaigns
    const campaigns = await dbService.getCampaigns({ userId });
    
    if (campaigns.length === 0) {
      return res.json({
        data: {
          summary: {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalContributions: 0,
            totalAmount: 0
          },
          campaigns: [],
          period
        }
      });
    }

    // Get analytics for all campaigns
    const campaignAnalytics = await Promise.all(
      campaigns.map(async (campaign) => {
        const analytics = await dbService.getCampaignAnalytics(campaign.id, period);
        const report = generateAnalyticsReport(analytics);
        
        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: campaign.status,
          analytics: report
        };
      })
    );

    // Calculate summary statistics
    const summary = campaignAnalytics.reduce((acc, campaign) => {
      const analytics = campaign.analytics;
      
      return {
        totalCampaigns: acc.totalCampaigns + 1,
        activeCampaigns: acc.activeCampaigns + (campaign.status === 'active' ? 1 : 0),
        totalContributions: acc.totalContributions + analytics.conversions,
        totalAmount: acc.totalAmount + analytics.revenue,
        totalImpressions: acc.totalImpressions + analytics.impressions,
        totalClicks: acc.totalClicks + analytics.clicks,
        totalSpend: acc.totalSpend + analytics.spend
      };
    }, {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalContributions: 0,
      totalAmount: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalSpend: 0
    });

    res.json({
      data: {
        summary,
        campaigns: campaignAnalytics,
        period
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard analytics'
    });
  }
}));

/**
 * GET /api/analytics/contributions/:id
 * Get contribution analytics for a campaign
 */
router.get('/contributions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { groupBy = 'day', period = '30d' } = req.query;
  const userId = req.user.id;

  try {
    // Verify campaign access
    const campaign = await dbService.getCampaign(id, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Get contribution analytics
    const contributions = await dbService.getContributionAnalytics(id, period, groupBy);
    
    // Process data for different groupings
    const processedData = processContributionData(contributions, groupBy);

    res.json({
      data: {
        campaignId: id,
        campaignName: campaign.name,
        period,
        groupBy,
        contributions: processedData
      }
    });
  } catch (error) {
    console.error('Contribution analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch contribution analytics'
    });
  }
}));

/**
 * GET /api/analytics/performance/compare
 * Compare performance across campaigns
 */
router.get('/performance/compare', asyncHandler(async (req, res) => {
  const { campaignIds, metric = 'ctr', period = '30d' } = req.query;
  const userId = req.user.id;

  try {
    if (!campaignIds) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Campaign IDs are required'
      });
    }

    const ids = Array.isArray(campaignIds) ? campaignIds : campaignIds.split(',');
    
    if (ids.length > 10) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Maximum 10 campaigns can be compared at once'
      });
    }

    // Verify all campaigns belong to user
    const campaigns = await Promise.all(
      ids.map(id => dbService.getCampaign(id, userId))
    );

    const notFound = campaigns.findIndex(campaign => !campaign);
    if (notFound !== -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Campaign ${ids[notFound]} not found`
      });
    }

    // Get performance data for each campaign
    const performanceData = await Promise.all(
      campaigns.map(async (campaign) => {
        const analytics = await dbService.getCampaignAnalytics(campaign.id, period);
        const report = generateAnalyticsReport(analytics);
        
        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: campaign.status,
          metricValue: report[metric] || 0,
          analytics: report
        };
      })
    );

    // Sort by metric value
    performanceData.sort((a, b) => b.metricValue - a.metricValue);

    res.json({
      data: {
        metric,
        period,
        campaigns: performanceData,
        summary: {
          bestPerforming: performanceData[0],
          averageValue: performanceData.reduce((sum, c) => sum + c.metricValue, 0) / performanceData.length
        }
      }
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to compare campaign performance'
    });
  }
}));

/**
 * GET /api/analytics/export/:id
 * Export campaign analytics data
 */
router.get('/export/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format = 'json', period = '30d' } = req.query;
  const userId = req.user.id;

  try {
    // Verify campaign access
    const campaign = await dbService.getCampaign(id, userId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Get detailed analytics data
    const analytics = await dbService.getCampaignAnalytics(id, period);
    const contributions = await dbService.getContributions({ campaignId: id });
    
    const exportData = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        createdAt: campaign.created_at
      },
      analytics: generateAnalyticsReport(analytics),
      contributions: contributions.map(c => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        createdAt: c.created_at,
        confirmedAt: c.confirmed_at
      })),
      exportedAt: new Date().toISOString(),
      period
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=campaign-${id}-analytics.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=campaign-${id}-analytics.json`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export analytics'
    });
  }
}));

// Helper functions
function getPreviousPeriod(period) {
  // Simple implementation - in production, this would be more sophisticated
  const periodMap = {
    '7d': '14d',
    '30d': '60d',
    '90d': '180d'
  };
  return periodMap[period] || '60d';
}

function processContributionData(contributions, groupBy) {
  // Group contributions by time period
  const grouped = {};
  
  contributions.forEach(contribution => {
    const key = getGroupKey(contribution.created_at, groupBy);
    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        count: 0,
        amount: 0,
        contributions: []
      };
    }
    
    grouped[key].count += 1;
    grouped[key].amount += contribution.amount;
    grouped[key].contributions.push(contribution);
  });
  
  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

function getGroupKey(dateString, groupBy) {
  const date = new Date(dateString);
  
  switch (groupBy) {
    case 'hour':
      return date.toISOString().substring(0, 13) + ':00:00.000Z';
    case 'day':
      return date.toISOString().substring(0, 10);
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().substring(0, 10);
    case 'month':
      return date.toISOString().substring(0, 7);
    default:
      return date.toISOString().substring(0, 10);
  }
}

function convertToCSV(data) {
  // Simple CSV conversion - in production, use a proper CSV library
  const contributions = data.contributions;
  
  const headers = ['ID', 'Amount', 'Currency', 'Status', 'Created At', 'Confirmed At'];
  const rows = contributions.map(c => [
    c.id,
    c.amount,
    c.currency,
    c.status,
    c.createdAt,
    c.confirmedAt || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export { router as analyticsRoutes };