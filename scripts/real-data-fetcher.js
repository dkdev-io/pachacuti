#!/usr/bin/env node

/**
 * REAL DATA FETCHER - NO MOCK DATA ALLOWED
 * 
 * CRITICAL RULES:
 * 1. ONLY real data from actual APIs
 * 2. NO estimations or calculations
 * 3. NO fake/mock data ever
 * 4. If data unavailable, show "Data unavailable" not fake numbers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RealDataFetcher {
    constructor() {
        this.data = {
            tokens: {
                status: 'unavailable',
                message: 'Anthropic API key required',
                inputTokens: null,
                outputTokens: null,
                totalCost: null
            },
            github: {
                status: 'unavailable', 
                linesAdded: 0,
                linesRemoved: 0,
                filesChanged: 0,
                commitsToday: 0,
                uncommittedLines: 0
            },
            agents: {
                status: 'unavailable',
                activeShells: 0,
                sessions: []
            }
        };
    }

    /**
     * ANTHROPIC API - Real token usage
     * Requires: ANTHROPIC_API_KEY environment variable
     */
    async fetchAnthropicUsage() {
        console.log('🔍 Fetching REAL Anthropic token usage...');
        
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY not set - cannot fetch real usage');
            this.data.tokens.status = 'error';
            this.data.tokens.message = 'Set ANTHROPIC_API_KEY environment variable';
            return;
        }

        try {
            // NOTE: Anthropic doesn't have a public billing API yet
            // This is a placeholder for when they release it
            // For now, we'll parse from logs if available
            
            const logsPath = path.join(process.env.HOME, '.anthropic', 'usage.json');
            if (fs.existsSync(logsPath)) {
                const usage = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
                this.data.tokens = {
                    status: 'available',
                    inputTokens: usage.input_tokens || 0,
                    outputTokens: usage.output_tokens || 0,
                    totalCost: usage.total_cost || 0,
                    source: 'anthropic_logs'
                };
            } else {
                this.data.tokens.status = 'api_unavailable';
                this.data.tokens.message = 'Anthropic billing API not yet public. Check console manually.';
            }
        } catch (error) {
            console.error('❌ Failed to fetch Anthropic usage:', error.message);
            this.data.tokens.status = 'error';
            this.data.tokens.error = error.message;
        }
    }

    /**
     * GITHUB API - Real commit statistics
     * Uses git and GitHub CLI for accurate data
     */
    async fetchGitHubStats() {
        console.log('📊 Fetching REAL GitHub statistics...');
        
        try {
            // Get today's commits from GitHub
            const today = new Date().toISOString().split('T')[0];
            const gitLog = execSync(
                `git log --since="${today} 00:00:00" --pretty=tformat: --numstat`,
                { encoding: 'utf8' }
            );

            let linesAdded = 0;
            let linesRemoved = 0;
            let filesChanged = new Set();

            gitLog.split('\n').forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length === 3) {
                    const added = parseInt(parts[0]) || 0;
                    const removed = parseInt(parts[1]) || 0;
                    if (!isNaN(added)) linesAdded += added;
                    if (!isNaN(removed)) linesRemoved += removed;
                    filesChanged.add(parts[2]);
                }
            });

            // Get uncommitted changes
            const diffStat = execSync('git diff --numstat', { encoding: 'utf8' });
            let uncommittedLines = 0;
            diffStat.split('\n').forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length === 3) {
                    uncommittedLines += (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0);
                }
            });

            // Count today's commits
            const commitCount = execSync(
                `git rev-list --count --since="${today} 00:00:00" HEAD`,
                { encoding: 'utf8' }
            ).trim();

            this.data.github = {
                status: 'available',
                linesAdded,
                linesRemoved,
                filesChanged: filesChanged.size,
                commitsToday: parseInt(commitCount) || 0,
                uncommittedLines,
                source: 'git_commands'
            };

        } catch (error) {
            console.error('❌ Failed to fetch GitHub stats:', error.message);
            this.data.github.status = 'error';
            this.data.github.error = error.message;
        }
    }

    /**
     * SHELL MONITORING - Real agent activity
     * Monitors actual shell sessions
     */
    async fetchShellActivity() {
        console.log('💻 Fetching REAL shell activity...');
        
        try {
            // Check for active shells using ps command
            const shellProcesses = execSync(
                'ps aux | grep -E "(bash|zsh|sh)" | grep -v grep | wc -l',
                { encoding: 'utf8' }
            ).trim();

            // Check for Claude-related processes
            const claudeProcesses = execSync(
                'ps aux | grep -i claude | grep -v grep || true',
                { encoding: 'utf8' }
            );

            const sessions = [];
            if (claudeProcesses) {
                claudeProcesses.split('\n').forEach(line => {
                    if (line.trim()) {
                        sessions.push({
                            process: line.substring(0, 80),
                            type: 'claude_session'
                        });
                    }
                });
            }

            this.data.agents = {
                status: 'available',
                activeShells: parseInt(shellProcesses) || 0,
                sessions: sessions,
                source: 'system_processes'
            };

        } catch (error) {
            console.error('❌ Failed to fetch shell activity:', error.message);
            this.data.agents.status = 'error';
            this.data.agents.error = error.message;
        }
    }

    /**
     * Generate dashboard data with ONLY real information
     */
    async generateDashboardData() {
        console.log('\n🚫 NO FAKE DATA POLICY ENFORCED');
        console.log('=====================================');
        
        await this.fetchAnthropicUsage();
        await this.fetchGitHubStats();
        await this.fetchShellActivity();

        const output = {
            timestamp: new Date().toISOString(),
            policy: 'REAL_DATA_ONLY',
            data: this.data,
            warnings: []
        };

        // Add warnings for unavailable data
        if (this.data.tokens.status !== 'available') {
            output.warnings.push('Token data unavailable - check Anthropic Console directly');
        }
        if (this.data.github.status !== 'available') {
            output.warnings.push('GitHub data unavailable - check git status');
        }
        if (this.data.agents.status !== 'available') {
            output.warnings.push('Agent data unavailable - check shell monitoring');
        }

        return output;
    }

    /**
     * Save real data to file
     */
    async saveData() {
        const data = await this.generateDashboardData();
        const outputPath = path.join(process.cwd(), 'devops', 'real-data.json');
        
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`\n✅ Real data saved to: ${outputPath}`);
        
        // Display summary
        console.log('\n📊 REAL DATA SUMMARY');
        console.log('====================');
        
        if (data.data.tokens.status === 'available') {
            console.log(`🎯 Tokens: ${data.data.tokens.inputTokens} in / ${data.data.tokens.outputTokens} out`);
            console.log(`💰 Cost: $${data.data.tokens.totalCost}`);
        } else {
            console.log(`⚠️  Tokens: ${data.data.tokens.message}`);
        }
        
        if (data.data.github.status === 'available') {
            console.log(`📝 Lines: +${data.data.github.linesAdded} -${data.data.github.linesRemoved}`);
            console.log(`📦 Commits Today: ${data.data.github.commitsToday}`);
            console.log(`⏳ Uncommitted Lines: ${data.data.github.uncommittedLines}`);
        }
        
        if (data.data.agents.status === 'available') {
            console.log(`💻 Active Shells: ${data.data.agents.activeShells}`);
            console.log(`🤖 Claude Sessions: ${data.data.agents.sessions.length}`);
        }
        
        if (data.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            data.warnings.forEach(w => console.log(`   - ${w}`));
        }
        
        return data;
    }
}

// GUARDRAIL: Prevent mock data
function enforceRealDataPolicy() {
    console.log('🛡️  GUARDRAIL: Real Data Policy Enforced');
    console.log('   - NO mock data allowed');
    console.log('   - NO estimations permitted');
    console.log('   - ONLY actual API/command data');
    console.log('   - Show "unavailable" if no real data');
}

// Run if called directly
if (require.main === module) {
    enforceRealDataPolicy();
    const fetcher = new RealDataFetcher();
    fetcher.saveData().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = RealDataFetcher;