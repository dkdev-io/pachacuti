#!/usr/bin/env node

/**
 * Mandatory QA Verification Hook
 * Automatically triggers QA verification before any checkout/reporting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class MandatoryQA {
  constructor() {
    this.projectDir = process.cwd();
    this.qaScript = path.join(this.projectDir, 'scripts', 'qa-verifier.js');
  }

  async initialize() {
    // Check if QA verifier exists
    if (!fs.existsSync(this.qaScript)) {
      console.log('⚠️ QA verifier not found, skipping verification');
      return true;
    }

    // Check for checkout/summary commands
    const command = process.argv[2] || '';
    const isCheckout = command.includes('checkout') || 
                      command.includes('summary') || 
                      command.includes('status report');

    if (isCheckout) {
      return await this.runMandatoryQA();
    }

    return true;
  }

  async runMandatoryQA() {
    try {
      console.log('\n🔍 MANDATORY QA VERIFICATION');
      console.log('═'.repeat(50));
      
      // Run QA verification automatically
      const result = execSync(`node "${this.qaScript}" 2>&1`, { 
        encoding: 'utf8',
        timeout: 30000 
      });
      
      console.log(result);
      
      // Check if verification passed
      if (result.includes('VERIFICATION PASSED') || 
          result.includes('✅ READY FOR PRODUCTION')) {
        console.log('✅ QA verification passed - proceeding');
        return true;
      } else if (result.includes('VERIFICATION FAILED') || 
                 result.includes('❌ NOT READY')) {
        console.log('❌ QA verification failed - blocking checkout');
        return false;
      }
      
      // Default to manual verification
      console.log('⚠️ Manual QA verification required');
      return await this.promptForManualVerification();
      
    } catch (error) {
      console.log('⚠️ QA verification error:', error.message);
      return await this.promptForManualVerification();
    }
  }

  async promptForManualVerification() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\n🔍 Manual QA verification - proceed anyway? [y/N]: ', (answer) => {
        rl.close();
        const proceed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
        if (proceed) {
          console.log('⚠️ Proceeding without QA verification (manual override)');
        } else {
          console.log('❌ Checkout blocked - QA verification required');
        }
        resolve(proceed);
      });
    });
  }
}

// Auto-run if called directly
if (require.main === module) {
  const qa = new MandatoryQA();
  qa.initialize().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('QA hook error:', error);
    process.exit(1);
  });
}

module.exports = MandatoryQA;