/**
 * Supabase Credential Extractor
 * Uses Puppeteer to extract Supabase project credentials from open browser
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

class SupabaseExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.credentials = null;
  }

  async initialize() {
    logger.info('🔍 Initializing Supabase credential extractor...');
    
    // Connect to existing browser instance if available
    try {
      this.browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null
      });
      logger.info('Connected to existing browser instance');
    } catch (error) {
      // Launch new browser instance
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          '--remote-debugging-port=9222',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      logger.info('Launched new browser instance');
    }
  }

  async extractCredentials() {
    logger.info('🎯 Extracting Supabase credentials from browser...');
    
    const pages = await this.browser.pages();
    let supabasePage = null;
    
    // Look for Supabase tab
    for (const page of pages) {
      const url = page.url();
      if (url.includes('supabase.com') || url.includes('supabase.co')) {
        supabasePage = page;
        break;
      }
    }
    
    if (!supabasePage) {
      // Open new Supabase tab
      supabasePage = await this.browser.newPage();
      await supabasePage.goto('https://supabase.com/dashboard');
      
      console.log('🌐 Please log in to Supabase and navigate to your project...');
      console.log('⏳ Waiting for you to open your project dashboard...');
      
      // Wait for project page
      await supabasePage.waitForFunction(() => {
        return window.location.href.includes('/project/') || 
               document.querySelector('[data-testid="project-url"]') ||
               document.querySelector('.project-url') ||
               document.title.includes('Project:');
      }, { timeout: 120000 });
    }
    
    this.page = supabasePage;
    
    // Extract project credentials
    const credentials = await this.extractProjectCredentials();
    
    if (credentials.url && credentials.anonKey) {
      logger.info('✅ Successfully extracted Supabase credentials');
      this.credentials = credentials;
      
      // Save credentials
      await this.saveCredentials(credentials);
      
      return credentials;
    } else {
      throw new Error('Failed to extract complete credentials');
    }
  }

  async extractProjectCredentials() {
    logger.info('📊 Extracting project details...');
    
    const credentials = {
      url: null,
      anonKey: null,
      serviceRoleKey: null,
      projectId: null,
      projectName: null
    };
    
    try {
      // Method 1: Try to find API settings page
      await this.navigateToAPISettings();
      
      // Extract URL
      credentials.url = await this.page.evaluate(() => {
        // Look for project URL in various locations
        const urlSelectors = [
          '[data-testid="project-url"]',
          '.project-url',
          '[class*="url"]',
          'code:contains("https://")',
          'input[value*="supabase.co"]'
        ];
        
        for (const selector of urlSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent || element.value || element.innerText;
              if (text && text.includes('supabase.co')) {
                return text.trim();
              }
            }
          } catch (e) {}
        }
        
        // Try to extract from page content
        const pageText = document.body.innerText;
        const urlMatch = pageText.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
        return urlMatch ? urlMatch[0] : null;
      });
      
      // Extract anon key
      credentials.anonKey = await this.page.evaluate(() => {
        // Look for anon key in various locations
        const keySelectors = [
          '[data-testid="anon-key"]',
          '[class*="anon"]',
          '[class*="public"]',
          'code',
          'pre',
          'input[value*="eyJ"]' // JWT tokens start with eyJ
        ];
        
        for (const selector of keySelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent || element.value || element.innerText;
              if (text && text.startsWith('eyJ') && text.length > 100) {
                return text.trim();
              }
            }
          } catch (e) {}
        }
        
        // Try to find in page text
        const pageText = document.body.innerText;
        const keyMatch = pageText.match(/eyJ[A-Za-z0-9_-]{100,}/);
        return keyMatch ? keyMatch[0] : null;
      });
      
      // Extract project ID from URL if available
      credentials.projectId = await this.page.evaluate(() => {
        const url = window.location.href;
        const projectMatch = url.match(/project\/([a-z0-9-]+)/);
        return projectMatch ? projectMatch[1] : null;
      });
      
      // Extract project name
      credentials.projectName = await this.page.evaluate(() => {
        const nameSelectors = [
          '[data-testid="project-name"]',
          '.project-name',
          'h1',
          '[class*="title"]'
        ];
        
        for (const selector of nameSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              const text = element.textContent || element.innerText;
              if (text && text.trim() && !text.includes('Supabase')) {
                return text.trim();
              }
            }
          } catch (e) {}
        }
        
        return document.title.split(' | ')[0] || 'Unknown Project';
      });
      
      logger.info(`Project: ${credentials.projectName}`);
      logger.info(`URL: ${credentials.url}`);
      logger.info(`Anon Key: ${credentials.anonKey ? 'Found' : 'Not found'}`);
      
    } catch (error) {
      logger.error('Error extracting credentials:', error);
    }
    
    // If we couldn't find everything, try alternative methods
    if (!credentials.url || !credentials.anonKey) {
      logger.info('🔄 Trying alternative extraction methods...');
      const altCredentials = await this.tryAlternativeExtraction();
      Object.assign(credentials, altCredentials);
    }
    
    return credentials;
  }

  async navigateToAPISettings() {
    logger.info('🚀 Navigating to API settings...');
    
    try {
      // Look for Settings or API links
      await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        
        for (const link of links) {
          const text = link.textContent?.toLowerCase() || '';
          if (text.includes('settings') || text.includes('api') || text.includes('config')) {
            link.click();
            return true;
          }
        }
        
        // Try sidebar navigation
        const navItems = document.querySelectorAll('[class*="nav"] a, [class*="sidebar"] a');
        for (const item of navItems) {
          const text = item.textContent?.toLowerCase() || '';
          if (text.includes('settings') || text.includes('api')) {
            item.click();
            return true;
          }
        }
      });
      
      // Wait for navigation
      await this.page.waitForTimeout(2000);
      
      // Look for API settings specifically
      await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        
        for (const element of elements) {
          const text = element.textContent?.toLowerCase() || '';
          if (text.includes('project api keys') || 
              text.includes('api settings') || 
              text.includes('configuration')) {
            element.click();
            break;
          }
        }
      });
      
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      logger.warn('Could not navigate to API settings, trying current page');
    }
  }

  async tryAlternativeExtraction() {
    logger.info('🔍 Trying alternative credential extraction...');
    
    const credentials = {
      url: null,
      anonKey: null
    };
    
    try {
      // Method 1: Look in browser storage
      const storageData = await this.page.evaluate(() => {
        const data = {};
        
        // Check localStorage
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            if (value && (value.includes('supabase.co') || value.startsWith('eyJ'))) {
              data[key] = value;
            }
          }
        } catch (e) {}
        
        // Check sessionStorage
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            if (value && (value.includes('supabase.co') || value.startsWith('eyJ'))) {
              data[key] = value;
            }
          }
        } catch (e) {}
        
        return data;
      });
      
      // Parse storage data
      for (const [key, value] of Object.entries(storageData)) {
        if (value.includes('supabase.co') && !credentials.url) {
          const urlMatch = value.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
          if (urlMatch) credentials.url = urlMatch[0];
        }
        
        if (value.startsWith('eyJ') && value.length > 100 && !credentials.anonKey) {
          credentials.anonKey = value;
        }
      }
      
      // Method 2: Look in network requests
      if (!credentials.url || !credentials.anonKey) {
        logger.info('🌐 Analyzing network requests...');
        
        // Enable request interception
        await this.page.setRequestInterception(true);
        
        const requests = [];
        this.page.on('request', (request) => {
          const url = request.url();
          const headers = request.headers();
          
          if (url.includes('supabase.co')) {
            requests.push({ url, headers });
          }
          
          request.continue();
        });
        
        // Trigger some requests by interacting with the page
        await this.page.reload();
        await this.page.waitForTimeout(3000);
        
        // Analyze captured requests
        for (const request of requests) {
          if (request.url.includes('supabase.co') && !credentials.url) {
            const urlMatch = request.url.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
            if (urlMatch) credentials.url = urlMatch[0];
          }
          
          if (request.headers.apikey && !credentials.anonKey) {
            credentials.anonKey = request.headers.apikey;
          }
          
          if (request.headers.authorization && !credentials.anonKey) {
            const auth = request.headers.authorization;
            if (auth.startsWith('Bearer ')) {
              credentials.anonKey = auth.replace('Bearer ', '');
            }
          }
        }
        
        await this.page.setRequestInterception(false);
      }
      
    } catch (error) {
      logger.error('Alternative extraction failed:', error);
    }
    
    return credentials;
  }

  async saveCredentials(credentials) {
    const credentialsPath = path.join(__dirname, '../config/supabase.json');
    
    const config = {
      url: credentials.url,
      anonKey: credentials.anonKey,
      serviceRoleKey: credentials.serviceRoleKey,
      projectId: credentials.projectId,
      projectName: credentials.projectName,
      extractedAt: new Date().toISOString()
    };
    
    await fs.mkdir(path.dirname(credentialsPath), { recursive: true });
    await fs.writeFile(credentialsPath, JSON.stringify(config, null, 2));
    
    // Also create .env entries
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, start fresh
    }
    
    // Update or add Supabase variables
    const supabaseVars = [
      `SUPABASE_URL=${credentials.url}`,
      `SUPABASE_ANON_KEY=${credentials.anonKey}`,
      `SUPABASE_PROJECT_ID=${credentials.projectId}`,
      `SUPABASE_PROJECT_NAME=${credentials.projectName}`
    ];
    
    for (const varLine of supabaseVars) {
      const [key] = varLine.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, varLine);
      } else {
        envContent += `\n${varLine}`;
      }
    }
    
    await fs.writeFile(envPath, envContent);
    
    logger.info(`✅ Credentials saved to ${credentialsPath} and .env`);
  }

  async interactiveExtraction() {
    console.log('\n🎯 Interactive Supabase Credential Extraction\n');
    console.log('Instructions:');
    console.log('1. Make sure you have a Supabase project open in your browser');
    console.log('2. Navigate to Project Settings > API');
    console.log('3. This script will extract the credentials automatically\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('Press Enter when you\'re ready to extract credentials... ', async () => {
        rl.close();
        
        try {
          const credentials = await this.extractCredentials();
          
          console.log('\n✅ Extraction Complete!');
          console.log(`Project: ${credentials.projectName}`);
          console.log(`URL: ${credentials.url}`);
          console.log(`Anon Key: ${credentials.anonKey ? 'Extracted ✅' : 'Missing ❌'}`);
          
          resolve(credentials);
        } catch (error) {
          console.error('❌ Extraction failed:', error.message);
          resolve(null);
        }
      });
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const extractor = new SupabaseExtractor();
    
    try {
      await extractor.initialize();
      
      if (process.argv.includes('--interactive')) {
        await extractor.interactiveExtraction();
      } else {
        await extractor.extractCredentials();
      }
      
    } catch (error) {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    } finally {
      await extractor.close();
    }
  }
  
  main();
}

module.exports = SupabaseExtractor;