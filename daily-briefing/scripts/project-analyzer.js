#!/usr/bin/env node

/**
 * Project Analyzer for Claude Code Optimization
 * Analyzes current and past projects to identify optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..', '..');
    this.dataPath = path.join(__dirname, '..', 'data');
    this.projectsFile = path.join(this.dataPath, 'projects.json');
    this.analysisFile = path.join(this.dataPath, 'analysis.json');
  }

  async analyzeProjects() {
    console.log('🔍 Analyzing projects for optimization opportunities...\n');
    
    const projects = await this.discoverProjects();
    const analysis = {
      date: new Date().toISOString(),
      projects: [],
      recommendations: [],
      quickWins: [],
      timeEstimates: {}
    };

    for (const project of projects) {
      const projectAnalysis = await this.analyzeProject(project);
      analysis.projects.push(projectAnalysis);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(projectAnalysis);
      analysis.recommendations.push(...recommendations);
      
      // Identify quick wins
      const quickWins = this.identifyQuickWins(projectAnalysis);
      analysis.quickWins.push(...quickWins);
    }

    // Save analysis
    this.saveAnalysis(analysis);
    
    return analysis;
  }

  async discoverProjects() {
    const projects = [];
    
    // Find git repositories
    const gitProjects = this.findGitProjects();
    
    // Find package.json projects
    const npmProjects = this.findNpmProjects();
    
    // Find Python projects
    const pythonProjects = this.findPythonProjects();
    
    // Merge and deduplicate
    const allProjects = [...new Set([...gitProjects, ...npmProjects, ...pythonProjects])];
    
    for (const projectPath of allProjects) {
      const projectInfo = await this.getProjectInfo(projectPath);
      projects.push(projectInfo);
    }
    
    return projects;
  }

  findGitProjects() {
    const projects = [];
    
    try {
      // Search for .git directories
      const findCmd = `find "${this.projectRoot}" -type d -name ".git" -maxdepth 3 2>/dev/null`;
      const gitDirs = execSync(findCmd, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(gitPath => path.dirname(gitPath));
      
      projects.push(...gitDirs);
    } catch (e) {
      // Fallback to manual search
      projects.push(this.projectRoot);
    }
    
    return projects;
  }

  findNpmProjects() {
    const projects = [];
    
    try {
      const findCmd = `find "${this.projectRoot}" -name "package.json" -maxdepth 3 2>/dev/null`;
      const packageFiles = execSync(findCmd, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(pkgPath => path.dirname(pkgPath));
      
      projects.push(...packageFiles);
    } catch (e) {
      // Silent fail
    }
    
    return projects;
  }

  findPythonProjects() {
    const projects = [];
    
    try {
      const findCmd = `find "${this.projectRoot}" -name "requirements.txt" -o -name "setup.py" -o -name "pyproject.toml" -maxdepth 3 2>/dev/null`;
      const pythonFiles = execSync(findCmd, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(filePath => path.dirname(filePath));
      
      projects.push(...pythonFiles);
    } catch (e) {
      // Silent fail
    }
    
    return projects;
  }

  async getProjectInfo(projectPath) {
    const info = {
      path: projectPath,
      name: path.basename(projectPath),
      type: 'unknown',
      language: 'unknown',
      lastModified: null,
      status: 'unknown',
      todoCount: 0,
      issues: [],
      metrics: {}
    };

    // Determine project type
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      info.type = 'node';
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      info.name = pkg.name || info.name;
      info.language = 'javascript';
    } else if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
      info.type = 'python';
      info.language = 'python';
    }

    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain', { 
        cwd: projectPath, 
        encoding: 'utf8' 
      });
      
      if (gitStatus.trim()) {
        info.status = 'uncommitted-changes';
        info.issues.push('Has uncommitted changes');
      } else {
        info.status = 'clean';
      }
      
      // Get last commit date
      const lastCommit = execSync('git log -1 --format=%ai', {
        cwd: projectPath,
        encoding: 'utf8'
      }).trim();
      info.lastModified = new Date(lastCommit);
      
    } catch (e) {
      info.status = 'not-git';
    }

    // Count TODOs
    try {
      const todoCount = execSync(`grep -r "TODO\\|FIXME\\|HACK" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.py" 2>/dev/null | wc -l`, {
        cwd: projectPath,
        encoding: 'utf8'
      }).trim();
      info.todoCount = parseInt(todoCount) || 0;
      
      if (info.todoCount > 0) {
        info.issues.push(`${info.todoCount} TODOs/FIXMEs found`);
      }
    } catch (e) {
      // Silent fail
    }

    // Analyze code metrics
    info.metrics = await this.analyzeCodeMetrics(projectPath);
    
    return info;
  }

  async analyzeCodeMetrics(projectPath) {
    const metrics = {
      fileCount: 0,
      totalLines: 0,
      testCoverage: 'unknown',
      complexFiles: [],
      duplicateCode: false,
      missingTests: []
    };

    try {
      // Count files
      const jsFiles = execSync(`find "${projectPath}" -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" 2>/dev/null | wc -l`, {
        encoding: 'utf8'
      }).trim();
      metrics.fileCount = parseInt(jsFiles) || 0;

      // Check for test files
      const testFiles = execSync(`find "${projectPath}" -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l`, {
        encoding: 'utf8'
      }).trim();
      
      if (metrics.fileCount > 0 && parseInt(testFiles) === 0) {
        metrics.missingTests.push('No test files found');
      }

      // Find complex files (>500 lines)
      try {
        const largeFiles = execSync(`find "${projectPath}" -name "*.js" -o -name "*.ts" -exec wc -l {} + 2>/dev/null | awk '$1 > 500 {print $2}'`, {
          encoding: 'utf8'
        }).trim().split('\n').filter(Boolean);
        
        if (largeFiles.length > 0) {
          metrics.complexFiles = largeFiles.map(f => path.relative(projectPath, f));
        }
      } catch (e) {
        // Silent fail
      }

    } catch (e) {
      // Silent fail
    }

    return metrics;
  }

  async analyzeProject(project) {
    const analysis = {
      ...project,
      optimizations: [],
      newFeatures: [],
      timeToComplete: 0
    };

    // Check for optimization opportunities
    
    // 1. Missing parallel execution
    if (project.metrics.fileCount > 10) {
      analysis.optimizations.push({
        type: 'parallel-execution',
        description: 'Use batch file operations for faster processing',
        impact: 'high',
        timeEstimate: '5 minutes',
        howTo: 'Use MultiEdit and batch Read operations in single message'
      });
    }

    // 2. No test coverage
    if (project.metrics.missingTests.length > 0) {
      analysis.optimizations.push({
        type: 'add-tests',
        description: 'Add test coverage with TDD agents',
        impact: 'high',
        timeEstimate: '30 minutes',
        howTo: 'Use Task("tester", "Generate comprehensive test suite")'
      });
    }

    // 3. Large files that need refactoring
    if (project.metrics.complexFiles.length > 0) {
      analysis.optimizations.push({
        type: 'refactor-complex',
        description: `Refactor ${project.metrics.complexFiles.length} complex files`,
        impact: 'medium',
        timeEstimate: '1 hour',
        howTo: 'Use Task("code-analyzer", "Refactor large files") with Task("coder", "Implement refactoring")'
      });
    }

    // 4. Uncommitted changes
    if (project.status === 'uncommitted-changes') {
      analysis.optimizations.push({
        type: 'commit-changes',
        description: 'Commit pending changes',
        impact: 'low',
        timeEstimate: '2 minutes',
        howTo: 'Use git commit workflow with proper message format'
      });
    }

    // 5. TODOs to complete
    if (project.todoCount > 0) {
      analysis.optimizations.push({
        type: 'complete-todos',
        description: `Complete ${project.todoCount} TODOs`,
        impact: 'medium',
        timeEstimate: `${project.todoCount * 10} minutes`,
        howTo: 'Use Grep("TODO|FIXME") then Task("coder", "Complete all TODOs")'
      });
    }

    // Check for new Claude Code features that could help
    analysis.newFeatures = this.identifyApplicableFeatures(project);

    // Calculate total time estimate
    analysis.timeToComplete = analysis.optimizations.reduce((total, opt) => {
      const time = parseInt(opt.timeEstimate) || 0;
      return total + time;
    }, 0);

    return analysis;
  }

  identifyApplicableFeatures(project) {
    const features = [];

    // Check for opportunities to use new agents
    if (project.type === 'node' && !project.hasCI) {
      features.push({
        feature: 'cicd-engineer agent',
        benefit: 'Automatically set up GitHub Actions CI/CD',
        command: 'Task("cicd-engineer", "Create GitHub Actions workflow")'
      });
    }

    if (project.language === 'javascript' && !project.hasApiDocs) {
      features.push({
        feature: 'api-docs agent',
        benefit: 'Generate OpenAPI documentation',
        command: 'Task("api-docs", "Generate API documentation")'
      });
    }

    if (project.metrics.fileCount > 20) {
      features.push({
        feature: 'swarm coordination',
        benefit: 'Use multiple agents in parallel for 2.8x speedup',
        command: 'Launch multiple Task() agents concurrently'
      });
    }

    if (project.metrics.duplicateCode) {
      features.push({
        feature: 'code-analyzer agent',
        benefit: 'Identify and eliminate code duplication',
        command: 'Task("code-analyzer", "Find and fix duplicate code")'
      });
    }

    return features;
  }

  generateRecommendations(projectAnalysis) {
    const recommendations = [];

    projectAnalysis.optimizations.forEach(opt => {
      recommendations.push({
        project: projectAnalysis.name,
        type: opt.type,
        description: opt.description,
        impact: opt.impact,
        timeEstimate: opt.timeEstimate,
        implementation: opt.howTo,
        priority: this.calculatePriority(opt)
      });
    });

    return recommendations;
  }

  identifyQuickWins(projectAnalysis) {
    const quickWins = [];

    projectAnalysis.optimizations
      .filter(opt => {
        const time = parseInt(opt.timeEstimate) || 0;
        return time <= 5 && opt.impact !== 'low';
      })
      .forEach(opt => {
        quickWins.push({
          project: projectAnalysis.name,
          task: opt.description,
          time: opt.timeEstimate,
          command: opt.howTo
        });
      });

    return quickWins;
  }

  calculatePriority(optimization) {
    const impactScore = { high: 3, medium: 2, low: 1 };
    const timeScore = parseInt(optimization.timeEstimate) || 60;
    
    // Higher impact and lower time = higher priority
    const priority = (impactScore[optimization.impact] || 1) * 100 / timeScore;
    
    if (priority > 10) return 'urgent';
    if (priority > 5) return 'high';
    if (priority > 1) return 'medium';
    return 'low';
  }

  saveAnalysis(analysis) {
    fs.writeFileSync(this.analysisFile, JSON.stringify(analysis, null, 2));
  }

  formatRecommendations(analysis) {
    const output = [];
    
    if (analysis.quickWins.length > 0) {
      output.push('\n🎯 Quick Wins (< 5 minutes):');
      analysis.quickWins.forEach(win => {
        output.push(`  • ${win.project}: ${win.task} (${win.time})`);
        output.push(`    → ${win.command}`);
      });
    }

    if (analysis.recommendations.length > 0) {
      output.push('\n📋 Project Optimizations:');
      
      // Group by project
      const byProject = {};
      analysis.recommendations.forEach(rec => {
        if (!byProject[rec.project]) {
          byProject[rec.project] = [];
        }
        byProject[rec.project].push(rec);
      });

      Object.entries(byProject).forEach(([project, recs]) => {
        output.push(`\n  ${project}:`);
        recs.sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }).forEach(rec => {
          const icon = rec.priority === 'urgent' ? '🔴' : 
                       rec.priority === 'high' ? '🟡' : '🟢';
          output.push(`    ${icon} ${rec.description} (${rec.timeEstimate})`);
        });
      });
    }

    return output;
  }
}

// Export for use in other scripts
module.exports = ProjectAnalyzer;

// Run if executed directly
if (require.main === module) {
  const analyzer = new ProjectAnalyzer();
  analyzer.analyzeProjects().then(analysis => {
    const output = analyzer.formatRecommendations(analysis);
    output.forEach(line => console.log(line));
  });
}