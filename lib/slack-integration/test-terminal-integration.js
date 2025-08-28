#!/usr/bin/env node

/**
 * Test Terminal Integration - Simulates how Claude Code would use the approval system
 */

const SimpleApprovalIntegration = require('./simple-approval');
const fs = require('fs').promises;

async function testApprovalFlow() {
  console.log('🧪 Testing Claude Code -> Slack -> Terminal approval flow...\n');
  
  const approval = new SimpleApprovalIntegration();
  
  // Simulate Claude Code sending an approval request
  console.log('1️⃣ Claude Code sends approval request to Slack...');
  
  await approval.sendApprovalRequest({
    project: 'pachacuti-terminal-test',
    userPrompt: 'verify terminal integration works correctly',
    toolName: 'Bash',
    description: 'Test the approval system integration with terminal',
    command: 'echo "Hello from approved command"',
    workingDir: '/Users/Danallovertheplace/pachacuti/lib/slack-integration'
  });
  
  console.log('✅ Approval request sent to Slack!');
  console.log('💬 Expected Slack message format:');
  console.log('   **slack-integration/verify terminal integration works correctly**');
  console.log('   ─────────────────────────────────────────────');
  console.log('   Claude wants to run: Bash');
  console.log('   Test the approval system integration with terminal');
  console.log('   Command: `echo "Hello from approved command"`');
  console.log('   [1] Yes, proceed');
  console.log('   [2] No, cancel');
  console.log('   [3] Always approve this tool');
  console.log('   Choose (1-3):');
  console.log('');
  
  // Start monitoring for responses
  console.log('2️⃣ Starting to monitor for user response...');
  approval.startMonitoring();
  
  // Simulate checking for result
  let attempts = 0;
  const maxAttempts = 6; // 1 minute total (10 second intervals)
  
  const checkForResult = setInterval(async () => {
    attempts++;
    console.log(`🔍 Checking for user response (attempt ${attempts}/${maxAttempts})...`);
    
    try {
      const resultData = await fs.readFile('/tmp/claude-approval-result.json', 'utf8');
      const result = JSON.parse(resultData);
      
      console.log('\n✅ User response received!');
      console.log('📋 Result:', result);
      console.log('');
      
      if (result.approved) {
        console.log('🚀 Claude Code would now execute the approved command:');
        console.log(`   Command: echo "Hello from approved command"`);
        console.log('   Status: APPROVED ✅');
      } else {
        console.log('🛑 Claude Code would cancel the operation:');
        console.log('   Status: CANCELLED ❌');
      }
      
      console.log('\n🎉 Terminal integration test SUCCESSFUL!');
      clearInterval(checkForResult);
      process.exit(0);
      
    } catch (error) {
      // Result file doesn't exist yet, continue waiting
      if (attempts >= maxAttempts) {
        console.log('\n⏰ No user response received within time limit');
        console.log('💡 To test manually:');
        console.log('   1. Check your Slack for the approval message');
        console.log('   2. Reply with 1, 2, or 3');
        console.log('   3. Check /tmp/claude-approval-result.json for the result');
        clearInterval(checkForResult);
        process.exit(0);
      }
    }
  }, 10000); // Check every 10 seconds
}

// Run the test
testApprovalFlow().catch(console.error);