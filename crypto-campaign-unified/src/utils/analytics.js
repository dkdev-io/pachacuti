/**
 * Analytics Utilities
 * Provides analytics calculation and reporting functions
 */

/**
 * Calculate conversion rate
 * @param {number} conversions - Number of conversions
 * @param {number} clicks - Number of clicks
 * @returns {number} Conversion rate as percentage
 */
export function calculateConversionRate(conversions, clicks) {
  if (clicks === 0) return 0
  return (conversions / clicks) * 100
}

/**
 * Calculate click-through rate
 * @param {number} clicks - Number of clicks
 * @param {number} impressions - Number of impressions
 * @returns {number} CTR as percentage
 */
export function calculateCTR(clicks, impressions) {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

/**
 * Calculate cost per click
 * @param {number} spend - Total spend
 * @param {number} clicks - Number of clicks
 * @returns {number} Cost per click
 */
export function calculateCPC(spend, clicks) {
  if (clicks === 0) return 0
  return spend / clicks
}

/**
 * Calculate cost per acquisition
 * @param {number} spend - Total spend
 * @param {number} conversions - Number of conversions
 * @returns {number} Cost per acquisition
 */
export function calculateCPA(spend, conversions) {
  if (conversions === 0) return 0
  return spend / conversions
}

/**
 * Calculate return on ad spend
 * @param {number} revenue - Revenue generated
 * @param {number} spend - Amount spent
 * @returns {number} ROAS as ratio
 */
export function calculateROAS(revenue, spend) {
  if (spend === 0) return 0
  return revenue / spend
}

/**
 * Generate analytics report
 * @param {Object} metrics - Campaign metrics
 * @returns {Object} Analytics report
 */
export function generateAnalyticsReport(metrics) {
  const { impressions = 0, clicks = 0, conversions = 0, spend = 0, revenue = 0 } = metrics

  if (impressions === 0 && clicks === 0 && conversions === 0 && spend === 0 && revenue === 0) {
    throw new Error('Invalid metrics: at least one metric must be provided')
  }

  return {
    impressions,
    clicks,
    conversions,
    spend,
    revenue,
    ctr: calculateCTR(clicks, impressions),
    conversionRate: calculateConversionRate(conversions, clicks),
    cpc: calculateCPC(spend, clicks),
    cpa: calculateCPA(spend, conversions),
    roas: calculateROAS(revenue, spend),
    timestamp: new Date().toISOString()
  }
}

/**
 * Compare two analytics periods
 * @param {Object} current - Current period metrics
 * @param {Object} previous - Previous period metrics
 * @returns {Object} Comparison report
 */
export function compareAnalyticsPeriods(current, previous) {
  const currentReport = generateAnalyticsReport(current)
  const previousReport = generateAnalyticsReport(previous)

  const calculateChange = (currentVal, previousVal) => {
    if (previousVal === 0) return currentVal > 0 ? 100 : 0
    return ((currentVal - previousVal) / previousVal) * 100
  }

  return {
    current: currentReport,
    previous: previousReport,
    changes: {
      impressions: calculateChange(currentReport.impressions, previousReport.impressions),
      clicks: calculateChange(currentReport.clicks, previousReport.clicks),
      conversions: calculateChange(currentReport.conversions, previousReport.conversions),
      spend: calculateChange(currentReport.spend, previousReport.spend),
      ctr: calculateChange(currentReport.ctr, previousReport.ctr),
      conversionRate: calculateChange(currentReport.conversionRate, previousReport.conversionRate),
      cpc: calculateChange(currentReport.cpc, previousReport.cpc),
      cpa: calculateChange(currentReport.cpa, previousReport.cpa),
      roas: calculateChange(currentReport.roas, previousReport.roas)
    }
  }
}