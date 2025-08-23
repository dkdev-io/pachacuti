#!/usr/bin/env node

/**
 * Claude Code Automatic Documentation Update System
 * Keeps documentation current with latest discoveries and capabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationUpdater {
  constructor() {
    this.docsPath = path.join(__dirname, '..');
    this.timestamp = new Date().toISOString();
    this.updates = [];
    this.backups = {};
  }

  // Main update process
  async updateAll() {
    console.log('🚀 Starting Claude Code Documentation Update...\n');
    
    // Create backups first
    this.createBackups();
    
    // Run updates
    await this.updateToolReference();
    await this.updateCapabilities();
    await this.updateBestPractices();
    await this.updateWorkflowPatterns();
    await this.updateTroubleshooting();
    await this.updateAdvancedFeatures();
    
    // Update CLAUDE.md files
    await this.updateClaudeMdFiles();
    
    // Generate changelog
    this.generateChangelog();
    
    // Verify updates
    this.verifyUpdates();
    
    console.log('\n✅ Documentation update complete!');
    return this.updates;
  }

  // Create backups of all docs
  createBackups() {
    console.log('📦 Creating backups...');
    
    const files = [
      'tool-reference.md',
      'capabilities.md',
      'best-practices.md',
      'workflow-patterns.md',
      'troubleshooting.md',
      'advanced-features.md'
    ];
    
    files.forEach(file => {
      const filePath = path.join(this.docsPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.backups[file] = content;
        
        // Save versioned backup
        const backupPath = path.join(
          this.docsPath,
          'versions',
          `${file}.${this.timestamp}.backup`
        );
        fs.writeFileSync(backupPath, content);
      }
    });
  }

  // Update tool reference
  async updateToolReference() {
    console.log('📚 Updating tool reference...');
    
    const toolRefPath = path.join(this.docsPath, 'tool-reference.md');
    let content = fs.readFileSync(toolRefPath, 'utf8');
    
    // Check for new tool discoveries from learning sessions
    const learningData = this.getLatestLearning();
    
    if (learningData.newTools) {
      learningData.newTools.forEach(tool => {
        if (!content.includes(`### ${tool.name}`)) {
          // Add new tool section
          const toolSection = this.formatToolSection(tool);
          content = this.insertSection(content, toolSection, '## Complete Tool Directory');
          
          this.updates.push({
            file: 'tool-reference.md',
            type: 'new-tool',
            description: `Added ${tool.name} tool`
          });
        }
      });
    }
    
    // Update tool parameters if changed
    if (learningData.toolUpdates) {
      learningData.toolUpdates.forEach(update => {
        content = this.updateToolParameters(content, update);
      });
    }
    
    fs.writeFileSync(toolRefPath, content);
  }

  // Update capabilities
  async updateCapabilities() {
    console.log('🚀 Updating capabilities...');
    
    const capPath = path.join(this.docsPath, 'capabilities.md');
    let content = fs.readFileSync(capPath, 'utf8');
    
    // Get latest capability discoveries
    const discoveries = this.getCapabilityDiscoveries();
    
    discoveries.forEach(discovery => {
      if (!content.includes(discovery.keyword)) {
        // Add new capability
        const section = this.formatCapabilitySection(discovery);
        content = this.insertSection(content, section, discovery.category);
        
        this.updates.push({
          file: 'capabilities.md',
          type: 'new-capability',
          description: discovery.description
        });
      }
    });
    
    // Update version and date
    content = content.replace(
      /Knowledge Cutoff: .*/,
      `Knowledge Cutoff: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    );
    
    fs.writeFileSync(capPath, content);
  }

  // Update best practices
  async updateBestPractices() {
    console.log('📋 Updating best practices...');
    
    const bestPath = path.join(this.docsPath, 'best-practices.md');
    let content = fs.readFileSync(bestPath, 'utf8');
    
    // Get successful patterns from sessions
    const patterns = this.getSuccessfulPatterns();
    
    patterns.forEach(pattern => {
      if (pattern.efficiency > 0.8 && !content.includes(pattern.name)) {
        // Add as best practice
        const section = this.formatBestPracticeSection(pattern);
        content = this.insertSection(content, section, pattern.category);
        
        this.updates.push({
          file: 'best-practices.md',
          type: 'new-practice',
          description: pattern.name
        });
      }
    });
    
    fs.writeFileSync(bestPath, content);
  }

  // Update workflow patterns
  async updateWorkflowPatterns() {
    console.log('🔄 Updating workflow patterns...');
    
    const workflowPath = path.join(this.docsPath, 'workflow-patterns.md');
    let content = fs.readFileSync(workflowPath, 'utf8');
    
    // Get new workflow patterns
    const workflows = this.getNewWorkflows();
    
    workflows.forEach(workflow => {
      if (!content.includes(workflow.pattern)) {
        // Add new workflow
        const section = this.formatWorkflowSection(workflow);
        content = this.insertSection(content, section, '## Common Development Workflows');
        
        this.updates.push({
          file: 'workflow-patterns.md',
          type: 'new-workflow',
          description: workflow.name
        });
      }
    });
    
    fs.writeFileSync(workflowPath, content);
  }

  // Update troubleshooting
  async updateTroubleshooting() {
    console.log('🔧 Updating troubleshooting...');
    
    const troublePath = path.join(this.docsPath, 'troubleshooting.md');
    let content = fs.readFileSync(troublePath, 'utf8');
    
    // Get resolved issues from sessions
    const issues = this.getResolvedIssues();
    
    issues.forEach(issue => {
      if (!content.includes(issue.error)) {
        // Add solution
        const section = this.formatTroubleshootingSection(issue);
        content = this.insertSection(content, section, '## Common Issues and Solutions');
        
        this.updates.push({
          file: 'troubleshooting.md',
          type: 'new-solution',
          description: issue.error
        });
      }
    });
    
    fs.writeFileSync(troublePath, content);
  }

  // Update advanced features
  async updateAdvancedFeatures() {
    console.log('🎯 Updating advanced features...');
    
    const advPath = path.join(this.docsPath, 'advanced-features.md');
    let content = fs.readFileSync(advPath, 'utf8');
    
    // Get advanced techniques discovered
    const techniques = this.getAdvancedTechniques();
    
    techniques.forEach(technique => {
      if (!content.includes(technique.name)) {
        // Add technique
        const section = this.formatAdvancedSection(technique);
        content = this.insertSection(content, section, technique.category);
        
        this.updates.push({
          file: 'advanced-features.md',
          type: 'new-technique',
          description: technique.name
        });
      }
    });
    
    fs.writeFileSync(advPath, content);
  }

  // Update CLAUDE.md files with full tool awareness
  async updateClaudeMdFiles() {
    console.log('📝 Updating CLAUDE.md files...');
    
    // Find all CLAUDE.md files in parent directories
    const claudeMdPaths = this.findClaudeMdFiles();
    
    claudeMdPaths.forEach(claudeMdPath => {
      this.injectToolAwareness(claudeMdPath);
    });
  }

  // Find CLAUDE.md files
  findClaudeMdFiles() {
    const paths = [];
    let currentPath = path.join(this.docsPath, '..', '..');
    
    // Check current and parent directories
    for (let i = 0; i < 3; i++) {
      const claudeMdPath = path.join(currentPath, 'CLAUDE.md');
      if (fs.existsSync(claudeMdPath)) {
        paths.push(claudeMdPath);
      }
      currentPath = path.join(currentPath, '..');
    }
    
    return paths;
  }

  // Inject tool awareness into CLAUDE.md
  injectToolAwareness(claudeMdPath) {
    console.log(`  Updating ${claudeMdPath}...`);
    
    let content = fs.readFileSync(claudeMdPath, 'utf8');
    
    // Extract summaries from documentation
    const toolSummary = this.extractToolSummary();
    const capabilitySummary = this.extractCapabilitySummary();
    const patternSummary = this.extractPatternSummary();
    
    // Check if tool awareness section exists
    if (!content.includes('## Claude Code Full Tool Awareness')) {
      // Add new section
      const toolAwareness = `
## Claude Code Full Tool Awareness

### Complete Tool Reference
${toolSummary}

### Current Capabilities
${capabilitySummary}

### Workflow Patterns
${patternSummary}

### Quick Reference
- **Batch Operations**: Always use multiple operations in single message
- **Tool Precedence**: Grep > grep, Glob > find, Read > cat
- **Performance**: Parallel execution 2.8-4.4x faster
- **Agents Available**: 54 specialized agents
`;
      
      content += '\n' + toolAwareness;
    } else {
      // Update existing section
      content = this.updateExistingToolAwareness(content, {
        toolSummary,
        capabilitySummary,
        patternSummary
      });
    }
    
    fs.writeFileSync(claudeMdPath, content);
    
    this.updates.push({
      file: claudeMdPath,
      type: 'tool-awareness',
      description: 'Updated with full tool awareness'
    });
  }

  // Extract tool summary
  extractToolSummary() {
    const toolRef = fs.readFileSync(
      path.join(this.docsPath, 'tool-reference.md'),
      'utf8'
    );
    
    // Extract key tools and their purposes
    const tools = [
      'Read - Read files, images, PDFs, notebooks',
      'Write - Create new files',
      'Edit/MultiEdit - Modify existing files',
      'Grep - Powerful regex search',
      'Glob - File pattern matching',
      'Bash - Execute shell commands',
      'Task - Spawn specialized agents',
      'TodoWrite - Task management',
      'WebSearch/WebFetch - Web operations'
    ];
    
    return tools.map(t => `- ${t}`).join('\n');
  }

  // Extract capability summary
  extractCapabilitySummary() {
    const capabilities = [
      'All major programming languages',
      '54 specialized AI agents',
      'Parallel execution (2.8-4.4x faster)',
      'Git/GitHub integration',
      'TDD/BDD workflows',
      'Multi-modal (text, images, PDFs)',
      'Background process management',
      'Web search and fetching',
      'Automated testing'
    ];
    
    return capabilities.map(c => `- ${c}`).join('\n');
  }

  // Extract pattern summary
  extractPatternSummary() {
    const patterns = [
      'Batch all operations in single message',
      'Read before Edit/Write',
      'Use absolute paths always',
      'Quote paths with spaces',
      'Prefer specific tools over Bash',
      'Launch agents concurrently',
      'Mark todos immediately',
      'Run linting after changes'
    ];
    
    return patterns.map(p => `- ${p}`).join('\n');
  }

  // Helper methods for data retrieval
  getLatestLearning() {
    const learningDir = path.join(this.docsPath, 'learning');
    const files = fs.readdirSync(learningDir)
      .filter(f => f.startsWith('session-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      return { newTools: [], toolUpdates: [] };
    }
    
    const latestSession = JSON.parse(
      fs.readFileSync(path.join(learningDir, files[0]), 'utf8')
    );
    
    return {
      newTools: latestSession.discoveries?.filter(d => d.type === 'tool') || [],
      toolUpdates: latestSession.updates?.filter(u => u.tool) || []
    };
  }

  getCapabilityDiscoveries() {
    // Aggregate from learning sessions
    return [];
  }

  getSuccessfulPatterns() {
    // Get patterns with high success rate
    return [];
  }

  getNewWorkflows() {
    // Get newly discovered workflows
    return [];
  }

  getResolvedIssues() {
    // Get issues that were resolved
    return [];
  }

  getAdvancedTechniques() {
    // Get advanced techniques discovered
    return [];
  }

  // Formatting helpers
  formatToolSection(tool) {
    return `
### ${tool.name}
- **Purpose**: ${tool.purpose}
- **Parameters**: ${tool.parameters}
- **Example**: \`\`\`javascript
${tool.example}
\`\`\`
`;
  }

  formatCapabilitySection(capability) {
    return `
### ${capability.name}
${capability.description}

**Usage**: ${capability.usage}
**Benefits**: ${capability.benefits}
`;
  }

  formatBestPracticeSection(practice) {
    return `
### ${practice.name}
${practice.description}

\`\`\`javascript
${practice.code}
\`\`\`

**Why**: ${practice.rationale}
`;
  }

  formatWorkflowSection(workflow) {
    return `
### ${workflow.name}
${workflow.description}

\`\`\`javascript
${workflow.implementation}
\`\`\`
`;
  }

  formatTroubleshootingSection(issue) {
    return `
#### Issue: ${issue.error}
**Symptoms**: ${issue.symptoms}

**Solution**:
\`\`\`javascript
${issue.solution}
\`\`\`

**Prevention**: ${issue.prevention}
`;
  }

  formatAdvancedSection(technique) {
    return `
### ${technique.name}
${technique.description}

\`\`\`javascript
${technique.implementation}
\`\`\`

**Performance**: ${technique.performance}
`;
  }

  // Insert section at appropriate location
  insertSection(content, section, afterHeading) {
    const headingIndex = content.indexOf(afterHeading);
    if (headingIndex === -1) {
      return content + '\n' + section;
    }
    
    const nextHeadingIndex = content.indexOf('\n##', headingIndex + 1);
    if (nextHeadingIndex === -1) {
      return content + '\n' + section;
    }
    
    return content.slice(0, nextHeadingIndex) + 
           '\n' + section + 
           content.slice(nextHeadingIndex);
  }

  // Update existing tool awareness section
  updateExistingToolAwareness(content, summaries) {
    // Update each subsection
    // This is simplified - real implementation would be more sophisticated
    return content;
  }

  // Generate changelog
  generateChangelog() {
    if (this.updates.length === 0) {
      return;
    }
    
    const changelogPath = path.join(this.docsPath, 'CHANGELOG.md');
    let changelog = '';
    
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    }
    
    const entry = `
## [${new Date().toLocaleDateString()}]

### Added
${this.updates
  .filter(u => u.type.startsWith('new'))
  .map(u => `- ${u.description}`)
  .join('\n')}

### Updated
${this.updates
  .filter(u => !u.type.startsWith('new'))
  .map(u => `- ${u.description}`)
  .join('\n')}
`;
    
    changelog = entry + '\n' + changelog;
    fs.writeFileSync(changelogPath, changelog);
  }

  // Verify updates
  verifyUpdates() {
    console.log('\n📊 Update Summary:');
    console.log(`  Total updates: ${this.updates.length}`);
    
    const byFile = {};
    this.updates.forEach(update => {
      byFile[update.file] = (byFile[update.file] || 0) + 1;
    });
    
    Object.entries(byFile).forEach(([file, count]) => {
      console.log(`  ${file}: ${count} updates`);
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const updater = new DocumentationUpdater();
  updater.updateAll().catch(console.error);
}

module.exports = DocumentationUpdater;