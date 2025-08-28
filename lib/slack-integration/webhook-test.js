#!/usr/bin/env node

/**
 * Webhook Test Message
 * Uses the webhook URL found in your credentials to send a message
 */

const https = require('https');

async function sendWebhookMessage() {
  const webhookUrl = 'https://hooks.slack.com/services/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';
  
  const message = {
    text: '🎉 Pachacuti Slack Integration Test via Webhook',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚀 Pachacuti Test Message',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Integration Status:* ✅ Working via webhook!\n*Method:* Incoming Webhook\n*Time:* ${new Date().toLocaleString()}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Test Results:*\n• ✅ Webhook URL working\n• ✅ Message delivery successful\n• ✅ Rich block formatting supported\n• ✅ Pachacuti integration ready'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🤖 Sent from Pachacuti approval system code review'
          }
        ]
      }
    ]
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(webhookUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Test message sent successfully via webhook!');
          console.log('📱 Check your #claude-code-notifications channel for the message');
          resolve(data);
        } else {
          console.error(`❌ Webhook failed with status ${res.statusCode}: ${data}`);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Webhook request failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

sendWebhookMessage().catch(console.error);