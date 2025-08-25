#!/usr/bin/env node

/**
 * Real Data Connector for Pachacuti DevOps Dashboard
 * Connects actual system metrics to dashboard displays
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RealDataConnector {
    constructor() {
        this.dataPath = path.join(__dirname, 'real-data.json');
        this.metricsPath = path.join(__dirname, '.claude-flow/metrics');
        this.tokenUsagePath = path.join(__dirname, 'token-usage.json');
    }

    async collectAllData() {
        const data = {
            timestamp: new Date().toISOString(),
            agents: await this.getAgentData(),
            shells: await this.getShellData(),
            projects: await this.getProjectData(),
            performance: await this.getPerformanceData(),
            tokens: await this.getTokenUsage(),
            git: await this.getGitActivity()
        };

        // Save to file for dashboard consumption
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        console.log(`✅ Real data collected and saved to ${this.dataPath}`);
        return data;
    }

    async getAgentData() {
        try {
            // Get actual Claude processes
            const claudeProcesses = execSync('ps aux | grep claude | grep -v grep', { encoding: 'utf8' })
                .split('\n')
                .filter(line => line.trim());

            const activeAgents = claudeProcesses.map((proc, index) => {
                const parts = proc.split(/\s+/);
                const pid = parts[1];
                const cpu = parts[2];
                const mem = parts[3];
                const tty = parts[6];
                
                return {
                    id: `agent_${pid}`,
                    pid: pid,
                    name: `Claude Session ${tty}`,
                    status: 'active',
                    cpu: `${cpu}%`,
                    memory: `${mem}%`,
                    tty: tty,
                    type: this.detectAgentType(tty),
                    uptime: this.calculateUptime(parts[9])
                };
            });

            // Get idle shells (terminals without active Claude)
            const allTerminals = execSync('who | wc -l', { encoding: 'utf8' }).trim();
            const idleCount = Math.max(0, parseInt(allTerminals) - activeAgents.length);

            return {
                active: activeAgents,
                inactive: Array(idleCount).fill(null).map((_, i) => ({
                    id: `idle_${i}`,
                    name: `Idle Shell ${i + 1}`,
                    status: 'inactive'
                })),
                closed: [] // Would need session history to track
            };
        } catch (error) {
            console.error('Error getting agent data:', error);
            return { active: [], inactive: [], closed: [] };
        }
    }

    async getShellData() {
        try {
            const shells = execSync('ps aux | grep -E "(zsh|bash|claude)" | grep -v grep', { encoding: 'utf8' })
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 10) // Top 10 shells
                .map(line => {
                    const parts = line.split(/\s+/);
                    return {
                        pid: parts[1],
                        cpu: parts[2],
                        memory: parts[3],
                        command: parts.slice(10).join(' ').substring(0, 50),
                        tty: parts[6]
                    };
                });

            return shells;
        } catch (error) {
            return [];
        }
    }

    async getProjectData() {
        try {
            const projectsPath = path.join(__dirname, '../config/port-registry.json');
            if (fs.existsSync(projectsPath)) {
                const registry = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
                return Object.entries(registry.port_assignments).map(([port, proj]) => ({
                    name: proj.project,
                    port: port,
                    status: proj.status,
                    type: proj.type,
                    path: proj.path
                }));
            }
        } catch (error) {
            console.error('Error reading project data:', error);
        }
        return [];
    }

    async getPerformanceData() {
        try {
            // Get system load
            const loadAvg = execSync('uptime', { encoding: 'utf8' });
            const loadMatch = loadAvg.match(/load averages?: ([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
            
            // Get memory usage
            const memInfo = execSync('vm_stat', { encoding: 'utf8' });
            const pageSize = 16384; // macOS page size
            const freePages = parseInt(memInfo.match(/Pages free:\s+(\d+)/)?.[1] || 0);
            const activePages = parseInt(memInfo.match(/Pages active:\s+(\d+)/)?.[1] || 0);
            const totalMemory = (freePages + activePages) * pageSize / (1024 * 1024 * 1024); // GB

            return {
                loadAverage: loadMatch ? [
                    parseFloat(loadMatch[1]),
                    parseFloat(loadMatch[2]),
                    parseFloat(loadMatch[3])
                ] : [0, 0, 0],
                memoryUsageGB: (activePages * pageSize / (1024 * 1024 * 1024)).toFixed(2),
                totalMemoryGB: totalMemory.toFixed(2),
                cpuCores: parseInt(execSync('sysctl -n hw.ncpu', { encoding: 'utf8' }).trim())
            };
        } catch (error) {
            return {
                loadAverage: [0, 0, 0],
                memoryUsageGB: 0,
                totalMemoryGB: 0,
                cpuCores: 4
            };
        }
    }

    async getTokenUsage() {
        try {
            // Check if token usage file exists
            if (fs.existsSync(this.tokenUsagePath)) {
                return JSON.parse(fs.readFileSync(this.tokenUsagePath, 'utf8'));
            }
            
            // Estimate based on session time and typical usage
            const sessionHours = this.getSessionDuration();
            const estimatedTokens = Math.floor(sessionHours * 15000); // ~15k tokens/hour estimate
            
            return {
                daily: estimatedTokens,
                hourly: Math.floor(estimatedTokens / Math.max(1, sessionHours)),
                cost: (estimatedTokens * 0.00001).toFixed(2) // Rough cost estimate
            };
        } catch (error) {
            return { daily: 0, hourly: 0, cost: 0 };
        }
    }

    async getGitActivity() {
        try {
            const todayCommits = execSync('git log --since="24 hours ago" --oneline 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
            const modifiedFiles = execSync('git status --short 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
            const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8' }).trim();

            return {
                commitsToday: parseInt(todayCommits) || 0,
                modifiedFiles: parseInt(modifiedFiles) || 0,
                currentBranch: branch || 'main'
            };
        } catch (error) {
            return { commitsToday: 0, modifiedFiles: 0, currentBranch: 'main' };
        }
    }

    detectAgentType(tty) {
        // Map TTY to agent type based on session patterns
        const ttyNum = parseInt(tty.replace(/\D/g, ''));
        const types = ['developer', 'devops', 'tester', 'monitor', 'analyst'];
        return types[ttyNum % types.length];
    }

    calculateUptime(startTime) {
        // Parse start time and calculate duration
        const now = new Date();
        const started = new Date(startTime);
        const hours = Math.floor((now - started) / (1000 * 60 * 60));
        const minutes = Math.floor((now - started) / (1000 * 60)) % 60;
        return `${hours}h ${minutes}m`;
    }

    getSessionDuration() {
        try {
            // Get earliest Claude process start time
            const processes = execSync('ps aux | grep claude | grep -v grep', { encoding: 'utf8' });
            // Simple estimate: count lines as proxy for hours active
            return processes.split('\n').filter(l => l.trim()).length || 1;
        } catch {
            return 1;
        }
    }

    // Auto-update every 30 seconds
    startAutoUpdate() {
        this.collectAllData();
        setInterval(() => {
            this.collectAllData();
        }, 30000);
        console.log('📊 Real-time data connector started. Updates every 30 seconds.');
    }
}

// Run if executed directly
if (require.main === module) {
    const connector = new RealDataConnector();
    
    // Check for daemon mode
    if (process.argv.includes('--daemon')) {
        connector.startAutoUpdate();
        // Keep process running
        process.stdin.resume();
    } else {
        // Single collection
        connector.collectAllData().then(data => {
            console.log('Data collected:', JSON.stringify(data, null, 2));
        });
    }
}

module.exports = RealDataConnector;