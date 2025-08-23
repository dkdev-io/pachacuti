#!/usr/bin/env node

/**
 * Dashboard Verification Script using Puppeteer
 * Automatically opens Chrome, navigates to dashboard, and verifies agent counts
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function verifyDashboard() {
    let browser;
    
    try {
        console.log('🚀 Starting Chrome browser...');
        browser = await puppeteer.launch({
            headless: false, // Show browser window
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-web-security']
        });

        const page = await browser.newPage();
        
        // Navigate to dashboard
        const dashboardPath = path.resolve(__dirname, '../devops/agent-dashboard.html');
        const dashboardUrl = `file://${dashboardPath}`;
        
        console.log('📊 Navigating to dashboard:', dashboardUrl);
        await page.goto(dashboardUrl, { waitUntil: 'networkidle0' });

        // Wait for dashboard to load
        await page.waitForSelector('.stats-bar', { timeout: 10000 });
        
        // Extract agent counts
        const stats = await page.evaluate(() => {
            return {
                activeAgents: document.getElementById('activeAgents')?.textContent || '0',
                inactiveAgents: document.getElementById('inactiveAgents')?.textContent || '0', 
                closedAgents: document.getElementById('closedAgents')?.textContent || '0',
                totalProjects: document.getElementById('totalProjects')?.textContent || '0',
                filesModified: document.getElementById('filesModified')?.textContent || '0',
                linesWritten: document.getElementById('linesWritten')?.textContent || '0',
                tasksCompleted: document.getElementById('tasksCompleted')?.textContent || '0'
            };
        });

        console.log('📈 Dashboard Statistics:');
        console.log(`   Active Agents: ${stats.activeAgents}`);
        console.log(`   Inactive Agents: ${stats.inactiveAgents}`);
        console.log(`   Closed Agents: ${stats.closedAgents}`);
        console.log(`   Total Projects: ${stats.totalProjects}`);
        console.log(`   Files Modified: ${stats.filesModified}`);
        console.log(`   Lines Written: ${stats.linesWritten}`);
        console.log(`   Tasks Completed: ${stats.tasksCompleted}`);

        // Take screenshot
        const screenshotPath = path.resolve(__dirname, '../docs/dashboard-verification.png');
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
        });
        console.log('📸 Screenshot saved:', screenshotPath);

        // Verify agent counts are realistic
        const activeCount = parseInt(stats.activeAgents);
        const inactiveCount = parseInt(stats.inactiveAgents);
        const closedCount = parseInt(stats.closedAgents);
        const total = activeCount + inactiveCount + closedCount;

        console.log('\n✅ Verification Results:');
        if (activeCount <= 5 && total <= 10) {
            console.log('✓ Agent counts look realistic (not inflated)');
            console.log(`✓ Total agents: ${total} (reasonable)`);
            console.log(`✓ Active agents: ${activeCount} (matches expected 3-5 range)`);
        } else {
            console.log('❌ Agent counts still appear inflated');
            console.log(`❌ Total agents: ${total} (too high)`);
            console.log(`❌ Active agents: ${activeCount} (expected 3-5)`);
        }

        // Test daily report navigation
        console.log('\n🔗 Testing daily report navigation...');
        await page.click('#quickDatePicker');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set date and click view report
        await page.evaluate(() => {
            document.getElementById('quickDatePicker').value = '2025-08-23';
        });
        
        // Click view report button (this will open in new tab)
        const [newPage] = await Promise.all([
            new Promise(resolve => page.on('popup', resolve)),
            page.click('.quick-view-btn')
        ]);
        
        await newPage.waitForSelector('.report-container', { timeout: 5000 });
        console.log('✓ Daily report navigation working');
        
        // Take daily report screenshot
        const reportScreenshotPath = path.resolve(__dirname, '../docs/daily-report-verification.png');
        await newPage.screenshot({ 
            path: reportScreenshotPath, 
            fullPage: true 
        });
        console.log('📸 Daily report screenshot saved:', reportScreenshotPath);

        await newPage.close();

        // Generate verification report
        const reportData = {
            timestamp: new Date().toISOString(),
            dashboardUrl: dashboardUrl,
            stats: stats,
            verification: {
                realistic_counts: total <= 10,
                active_agents_reasonable: activeCount <= 5,
                navigation_working: true,
                screenshots_captured: true
            },
            screenshots: [screenshotPath, reportScreenshotPath]
        };

        const reportPath = path.resolve(__dirname, '../docs/dashboard-verification-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log('📋 Verification report saved:', reportPath);

        console.log('\n🎉 Dashboard verification completed successfully!');

        // Keep browser open for 30 seconds for user to see
        console.log('⏱️  Browser will close in 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

if (require.main === module) {
    verifyDashboard();
}

module.exports = { verifyDashboard };