/**
 * Knowledge Base Module
 * Searchable index of all development sessions and knowledge
 */

const sqlite3 = require('sqlite3').verbose();
const lunr = require('lunr');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('./logger');

class KnowledgeBase {
  constructor() {
    this.db = null;
    this.searchIndex = null;
    this.documents = new Map();
    this.dbPath = path.join(__dirname, '../data/knowledge.db');
  }

  async initialize() {
    logger.info('Initializing knowledge base...');
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    // Initialize SQLite database
    await this.initDatabase();
    
    // Build search index
    await this.buildSearchIndex();
    
    logger.info('Knowledge base initialized');
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT,
        end_time TEXT,
        duration INTEGER,
        summary TEXT,
        activities INTEGER,
        file_changes INTEGER,
        commits INTEGER,
        problems_solved INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        timestamp TEXT,
        type TEXT,
        details TEXT,
        searchable_text TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS commits (
        hash TEXT PRIMARY KEY,
        session_id TEXT,
        message TEXT,
        author TEXT,
        date TEXT,
        files_changed INTEGER,
        additions INTEGER,
        deletions INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT,
        session_id TEXT,
        action TEXT,
        changes INTEGER,
        timestamp TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        category TEXT,
        description TEXT,
        reasoning TEXT,
        impact TEXT,
        timestamp TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        description TEXT,
        category TEXT,
        severity TEXT,
        solution_id INTEGER,
        timestamp TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS solutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER,
        session_id TEXT,
        description TEXT,
        implementation TEXT,
        effectiveness TEXT,
        reusable BOOLEAN,
        timestamp TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (problem_id) REFERENCES problems(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS search_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT,
        doc_type TEXT,
        title TEXT,
        content TEXT,
        tags TEXT,
        timestamp TEXT
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_session ON activities(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`,
      `CREATE INDEX IF NOT EXISTS idx_commits_session ON commits(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_files_session ON files(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_search_type ON search_index(doc_type)`
    ];
    
    for (const schema of schemas) {
      await this.runQuery(schema);
    }
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async indexSession(sessionData) {
    logger.info(`Indexing session ${sessionData.sessionId}`);
    
    // Store session summary
    await this.runQuery(
      `INSERT OR REPLACE INTO sessions 
       (id, start_time, end_time, duration, summary, activities, 
        file_changes, commits, problems_solved) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionData.sessionId,
        sessionData.start,
        sessionData.end,
        sessionData.duration,
        JSON.stringify(sessionData.keyAchievements),
        sessionData.statistics.totalActivities,
        sessionData.statistics.fileChanges,
        sessionData.statistics.gitCommits,
        sessionData.statistics.problemsSolved
      ]
    );
    
    // Index commits
    for (const commit of sessionData.commits) {
      await this.indexCommit({
        ...commit,
        sessionId: sessionData.sessionId
      });
    }
    
    // Index file changes
    for (const change of sessionData.fileChanges) {
      await this.runQuery(
        `INSERT INTO files (path, session_id, action, changes, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          change.file,
          sessionData.sessionId,
          change.action,
          1,
          change.timestamp
        ]
      );
    }
    
    // Index decisions
    for (const decision of sessionData.decisions) {
      await this.runQuery(
        `INSERT INTO decisions 
         (session_id, category, description, reasoning, impact, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionData.sessionId,
          decision.category,
          decision.description,
          decision.reasoning,
          decision.impact,
          decision.timestamp
        ]
      );
    }
    
    // Index problems and solutions
    for (const problem of sessionData.problems) {
      const result = await this.runQuery(
        `INSERT INTO problems 
         (session_id, description, category, severity, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          sessionData.sessionId,
          problem.description,
          problem.category,
          problem.severity,
          problem.timestamp
        ]
      );
      
      // Link solutions
      const solutions = sessionData.solutions.filter(s => 
        s.problemId === problem.id || 
        s.description.includes(problem.description)
      );
      
      for (const solution of solutions) {
        await this.runQuery(
          `INSERT INTO solutions 
           (problem_id, session_id, description, implementation, 
            effectiveness, reusable, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            result.id,
            sessionData.sessionId,
            solution.description,
            solution.implementation,
            solution.effectiveness,
            solution.reusable,
            solution.timestamp
          ]
        );
      }
    }
    
    // Update search index
    await this.addToSearchIndex({
      id: sessionData.sessionId,
      type: 'session',
      title: `Session ${sessionData.sessionId}`,
      content: JSON.stringify(sessionData),
      tags: this.extractTags(sessionData)
    });
  }

  async indexCommit(commit) {
    await this.runQuery(
      `INSERT OR REPLACE INTO commits 
       (hash, session_id, message, author, date, files_changed, additions, deletions) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commit.hash,
        commit.sessionId || null,
        commit.message,
        commit.author || commit.email,
        commit.date || commit.timestamp,
        commit.files?.length || 0,
        commit.stats?.additions || 0,
        commit.stats?.deletions || 0
      ]
    );
    
    // Add to search index
    await this.addToSearchIndex({
      id: commit.hash,
      type: 'commit',
      title: commit.message,
      content: `${commit.message} by ${commit.author} on ${commit.date}`,
      tags: this.extractCommitTags(commit.message)
    });
  }

  async indexSnapshot(snapshot) {
    // Store snapshot for quick access
    const snapshotPath = path.join(
      __dirname,
      '../data/snapshots',
      `${snapshot.sessionId}-${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    // Add to search index
    await this.addToSearchIndex({
      id: `snapshot-${snapshot.sessionId}-${snapshot.timestamp}`,
      type: 'snapshot',
      title: `Snapshot for ${snapshot.sessionId}`,
      content: JSON.stringify(snapshot.recentActivity),
      tags: ['snapshot', snapshot.sessionId]
    });
  }

  async addToSearchIndex(doc) {
    await this.runQuery(
      `INSERT INTO search_index (doc_id, doc_type, title, content, tags, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        doc.id,
        doc.type,
        doc.title,
        doc.content,
        JSON.stringify(doc.tags),
        new Date().toISOString()
      ]
    );
    
    // Add to Lunr index
    this.documents.set(doc.id, doc);
    
    // Rebuild index periodically
    if (this.documents.size % 100 === 0) {
      await this.buildSearchIndex();
    }
  }

  async buildSearchIndex() {
    const docs = await this.allQuery('SELECT * FROM search_index');
    
    this.searchIndex = lunr(function() {
      this.ref('doc_id');
      this.field('title', { boost: 10 });
      this.field('content');
      this.field('tags', { boost: 5 });
      
      docs.forEach(doc => {
        this.add({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          tags: doc.tags
        });
      });
    });
    
    logger.info(`Search index built with ${docs.length} documents`);
  }

  async search(query) {
    logger.info(`Searching for: ${query}`);
    
    // Search using Lunr
    const results = this.searchIndex.search(query);
    
    // Get full documents
    const documents = [];
    for (const result of results.slice(0, 20)) {
      const doc = await this.getQuery(
        'SELECT * FROM search_index WHERE doc_id = ?',
        [result.ref]
      );
      
      if (doc) {
        documents.push({
          ...doc,
          score: result.score,
          matches: result.matchData
        });
      }
    }
    
    // Also search in SQL for exact matches
    const sqlResults = await this.searchSQL(query);
    
    return {
      lunrResults: documents,
      sqlResults: sqlResults,
      totalResults: documents.length + sqlResults.length
    };
  }

  async searchSQL(query) {
    const results = {
      sessions: [],
      commits: [],
      files: [],
      problems: [],
      solutions: []
    };
    
    // Search sessions
    results.sessions = await this.allQuery(
      `SELECT * FROM sessions 
       WHERE summary LIKE ? 
       ORDER BY start_time DESC 
       LIMIT 10`,
      [`%${query}%`]
    );
    
    // Search commits
    results.commits = await this.allQuery(
      `SELECT * FROM commits 
       WHERE message LIKE ? 
       ORDER BY date DESC 
       LIMIT 10`,
      [`%${query}%`]
    );
    
    // Search files
    results.files = await this.allQuery(
      `SELECT * FROM files 
       WHERE path LIKE ? 
       ORDER BY timestamp DESC 
       LIMIT 10`,
      [`%${query}%`]
    );
    
    // Search problems
    results.problems = await this.allQuery(
      `SELECT p.*, s.description as solution_desc 
       FROM problems p 
       LEFT JOIN solutions s ON p.id = s.problem_id 
       WHERE p.description LIKE ? 
       ORDER BY p.timestamp DESC 
       LIMIT 10`,
      [`%${query}%`]
    );
    
    return results;
  }

  async getSessionHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await this.allQuery(
      `SELECT * FROM sessions 
       WHERE start_time >= ? 
       ORDER BY start_time DESC`,
      [since.toISOString()]
    );
  }

  async getProjectTimeline(projectName) {
    const commits = await this.allQuery(
      `SELECT * FROM commits 
       WHERE message LIKE ? 
       ORDER BY date ASC`,
      [`%${projectName}%`]
    );
    
    const timeline = {};
    commits.forEach(commit => {
      const date = commit.date.split('T')[0];
      if (!timeline[date]) {
        timeline[date] = [];
      }
      timeline[date].push(commit);
    });
    
    return timeline;
  }

  async getRelatedWork(sessionId) {
    // Find related sessions based on files and commits
    const session = await this.getQuery(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );
    
    if (!session) return [];
    
    // Get files from this session
    const files = await this.allQuery(
      'SELECT DISTINCT path FROM files WHERE session_id = ?',
      [sessionId]
    );
    
    const filePaths = files.map(f => f.path);
    
    // Find other sessions that touched the same files
    const relatedSessions = new Set();
    
    for (const filePath of filePaths) {
      const sessions = await this.allQuery(
        `SELECT DISTINCT session_id FROM files 
         WHERE path = ? AND session_id != ?`,
        [filePath, sessionId]
      );
      
      sessions.forEach(s => relatedSessions.add(s.session_id));
    }
    
    // Get details of related sessions
    const related = [];
    for (const relatedId of relatedSessions) {
      const relatedSession = await this.getQuery(
        'SELECT * FROM sessions WHERE id = ?',
        [relatedId]
      );
      
      if (relatedSession) {
        related.push(relatedSession);
      }
    }
    
    return related;
  }

  extractTags(sessionData) {
    const tags = [];
    
    // Extract from commits
    sessionData.commits?.forEach(commit => {
      if (commit.message.includes('feat')) tags.push('feature');
      if (commit.message.includes('fix')) tags.push('bugfix');
      if (commit.message.includes('test')) tags.push('testing');
      if (commit.message.includes('doc')) tags.push('documentation');
    });
    
    // Extract from file types
    sessionData.fileChanges?.forEach(change => {
      const ext = path.extname(change.file);
      if (ext) tags.push(ext.substring(1));
    });
    
    return [...new Set(tags)];
  }

  extractCommitTags(message) {
    const tags = [];
    const patterns = {
      feature: /feat|add|implement/i,
      bugfix: /fix|bug|issue/i,
      refactor: /refactor|clean|improve/i,
      test: /test|spec/i,
      docs: /doc|readme/i,
      performance: /perf|optimize/i,
      security: /security|vulnerability/i
    };
    
    Object.entries(patterns).forEach(([tag, pattern]) => {
      if (message.match(pattern)) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  async exportKnowledge(format = 'json') {
    const exportData = {
      sessions: await this.allQuery('SELECT * FROM sessions'),
      commits: await this.allQuery('SELECT * FROM commits'),
      files: await this.allQuery('SELECT * FROM files'),
      decisions: await this.allQuery('SELECT * FROM decisions'),
      problems: await this.allQuery('SELECT * FROM problems'),
      solutions: await this.allQuery('SELECT * FROM solutions')
    };
    
    const exportPath = path.join(
      __dirname,
      '../exports',
      `knowledge-export-${new Date().toISOString().split('T')[0]}.${format}`
    );
    
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    
    if (format === 'json') {
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    } else if (format === 'markdown') {
      const markdown = this.convertToMarkdown(exportData);
      await fs.writeFile(exportPath, markdown);
    }
    
    logger.info(`Knowledge exported to ${exportPath}`);
    return exportPath;
  }

  convertToMarkdown(data) {
    let markdown = '# Pachacuti Development Knowledge Base\n\n';
    
    markdown += `## Summary\n`;
    markdown += `- Total Sessions: ${data.sessions.length}\n`;
    markdown += `- Total Commits: ${data.commits.length}\n`;
    markdown += `- Files Modified: ${data.files.length}\n`;
    markdown += `- Problems Solved: ${data.problems.length}\n`;
    markdown += `- Solutions Documented: ${data.solutions.length}\n\n`;
    
    markdown += `## Recent Sessions\n\n`;
    data.sessions.slice(0, 10).forEach(session => {
      markdown += `### ${session.id}\n`;
      markdown += `- Duration: ${session.duration}ms\n`;
      markdown += `- Activities: ${session.activities}\n`;
      markdown += `- Commits: ${session.commits}\n`;
      markdown += `- Summary: ${session.summary}\n\n`;
    });
    
    markdown += `## Key Decisions\n\n`;
    data.decisions.slice(0, 10).forEach(decision => {
      markdown += `### ${decision.description}\n`;
      markdown += `- Category: ${decision.category}\n`;
      markdown += `- Reasoning: ${decision.reasoning}\n`;
      markdown += `- Impact: ${decision.impact}\n\n`;
    });
    
    return markdown;
  }
}

module.exports = KnowledgeBase;