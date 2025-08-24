#!/usr/bin/env node

/**
 * Token Usage Tracker for Claude Code Sessions
 * Analyzes Claude usage patterns and estimates token consumption
 */

const fs = require('fs');
const path = require('path');

class TokenUsageTracker {
    constructor() {
        this.sessionStart = new Date();
        this.tokenUsage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            sessionsAnalyzed: 0
        };
        
        // Claude Sonnet 4 pricing
        this.pricing = {
            input: 0.000015,  // $15 per million tokens
            output: 0.000075  // $75 per million tokens
        };
    }

    async analyzeSession() {
        console.log('🔍 Analyzing Claude Code session token usage...');
        
        try {
            // Check for performance logs
            await this.checkPerformanceLogs();
            
            // Analyze file modifications
            await this.analyzeFileModifications();
            
            // Estimate based on session activity
            this.estimateFromActivity();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('Error analyzing token usage:', error.message);
            this.generateFallbackEstimate();
        }
    }

    async checkPerformanceLogs() {
        const logPaths = [
            path.join(process.env.HOME, '.claude', 'sessions.log'),
            path.join(process.cwd(), 'logs', 'claude-performance.log'),
            '/tmp/claude-sessions.log'
        ];

        for (const logPath of logPaths) {
            try {
                if (fs.existsSync(logPath)) {
                    console.log(`📄 Reading logs from: ${logPath}`);
                    const logData = fs.readFileSync(logPath, 'utf8');
                    this.parseLogData(logData);
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        console.log('⚠️  No Claude performance logs found');
    }

    parseLogData(logData) {
        const lines = logData.split('\n');
        let inputTokens = 0;
        let outputTokens = 0;

        lines.forEach(line => {
            // Parse token usage from log lines
            const inputMatch = line.match(/input_tokens[:\s]+(\d+)/i);
            const outputMatch = line.match(/output_tokens[:\s]+(\d+)/i);
            
            if (inputMatch) {
                inputTokens += parseInt(inputMatch[1]);
            }
            if (outputMatch) {
                outputTokens += parseInt(outputMatch[1]);
            }
        });

        if (inputTokens > 0 || outputTokens > 0) {
            this.tokenUsage.inputTokens += inputTokens;
            this.tokenUsage.outputTokens += outputTokens;
            this.tokenUsage.sessionsAnalyzed++;
            console.log(`✅ Found ${inputTokens + outputTokens} tokens in logs`);
        }
    }

    async analyzeFileModifications() {
        try {
            // Get git status to see modified files
            const { execSync } = require('child_process');
            const gitStatus = execSync('git status --porcelain', { encoding: 'utf8', cwd: process.cwd() });
            const modifiedFiles = gitStatus.split('\n').filter(line => line.trim());

            let estimatedTokens = 0;
            
            for (const file of modifiedFiles) {
                const filename = file.substring(3); // Remove git status prefix
                try {
                    const filePath = path.join(process.cwd(), filename);
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        const fileSizeKB = stats.size / 1024;
                        
                        // Estimate tokens: ~750 tokens per KB for code files
                        const estimatedFileTokens = Math.floor(fileSizeKB * 750);
                        estimatedTokens += estimatedFileTokens;
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }

            this.tokenUsage.inputTokens += Math.floor(estimatedTokens * 0.7); // Input context
            this.tokenUsage.outputTokens += Math.floor(estimatedTokens * 0.3); // Generated output
            
            console.log(`📁 Analyzed ${modifiedFiles.length} modified files: ~${estimatedTokens} tokens`);
        } catch (error) {
            console.log('⚠️  Could not analyze git modifications');
        }
    }

    estimateFromActivity() {
        // Get session duration
        const sessionDuration = Date.now() - this.sessionStart.getTime();
        const hoursActive = Math.max(sessionDuration / (1000 * 60 * 60), 0.1);

        // Estimate based on typical Claude Code usage patterns
        const baseInputPerHour = 12000;  // Conservative estimate
        const baseOutputPerHour = 6000;  // Conservative estimate

        const timeBasedInput = Math.floor(hoursActive * baseInputPerHour);
        const timeBasedOutput = Math.floor(hoursActive * baseOutputPerHour);

        this.tokenUsage.inputTokens += timeBasedInput;
        this.tokenUsage.outputTokens += timeBasedOutput;

        console.log(`⏱️  Session duration: ${hoursActive.toFixed(1)}h, estimated ${timeBasedInput + timeBasedOutput} tokens`);
    }

    calculateCosts() {
        this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;
        
        const inputCost = this.tokenUsage.inputTokens * this.pricing.input;
        const outputCost = this.tokenUsage.outputTokens * this.pricing.output;
        
        this.tokenUsage.estimatedCost = inputCost + outputCost;
        this.tokenUsage.inputCost = inputCost;
        this.tokenUsage.outputCost = outputCost;
    }

    generateReport() {
        this.calculateCosts();
        
        console.log('\n📊 TOKEN USAGE REPORT');
        console.log('═══════════════════════════════════════');
        console.log(`📥 Input Tokens:    ${this.tokenUsage.inputTokens.toLocaleString()}`);
        console.log(`📤 Output Tokens:   ${this.tokenUsage.outputTokens.toLocaleString()}`);
        console.log(`🔢 Total Tokens:    ${this.tokenUsage.totalTokens.toLocaleString()}`);
        console.log(`💰 Estimated Cost:  $${this.tokenUsage.estimatedCost.toFixed(2)}`);
        console.log(`📈 Sessions Found:  ${this.tokenUsage.sessionsAnalyzed}`);
        
        // Save to JSON for dashboard consumption
        this.saveToFile();
        
        return this.tokenUsage;
    }

    generateFallbackEstimate() {
        console.log('⚠️  Using fallback estimation method');
        
        // Very conservative estimate
        this.tokenUsage.inputTokens = 25000;  // 25K input tokens
        this.tokenUsage.outputTokens = 12000; // 12K output tokens
        
        this.generateReport();
    }

    saveToFile() {
        const outputPath = path.join(process.cwd(), 'devops', 'token-usage.json');
        const data = {
            timestamp: new Date().toISOString(),
            tokenUsage: this.tokenUsage,
            metadata: {
                generatedBy: 'token-usage-tracker.js',
                sessionStart: this.sessionStart.toISOString()
            }
        };
        
        try {
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
            console.log(`💾 Token data saved to: ${outputPath}`);
        } catch (error) {
            console.error('Failed to save token data:', error.message);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tracker = new TokenUsageTracker();
    tracker.analyzeSession().then(() => {
        console.log('✅ Token analysis complete');
    }).catch(error => {
        console.error('❌ Token analysis failed:', error.message);
        process.exit(1);
    });
}

module.exports = TokenUsageTracker;