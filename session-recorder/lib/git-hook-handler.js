#!/usr/bin/env node

/**
 * Git Hook Handler
 * Processes git hooks and sends events to session recorder
 */

const http = require('http');
const { execSync } = require('child_process');

const hookType = process.argv[2];
const sessionRecorderPort = process.env.SESSION_RECORDER_PORT || 5555;

function sendEvent(event) {
  const data = JSON.stringify(event);
  
  const options = {
    hostname: 'localhost',
    port: sessionRecorderPort,
    path: '/api/git-hook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const req = http.request(options, (res) => {
    // Silent success
  });
  
  req.on('error', (error) => {
    // Silent failure - don't block git operations
  });
  
  req.write(data);
  req.end();
}

try {
  let event = {
    type: hookType,
    timestamp: new Date().toISOString()
  };
  
  switch (hookType) {
    case 'post-commit':
      // Get the latest commit info
      const commitInfo = execSync('git log -1 --pretty=format:"%H|%an|%ae|%s"').toString();
      const [hash, author, email, message] = commitInfo.split('|');
      
      event.commit = {
        hash,
        author,
        email,
        message
      };
      
      // Get changed files
      const files = execSync('git diff-tree --no-commit-id --name-only -r HEAD').toString();
      event.files = files.split('\n').filter(f => f);
      
      break;
      
    case 'pre-push':
      // Get branch being pushed
      event.branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      
      // Get commits being pushed
      const commits = execSync('git log origin/main..HEAD --oneline').toString();
      event.commits = commits.split('\n').filter(c => c);
      
      break;
  }
  
  sendEvent(event);
} catch (error) {
  // Silent failure - don't block git operations
}

process.exit(0);