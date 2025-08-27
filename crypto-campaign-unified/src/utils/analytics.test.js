import { describe, it, expect } from 'vitest'
import {
  calculateConversionRate,
  calculateCTR,
  calculateCPC,
  calculateCPA,
  calculateROAS,
  generateAnalyticsReport,
  compareAnalyticsPeriods
} from './analytics.js'

describe('Analytics Utils', () => {
  describe('calculateConversionRate', () => {
    it('should calculate correct conversion rate', () => {
      expect(calculateConversionRate(10, 100)).toBe(10)
      expect(calculateConversionRate(25, 250)).toBe(10)
      expect(calculateConversionRate(1, 200)).toBe(0.5)
    })

    it('should return 0 for zero clicks', () => {
      expect(calculateConversionRate(10, 0)).toBe(0)
    })

    it('should handle zero conversions', () => {
      expect(calculateConversionRate(0, 100)).toBe(0)
    })
  })

  describe('calculateCTR', () => {
    it('should calculate correct CTR', () => {
      expect(calculateCTR(50, 1000)).toBe(5)
      expect(calculateCTR(100, 10000)).toBe(1)
      expect(calculateCTR(1, 1000)).toBe(0.1)
    })

    it('should return 0 for zero impressions', () => {
      expect(calculateCTR(50, 0)).toBe(0)
    })

    it('should handle zero clicks', () => {
      expect(calculateCTR(0, 1000)).toBe(0)
    })
  })

  describe('calculateCPC', () => {
    it('should calculate correct CPC', () => {
      expect(calculateCPC(100, 50)).toBe(2)
      expect(calculateCPC(250, 100)).toBe(2.5)
      expect(calculateCPC(33.33, 10)).toBeCloseTo(3.333, 2)
    })

    it('should return 0 for zero clicks', () => {
      expect(calculateCPC(100, 0)).toBe(0)
    })

    it('should handle zero spend', () => {
      expect(calculateCPC(0, 100)).toBe(0)
    })
  })

  describe('calculateCPA', () => {
    it('should calculate correct CPA', () => {
      expect(calculateCPA(200, 10)).toBe(20)
      expect(calculateCPA(500, 25)).toBe(20)
      expect(calculateCPA(100, 3)).toBeCloseTo(33.333, 2)
    })

    it('should return 0 for zero conversions', () => {
      expect(calculateCPA(200, 0)).toBe(0)
    })

    it('should handle zero spend', () => {
      expect(calculateCPA(0, 10)).toBe(0)
    })
  })

  describe('calculateROAS', () => {
    it('should calculate correct ROAS', () => {
      expect(calculateROAS(1000, 200)).toBe(5)
      expect(calculateROAS(500, 100)).toBe(5)
      expect(calculateROAS(750, 250)).toBe(3)
    })

    it('should return 0 for zero spend', () => {
      expect(calculateROAS(1000, 0)).toBe(0)
    })

    it('should handle zero revenue', () => {
      expect(calculateROAS(0, 100)).toBe(0)
    })
  })

  describe('generateAnalyticsReport', () => {
    it('should generate complete analytics report', () => {
      const metrics = {
        impressions: 10000,
        clicks: 500,
        conversions: 25,
        spend: 1000,
        revenue: 5000
      }

      const report = generateAnalyticsReport(metrics)

      expect(report.impressions).toBe(10000)
      expect(report.clicks).toBe(500)
      expect(report.conversions).toBe(25)
      expect(report.spend).toBe(1000)
      expect(report.revenue).toBe(5000)
      expect(report.ctr).toBe(5)
      expect(report.conversionRate).toBe(5)
      expect(report.cpc).toBe(2)
      expect(report.cpa).toBe(40)
      expect(report.roas).toBe(5)
      expect(report.timestamp).toBeDefined()
    })

    it('should handle missing revenue', () => {
      const metrics = {
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        spend: 100
      }

      const report = generateAnalyticsReport(metrics)

      expect(report.revenue).toBe(0)
      expect(report.roas).toBe(0)
    })

    it('should throw error for invalid metrics', () => {
      expect(() => {
        generateAnalyticsReport({})
      }).toThrow('Invalid metrics: at least one metric must be provided')
    })

    it('should handle metrics with zero values', () => {
      const metrics = {
        impressions: 1000,
        clicks: 0,
        conversions: 0,
        spend: 0
      }

      const report = generateAnalyticsReport(metrics)

      expect(report.ctr).toBe(0)
      expect(report.conversionRate).toBe(0)
      expect(report.cpc).toBe(0)
      expect(report.cpa).toBe(0)
      expect(report.roas).toBe(0)
    })
  })

  describe('compareAnalyticsPeriods', () => {
    it('should compare two periods correctly', () => {
      const current = {
        impressions: 2000,
        clicks: 200,
        conversions: 20,
        spend: 400,
        revenue: 2000
      }

      const previous = {
        impressions: 1000,
        clicks: 100,
        conversions: 10,
        spend: 200,
        revenue: 1000
      }

      const comparison = compareAnalyticsPeriods(current, previous)

      expect(comparison.current).toBeDefined()
      expect(comparison.previous).toBeDefined()
      expect(comparison.changes.impressions).toBe(100) // 100% increase
      expect(comparison.changes.clicks).toBe(100)
      expect(comparison.changes.conversions).toBe(100)
      expect(comparison.changes.spend).toBe(100)
    })

    it('should handle zero previous values', () => {
      const current = {
        impressions: 1000,
        clicks: 100,
        conversions: 10,
        spend: 200
      }

      const previous = {
        impressions: 1, // Minimal non-zero value to avoid validation error
        clicks: 0,
        conversions: 0,
        spend: 0
      }

      const comparison = compareAnalyticsPeriods(current, previous)

      expect(comparison.changes.impressions).toBe(99900) // Huge increase from 1 to 1000
      expect(comparison.changes.clicks).toBe(100) // From 0 to 100
      expect(comparison.changes.conversions).toBe(100) // From 0 to 10
      expect(comparison.changes.spend).toBe(100) // From 0 to 200
    })

    it('should handle negative changes', () => {
      const current = {
        impressions: 500,
        clicks: 50,
        conversions: 5,
        spend: 100
      }

      const previous = {
        impressions: 1000,
        clicks: 100,
        conversions: 10,
        spend: 200
      }

      const comparison = compareAnalyticsPeriods(current, previous)

      expect(comparison.changes.impressions).toBe(-50) // 50% decrease
      expect(comparison.changes.clicks).toBe(-50)
      expect(comparison.changes.conversions).toBe(-50)
      expect(comparison.changes.spend).toBe(-50)
    })
  })
})