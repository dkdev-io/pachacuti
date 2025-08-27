/**
 * Financial Security Tests - Donation Validation
 * Tests for donation amount validation, FEC compliance, and financial fraud prevention
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SecurityTestFramework } from '../security-test-framework.js'

describe('Donation Validation Security Tests', () => {
  let securityFramework
  let donationService

  beforeEach(() => {
    securityFramework = new SecurityTestFramework()
    donationService = new MockDonationService()
  })

  describe('Donation Amount Validation', () => {
    it('should prevent negative donation amounts', () => {
      const invalidAmounts = [-1, -100.50, -0.01, Number.NEGATIVE_INFINITY]
      
      invalidAmounts.forEach(amount => {
        expect(() => {
          donationService.processDonation({
            amount,
            donorId: 'donor_123',
            campaignId: 'camp_456'
          })
        }).toThrow('Invalid donation amount')
      })
    })

    it('should prevent zero donation amounts', () => {
      expect(() => {
        donationService.processDonation({
          amount: 0,
          donorId: 'donor_123', 
          campaignId: 'camp_456'
        })
      }).toThrow('Donation amount must be greater than zero')
    })

    it('should enforce minimum donation amounts', () => {
      const tooSmall = [0.001, 0.5, 0.99]
      
      tooSmall.forEach(amount => {
        expect(() => {
          donationService.processDonation({
            amount,
            donorId: 'donor_123',
            campaignId: 'camp_456'
          })
        }).toThrow('Minimum donation amount is $1.00')
      })
    })

    it('should handle floating point precision correctly', () => {
      const precisionTestCases = [
        { input: 10.999999999999998, expected: 11.00 },
        { input: 0.1 + 0.2, expected: 0.30 },
        { input: 1.005, expected: 1.01 }, // Banker's rounding
        { input: 1.234567890123456789, expected: 1.23 }
      ]

      precisionTestCases.forEach(testCase => {
        const donation = donationService.processDonation({
          amount: testCase.input,
          donorId: 'donor_123',
          campaignId: 'camp_456'
        })

        expect(donation.amount).toBe(testCase.expected)
      })
    })

    it('should reject extremely large amounts to prevent overflow', () => {
      const extremeAmounts = [
        Number.MAX_VALUE,
        Number.POSITIVE_INFINITY,
        999999999999999999999,
        1e20
      ]

      extremeAmounts.forEach(amount => {
        expect(() => {
          donationService.processDonation({
            amount,
            donorId: 'donor_123',
            campaignId: 'camp_456'
          })
        }).toThrow('Donation amount exceeds maximum allowed')
      })
    })
  })

  describe('FEC Compliance Validation', () => {
    it('should enforce individual contribution limits per election cycle', () => {
      const donorId = 'donor_federal_123'
      const campaignId = 'federal_camp_456'
      
      // Simulate donations throughout election cycle
      let totalDonated = 0
      const individualLimit = 2900 // 2023-2024 federal limit per candidate per election

      // Make donations up to the limit
      while (totalDonated < individualLimit) {
        const donationAmount = Math.min(500, individualLimit - totalDonated)
        const donation = donationService.processDonation({
          amount: donationAmount,
          donorId,
          campaignId,
          electionType: 'federal'
        })
        totalDonated += donation.amount
      }

      // Next donation should be rejected
      expect(() => {
        donationService.processDonation({
          amount: 1,
          donorId,
          campaignId,
          electionType: 'federal'
        })
      }).toThrow('Contribution limit exceeded for this election cycle')
    })

    it('should track aggregate contributions from same source', () => {
      const donorInfo = {
        name: 'John Doe',
        employer: 'ACME Corp',
        address: '123 Main St, City, ST 12345'
      }

      // Create multiple donor accounts with same person
      const donorIds = ['donor_1', 'donor_2', 'donor_3']
      const campaignId = 'federal_camp_456'

      donorIds.forEach(donorId => {
        donationService.setDonorInfo(donorId, donorInfo)
      })

      // Attempt to circumvent limits using multiple accounts
      donorIds.forEach((donorId, index) => {
        if (index < 2) {
          // First two should succeed
          donationService.processDonation({
            amount: 1500,
            donorId,
            campaignId,
            electionType: 'federal'
          })
        } else {
          // Third should be blocked due to aggregate limit
          expect(() => {
            donationService.processDonation({
              amount: 1500,
              donorId,
              campaignId,
              electionType: 'federal'
            })
          }).toThrow('Aggregate contribution limit exceeded')
        }
      })
    })

    it('should require donor information for contributions over $200', () => {
      const largeDonation = {
        amount: 250,
        donorId: 'donor_anonymous',
        campaignId: 'federal_camp_456',
        electionType: 'federal'
      }

      expect(() => {
        donationService.processDonation(largeDonation)
      }).toThrow('Donor information required for contributions over $200')

      // Should work with proper donor info
      donationService.setDonorInfo('donor_anonymous', {
        name: 'Anonymous Donor',
        address: '123 Main St, City, ST 12345',
        employer: 'Self-employed',
        occupation: 'Consultant'
      })

      const donation = donationService.processDonation(largeDonation)
      expect(donation.amount).toBe(250)
    })

    it('should detect and prevent straw donor schemes', () => {
      const suspiciousPatterns = [
        // Same address, different names
        {
          donations: [
            { donorId: 'donor_1', name: 'John Smith', address: '123 Main St', amount: 2000 },
            { donorId: 'donor_2', name: 'Jane Smith', address: '123 Main St', amount: 2000 },
            { donorId: 'donor_3', name: 'Bob Smith', address: '123 Main St', amount: 2000 }
          ]
        },
        // Sequential donation times
        {
          donations: [
            { donorId: 'donor_4', amount: 1000, timestamp: '2024-01-01T10:00:00Z' },
            { donorId: 'donor_5', amount: 1000, timestamp: '2024-01-01T10:00:01Z' },
            { donorId: 'donor_6', amount: 1000, timestamp: '2024-01-01T10:00:02Z' }
          ]
        }
      ]

      suspiciousPatterns.forEach((pattern, index) => {
        pattern.donations.forEach((donationData, donationIndex) => {
          if (donationIndex < 2) {
            // First two donations should succeed
            if (donationData.address) {
              donationService.setDonorInfo(donationData.donorId, {
                name: donationData.name,
                address: donationData.address
              })
            }
            donationService.processDonation({
              amount: donationData.amount,
              donorId: donationData.donorId,
              campaignId: 'federal_camp_456',
              timestamp: donationData.timestamp
            })
          } else {
            // Third should trigger fraud detection
            if (donationData.address) {
              donationService.setDonorInfo(donationData.donorId, {
                name: donationData.name,
                address: donationData.address
              })
            }
            expect(() => {
              donationService.processDonation({
                amount: donationData.amount,
                donorId: donationData.donorId,
                campaignId: 'federal_camp_456',
                timestamp: donationData.timestamp
              })
            }).toThrow('Suspicious donation pattern detected')
          }
        })
      })
    })

    it('should validate donor eligibility', () => {
      const ineligibleDonors = [
        { type: 'foreign_national', country: 'Canada' },
        { type: 'corporation', entityType: 'LLC' },
        { type: 'labor_union', entityType: 'Union' },
        { type: 'federal_contractor', contractorId: 'GOV123' },
        { type: 'minor', age: 16 }
      ]

      ineligibleDonors.forEach(donor => {
        expect(() => {
          donationService.processDonation({
            amount: 100,
            donorId: `donor_${donor.type}`,
            campaignId: 'federal_camp_456',
            donorType: donor.type,
            donorInfo: donor
          })
        }).toThrow('Ineligible donor')
      })
    })
  })

  describe('Payment Processing Security', () => {
    it('should validate credit card information', () => {
      const invalidCards = [
        { number: '1234567890123456', cvv: '123', expiry: '12/25' }, // Invalid number
        { number: '4111111111111111', cvv: '12', expiry: '12/25' }, // Invalid CVV
        { number: '4111111111111111', cvv: '123', expiry: '12/20' }, // Expired
        { number: '4111111111111111', cvv: '123', expiry: '13/25' }, // Invalid month
        { number: '4111111111111111', cvv: '1234', expiry: '12/25' }, // CVV too long
      ]

      invalidCards.forEach(card => {
        expect(() => {
          donationService.processPayment({
            amount: 100,
            paymentMethod: 'credit_card',
            cardInfo: card
          })
        }).toThrow(/invalid|expired/i)
      })
    })

    it('should detect and prevent card testing attacks', () => {
      const cardNumbers = [
        '4111111111111111',
        '4222222222222222', 
        '4333333333333333',
        '4444444444444444'
      ]

      // Rapid fire small donations with different cards
      cardNumbers.forEach((cardNumber, index) => {
        if (index < 3) {
          // First few should work
          donationService.processPayment({
            amount: 1,
            paymentMethod: 'credit_card',
            cardInfo: {
              number: cardNumber,
              cvv: '123',
              expiry: '12/25'
            }
          })
        } else {
          // Should trigger card testing detection
          expect(() => {
            donationService.processPayment({
              amount: 1,
              paymentMethod: 'credit_card', 
              cardInfo: {
                number: cardNumber,
                cvv: '123',
                expiry: '12/25'
              }
            })
          }).toThrow('Card testing attack detected')
        }
      })
    })

    it('should implement PCI DSS compliance checks', () => {
      // Mock PCI compliance validation
      const complianceChecks = {
        encryptedTransmission: true,
        tokenizedStorage: true,
        accessControls: true,
        auditLogging: true,
        vulnerabilityTesting: true,
        securityPolicies: true
      }

      Object.keys(complianceChecks).forEach(check => {
        expect(donationService.validatePCICompliance()[check]).toBe(true)
      })
    })

    it('should prevent duplicate transaction processing', () => {
      const transactionData = {
        amount: 100,
        donorId: 'donor_123',
        campaignId: 'camp_456',
        paymentMethod: 'credit_card',
        cardInfo: {
          number: '4111111111111111',
          cvv: '123',
          expiry: '12/25'
        }
      }

      // First transaction should succeed
      const transaction1 = donationService.processDonation(transactionData)
      expect(transaction1.status).toBe('completed')

      // Duplicate transaction should be rejected
      expect(() => {
        donationService.processDonation(transactionData)
      }).toThrow('Duplicate transaction detected')
    })
  })

  describe('Crypto Payment Security', () => {
    it('should validate cryptocurrency wallet addresses', () => {
      const invalidAddresses = [
        '1InvalidBitcoinAddress',
        '0xInvalidEthereumAddress',
        'invalid_address_format',
        '', // Empty address
        null, // Null address
        'bc1qinvalidbech32address'
      ]

      invalidAddresses.forEach(address => {
        expect(() => {
          donationService.processCryptoDonation({
            amount: 0.01,
            currency: 'BTC',
            walletAddress: address,
            campaignId: 'camp_456'
          })
        }).toThrow('Invalid wallet address')
      })
    })

    it('should prevent crypto dust attacks', () => {
      const dustAmounts = [
        0.00000001, // 1 satoshi
        0.0000001,  // 10 satoshis
        0.000001    // 100 satoshis
      ]

      dustAmounts.forEach(amount => {
        expect(() => {
          donationService.processCryptoDonation({
            amount,
            currency: 'BTC',
            walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            campaignId: 'camp_456'
          })
        }).toThrow('Amount below dust threshold')
      })
    })

    it('should validate transaction confirmations', () => {
      const unconfirmedTx = {
        txHash: '0x123...',
        confirmations: 0,
        amount: 1.0,
        currency: 'ETH'
      }

      expect(() => {
        donationService.confirmCryptoTransaction(unconfirmedTx)
      }).toThrow('Insufficient confirmations')

      // Should work with enough confirmations
      const confirmedTx = { ...unconfirmedTx, confirmations: 6 }
      const result = donationService.confirmCryptoTransaction(confirmedTx)
      expect(result.status).toBe('confirmed')
    })

    it('should detect potential money laundering patterns', () => {
      // Large round-number donations
      const suspiciousAmounts = [10000, 25000, 50000, 100000]
      
      suspiciousAmounts.forEach(amount => {
        const result = donationService.processCryptoDonation({
          amount: amount / 50000, // Convert to crypto equivalent
          currency: 'BTC',
          walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          campaignId: 'camp_456'
        })

        expect(result.flagged).toBe(true)
        expect(result.reason).toContain('AML screening required')
      })
    })
  })

  describe('Recurring Donation Security', () => {
    it('should validate recurring donation schedules', () => {
      const invalidSchedules = [
        { frequency: 'daily', amount: 100 }, // Too frequent
        { frequency: 'weekly', amount: 50000 }, // Amount too high
        { frequency: 'monthly', endDate: '2020-01-01' }, // End date in past
        { frequency: 'invalid', amount: 100 } // Invalid frequency
      ]

      invalidSchedules.forEach(schedule => {
        expect(() => {
          donationService.createRecurringDonation({
            donorId: 'donor_123',
            campaignId: 'camp_456',
            ...schedule
          })
        }).toThrow(/invalid|exceeded|past/i)
      })
    })

    it('should handle payment failures gracefully', () => {
      const recurringDonation = donationService.createRecurringDonation({
        donorId: 'donor_123',
        campaignId: 'camp_456',
        frequency: 'monthly',
        amount: 100
      })

      // Simulate failed payment
      const result = donationService.processRecurringPayment(recurringDonation.id, {
        simulateFailure: true
      })

      expect(result.status).toBe('failed')
      expect(result.retryCount).toBe(1)
      expect(result.nextRetryDate).toBeTruthy()
    })
  })

  afterEach(() => {
    // Generate security report if vulnerabilities found
    if (securityFramework.vulnerabilities.length > 0) {
      const report = securityFramework.generateSecurityReport()
      console.log('Financial Security Test Report:', JSON.stringify(report, null, 2))
    }
  })
})

// Mock Donation Service for testing
class MockDonationService {
  constructor() {
    this.donations = new Map()
    this.donors = new Map()
    this.electionCycleTotals = new Map()
    this.fraudDetection = new FraudDetectionService()
    this.cardTestingAttempts = 0
    this.transactionHashes = new Set()
    this.recurringDonations = new Map()
  }

  processDonation(donationData) {
    this.validateDonationAmount(donationData.amount)
    
    if (donationData.electionType === 'federal') {
      this.validateFECCompliance(donationData)
    }
    
    // Check for duplicates
    const hash = this.generateTransactionHash(donationData)
    if (this.transactionHashes.has(hash)) {
      throw new Error('Duplicate transaction detected')
    }
    
    // Fraud detection
    if (this.fraudDetection.isSuspicious(donationData)) {
      throw new Error('Suspicious donation pattern detected')
    }
    
    const donation = {
      id: `donation_${Date.now()}`,
      amount: this.normalizeAmount(donationData.amount),
      donorId: donationData.donorId,
      campaignId: donationData.campaignId,
      status: 'completed',
      timestamp: new Date().toISOString()
    }
    
    this.donations.set(donation.id, donation)
    this.transactionHashes.add(hash)
    
    return donation
  }

  validateDonationAmount(amount) {
    if (amount < 0) {
      throw new Error('Invalid donation amount')
    }
    
    if (amount === 0) {
      throw new Error('Donation amount must be greater than zero')
    }
    
    if (amount < 1) {
      throw new Error('Minimum donation amount is $1.00')
    }
    
    if (amount > 1000000 || !Number.isFinite(amount)) {
      throw new Error('Donation amount exceeds maximum allowed')
    }
  }

  normalizeAmount(amount) {
    return Math.round(amount * 100) / 100 // Round to 2 decimal places
  }

  setDonorInfo(donorId, info) {
    this.donors.set(donorId, info)
  }

  validateFECCompliance(donationData) {
    const { donorId, campaignId, amount, electionType } = donationData
    
    // Check individual contribution limits
    const limit = electionType === 'federal' ? 2900 : 5000
    const currentTotal = this.getElectionCycleTotal(donorId, campaignId)
    
    if (currentTotal + amount > limit) {
      throw new Error('Contribution limit exceeded for this election cycle')
    }
    
    // Require donor info for large donations
    if (amount > 200 && !this.donors.has(donorId)) {
      throw new Error('Donor information required for contributions over $200')
    }
    
    // Check for ineligible donors
    const donorInfo = this.donors.get(donorId)
    if (donorInfo && this.isIneligibleDonor(donorInfo, donationData.donorType)) {
      throw new Error('Ineligible donor')
    }
    
    // Update election cycle total
    this.updateElectionCycleTotal(donorId, campaignId, amount)
  }

  getElectionCycleTotal(donorId, campaignId) {
    return this.electionCycleTotals.get(`${donorId}:${campaignId}`) || 0
  }

  updateElectionCycleTotal(donorId, campaignId, amount) {
    const key = `${donorId}:${campaignId}`
    const current = this.electionCycleTotals.get(key) || 0
    this.electionCycleTotals.set(key, current + amount)
  }

  isIneligibleDonor(donorInfo, donorType) {
    const ineligibleTypes = [
      'foreign_national',
      'corporation', 
      'labor_union',
      'federal_contractor'
    ]
    
    if (ineligibleTypes.includes(donorType)) {
      return true
    }
    
    if (donorInfo.age && donorInfo.age < 18) {
      return true
    }
    
    return false
  }

  processPayment(paymentData) {
    if (paymentData.paymentMethod === 'credit_card') {
      this.validateCreditCard(paymentData.cardInfo)
      
      // Card testing detection
      this.cardTestingAttempts++
      if (this.cardTestingAttempts > 3 && paymentData.amount < 5) {
        throw new Error('Card testing attack detected')
      }
    }
    
    return { status: 'completed', transactionId: `tx_${Date.now()}` }
  }

  validateCreditCard(cardInfo) {
    const { number, cvv, expiry } = cardInfo
    
    // Luhn algorithm check
    if (!this.isValidCreditCardNumber(number)) {
      throw new Error('Invalid credit card number')
    }
    
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      throw new Error('Invalid CVV')
    }
    
    const [month, year] = expiry.split('/')
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1)
    
    if (expiryDate < new Date()) {
      throw new Error('Credit card expired')
    }
    
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      throw new Error('Invalid expiry month')
    }
  }

  isValidCreditCardNumber(number) {
    // Simplified Luhn algorithm
    const digits = number.replace(/\D/g, '').split('').map(Number)
    let sum = 0
    let isEven = false
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i]
      
      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0 && digits.length >= 13 && digits.length <= 19
  }

  validatePCICompliance() {
    return {
      encryptedTransmission: true,
      tokenizedStorage: true,
      accessControls: true,
      auditLogging: true,
      vulnerabilityTesting: true,
      securityPolicies: true
    }
  }

  processCryptoDonation(cryptoData) {
    const { amount, currency, walletAddress, campaignId } = cryptoData
    
    if (!this.isValidWalletAddress(walletAddress, currency)) {
      throw new Error('Invalid wallet address')
    }
    
    if (this.isDustAmount(amount, currency)) {
      throw new Error('Amount below dust threshold')
    }
    
    // AML screening for large amounts
    const usdEquivalent = this.convertToUSD(amount, currency)
    const flagged = usdEquivalent >= 10000
    
    return {
      id: `crypto_donation_${Date.now()}`,
      amount,
      currency,
      campaignId,
      flagged,
      reason: flagged ? 'AML screening required' : null,
      status: 'pending'
    }
  }

  isValidWalletAddress(address, currency) {
    if (!address || typeof address !== 'string') return false
    
    const patterns = {
      BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
      ETH: /^0x[a-fA-F0-9]{40}$/,
      LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/
    }
    
    return patterns[currency]?.test(address) || false
  }

  isDustAmount(amount, currency) {
    const dustThresholds = {
      BTC: 0.00000546,
      ETH: 0.000001,
      LTC: 0.00001
    }
    
    return amount < (dustThresholds[currency] || 0.000001)
  }

  convertToUSD(amount, currency) {
    const rates = { BTC: 50000, ETH: 3000, LTC: 100 }
    return amount * (rates[currency] || 1)
  }

  confirmCryptoTransaction(txData) {
    if (txData.confirmations < 3) {
      throw new Error('Insufficient confirmations')
    }
    
    return { status: 'confirmed', txHash: txData.txHash }
  }

  createRecurringDonation(recurringData) {
    const { frequency, amount, endDate } = recurringData
    
    if (frequency === 'daily') {
      throw new Error('Daily frequency not allowed')
    }
    
    if (!['weekly', 'monthly', 'quarterly'].includes(frequency)) {
      throw new Error('Invalid frequency')
    }
    
    if (amount > 10000) {
      throw new Error('Amount exceeded for recurring donations')
    }
    
    if (endDate && new Date(endDate) < new Date()) {
      throw new Error('End date cannot be in the past')
    }
    
    const recurring = {
      id: `recurring_${Date.now()}`,
      ...recurringData,
      status: 'active',
      createdAt: new Date().toISOString()
    }
    
    this.recurringDonations.set(recurring.id, recurring)
    return recurring
  }

  processRecurringPayment(recurringId, options = {}) {
    if (options.simulateFailure) {
      return {
        status: 'failed',
        retryCount: 1,
        nextRetryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }
    
    return { status: 'completed' }
  }

  generateTransactionHash(donationData) {
    return `${donationData.donorId}_${donationData.amount}_${donationData.campaignId}_${Date.now()}`
  }
}

class FraudDetectionService {
  constructor() {
    this.addressCounts = new Map()
    this.timeWindows = []
  }

  isSuspicious(donationData) {
    // Check for same address donations
    if (this.checkAddressFraud(donationData)) {
      return true
    }
    
    // Check for timing patterns
    if (this.checkTimingFraud(donationData)) {
      return true
    }
    
    return false
  }

  checkAddressFraud(donationData) {
    const donor = donationData.donorId
    const address = donationData.donorInfo?.address
    
    if (address) {
      const count = this.addressCounts.get(address) || 0
      this.addressCounts.set(address, count + 1)
      
      return count >= 2 // Suspicious if 3+ donors from same address
    }
    
    return false
  }

  checkTimingFraud(donationData) {
    const now = Date.now()
    this.timeWindows.push(now)
    
    // Keep only last 10 seconds
    this.timeWindows = this.timeWindows.filter(time => now - time < 10000)
    
    return this.timeWindows.length > 2 // Suspicious if >2 donations in 10 seconds
  }
}