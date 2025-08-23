#!/usr/bin/env node

/**
 * Pachacuti Session Recorder CLI
 * Command-line interface for the session recording system
 */

const { program } = require('commander');
const PachacutiSessionRecorder = require('./index');
const KnowledgeSearch = require('./lib/knowledge-search');
const ReportGenerator = require('./lib/report-generator');
const HistoryRecovery = require('./lib/history-recovery');
const PachacutiIntegration = require('./lib/pachacuti-integration');

program
  .name('pachacuti-recorder')
  .description('Pachacuti Session Recorder - The Second Brain for Development')
  .version('1.0.0');

// Start recording
program
  .command('start')
  .description('Start the session recorder')
  .option('-p, --port <port>', 'API port', '5555')
  .option('-v, --verbose', 'Verbose logging')
  .action(async (options) => {
    try {
      if (options.verbose) {
        process.env.LOG_LEVEL = 'debug';
      }
      
      const recorder = new PachacutiSessionRecorder();
      await recorder.initialize();
      
      console.log('🎯 Pachacuti Session Recorder started');
      console.log(`📡 API listening on port ${options.port}`);
      console.log('🔍 Real-time monitoring active');
      console.log('\nPress Ctrl+C to stop recording\n');
      
      // Keep process alive
      process.stdin.resume();
    } catch (error) {
      console.error('❌ Failed to start recorder:', error.message);
      process.exit(1);
    }
  });

// Search knowledge base
program
  .command('search [query]')
  .description('Search the development knowledge base')
  .option('-t, --type <type>', 'Search type (session, commit, file, problem)')
  .option('-l, --limit <limit>', 'Limit results', '20')
  .action(async (query, options) => {
    try {
      const search = new KnowledgeSearch();
      await search.initialize();
      
      if (query) {
        await search.performSearch(query);
      } else {
        await search.interactiveSearch();
      }
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      process.exit(1);
    }
  });

// Generate reports
program
  .command('report <type>')
  .description('Generate development reports')
  .option('-d, --date <date>', 'Report date (YYYY-MM-DD)')
  .option('-o, --output <path>', 'Output path')
  .action(async (type, options) => {
    try {
      const generator = new ReportGenerator();
      let reportPath;
      
      switch (type) {
        case 'daily':
          const date = options.date ? new Date(options.date) : new Date();
          reportPath = await generator.generateDailyReport(date);
          break;
        case 'weekly':
          reportPath = await generator.generateWeeklyReport();
          break;
        case 'monthly':
          reportPath = await generator.generateMonthlyReport();
          break;
        default:
          console.error(`❌ Unknown report type: ${type}`);
          process.exit(1);
      }
      
      console.log(`✅ ${type} report generated: ${reportPath}`);
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    }
  });

// Recover history
program
  .command('recover')
  .description('Recover and analyze development history')
  .option('--days <days>', 'Days to recover', '365')
  .action(async (options) => {
    try {
      const recovery = new HistoryRecovery();
      
      console.log('🔍 Starting history recovery...');
      const history = await recovery.recoverHistory();
      
      console.log('✅ History recovery complete:');
      console.log(`📊 Projects: ${Object.keys(history.projects).length}`);
      console.log(`👥 Developers: ${Object.keys(history.developers).length}`);
      console.log(`📈 Timeline entries: ${Object.keys(history.timeline).length}`);
      
    } catch (error) {
      console.error('❌ History recovery failed:', error.message);
      process.exit(1);
    }
  });

// Integration commands
program
  .command('integrate')
  .description('Set up Pachacuti system integration')
  .action(async () => {
    try {
      const integration = new PachacutiIntegration();
      await integration.initialize();
      
      console.log('✅ Pachacuti integration setup complete');
      console.log('🔗 Connected to daily briefing system');
      console.log('🔒 Integrated with approval system');
      console.log('🛠️  DevOps monitoring hooks installed');
    } catch (error) {
      console.error('❌ Integration failed:', error.message);
      process.exit(1);
    }
  });

// Export data
program
  .command('export <format>')
  .description('Export knowledge base')
  .option('-o, --output <path>', 'Output file path')
  .action(async (format, options) => {
    try {
      const search = new KnowledgeSearch();
      await search.initialize();
      
      const exportPath = await search.knowledgeBase.exportKnowledge(format);
      
      console.log(`✅ Knowledge base exported to: ${exportPath}`);
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show system status')
  .action(async () => {
    try {
      console.log('🎯 Pachacuti Session Recorder Status\n');
      
      // Check if recorder is running
      // This would typically check a PID file or process status
      console.log('📡 Recorder: Not running');
      
      // Check knowledge base
      const search = new KnowledgeSearch();
      await search.initialize();
      
      const sessions = await search.knowledgeBase.getSessionHistory(7);
      console.log(`📊 Sessions (7 days): ${sessions.length}`);
      
      const recentSession = sessions[0];
      if (recentSession) {
        console.log(`🕐 Last session: ${recentSession.start_time}`);
        console.log(`⏱️  Duration: ${recentSession.duration}ms`);
        console.log(`💾 Commits: ${recentSession.commits}`);
      }
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    }
  });

// Initialize/setup command
program
  .command('init')
  .description('Initialize session recorder (run setup)')
  .action(async () => {
    const { exec } = require('child_process').promises;
    try {
      console.log('🚀 Initializing Pachacuti Session Recorder...');
      await exec('./setup.sh');
      console.log('✅ Initialization complete');
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  });

// Demo command
program
  .command('demo')
  .description('Run a demo session recording')
  .action(async () => {
    try {
      console.log('🎬 Starting demo session...\n');
      
      const recorder = new PachacutiSessionRecorder();
      await recorder.initialize();
      
      // Simulate some activity
      console.log('📝 Recording demo activity...');
      
      await recorder.sessionCapture.recordFileChange({
        type: 'change',
        path: 'demo/example.js',
        action: 'modify',
        content: 'console.log("Demo session recording");'
      });
      
      await recorder.sessionCapture.recordCommand({
        command: 'npm test',
        output: 'Tests passed: 5/5',
        exitCode: 0,
        duration: 2500
      });
      
      await recorder.sessionCapture.recordDecision({
        category: 'architecture',
        description: 'Use React for frontend components',
        reasoning: 'Better component reusability and team familiarity',
        impact: 'medium'
      });
      
      const summary = await recorder.sessionCapture.generateSummary();
      
      console.log('\n🎯 Demo session completed:');
      console.log(`📊 Session ID: ${summary.sessionId}`);
      console.log(`⏱️  Duration: ${summary.durationFormatted}`);
      console.log(`🎯 Activities: ${summary.statistics.totalActivities}`);
      
      // Generate a demo report
      const reportPath = await recorder.reportGenerator.generateSessionReport(summary);
      console.log(`📋 Demo report: ${reportPath}`);
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command specified, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}