#!/usr/bin/env node

/**
 * Slack Configuration Validation Script
 * Validates all required environment variables and their formats
 */

require('dotenv').config();

const requiredVars = {
  SLACK_BOT_TOKEN: {
    required: true,
    format: /^xoxb-.+/,
    description: 'Bot User OAuth Token (must start with xoxb-)'
  },
  SLACK_SIGNING_SECRET: {
    required: true,
    minLength: 10,
    description: 'Signing Secret for request verification'
  },
  SLACK_WEBHOOK_PORT: {
    required: true,
    type: 'number',
    min: 1024,
    max: 65535,
    description: 'Port for webhook server'
  }
};

const optionalVars = {
  SLACK_TEAM_ID: {
    format: /^T[A-Z0-9]+$/,
    description: 'Workspace Team ID'
  },
  SLACK_DEFAULT_CHANNEL: {
    description: 'Default channel for notifications'
  },
  SLACK_AUTO_ARCHIVE: {
    type: 'boolean',
    description: 'Auto-archive channels when sessions end'
  },
  SLACK_REMINDER_MINUTES: {
    type: 'number',
    min: 1,
    max: 1440,
    description: 'Reminder interval in minutes'
  },
  SLACK_HEALTH_CHECK_INTERVAL: {
    type: 'number', 
    min: 10,
    max: 3600,
    description: 'Health check interval in seconds'
  }
};

function validateVariable(name, value, config) {
  const errors = [];
  
  if (!value) {
    if (config.required) {
      errors.push(`${name} is required but not set`);
    }
    return errors;
  }
  
  // Format validation
  if (config.format && !config.format.test(value)) {
    errors.push(`${name} format is invalid (expected: ${config.format})`);
  }
  
  // Length validation
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${name} must be at least ${config.minLength} characters`);
  }
  
  // Type validation
  if (config.type === 'number') {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      errors.push(`${name} must be a valid number`);
    } else {
      if (config.min !== undefined && num < config.min) {
        errors.push(`${name} must be >= ${config.min}`);
      }
      if (config.max !== undefined && num > config.max) {
        errors.push(`${name} must be <= ${config.max}`);
      }
    }
  }
  
  if (config.type === 'boolean') {
    const valid = ['true', 'false', '1', '0'].includes(value.toLowerCase());
    if (!valid) {
      errors.push(`${name} must be a boolean value (true/false)`);
    }
  }
  
  return errors;
}

function main() {
  console.log('🔍 Validating Slack Integration Configuration...\n');
  
  let hasErrors = false;
  const warnings = [];
  
  // Validate required variables
  console.log('📋 Required Configuration:');
  for (const [name, config] of Object.entries(requiredVars)) {
    const value = process.env[name];
    const errors = validateVariable(name, value, config);
    
    if (errors.length > 0) {
      console.log(`❌ ${name}: ${errors.join(', ')}`);
      hasErrors = true;
    } else {
      const displayValue = name.includes('TOKEN') || name.includes('SECRET') 
        ? value ? `${value.substring(0, 10)}...` : 'not set'
        : value;
      console.log(`✅ ${name}: ${displayValue}`);
    }
  }
  
  console.log('\n📝 Optional Configuration:');
  for (const [name, config] of Object.entries(optionalVars)) {
    const value = process.env[name];
    const errors = validateVariable(name, value, config);
    
    if (errors.length > 0) {
      console.log(`⚠️  ${name}: ${errors.join(', ')}`);
      warnings.push(`${name}: ${errors.join(', ')}`);
    } else if (value) {
      console.log(`✅ ${name}: ${value}`);
    } else {
      console.log(`➖ ${name}: not set (using defaults)`);
    }
  }
  
  // Production readiness check
  console.log('\n🚀 Production Readiness:');
  
  const botToken = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  
  if (botToken && botToken.includes('placeholder')) {
    console.log('⚠️  SLACK_BOT_TOKEN contains placeholder - replace with real token');
    warnings.push('Bot token is placeholder');
  }
  
  if (signingSecret && signingSecret.includes('placeholder')) {
    console.log('⚠️  SLACK_SIGNING_SECRET contains placeholder - replace with real secret');
    warnings.push('Signing secret is placeholder');
  }
  
  if (process.env.NODE_ENV === 'production' && warnings.length > 0) {
    console.log('❌ Not ready for production - has placeholder values');
    hasErrors = true;
  }
  
  // Port availability check
  const port = process.env.SLACK_WEBHOOK_PORT;
  if (port) {
    console.log(`🔌 Webhook will run on port ${port}`);
    console.log('   Make sure this port is:');
    console.log('   - Available and not in use');
    console.log('   - Accessible from Slack (public URL required)');
    console.log('   - Properly configured in Slack app settings');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Configuration has errors - fix before starting');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  Configuration valid with ${warnings.length} warnings`);
    console.log('✅ System can start but may need production values');
    process.exit(0);
  } else {
    console.log('✅ Configuration is valid and ready');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateVariable, requiredVars, optionalVars };