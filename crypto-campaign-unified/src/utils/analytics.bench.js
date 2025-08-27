import { bench, describe } from 'vitest'
import {
  calculateConversionRate,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateROAS,
  generateAnalyticsReport,
  compareAnalyticsPeriods
} from './analytics.js'

describe('Analytics Performance Benchmarks', () => {
  const largeDataset = {
    impressions: 1000000,
    clicks: 50000,
    conversions: 2500,
    spend: 10000,
    revenue: 125000
  }

  const smallDataset = {
    impressions: 1000,
    clicks: 50,
    conversions: 2,
    spend: 100,
    revenue: 500
  }

  bench('calculateConversionRate - small dataset', () => {
    calculateConversionRate(smallDataset.conversions, smallDataset.clicks)
  })

  bench('calculateConversionRate - large dataset', () => {
    calculateConversionRate(largeDataset.conversions, largeDataset.clicks)
  })

  bench('calculateCTR - small dataset', () => {
    calculateCTR(smallDataset.clicks, smallDataset.impressions)
  })

  bench('calculateCTR - large dataset', () => {
    calculateCTR(largeDataset.clicks, largeDataset.impressions)
  })

  bench('calculateCPC - small dataset', () => {
    calculateCPC(smallDataset.spend, smallDataset.clicks)
  })

  bench('calculateCPC - large dataset', () => {
    calculateCPC(largeDataset.spend, largeDataset.clicks)
  })

  bench('calculateCPA - small dataset', () => {
    calculateCPA(smallDataset.spend, smallDataset.conversions)
  })

  bench('calculateCPA - large dataset', () => {
    calculateCPA(largeDataset.spend, largeDataset.conversions)
  })

  bench('calculateROAS - small dataset', () => {
    calculateROAS(smallDataset.revenue, smallDataset.spend)
  })

  bench('calculateROAS - large dataset', () => {
    calculateROAS(largeDataset.revenue, largeDataset.spend)
  })

  bench('generateAnalyticsReport - small dataset', () => {
    generateAnalyticsReport(smallDataset)
  })

  bench('generateAnalyticsReport - large dataset', () => {
    generateAnalyticsReport(largeDataset)
  })

  bench('compareAnalyticsPeriods - small datasets', () => {
    compareAnalyticsPeriods(smallDataset, {
      impressions: 800,
      clicks: 40,
      conversions: 1,
      spend: 80,
      revenue: 200
    })
  })

  bench('compareAnalyticsPeriods - large datasets', () => {
    compareAnalyticsPeriods(largeDataset, {
      impressions: 800000,
      clicks: 40000,
      conversions: 2000,
      spend: 8000,
      revenue: 100000
    })
  })

  bench('batch analytics calculations', () => {
    const metrics = [smallDataset, largeDataset]
    metrics.forEach(metric => {
      calculateConversionRate(metric.conversions, metric.clicks)
      calculateCTR(metric.clicks, metric.impressions)
      calculateCPC(metric.spend, metric.clicks)
      calculateCPA(metric.spend, metric.conversions)
      calculateROAS(metric.revenue, metric.spend)
    })
  })
})