# Puppeteer Agent Guide

## Available for All Agents

Puppeteer is installed and ready for use by all Claude Code agents in the Pachacuti environment.

**Installation Location**: `/Users/Danallovertheplace/pachacuti/node_modules/puppeteer`

## Usage Examples

### Basic Browser Automation
```javascript
const puppeteer = require('puppeteer');

async function automateTask() {
    const browser = await puppeteer.launch({
        headless: false, // Show browser window
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    await page.goto('file:///path/to/dashboard.html');
    
    // Your automation code here
    
    await browser.close();
}
```

### Dashboard Verification
See `/Users/Danallovertheplace/pachacuti/scripts/verify-dashboard.js` for complete example.

## Key Features Available

- ✅ Chrome browser automation
- ✅ Screenshot capture 
- ✅ Element interaction (clicks, typing)
- ✅ Page navigation and waiting
- ✅ Data extraction from pages
- ✅ File:// protocol support for local HTML files

## Working Examples

The verification script successfully:
- Opens Chrome browser automatically  
- Navigates to local dashboard HTML file
- Extracts agent statistics from page
- Takes full-page screenshots
- Tests navigation functionality
- Generates verification reports

All agents can now use Puppeteer for browser automation tasks.