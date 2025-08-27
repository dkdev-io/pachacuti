/**
 * Validation Utilities
 * Provides data validation functions for API inputs
 */

/**
 * Validate campaign data
 */
export function validateCampaignData(data, isUpdate = false) {
  const errors = [];
  
  // Required fields for creation
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Campaign name is required and must be a string');
    } else if (data.name.length < 3 || data.name.length > 100) {
      errors.push('Campaign name must be between 3 and 100 characters');
    }
    
    if (!data.type || typeof data.type !== 'string') {
      errors.push('Campaign type is required');
    } else if (!['fundraising', 'awareness', 'advocacy', 'donation'].includes(data.type)) {
      errors.push('Campaign type must be one of: fundraising, awareness, advocacy, donation');
    }
  }
  
  // Optional fields validation
  if (data.duration !== undefined) {
    if (!Number.isInteger(data.duration) || data.duration < 1 || data.duration > 365) {
      errors.push('Duration must be an integer between 1 and 365 days');
    }
  }
  
  if (data.budget !== undefined) {
    if (typeof data.budget !== 'number' || data.budget < 0) {
      errors.push('Budget must be a non-negative number');
    }
  }
  
  if (data.status !== undefined) {
    if (!['draft', 'active', 'paused', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Status must be one of: draft, active, paused, completed, cancelled');
    }
  }
  
  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.length > 1000) {
      errors.push('Description must be a string with maximum 1000 characters');
    }
  }
  
  if (data.targetAmount !== undefined) {
    if (typeof data.targetAmount !== 'number' || data.targetAmount <= 0) {
      errors.push('Target amount must be a positive number');
    }
  }
  
  if (data.maxIndividualContribution !== undefined) {
    if (typeof data.maxIndividualContribution !== 'number' || data.maxIndividualContribution <= 0) {
      errors.push('Max individual contribution must be a positive number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate contribution data
 */
export function validateContributionData(data) {
  const errors = [];
  
  // Required fields
  if (!data.campaignId || typeof data.campaignId !== 'string') {
    errors.push('Campaign ID is required');
  }
  
  if (!data.amount || typeof data.amount !== 'number') {
    errors.push('Amount is required and must be a number');
  } else if (data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (data.amount > 1000000) { // $1M max
    errors.push('Amount exceeds maximum allowed contribution');
  }
  
  if (!data.currency || typeof data.currency !== 'string') {
    errors.push('Currency is required');
  } else if (!['USD', 'ETH', 'BTC', 'USDC', 'USDT'].includes(data.currency)) {
    errors.push('Currency must be one of: USD, ETH, BTC, USDC, USDT');
  }
  
  if (!data.walletAddress || typeof data.walletAddress !== 'string') {
    errors.push('Wallet address is required');
  } else if (!isValidEthereumAddress(data.walletAddress)) {
    errors.push('Invalid Ethereum wallet address');
  }
  
  // Optional fields
  if (data.message !== undefined) {
    if (typeof data.message !== 'string' || data.message.length > 500) {
      errors.push('Message must be a string with maximum 500 characters');
    }
  }
  
  if (data.anonymous !== undefined && typeof data.anonymous !== 'boolean') {
    errors.push('Anonymous flag must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user data
 */
export function validateUserData(data, isUpdate = false) {
  const errors = [];
  
  // Required fields for registration
  if (!isUpdate) {
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    if (!data.password || typeof data.password !== 'string') {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (!isStrongPassword(data.password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }
  
  // Optional fields
  if (data.firstName !== undefined) {
    if (typeof data.firstName !== 'string' || data.firstName.length < 1 || data.firstName.length > 50) {
      errors.push('First name must be a string between 1 and 50 characters');
    }
  }
  
  if (data.lastName !== undefined) {
    if (typeof data.lastName !== 'string' || data.lastName.length < 1 || data.lastName.length > 50) {
      errors.push('Last name must be a string between 1 and 50 characters');
    }
  }
  
  if (data.walletAddress !== undefined) {
    if (data.walletAddress && !isValidEthereumAddress(data.walletAddress)) {
      errors.push('Invalid Ethereum wallet address');
    }
  }
  
  if (data.phoneNumber !== undefined) {
    if (data.phoneNumber && !isValidPhoneNumber(data.phoneNumber)) {
      errors.push('Invalid phone number format');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate analytics query parameters
 */
export function validateAnalyticsQuery(query) {
  const errors = [];
  
  if (query.period !== undefined) {
    if (!['1d', '7d', '30d', '90d', '1y'].includes(query.period)) {
      errors.push('Period must be one of: 1d, 7d, 30d, 90d, 1y');
    }
  }
  
  if (query.groupBy !== undefined) {
    if (!['hour', 'day', 'week', 'month'].includes(query.groupBy)) {
      errors.push('GroupBy must be one of: hour, day, week, month');
    }
  }
  
  if (query.metric !== undefined) {
    if (!['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'conversionRate', 'cpc', 'cpa', 'roas'].includes(query.metric)) {
      errors.push('Metric must be a valid analytics metric');
    }
  }
  
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }
  }
  
  if (query.offset !== undefined) {
    const offset = parseInt(query.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('Offset must be a non-negative number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Basic XSS prevention
    .replace(/\0/g, ''); // Remove null bytes
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query) {
  const errors = [];
  
  if (!query || typeof query !== 'string') {
    errors.push('Search query is required');
    return { valid: false, errors, sanitized: '' };
  }
  
  const sanitized = sanitizeString(query, 100);
  
  if (sanitized.length < 2) {
    errors.push('Search query must be at least 2 characters long');
  }
  
  if (sanitized.length > 100) {
    errors.push('Search query must be no more than 100 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongRegex.test(password);
}

function isValidEthereumAddress(address) {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

function isValidPhoneNumber(phone) {
  // Basic phone number validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(requests, timeWindow, maxRequests) {
  const now = Date.now();
  const windowStart = now - timeWindow;
  
  // Filter requests within the time window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  return {
    allowed: recentRequests.length < maxRequests,
    remaining: Math.max(0, maxRequests - recentRequests.length),
    resetTime: windowStart + timeWindow
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  } = options;
  
  const errors = [];
  
  if (!file) {
    errors.push('File is required');
    return { valid: false, errors };
  }
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}