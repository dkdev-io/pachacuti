#!/usr/bin/env node

/**
 * Slack Webhook Server Startup Script
 * Validates configuration and starts the webhook server
 */

require('dotenv').config();
const SlackWebhookServer = require('./webhook-handler');

async function main() {
  console.log('🚀 Starting Pachacuti Slack Webhook Server...\n');
  
  // Run configuration validation first
  console.log('🔍 Validating configuration...');
  try {
    require('./validate-config');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Get port from environment
  const port = process.env.SLACK_WEBHOOK_PORT || 3006;
  
  // Check if we're using placeholder values
  const usingPlaceholders = 
    process.env.SLACK_BOT_TOKEN?.includes('placeholder') ||
    process.env.SLACK_SIGNING_SECRET?.includes('placeholder');
  
  if (usingPlaceholders) {
    console.log('⚠️  WARNING: Using placeholder credentials');
    console.log('   - Slack API calls will fail');
    console.log('   - Server will start but channels cannot be created');
    console.log('   - Replace with real credentials for full functionality\n');
  }
  
  // Create and start server
  const server = new SlackWebhookServer(port);
  
  try {
    await server.start();
    console.log('\n✅ Webhook server started successfully!');
    console.log(`📡 Listening on port ${port}`);
    console.log('\nEndpoints:');
    console.log(`- Interactive: http://localhost:${port}/slack/interactive`);
    console.log(`- Commands: http://localhost:${port}/slack/commands`);
    console.log(`- Events: http://localhost:${port}/slack/events`);
    console.log(`- Health: http://localhost:${port}/health`);
    console.log(`- API: http://localhost:${port}/api/pending-approvals`);
    
    if (usingPlaceholders) {
      console.log('\n📝 Next steps for production:');
      console.log('1. Create Slack app at https://api.slack.com/apps');
      console.log('2. Run: node setup-slack-app.js');
      console.log('3. Update .env with real credentials');
      console.log('4. Configure public URL (ngrok/domain) in Slack app');
      console.log('5. Test with real Slack workspace');
    } else {
      console.log('\n🎉 Ready for production use!');
    }
    
  } catch (error) {
    console.error('❌ Failed to start webhook server:', error.message);
    
    if (error.code === 'EADDRINUSE') {
      console.error(`   Port ${port} is already in use`);
      console.error('   Try a different port or stop the conflicting service');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;