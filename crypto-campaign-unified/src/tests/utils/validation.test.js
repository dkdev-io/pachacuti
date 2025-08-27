/**
 * Validation Utilities Tests
 * Tests data validation functions and security validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateCampaignData,
  validateContributionData,
  validateUserData,
  validateAnalyticsQuery,
  validateSearchQuery,
  validateRateLimit,
  validateFileUpload,
  sanitizeString
} from '../../utils/validation.js';

describe('Validation Utilities', () => {
  describe('validateCampaignData', () => {
    const validCampaignData = {
      name: 'Test Campaign',
      type: 'fundraising',
      duration: 30,
      budget: 5000,
      description: 'A test campaign for fundraising',
      targetAmount: 10000,
      maxIndividualContribution: 1000
    };

    describe('Creation validation', () => {
      it('should validate correct campaign data', () => {
        const result = validateCampaignData(validCampaignData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require campaign name', () => {
        const result = validateCampaignData({ ...validCampaignData, name: undefined });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Campaign name is required and must be a string');
      });

      it('should validate campaign name length', () => {
        const shortName = validateCampaignData({ ...validCampaignData, name: 'ab' });
        expect(shortName.valid).toBe(false);
        expect(shortName.errors).toContain('Campaign name must be between 3 and 100 characters');

        const longName = 'a'.repeat(101);
        const longResult = validateCampaignData({ ...validCampaignData, name: longName });
        expect(longResult.valid).toBe(false);
        expect(longResult.errors).toContain('Campaign name must be between 3 and 100 characters');
      });

      it('should require campaign type', () => {
        const result = validateCampaignData({ ...validCampaignData, type: undefined });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Campaign type is required');
      });

      it('should validate campaign type values', () => {
        const result = validateCampaignData({ ...validCampaignData, type: 'invalid-type' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Campaign type must be one of: fundraising, awareness, advocacy, donation');
      });

      it('should accept valid campaign types', () => {
        const types = ['fundraising', 'awareness', 'advocacy', 'donation'];
        
        types.forEach(type => {
          const result = validateCampaignData({ ...validCampaignData, type });
          expect(result.valid).toBe(true);
        });
      });

      it('should validate duration range', () => {
        const shortDuration = validateCampaignData({ ...validCampaignData, duration: 0 });
        expect(shortDuration.valid).toBe(false);
        expect(shortDuration.errors).toContain('Duration must be an integer between 1 and 365 days');

        const longDuration = validateCampaignData({ ...validCampaignData, duration: 400 });
        expect(longDuration.valid).toBe(false);
        expect(longDuration.errors).toContain('Duration must be an integer between 1 and 365 days');

        const floatDuration = validateCampaignData({ ...validCampaignData, duration: 30.5 });
        expect(floatDuration.valid).toBe(false);
        expect(floatDuration.errors).toContain('Duration must be an integer between 1 and 365 days');
      });

      it('should validate budget', () => {
        const negativeBudget = validateCampaignData({ ...validCampaignData, budget: -100 });
        expect(negativeBudget.valid).toBe(false);
        expect(negativeBudget.errors).toContain('Budget must be a non-negative number');
      });

      it('should validate status values', () => {
        const result = validateCampaignData({ ...validCampaignData, status: 'invalid-status' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Status must be one of: draft, active, paused, completed, cancelled');
      });

      it('should validate description length', () => {
        const longDescription = 'a'.repeat(1001);
        const result = validateCampaignData({ ...validCampaignData, description: longDescription });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Description must be a string with maximum 1000 characters');
      });

      it('should validate target amount', () => {
        const result = validateCampaignData({ ...validCampaignData, targetAmount: -1000 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Target amount must be a positive number');
      });

      it('should validate max individual contribution', () => {
        const result = validateCampaignData({ ...validCampaignData, maxIndividualContribution: -500 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Max individual contribution must be a positive number');
      });
    });

    describe('Update validation', () => {
      it('should allow partial updates', () => {
        const updates = { budget: 7000 };
        const result = validateCampaignData(updates, true);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should not require name and type for updates', () => {
        const result = validateCampaignData({}, true);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should still validate provided fields in updates', () => {
        const result = validateCampaignData({ budget: -100 }, true);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Budget must be a non-negative number');
      });
    });
  });

  describe('validateContributionData', () => {
    const validContributionData = {
      campaignId: 'campaign-123',
      amount: 250,
      currency: 'ETH',
      walletAddress: '0x1234567890123456789012345678901234567890',
      message: 'Supporting this cause!',
      anonymous: false
    };

    it('should validate correct contribution data', () => {
      const result = validateContributionData(validContributionData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require campaign ID', () => {
      const result = validateContributionData({ ...validContributionData, campaignId: undefined });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Campaign ID is required');
    });

    it('should require amount', () => {
      const result = validateContributionData({ ...validContributionData, amount: undefined });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount is required and must be a number');
    });

    it('should validate amount value', () => {
      const zeroAmount = validateContributionData({ ...validContributionData, amount: 0 });
      expect(zeroAmount.valid).toBe(false);
      expect(zeroAmount.errors).toContain('Amount must be greater than 0');

      const negativeAmount = validateContributionData({ ...validContributionData, amount: -100 });
      expect(negativeAmount.valid).toBe(false);
      expect(negativeAmount.errors).toContain('Amount must be greater than 0');

      const largeAmount = validateContributionData({ ...validContributionData, amount: 2000000 });
      expect(largeAmount.valid).toBe(false);
      expect(largeAmount.errors).toContain('Amount exceeds maximum allowed contribution');
    });

    it('should require currency', () => {
      const result = validateContributionData({ ...validContributionData, currency: undefined });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Currency is required');
    });

    it('should validate currency values', () => {
      const result = validateContributionData({ ...validContributionData, currency: 'INVALID' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Currency must be one of: USD, ETH, BTC, USDC, USDT');
    });

    it('should accept valid currencies', () => {
      const currencies = ['USD', 'ETH', 'BTC', 'USDC', 'USDT'];
      
      currencies.forEach(currency => {
        const result = validateContributionData({ ...validContributionData, currency });
        expect(result.valid).toBe(true);
      });
    });

    it('should require wallet address', () => {
      const result = validateContributionData({ ...validContributionData, walletAddress: undefined });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wallet address is required');
    });

    it('should validate Ethereum address format', () => {
      const invalidAddresses = [
        'invalid-address',
        '0x123', // Too short
        '0x1234567890123456789012345678901234567890123', // Too long
        '1234567890123456789012345678901234567890', // Missing 0x prefix
        '0xGHIJ567890123456789012345678901234567890' // Invalid characters
      ];

      invalidAddresses.forEach(address => {
        const result = validateContributionData({ ...validContributionData, walletAddress: address });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid Ethereum wallet address');
      });
    });

    it('should validate message length', () => {
      const longMessage = 'a'.repeat(501);
      const result = validateContributionData({ ...validContributionData, message: longMessage });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message must be a string with maximum 500 characters');
    });

    it('should validate anonymous flag type', () => {
      const result = validateContributionData({ ...validContributionData, anonymous: 'not-boolean' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Anonymous flag must be a boolean');
    });
  });

  describe('validateUserData', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
      walletAddress: '0x1234567890123456789012345678901234567890',
      phoneNumber: '+1-555-123-4567'
    };

    describe('Registration validation', () => {
      it('should validate correct user data', () => {
        const result = validateUserData(validUserData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require email', () => {
        const result = validateUserData({ ...validUserData, email: undefined });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Email is required');
      });

      it('should validate email format', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example'
        ];

        invalidEmails.forEach(email => {
          const result = validateUserData({ ...validUserData, email });
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Invalid email format');
        });
      });

      it('should require password', () => {
        const result = validateUserData({ ...validUserData, password: undefined });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should validate password length', () => {
        const shortPassword = validateUserData({ ...validUserData, password: 'short' });
        
        expect(shortPassword.valid).toBe(false);
        expect(shortPassword.errors).toContain('Password must be at least 8 characters long');
      });

      it('should validate password strength', () => {
        const weakPasswords = [
          'password', // No uppercase or numbers
          'PASSWORD', // No lowercase or numbers
          'Password', // No numbers
          '12345678', // No letters
          'pass123'   // Less than 8 chars
        ];

        weakPasswords.forEach(password => {
          const result = validateUserData({ ...validUserData, password });
          if (password !== 'pass123') { // This one fails length test first
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one uppercase letter, one lowercase letter, and one number');
          }
        });
      });

      it('should accept strong passwords', () => {
        const strongPasswords = [
          'Password123',
          'MySecure1Pass',
          'Complex2Password!'
        ];

        strongPasswords.forEach(password => {
          const result = validateUserData({ ...validUserData, password });
          expect(result.valid).toBe(true);
        });
      });

      it('should validate first name', () => {
        const emptyName = validateUserData({ ...validUserData, firstName: '' });
        expect(emptyName.valid).toBe(false);
        expect(emptyName.errors).toContain('First name must be a string between 1 and 50 characters');

        const longName = 'a'.repeat(51);
        const longResult = validateUserData({ ...validUserData, firstName: longName });
        expect(longResult.valid).toBe(false);
        expect(longResult.errors).toContain('First name must be a string between 1 and 50 characters');
      });

      it('should validate last name', () => {
        const emptyName = validateUserData({ ...validUserData, lastName: '' });
        expect(emptyName.valid).toBe(false);
        expect(emptyName.errors).toContain('Last name must be a string between 1 and 50 characters');

        const longName = 'a'.repeat(51);
        const longResult = validateUserData({ ...validUserData, lastName: longName });
        expect(longResult.valid).toBe(false);
        expect(longResult.errors).toContain('Last name must be a string between 1 and 50 characters');
      });

      it('should validate wallet address when provided', () => {
        const result = validateUserData({ ...validUserData, walletAddress: 'invalid-address' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid Ethereum wallet address');
      });

      it('should validate phone number when provided', () => {
        const invalidPhones = [
          '123',
          'not-a-phone',
          '123-45-67' // Too short
        ];

        invalidPhones.forEach(phoneNumber => {
          const result = validateUserData({ ...validUserData, phoneNumber });
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Invalid phone number format');
        });
      });
    });

    describe('Update validation', () => {
      it('should allow partial updates', () => {
        const updates = { firstName: 'Jane' };
        const result = validateUserData(updates, true);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should not require email and password for updates', () => {
        const result = validateUserData({}, true);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('validateAnalyticsQuery', () => {
    it('should validate correct query parameters', () => {
      const query = {
        period: '30d',
        groupBy: 'day',
        metric: 'ctr',
        limit: 100,
        offset: 0
      };

      const result = validateAnalyticsQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate period values', () => {
      const result = validateAnalyticsQuery({ period: 'invalid-period' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Period must be one of: 1d, 7d, 30d, 90d, 1y');
    });

    it('should validate groupBy values', () => {
      const result = validateAnalyticsQuery({ groupBy: 'invalid-group' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GroupBy must be one of: hour, day, week, month');
    });

    it('should validate metric values', () => {
      const result = validateAnalyticsQuery({ metric: 'invalid-metric' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metric must be a valid analytics metric');
    });

    it('should validate limit range', () => {
      const lowLimit = validateAnalyticsQuery({ limit: '0' });
      expect(lowLimit.valid).toBe(false);
      expect(lowLimit.errors).toContain('Limit must be a number between 1 and 1000');

      const highLimit = validateAnalyticsQuery({ limit: '2000' });
      expect(highLimit.valid).toBe(false);
      expect(highLimit.errors).toContain('Limit must be a number between 1 and 1000');

      const invalidLimit = validateAnalyticsQuery({ limit: 'not-a-number' });
      expect(invalidLimit.valid).toBe(false);
      expect(invalidLimit.errors).toContain('Limit must be a number between 1 and 1000');
    });

    it('should validate offset', () => {
      const negativeOffset = validateAnalyticsQuery({ offset: '-1' });
      expect(negativeOffset.valid).toBe(false);
      expect(negativeOffset.errors).toContain('Offset must be a non-negative number');

      const invalidOffset = validateAnalyticsQuery({ offset: 'not-a-number' });
      expect(invalidOffset.valid).toBe(false);
      expect(invalidOffset.errors).toContain('Offset must be a non-negative number');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      const result = sanitizeString('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should remove HTML tags', () => {
      const result = sanitizeString('Hello <script>alert("xss")</script> World');
      expect(result).toBe('Hello scriptalert("xss")/script World');
    });

    it('should remove null bytes', () => {
      const result = sanitizeString('hello\0world');
      expect(result).toBe('helloworld');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitizeString(longString, 100);
      expect(result).toHaveLength(100);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate correct search query', () => {
      const result = validateSearchQuery('test campaign');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBe('test campaign');
    });

    it('should require query string', () => {
      const result = validateSearchQuery('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Search query is required');
    });

    it('should validate minimum length', () => {
      const result = validateSearchQuery('a');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Search query must be at least 2 characters long');
    });

    it('should validate maximum length', () => {
      const longQuery = 'a'.repeat(101);
      const result = validateSearchQuery(longQuery);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Search query must be no more than 100 characters');
    });

    it('should sanitize query', () => {
      const result = validateSearchQuery('  <script>malicious</script>  ');

      expect(result.sanitized).toBe('scriptmalicious/script');
    });
  });

  describe('validateRateLimit', () => {
    it('should allow requests within limit', () => {
      const requests = [Date.now() - 5000, Date.now() - 3000]; // 2 requests in last 10 seconds
      const result = validateRateLimit(requests, 10000, 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it('should deny requests exceeding limit', () => {
      const requests = Array(5).fill().map((_, i) => Date.now() - (i * 1000)); // 5 requests in last 5 seconds
      const result = validateRateLimit(requests, 10000, 3);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should ignore old requests outside time window', () => {
      const requests = [
        Date.now() - 15000, // Outside 10-second window
        Date.now() - 5000,  // Inside window
        Date.now() - 2000   // Inside window
      ];
      const result = validateRateLimit(requests, 10000, 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });
  });

  describe('validateFileUpload', () => {
    const mockFile = {
      originalname: 'test.jpg',
      size: 1024 * 1024, // 1MB
      mimetype: 'image/jpeg'
    };

    it('should validate correct file', () => {
      const result = validateFileUpload(mockFile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require file', () => {
      const result = validateFileUpload(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is required');
    });

    it('should validate file size', () => {
      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB
      const result = validateFileUpload(largeFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds 5MB limit');
    });

    it('should validate mime type', () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };
      const result = validateFileUpload(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type application/pdf is not allowed');
    });

    it('should validate file extension', () => {
      const invalidFile = { ...mockFile, originalname: 'test.pdf' };
      const result = validateFileUpload(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File extension .pdf is not allowed');
    });

    it('should use custom options', () => {
      const options = {
        maxSize: 500 * 1024, // 500KB
        allowedTypes: ['image/png'],
        allowedExtensions: ['.png']
      };

      const result = validateFileUpload(mockFile, options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds 0.48828125MB limit');
      expect(result.errors).toContain('File type image/jpeg is not allowed');
      expect(result.errors).toContain('File extension .jpg is not allowed');
    });
  });
});