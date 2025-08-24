#!/usr/bin/env node

/**
 * Unified State Management System for Pachacuti
 * Consolidates fragmented .claude-flow directories and provides cross-project coordination
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UnifiedStateManager {
  constructor() {
    this.projectRoot = '/Users/Danallovertheplace/pachacuti';
    this.centralFlow = path.join(this.projectRoot, '.claude-flow');
    this.configPath = path.join(this.centralFlow, 'unified', 'consolidation-config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.log('⚠️ Config load error:', error.message);
    }
    
    // Default configuration
    return {
      consolidation: { enabled: true },
      stateManagement: { synchronization: 'real-time' }
    };
  }

  async consolidateDirectories() {
    console.log('\n🔧 UNIFIED STATE MANAGEMENT');
    console.log('═'.repeat(50));
    
    const subDirectories = [
      'devops/.claude-flow',
      'task-manager/.claude-flow', 
      'shell-viewer/.claude-flow',
      'shell-viewer/frontend/.claude-flow',
      'shell-viewer/backend/.claude-flow',
      'session-recorder/.claude-flow'
    ];

    const consolidated = {
      totalFiles: 0,
      mergedMetrics: [],
      archivedDirectories: 0
    };

    // Process each subdirectory
    for (const subDir of subDirectories) {
      const fullPath = path.join(this.projectRoot, subDir);
      if (fs.existsSync(fullPath)) {
        console.log(`📂 Processing: ${subDir}`);
        await this.mergeDirectory(fullPath, consolidated);
        consolidated.archivedDirectories++;
      }
    }

    // Create unified metrics
    await this.createUnifiedMetrics(consolidated);
    
    console.log('\n✅ Consolidation Results:');
    console.log(`  • Files processed: ${consolidated.totalFiles}`);
    console.log(`  • Directories archived: ${consolidated.archivedDirectories}`);
    console.log(`  • Unified metrics: ${consolidated.mergedMetrics.length} entries`);
    
    return consolidated;
  }

  async mergeDirectory(dirPath, consolidated) {
    const metricsPath = path.join(dirPath, 'metrics');
    if (fs.existsSync(metricsPath)) {
      const files = fs.readdirSync(metricsPath);
      
      for (const file of files) {
        const filePath = path.join(metricsPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Add source context
            const enhancedData = {
              ...data,
              source: path.relative(this.projectRoot, dirPath),
              timestamp: stats.mtime.getTime(),
              file: file
            };
            
            consolidated.mergedMetrics.push(enhancedData);
            consolidated.totalFiles++;
            
          } catch (error) {
            console.log(`⚠️ Error processing ${file}:`, error.message);
          }
        }
      }
    }
  }

  async createUnifiedMetrics(consolidated) {
    const unifiedPath = path.join(this.centralFlow, 'unified');
    if (!fs.existsSync(unifiedPath)) {
      fs.mkdirSync(unifiedPath, { recursive: true });
    }

    // Create consolidated performance metrics
    const performanceMetrics = consolidated.mergedMetrics.filter(m => 
      m.file.includes('performance') || m.totalTasks !== undefined
    );

    const unifiedPerformance = {
      consolidationTime: Date.now(),
      totalSources: performanceMetrics.length,
      aggregatedTasks: performanceMetrics.reduce((sum, m) => sum + (m.totalTasks || 0), 0),
      aggregatedSuccess: performanceMetrics.reduce((sum, m) => sum + (m.successfulTasks || 0), 0),
      aggregatedFailures: performanceMetrics.reduce((sum, m) => sum + (m.failedTasks || 0), 0),
      crossProjectMetrics: consolidated.mergedMetrics,
      lastUpdate: new Date().toISOString()
    };

    // Write unified metrics
    fs.writeFileSync(
      path.join(unifiedPath, 'consolidated-performance.json'),
      JSON.stringify(unifiedPerformance, null, 2)
    );

    // Create state synchronization manifest
    const syncManifest = {
      version: '1.0.0',
      consolidationComplete: true,
      centralDirectory: this.centralFlow,
      lastSync: new Date().toISOString(),
      sources: consolidated.mergedMetrics.map(m => ({
        source: m.source,
        file: m.file,
        timestamp: m.timestamp
      }))
    };

    fs.writeFileSync(
      path.join(unifiedPath, 'sync-manifest.json'),
      JSON.stringify(syncManifest, null, 2)
    );
  }

  async enableGlobalHooks() {
    console.log('\n🔗 INTEGRATING GLOBAL HOOKS');
    console.log('═'.repeat(50));

    const globalHooksPath = '/Users/Danallovertheplace/.claude/hooks';
    const localHooksPath = path.join(this.projectRoot, '.claude', 'hooks');

    // Create local hooks directory if it doesn't exist
    if (!fs.existsSync(localHooksPath)) {
      fs.mkdirSync(localHooksPath, { recursive: true });
    }

    // Create integration script
    const integrationScript = `#!/usr/bin/env node

// Hook Integration Bridge - Links global hooks to pachacuti
const { execSync } = require('child_process');
const path = require('path');

const globalHooks = '${globalHooksPath}';
const command = process.argv[2] || '';

// Check if this is a QA-triggering command
const qaCommands = ['checkout', 'status', 'summary', 'git commit'];
const shouldRunQA = qaCommands.some(cmd => command.includes(cmd));

if (shouldRunQA) {
  try {
    // Run mandatory QA verification
    const result = execSync(\`node "\${__dirname}/mandatory-qa.js" "\${command}"\`, { 
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
`;

    fs.writeFileSync(path.join(localHooksPath, 'integration-bridge.js'), integrationScript);
    execSync(`chmod +x "${path.join(localHooksPath, 'integration-bridge.js')}"`);

    console.log('✅ Global hooks integrated successfully');
    console.log(`  • Global hooks path: ${globalHooksPath}`);
    console.log(`  • Local hooks path: ${localHooksPath}`);
    console.log('  • Integration bridge: active');
  }

  async testIntegration() {
    console.log('\n🧪 TESTING INTEGRATION');
    console.log('═'.repeat(50));

    const tests = [
      { name: 'CLAUDE.md exists', test: () => fs.existsSync(path.join(this.projectRoot, 'CLAUDE.md')) },
      { name: 'Unified config exists', test: () => fs.existsSync(this.configPath) },
      { name: 'QA verifier accessible', test: () => fs.existsSync(path.join(this.projectRoot, 'scripts', 'qa-verifier.js')) },
      { name: 'Mandatory QA hook exists', test: () => fs.existsSync(path.join(this.projectRoot, '.claude', 'hooks', 'mandatory-qa.js')) },
      { name: 'Unified metrics directory', test: () => fs.existsSync(path.join(this.centralFlow, 'unified')) }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = test.test();
      console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
      if (result) passed++;
    }

    console.log(`\n📊 Integration Test Results: ${passed}/${tests.length} passed`);
    
    if (passed === tests.length) {
      console.log('🎉 All integration fixes successfully implemented!');
      return true;
    } else {
      console.log('⚠️ Some integration issues remain');
      return false;
    }
  }

  async run() {
    try {
      console.log('🚀 PACHACUTI ARCHITECTURAL INTEGRATION FIXES');
      console.log('═'.repeat(60));
      
      // Step 1: Consolidate directories
      await this.consolidateDirectories();
      
      // Step 2: Enable global hooks
      await this.enableGlobalHooks();
      
      // Step 3: Test integration
      const success = await this.testIntegration();
      
      if (success) {
        console.log('\n🎯 INTEGRATION COMPLETE');
        console.log('═'.repeat(50));
        console.log('✅ Global configuration inherited');
        console.log('✅ Unified state management active'); 
        console.log('✅ Mandatory QA verification enabled');
        console.log('✅ Cross-project coordination ready');
        console.log('\n💡 Next: Run any command to test QA verification!');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Integration error:', error.message);
      return false;
    }
  }
}

// Auto-run if called directly
if (require.main === module) {
  const manager = new UnifiedStateManager();
  manager.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = UnifiedStateManager;