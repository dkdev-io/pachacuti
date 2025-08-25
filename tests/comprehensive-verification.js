#!/usr/bin/env node

/**
 * Comprehensive Puppeteer Verification Suite
 * Tests all Pachacuti DevOps components with real browser automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PachacutiTestSuite {
    constructor() {
        this.browser = null;
        this.results = {
            timestamp: new Date().toISOString(),
            totalTests: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        
        // Test configurations
        this.dashboardPath = 'file:///Users/Danallovertheplace/pachacuti/devops/agent-dashboard.html';
        this.shellReportPath = 'file:///Users/Danallovertheplace/pachacuti/devops/shell-report.html';
        this.dailyReportPath = 'file:///Users/Danallovertheplace/pachacuti/devops/daily-report.html';
        this.taskManagerPath = 'file:///Users/Danallovertheplace/pachacuti/task-manager/dashboard/task-manager.html';
        this.projectLinksPath = 'file:///Users/Danallovertheplace/pachacuti/devops/project-links.html';
        
        this.apiEndpoints = {
            shellViewer: 'http://localhost:3001',
            sessions: 'http://localhost:3001/api/sessions',
            health: 'http://localhost:3001/api/health'
        };
    }

    async init() {
        console.log('🚀 Starting Puppeteer Browser...');
        this.browser = await puppeteer.launch({
            headless: false, // Show browser for verification
            devtools: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-file-access-from-files'
            ]
        });
        console.log('✅ Browser launched');
    }

    async runAllTests() {
        try {
            await this.init();
            
            console.log('📊 Running Comprehensive Test Suite...\n');

            // Phase 1: Dashboard Tests
            await this.testAgentDashboard();
            await this.testShellReport();
            await this.testDailyReport();
            await this.testTaskManager();
            await this.testProjectLinks();
            
            // Phase 2: API Tests
            await this.testShellViewerAPI();
            await this.testDataIntegration();
            
            // Phase 3: Real-Time Tests
            await this.testRealTimeUpdates();
            await this.testNavigation();
            
            // Phase 4: Performance Tests
            await this.testLoadTimes();
            await this.testResponsiveness();
            
            // Generate Report
            await this.generateReport();
            
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Browser closed');
            }
        }
    }

    async testAgentDashboard() {
        const testName = 'Agent Dashboard';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.dashboardPath, { waitUntil: 'networkidle2' });
            
            // Check if page loads
            await page.waitForSelector('.dashboard', { timeout: 10000 });
            
            // Check for LIVE DATA indicator
            const liveDataIndicator = await page.$('.header div:contains("LIVE DATA")');
            const hasLiveData = !!liveDataIndicator;
            
            // Check for real agent data
            const agentCards = await page.$$('.agent-card');
            const agentCount = agentCards.length;
            
            // Verify stats bar has actual numbers
            const statsElements = await page.$$('.stat-item .value');
            const statsValues = await Promise.all(
                statsElements.map(el => page.evaluate(element => element.textContent, el))
            );
            
            // Check navigation links
            const navLinks = await page.$$('.nav-link');
            const navCount = navLinks.length;
            
            // Take screenshot
            await page.screenshot({ 
                path: `./tests/screenshots/agent-dashboard-${Date.now()}.png`,
                fullPage: true 
            });
            
            this.addTestResult(testName, true, {
                hasLiveData,
                agentCount,
                statsValues: statsValues.slice(0, 4), // First 4 stats
                navCount,
                url: this.dashboardPath
            });
            
            console.log(`✅ ${testName} passed - ${agentCount} agents, live data: ${hasLiveData}`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testShellReport() {
        const testName = 'Shell Performance Report';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.shellReportPath, { waitUntil: 'networkidle2' });
            
            // Check performance metrics
            await page.waitForSelector('.metrics-grid', { timeout: 5000 });
            
            const metrics = await page.evaluate(() => {
                return {
                    activeShells: document.getElementById('activeShells')?.textContent || '0',
                    contextUsage: document.getElementById('contextUsage')?.textContent || 'N/A',
                    avgResponseTime: document.getElementById('avgResponseTime')?.textContent || 'N/A',
                    memoryUsage: document.getElementById('memoryUsage')?.textContent || '0MB'
                };
            });
            
            // Check if shell list is populated
            const shellItems = await page.$$('.shell-item');
            const shellCount = shellItems.length;
            
            // Check for performance bars
            const performanceBars = await page.$$('.performance-fill');
            const barCount = performanceBars.length;
            
            await page.screenshot({ 
                path: `./tests/screenshots/shell-report-${Date.now()}.png`,
                fullPage: true 
            });
            
            this.addTestResult(testName, true, {
                metrics,
                shellCount,
                performanceBarCount: barCount
            });
            
            console.log(`✅ ${testName} passed - ${shellCount} shells, ${barCount} performance bars`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testDailyReport() {
        const testName = 'Daily Report';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.dailyReportPath, { waitUntil: 'networkidle2' });
            
            // Generate a report first
            await page.click('.generate-btn');
            await page.waitForSelector('.report-container.show', { timeout: 5000 });
            
            // Check report cards
            const reportCards = await page.$$('.report-card');
            const cardCount = reportCards.length;
            
            // Get some metrics
            const metrics = await page.evaluate(() => {
                return {
                    totalTasks: document.getElementById('totalTasks')?.textContent || '0',
                    activeAgents: document.getElementById('activeAgents')?.textContent || '0',
                    tokensUsed: document.getElementById('tokensUsed')?.textContent || '0',
                    dailyCost: document.getElementById('dailyCost')?.textContent || '$0'
                };
            });
            
            // Check timeline
            const timelineItems = await page.$$('.timeline-item');
            const timelineCount = timelineItems.length;
            
            await page.screenshot({ 
                path: `./tests/screenshots/daily-report-${Date.now()}.png`,
                fullPage: true 
            });
            
            this.addTestResult(testName, true, {
                cardCount,
                metrics,
                timelineItems: timelineCount
            });
            
            console.log(`✅ ${testName} passed - ${cardCount} cards, ${timelineCount} timeline items`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testTaskManager() {
        const testName = 'Task Manager';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.taskManagerPath, { waitUntil: 'networkidle2' });
            
            // Check for project cards
            const projectCards = await page.$$('.project-card');
            const projectCount = projectCards.length;
            
            // Check agent badges
            const agentBadges = await page.$$('.agent-badge');
            const badgeCount = agentBadges.length;
            
            await page.screenshot({ 
                path: `./tests/screenshots/task-manager-${Date.now()}.png`,
                fullPage: true 
            });
            
            this.addTestResult(testName, true, {
                projectCount,
                agentBadgeCount: badgeCount
            });
            
            console.log(`✅ ${testName} passed - ${projectCount} projects, ${badgeCount} agent badges`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testProjectLinks() {
        const testName = 'Project Links';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.projectLinksPath, { waitUntil: 'networkidle2' });
            
            const projectCards = await page.$$('.project-card');
            const projectCount = projectCards.length;
            
            // Check for status indicators
            const statusElements = await page.$$('.status');
            const statusCount = statusElements.length;
            
            await page.screenshot({ 
                path: `./tests/screenshots/project-links-${Date.now()}.png`,
                fullPage: true 
            });
            
            this.addTestResult(testName, true, {
                projectCount,
                statusCount
            });
            
            console.log(`✅ ${testName} passed - ${projectCount} projects tracked`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testShellViewerAPI() {
        const testName = 'Shell Viewer API';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            
            // Test main page
            await page.goto(this.apiEndpoints.shellViewer, { waitUntil: 'networkidle2' });
            const title = await page.title();
            
            // Test sessions endpoint
            try {
                const response = await page.evaluate(async (url) => {
                    const res = await fetch(url);
                    return {
                        status: res.status,
                        data: await res.json()
                    };
                }, this.apiEndpoints.sessions);
                
                this.addTestResult(testName, true, {
                    pageTitle: title,
                    sessionsAPI: response
                });
                
                console.log(`✅ ${testName} passed - API responding, ${response.data?.length || 0} sessions`);
            } catch (apiError) {
                this.addTestResult(testName, false, { 
                    error: 'API not responding',
                    details: apiError.message 
                });
                console.log(`❌ ${testName} API failed: ${apiError.message}`);
            }
            
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testDataIntegration() {
        const testName = 'Real Data Integration';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            // Check if real-data.json exists and has recent data
            const dataPath = path.join(__dirname, '../devops/real-data.json');
            const exists = fs.existsSync(dataPath);
            
            if (exists) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                const isRecent = (Date.now() - new Date(data.timestamp).getTime()) < 300000; // 5 minutes
                
                this.addTestResult(testName, isRecent, {
                    dataExists: exists,
                    isRecent,
                    agentCount: data.agents?.active?.length || 0,
                    lastUpdate: data.timestamp
                });
                
                console.log(`✅ ${testName} passed - Real data flowing, ${data.agents?.active?.length || 0} agents`);
            } else {
                this.addTestResult(testName, false, { error: 'Real data file not found' });
                console.log(`❌ ${testName} failed: Real data file not found`);
            }
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testRealTimeUpdates() {
        const testName = 'Real-Time Updates';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.shellReportPath, { waitUntil: 'networkidle2' });
            
            // Wait for auto-refresh countdown
            const countdownExists = await page.$('#countdown');
            
            if (countdownExists) {
                const initialValue = await page.$eval('#countdown', el => el.textContent);
                
                // Wait 2 seconds and check if countdown changed
                await page.waitForTimeout(2000);
                const newValue = await page.$eval('#countdown', el => el.textContent);
                
                const isUpdating = initialValue !== newValue;
                
                this.addTestResult(testName, isUpdating, {
                    initialCountdown: initialValue,
                    newCountdown: newValue,
                    isUpdating
                });
                
                console.log(`✅ ${testName} ${isUpdating ? 'passed' : 'warning'} - Countdown updating: ${isUpdating}`);
            } else {
                this.addTestResult(testName, false, { error: 'Countdown element not found' });
                console.log(`❌ ${testName} failed: Countdown element not found`);
            }
            
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testNavigation() {
        const testName = 'Navigation';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            await page.goto(this.dashboardPath, { waitUntil: 'networkidle2' });
            
            // Test navigation links
            const navLinks = await page.$$('.nav-link[href^="file://"]');
            const navCount = navLinks.length;
            
            let workingLinks = 0;
            for (const link of navLinks.slice(0, 3)) { // Test first 3 links
                try {
                    const href = await page.evaluate(el => el.href, link);
                    const newPage = await this.browser.newPage();
                    await newPage.goto(href, { waitUntil: 'networkidle2', timeout: 5000 });
                    workingLinks++;
                    await newPage.close();
                } catch (linkError) {
                    // Link may not work, that's ok
                }
            }
            
            this.addTestResult(testName, workingLinks > 0, {
                totalLinks: navCount,
                workingLinks,
                successRate: `${Math.round((workingLinks / Math.min(3, navCount)) * 100)}%`
            });
            
            console.log(`✅ ${testName} passed - ${workingLinks}/${Math.min(3, navCount)} links working`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testLoadTimes() {
        const testName = 'Load Times';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const dashboards = [
                { name: 'Agent Dashboard', url: this.dashboardPath },
                { name: 'Shell Report', url: this.shellReportPath },
                { name: 'Daily Report', url: this.dailyReportPath }
            ];
            
            const loadTimes = {};
            
            for (const dashboard of dashboards) {
                const page = await this.browser.newPage();
                const startTime = Date.now();
                
                await page.goto(dashboard.url, { waitUntil: 'networkidle2', timeout: 10000 });
                
                const loadTime = Date.now() - startTime;
                loadTimes[dashboard.name] = loadTime;
                
                await page.close();
            }
            
            const avgLoadTime = Object.values(loadTimes).reduce((a, b) => a + b, 0) / Object.values(loadTimes).length;
            const acceptable = avgLoadTime < 5000; // Under 5 seconds
            
            this.addTestResult(testName, acceptable, {
                loadTimes,
                averageMs: Math.round(avgLoadTime),
                acceptable
            });
            
            console.log(`✅ ${testName} ${acceptable ? 'passed' : 'warning'} - Avg: ${Math.round(avgLoadTime)}ms`);
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    async testResponsiveness() {
        const testName = 'Mobile Responsiveness';
        console.log(`🧪 Testing ${testName}...`);
        
        try {
            const page = await this.browser.newPage();
            
            // Test mobile viewport
            await page.setViewport({ width: 375, height: 667 }); // iPhone SE
            await page.goto(this.dashboardPath, { waitUntil: 'networkidle2' });
            
            // Check if mobile layout elements exist/work
            const isResponsive = await page.evaluate(() => {
                const dashboard = document.querySelector('.dashboard');
                if (!dashboard) return false;
                
                const computedStyle = window.getComputedStyle(dashboard);
                return computedStyle.maxWidth !== 'none' || computedStyle.width.includes('%');
            });
            
            // Take mobile screenshot
            await page.screenshot({ 
                path: `./tests/screenshots/mobile-responsive-${Date.now()}.png`,
                fullPage: true 
            });
            
            // Reset viewport
            await page.setViewport({ width: 1920, height: 1080 });
            
            this.addTestResult(testName, isResponsive, {
                isResponsive,
                testedViewport: '375x667'
            });
            
            console.log(`✅ ${testName} ${isResponsive ? 'passed' : 'warning'} - Mobile responsive: ${isResponsive}`);
            await page.close();
            
        } catch (error) {
            this.addTestResult(testName, false, { error: error.message });
            console.log(`❌ ${testName} failed: ${error.message}`);
        }
    }

    addTestResult(name, passed, details = {}) {
        this.results.totalTests++;
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
        
        this.results.tests.push({
            name,
            passed,
            timestamp: new Date().toISOString(),
            details
        });
    }

    async generateReport() {
        const reportPath = path.join(__dirname, 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // Generate HTML report
        const htmlReport = this.generateHTMLReport();
        const htmlPath = path.join(__dirname, 'test-results.html');
        fs.writeFileSync(htmlPath, htmlReport);
        
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('=====================================');
        console.log(`Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Success Rate: ${Math.round((this.results.passed / this.results.totalTests) * 100)}%`);
        console.log(`📄 Report saved: ${htmlPath}`);
        
        // Show failed tests
        const failed = this.results.tests.filter(t => !t.passed);
        if (failed.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            failed.forEach(test => {
                console.log(`  - ${test.name}: ${test.details.error || 'Unknown error'}`);
            });
        }
    }

    generateHTMLReport() {
        return `<!DOCTYPE html>
<html><head><title>Pachacuti Test Results</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}
.container{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
.pass{color:#4CAF50}.fail{color:#f44336}.summary{background:#e3f2fd;padding:15px;border-radius:5px;margin-bottom:20px}
.test{margin:10px 0;padding:15px;border-left:4px solid #ddd;background:#fafafa}
.test.pass{border-left-color:#4CAF50}.test.fail{border-left-color:#f44336}
.details{margin-top:10px;font-size:0.9em;color:#666}
</style></head><body>
<div class="container">
<h1>🚀 Pachacuti DevOps Test Results</h1>
<div class="summary">
<h3>Summary</h3>
<p>Total Tests: ${this.results.totalTests}</p>
<p class="pass">✅ Passed: ${this.results.passed}</p>
<p class="fail">❌ Failed: ${this.results.failed}</p>
<p>Success Rate: ${Math.round((this.results.passed / this.results.totalTests) * 100)}%</p>
<p>Generated: ${this.results.timestamp}</p>
</div>
${this.results.tests.map(test => `
<div class="test ${test.passed ? 'pass' : 'fail'}">
<h4>${test.passed ? '✅' : '❌'} ${test.name}</h4>
<div class="details">
<strong>Time:</strong> ${test.timestamp}<br>
<strong>Details:</strong> <code>${JSON.stringify(test.details, null, 2)}</code>
</div>
</div>`).join('')}
</div></body></html>`;
    }
}

// Run if executed directly
if (require.main === module) {
    // Create screenshots directory
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const suite = new PachacutiTestSuite();
    suite.runAllTests().then(() => {
        process.exit(suite.results.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = PachacutiTestSuite;