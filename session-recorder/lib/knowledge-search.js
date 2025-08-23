#!/usr/bin/env node

/**
 * Knowledge Search CLI
 * Search through the development knowledge base
 */

const inquirer = require('inquirer');
const KnowledgeBase = require('./knowledge-base');
const { logger } = require('./logger');

class KnowledgeSearch {
  constructor() {
    this.knowledgeBase = new KnowledgeBase();
  }

  async initialize() {
    await this.knowledgeBase.initialize();
  }

  async interactiveSearch() {
    console.log('\n📚 Pachacuti Knowledge Base Search\n');
    
    while (true) {
      const { query } = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Search (or "exit" to quit):',
          validate: input => input.trim() !== ''
        }
      ]);
      
      if (query.toLowerCase() === 'exit') {
        break;
      }
      
      await this.performSearch(query);
    }
  }

  async performSearch(query) {
    console.log(`\nSearching for: "${query}"...\n`);
    
    const results = await this.knowledgeBase.search(query);
    
    if (results.totalResults === 0) {
      console.log('No results found.\n');
      return;
    }
    
    console.log(`Found ${results.totalResults} results:\n`);
    
    // Display Lunr results
    if (results.lunrResults.length > 0) {
      console.log('📝 Document Matches:');
      results.lunrResults.forEach((doc, i) => {
        console.log(`${i + 1}. [${doc.doc_type}] ${doc.title}`);
        console.log(`   Score: ${doc.score.toFixed(3)}`);
        console.log(`   ${this.truncate(doc.content, 100)}\n`);
      });
    }
    
    // Display SQL results
    if (results.sqlResults.sessions.length > 0) {
      console.log('📅 Session Matches:');
      results.sqlResults.sessions.forEach(session => {
        console.log(`- ${session.id} (${session.start_time})`);
        console.log(`  Duration: ${session.duration}ms, Commits: ${session.commits}\n`);
      });
    }
    
    if (results.sqlResults.commits.length > 0) {
      console.log('💾 Commit Matches:');
      results.sqlResults.commits.forEach(commit => {
        console.log(`- ${commit.hash.substring(0, 7)}: ${commit.message}`);
        console.log(`  By ${commit.author} on ${commit.date}\n`);
      });
    }
    
    if (results.sqlResults.files.length > 0) {
      console.log('📁 File Matches:');
      results.sqlResults.files.forEach(file => {
        console.log(`- ${file.path} (${file.action} on ${file.timestamp})\n`);
      });
    }
    
    if (results.sqlResults.problems.length > 0) {
      console.log('🐛 Problem/Solution Matches:');
      results.sqlResults.problems.forEach(problem => {
        console.log(`- ${problem.description}`);
        if (problem.solution_desc) {
          console.log(`  ✅ Solution: ${problem.solution_desc}`);
        }
        console.log('');
      });
    }
  }

  async searchByType() {
    const { searchType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'searchType',
        message: 'What would you like to search for?',
        choices: [
          'Sessions by date',
          'Commits by author',
          'Files by name',
          'Problems and solutions',
          'Project timeline',
          'Related work'
        ]
      }
    ]);
    
    switch (searchType) {
      case 'Sessions by date':
        await this.searchSessionsByDate();
        break;
      case 'Commits by author':
        await this.searchCommitsByAuthor();
        break;
      case 'Files by name':
        await this.searchFilesByName();
        break;
      case 'Problems and solutions':
        await this.searchProblemsAndSolutions();
        break;
      case 'Project timeline':
        await this.searchProjectTimeline();
        break;
      case 'Related work':
        await this.searchRelatedWork();
        break;
    }
  }

  async searchSessionsByDate() {
    const { days } = await inquirer.prompt([
      {
        type: 'number',
        name: 'days',
        message: 'How many days back to search?',
        default: 7
      }
    ]);
    
    const sessions = await this.knowledgeBase.getSessionHistory(days);
    
    console.log(`\nFound ${sessions.length} sessions in the last ${days} days:\n`);
    
    sessions.forEach(session => {
      console.log(`📅 ${session.id}`);
      console.log(`   Start: ${session.start_time}`);
      console.log(`   Duration: ${session.duration}ms`);
      console.log(`   Activities: ${session.activities}`);
      console.log(`   Commits: ${session.commits}\n`);
    });
  }

  async searchCommitsByAuthor() {
    const { author } = await inquirer.prompt([
      {
        type: 'input',
        name: 'author',
        message: 'Author name or email:'
      }
    ]);
    
    const results = await this.knowledgeBase.allQuery(
      `SELECT * FROM commits WHERE author LIKE ? OR message LIKE ? ORDER BY date DESC LIMIT 20`,
      [`%${author}%`, `%${author}%`]
    );
    
    console.log(`\nFound ${results.length} commits:\n`);
    
    results.forEach(commit => {
      console.log(`💾 ${commit.hash.substring(0, 7)}: ${commit.message}`);
      console.log(`   By ${commit.author} on ${commit.date}\n`);
    });
  }

  async searchFilesByName() {
    const { filename } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'File name or pattern:'
      }
    ]);
    
    const results = await this.knowledgeBase.allQuery(
      `SELECT DISTINCT path, COUNT(*) as changes FROM files 
       WHERE path LIKE ? 
       GROUP BY path 
       ORDER BY changes DESC 
       LIMIT 20`,
      [`%${filename}%`]
    );
    
    console.log(`\nFound ${results.length} files:\n`);
    
    results.forEach(file => {
      console.log(`📁 ${file.path} (${file.changes} changes)\n`);
    });
  }

  async searchProblemsAndSolutions() {
    const { keyword } = await inquirer.prompt([
      {
        type: 'input',
        name: 'keyword',
        message: 'Problem keyword:'
      }
    ]);
    
    const results = await this.knowledgeBase.allQuery(
      `SELECT p.*, s.description as solution_desc, s.effectiveness 
       FROM problems p 
       LEFT JOIN solutions s ON p.id = s.problem_id 
       WHERE p.description LIKE ? OR p.category LIKE ?
       ORDER BY p.timestamp DESC 
       LIMIT 20`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    
    console.log(`\nFound ${results.length} problems:\n`);
    
    results.forEach(problem => {
      console.log(`🐛 ${problem.description}`);
      console.log(`   Category: ${problem.category}, Severity: ${problem.severity}`);
      if (problem.solution_desc) {
        console.log(`   ✅ Solution: ${problem.solution_desc}`);
        console.log(`   Effectiveness: ${problem.effectiveness}`);
      }
      console.log('');
    });
  }

  async searchProjectTimeline() {
    const { project } = await inquirer.prompt([
      {
        type: 'input',
        name: 'project',
        message: 'Project name:'
      }
    ]);
    
    const timeline = await this.knowledgeBase.getProjectTimeline(project);
    
    console.log(`\nProject Timeline for "${project}":\n`);
    
    Object.entries(timeline).forEach(([date, events]) => {
      console.log(`📅 ${date}`);
      events.forEach(event => {
        console.log(`   - ${event.message || event.description}`);
      });
      console.log('');
    });
  }

  async searchRelatedWork() {
    const { sessionId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sessionId',
        message: 'Session ID:'
      }
    ]);
    
    const related = await this.knowledgeBase.getRelatedWork(sessionId);
    
    console.log(`\nFound ${related.length} related sessions:\n`);
    
    related.forEach(session => {
      console.log(`🔗 ${session.id}`);
      console.log(`   Start: ${session.start_time}`);
      console.log(`   Summary: ${session.summary}\n`);
    });
  }

  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async exportResults(results) {
    const { exportFormat } = await inquirer.prompt([
      {
        type: 'list',
        name: 'exportFormat',
        message: 'Export results as:',
        choices: ['JSON', 'Markdown', 'Cancel']
      }
    ]);
    
    if (exportFormat === 'Cancel') return;
    
    const format = exportFormat.toLowerCase();
    const exportPath = await this.knowledgeBase.exportKnowledge(format);
    
    console.log(`\nResults exported to: ${exportPath}\n`);
  }
}

// CLI interface
async function main() {
  const search = new KnowledgeSearch();
  await search.initialize();
  
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Direct search from command line
    const query = args.join(' ');
    await search.performSearch(query);
  } else {
    // Interactive mode
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select search mode:',
        choices: [
          'Free text search',
          'Search by type',
          'Export knowledge base',
          'Exit'
        ]
      }
    ]);
    
    switch (mode) {
      case 'Free text search':
        await search.interactiveSearch();
        break;
      case 'Search by type':
        await search.searchByType();
        break;
      case 'Export knowledge base':
        const format = await inquirer.prompt([
          {
            type: 'list',
            name: 'format',
            message: 'Export format:',
            choices: ['json', 'markdown']
          }
        ]);
        const path = await search.knowledgeBase.exportKnowledge(format.format);
        console.log(`\nKnowledge base exported to: ${path}\n`);
        break;
    }
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = KnowledgeSearch;