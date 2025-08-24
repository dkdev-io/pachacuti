#!/usr/bin/env node

// Hook Integration Bridge - Links global hooks to pachacuti
const { execSync } = require('child_process');
const path = require('path');

const globalHooks = '/Users/Danallovertheplace/.claude/hooks';
const command = process.argv[2] || '';

// Check if this is a QA-triggering command
const qaCommands = ['checkout', 'status', 'summary', 'git commit'];
const shouldRunQA = qaCommands.some(cmd => command.includes(cmd));

if (shouldRunQA) {
  try {
    // Run mandatory QA verification
    const result = execSync(`node "${__dirname}/mandatory-qa.js" "${command}"`, { 
      encoding: 'utf8', 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.log('❌ QA verification failed');
    process.exit(1);
  }
}

// Continue with other global hooks if needed
try {
  if (require('fs').existsSync(path.join(globalHooks, 'command-processor.js'))) {
    require(path.join(globalHooks, 'command-processor.js'));
  }
} catch (error) {
  // Silent fallback
}
