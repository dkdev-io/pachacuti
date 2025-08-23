#!/usr/bin/env node

/**
 * Recommendation Engine
 * Generates smart recommendations based on Claude Code features and project needs
 */

class RecommendationEngine {
  constructor() {
    this.recommendations = [];
    this.features = this.loadClaudeFeatures();
  }

  loadClaudeFeatures() {
    return {
      agents: {
        'parallel-execution': {
          agents: ['coder', 'tester', 'reviewer'],
          benefit: '2.8-4.4x faster execution',
          useCase: 'Multiple independent tasks'
        },
        'tdd-workflow': {
          agents: ['tdd-london-swarm', 'tester', 'sparc-coder'],
          benefit: '100% test coverage',
          useCase: 'Test-driven development'
        },
        'refactoring': {
          agents: ['code-analyzer', 'coder', 'reviewer'],
          benefit: 'Systematic code improvement',
          useCase: 'Code quality issues'
        },
        'documentation': {
          agents: ['api-docs', 'base-template-generator'],
          benefit: 'Auto-generated docs',
          useCase: 'Missing documentation'
        },
        'performance': {
          agents: ['perf-analyzer', 'performance-benchmarker'],
          benefit: 'Identify bottlenecks',
          useCase: 'Slow performance'
        },
        'security': {
          agents: ['security-manager', 'code-analyzer'],
          benefit: 'Find vulnerabilities',
          useCase: 'Security audit needed'
        }
      },
      patterns: {
        'batch-operations': {
          pattern: 'Read(f1); Read(f2); Edit(f3)',
          benefit: '70% faster than sequential',
          useCase: 'Multiple file operations'
        },
        'background-execution': {
          pattern: 'Bash(cmd, run_in_background=true)',
          benefit: 'Non-blocking execution',
          useCase: 'Long-running processes'
        },
        'smart-search': {
          pattern: 'Grep with multiline, then Task("researcher")',
          benefit: 'Comprehensive search',
          useCase: 'Complex code search'
        }
      },
      workflows: {
        'quick-refactor': {
          steps: ['Grep for patterns', 'MultiEdit all files', 'Run tests'],
          time: '5 minutes',
          benefit: 'Fast code updates'
        },
        'add-testing': {
          steps: ['Task("tester", "Generate tests")', 'Run coverage', 'Fix gaps'],
          time: '30 minutes',
          benefit: 'Improve code quality'
        },
        'optimize-performance': {
          steps: ['Task("perf-analyzer")', 'Identify bottlenecks', 'Optimize'],
          time: '1 hour',
          benefit: 'Faster execution'
        }
      }
    };
  }

  generateRecommendations(projectAnalysis, claudeUpdates) {
    this.recommendations = [];
    
    // Recommendations based on project issues
    this.addProjectRecommendations(projectAnalysis);
    
    // Recommendations based on new Claude features
    this.addFeatureRecommendations(claudeUpdates);
    
    // Time-saving recommendations
    this.addEfficiencyRecommendations(projectAnalysis);
    
    // Sort by priority and impact
    this.recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return this.recommendations;
  }

  addProjectRecommendations(analysis) {
    analysis.projects.forEach(project => {
      // Large number of TODOs
      if (project.todoCount > 5) {
        this.recommendations.push({
          type: 'todo-completion',
          project: project.name,
          title: `Complete ${project.todoCount} TODOs in ${project.name}`,
          description: 'Use parallel agents to clear technical debt',
          implementation: `
// Find all TODOs
Grep("TODO|FIXME|HACK", {output_mode: "content", -n: true})

// Spawn agents to complete them
Task("coder", "Complete all TODO items")
Task("tester", "Add tests for completed TODOs")
Task("reviewer", "Review TODO completions")`,
          timeEstimate: `${Math.round(project.todoCount * 5)} minutes with parallel agents`,
          priority: project.todoCount > 10 ? 'high' : 'medium',
          benefit: 'Reduce technical debt'
        });
      }

      // Missing tests
      if (project.metrics.missingTests.length > 0) {
        this.recommendations.push({
          type: 'add-tests',
          project: project.name,
          title: `Add test coverage to ${project.name}`,
          description: 'Generate comprehensive test suite',
          implementation: `
Task("tdd-london-swarm", "Create test suite with mocks")
Task("tester", "Add integration tests")
Bash("npm test -- --coverage")`,
          timeEstimate: '20 minutes',
          priority: 'high',
          benefit: 'Prevent regressions'
        });
      }

      // Complex files
      if (project.metrics.complexFiles.length > 0) {
        this.recommendations.push({
          type: 'refactor',
          project: project.name,
          title: `Refactor ${project.metrics.complexFiles.length} complex files`,
          description: 'Break down files over 500 lines',
          implementation: `
// Analyze complexity
Task("code-analyzer", "Analyze ${project.metrics.complexFiles.join(', ')}")

// Refactor with multiple agents
Task("system-architect", "Design modular structure")
Task("coder", "Implement refactoring")
Task("tester", "Ensure behavior unchanged")`,
          timeEstimate: '45 minutes',
          priority: 'medium',
          benefit: 'Improve maintainability'
        });
      }

      // Uncommitted changes
      if (project.status === 'uncommitted-changes') {
        this.recommendations.push({
          type: 'commit',
          project: project.name,
          title: `Commit changes in ${project.name}`,
          description: 'Clean up uncommitted work',
          implementation: `
Bash("git status")
Bash("git diff")
Bash("git add -A")
Bash("git commit -m 'chore: Clean up pending changes'")`,
          timeEstimate: '2 minutes',
          priority: 'low',
          benefit: 'Clean git status'
        });
      }
    });
  }

  addFeatureRecommendations(claudeUpdates) {
    // Recommend new features if available
    if (claudeUpdates.newFeatures && claudeUpdates.newFeatures.length > 0) {
      claudeUpdates.newFeatures.forEach(feature => {
        this.recommendations.push({
          type: 'new-feature',
          title: `Try new feature: ${feature}`,
          description: 'Newly available Claude Code capability',
          implementation: 'See documentation for usage',
          timeEstimate: '5 minutes to test',
          priority: 'low',
          benefit: 'Learn new capabilities'
        });
      });
    }

    // Always recommend efficiency improvements
    this.recommendations.push({
      type: 'efficiency',
      title: 'Use parallel agent execution',
      description: 'Launch multiple agents for independent tasks',
      implementation: `
// Instead of sequential:
Task("coder", "Task 1")
// wait...
Task("tester", "Task 2")

// Do parallel:
Task("coder", "Task 1")
Task("tester", "Task 2")
Task("reviewer", "Task 3")
// All in one message!`,
      timeEstimate: 'Saves 50-70% time',
      priority: 'medium',
      benefit: '2.8x faster execution'
    });
  }

  addEfficiencyRecommendations(analysis) {
    const totalFiles = analysis.projects.reduce((sum, p) => sum + p.metrics.fileCount, 0);
    
    if (totalFiles > 50) {
      this.recommendations.push({
        type: 'batch-optimization',
        title: 'Optimize file operations with batching',
        description: 'Use MultiEdit and batch Read for large codebases',
        implementation: `
// Batch read multiple files
const files = await Glob("**/*.js");
files.forEach(f => Read(f)); // All in one message

// Batch edit multiple files
MultiEdit(file, [edit1, edit2, edit3])`,
        timeEstimate: 'Saves 70% on file operations',
        priority: 'high',
        benefit: 'Dramatic speed improvement'
      });
    }

    // Recommend swarm coordination for large projects
    const largeProjects = analysis.projects.filter(p => p.metrics.fileCount > 20);
    if (largeProjects.length > 0) {
      this.recommendations.push({
        type: 'swarm-coordination',
        title: 'Use swarm coordination for large projects',
        description: 'Coordinate multiple agents for complex tasks',
        implementation: `
// Initialize swarm
Task("swarm-init", "Initialize adaptive swarm")

// Deploy specialized agents
Task("hierarchical-coordinator", "Coordinate refactoring")
Task("mesh-coordinator", "Distribute testing tasks")
Task("adaptive-coordinator", "Optimize based on complexity")`,
        timeEstimate: '60% faster than sequential',
        priority: 'medium',
        benefit: 'Handle complexity efficiently'
      });
    }
  }

  formatRecommendations() {
    const output = [];
    
    // Group by priority
    const urgent = this.recommendations.filter(r => r.priority === 'urgent');
    const high = this.recommendations.filter(r => r.priority === 'high');
    const medium = this.recommendations.filter(r => r.priority === 'medium');
    const low = this.recommendations.filter(r => r.priority === 'low');
    
    if (urgent.length > 0) {
      output.push('\n🔴 Urgent Recommendations:');
      urgent.forEach(rec => {
        output.push(`  • ${rec.title}`);
        output.push(`    Time: ${rec.timeEstimate} | Benefit: ${rec.benefit}`);
      });
    }
    
    if (high.length > 0) {
      output.push('\n🟡 High Priority:');
      high.forEach(rec => {
        output.push(`  • ${rec.title}`);
        output.push(`    Time: ${rec.timeEstimate} | Benefit: ${rec.benefit}`);
      });
    }
    
    if (medium.length > 0) {
      output.push('\n🟢 Medium Priority:');
      medium.slice(0, 3).forEach(rec => { // Show top 3
        output.push(`  • ${rec.title}`);
        output.push(`    Time: ${rec.timeEstimate}`);
      });
    }
    
    return output;
  }

  getTopRecommendation() {
    if (this.recommendations.length === 0) {
      return null;
    }
    
    // Return the highest priority, shortest time recommendation
    const urgent = this.recommendations.filter(r => r.priority === 'urgent');
    if (urgent.length > 0) {
      return urgent[0];
    }
    
    const high = this.recommendations.filter(r => r.priority === 'high');
    if (high.length > 0) {
      // Sort by time estimate
      high.sort((a, b) => {
        const timeA = parseInt(a.timeEstimate) || 999;
        const timeB = parseInt(b.timeEstimate) || 999;
        return timeA - timeB;
      });
      return high[0];
    }
    
    return this.recommendations[0];
  }
}

module.exports = RecommendationEngine;