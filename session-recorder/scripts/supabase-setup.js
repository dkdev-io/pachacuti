#!/usr/bin/env node

/**
 * Automated Supabase Setup for Pachacuti Session Recorder
 * Extracts credentials and sets up the complete cloud infrastructure
 */

const SupabaseExtractor = require('../lib/supabase-extractor');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

class SupabaseSetup {
  constructor() {
    this.extractor = new SupabaseExtractor();
    this.supabase = null;
    this.credentials = null;
  }

  async run() {
    console.log('🚀 Starting Automated Supabase Setup for Pachacuti Session Recorder\n');

    try {
      // Step 1: Extract credentials from browser
      console.log('🎯 Step 1: Extracting Supabase credentials from browser...');
      await this.extractor.initialize();
      
      this.credentials = await this.extractor.interactiveExtraction();
      
      if (!this.credentials || !this.credentials.url || !this.credentials.anonKey) {
        throw new Error('Failed to extract Supabase credentials');
      }

      // Step 2: Initialize Supabase client
      console.log('🔌 Step 2: Initializing Supabase client...');
      this.supabase = createClient(this.credentials.url, this.credentials.anonKey);

      // Step 3: Test connection
      console.log('🧪 Step 3: Testing connection...');
      await this.testConnection();

      // Step 4: Create database schema
      console.log('🗃️ Step 4: Creating database schema...');
      await this.createDatabaseSchema();

      // Step 5: Create migration script
      console.log('📦 Step 5: Creating migration utilities...');
      await this.createMigrationScript();

      // Step 6: Update session recorder
      console.log('🔧 Step 6: Updating session recorder for Supabase...');
      await this.createSupabaseAdapter();

      // Step 7: Create real-time features
      console.log('⚡ Step 7: Setting up real-time features...');
      await this.createRealTimeFeatures();

      // Step 8: Create team dashboard
      console.log('📊 Step 8: Creating team collaboration dashboard...');
      await this.createTeamDashboard();

      console.log('\n🎉 SUPABASE INTEGRATION COMPLETE!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run migrate-to-supabase');
      console.log('2. Start enhanced recorder: npm run start-cloud');
      console.log('3. View team dashboard: npm run dashboard');
      console.log('\n✨ Your second brain is now cloud-powered!');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.extractor.close();
    }
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase.from('_test').select('*').limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      console.log('✅ Connection successful!');
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async createDatabaseSchema() {
    const schema = `
-- Pachacuti Session Recorder Database Schema
-- Generated automatically for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  project_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration BIGINT,
  summary JSONB,
  statistics JSONB,
  key_achievements TEXT[],
  top_files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table (real-time events)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ,
  type TEXT NOT NULL,
  details JSONB,
  searchable_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Git commits table
CREATE TABLE IF NOT EXISTS commits (
  hash TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  message TEXT,
  author TEXT,
  email TEXT,
  date TIMESTAMPTZ,
  files_changed INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File changes table
CREATE TABLE IF NOT EXISTS file_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  file_path TEXT,
  action TEXT,
  content TEXT,
  diff_content TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  category TEXT,
  description TEXT,
  reasoning TEXT,
  alternatives JSONB,
  impact TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  description TEXT,
  category TEXT,
  severity TEXT,
  context TEXT,
  stack_trace TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solutions table
CREATE TABLE IF NOT EXISTS solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  description TEXT,
  implementation TEXT,
  effectiveness TEXT,
  reusable BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base with vector search
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  embedding VECTOR(1536), -- For OpenAI embeddings
  tags TEXT[],
  category TEXT,
  doc_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team coordination table
CREATE TABLE IF NOT EXISTS team_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  date DATE DEFAULT CURRENT_DATE,
  sessions_count INTEGER DEFAULT 0,
  total_duration BIGINT DEFAULT 0,
  commits_count INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_session_id ON activities(session_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_commits_session_id ON commits(session_id);
CREATE INDEX IF NOT EXISTS idx_commits_author ON commits(author);
CREATE INDEX IF NOT EXISTS idx_file_changes_session_id ON file_changes(session_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes(file_path);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_session_id ON knowledge_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_team_metrics_user_date ON team_metrics(user_id, date);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_sessions_summary_fts ON sessions USING GIN(to_tsvector('english', summary::text));
CREATE INDEX IF NOT EXISTS idx_activities_searchable_fts ON activities USING GIN(to_tsvector('english', searchable_text));
CREATE INDEX IF NOT EXISTS idx_commits_message_fts ON commits USING GIN(to_tsvector('english', message));
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts ON knowledge_entries USING GIN(to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Sessions: users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Activities: users can only see activities from their sessions
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Similar policies for other tables
CREATE POLICY "Users can view own commits" ON commits
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()) OR session_id IS NULL
  );
CREATE POLICY "Users can insert commits" ON commits
  FOR INSERT WITH CHECK (true); -- Commits can be shared

CREATE POLICY "Users can view own file changes" ON file_changes
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own file changes" ON file_changes
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own decisions" ON decisions
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own decisions" ON decisions
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own problems" ON problems
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own problems" ON problems
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own solutions" ON solutions
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own solutions" ON solutions
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own knowledge" ON knowledge_entries
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own knowledge" ON knowledge_entries
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own team metrics" ON team_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own team metrics" ON team_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own team metrics" ON team_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for common queries
CREATE OR REPLACE FUNCTION search_knowledge(
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 10
)
RETURNS SETOF knowledge_entries
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM knowledge_entries
  WHERE 
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
    AND (
      to_tsvector('english', content) @@ plainto_tsquery('english', query_text)
      OR content ILIKE '%' || query_text || '%'
      OR title ILIKE '%' || query_text || '%'
      OR query_text = ANY(tags)
    )
  ORDER BY 
    ts_rank(to_tsvector('english', content), plainto_tsquery('english', query_text)) DESC,
    created_at DESC
  LIMIT match_count;
$$;

-- Create function to get session summary
CREATE OR REPLACE FUNCTION get_session_summary(session_id_param TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'session', (SELECT to_jsonb(s) FROM sessions s WHERE s.id = session_id_param),
    'activities_count', (SELECT count(*) FROM activities WHERE session_id = session_id_param),
    'commits_count', (SELECT count(*) FROM commits WHERE session_id = session_id_param),
    'decisions_count', (SELECT count(*) FROM decisions WHERE session_id = session_id_param),
    'problems_count', (SELECT count(*) FROM problems WHERE session_id = session_id_param),
    'solutions_count', (SELECT count(*) FROM solutions WHERE session_id = session_id_param)
  );
$$;

-- Create function to calculate productivity metrics
CREATE OR REPLACE FUNCTION calculate_productivity_metrics(
  user_id_param UUID DEFAULT auth.uid(),
  days_back INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total_sessions', COUNT(*),
    'total_duration', SUM(duration),
    'avg_session_duration', AVG(duration),
    'total_commits', (SELECT COUNT(*) FROM commits c JOIN sessions s ON c.session_id = s.id 
                     WHERE s.user_id = user_id_param AND s.start_time >= NOW() - INTERVAL '1 day' * days_back),
    'productivity_score', CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(100, (COUNT(*) * 20 + SUM(duration)/3600000 * 10)::INT)
    END
  )
  FROM sessions
  WHERE user_id = user_id_param
    AND start_time >= NOW() - INTERVAL '1 day' * days_back;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

    // Save schema to file
    const schemaPath = path.join(__dirname, '../sql/supabase-schema.sql');
    await fs.mkdir(path.dirname(schemaPath), { recursive: true });
    await fs.writeFile(schemaPath, schema);

    console.log('📄 Database schema created and saved to sql/supabase-schema.sql');
    console.log('🔧 Please run this SQL in your Supabase SQL editor');
    console.log(`   URL: ${this.credentials.url.replace('supabase.co', 'supabase.com')}/sql`);
  }

  async createMigrationScript() {
    const migrationScript = `#!/usr/bin/env node

/**
 * SQLite to Supabase Migration Script
 * Migrates existing session data to Supabase cloud database
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

class SupabaseMigration {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.sqliteDb = new sqlite3.Database(
      path.join(__dirname, '../data/knowledge.db')
    );
  }

  async migrate() {
    console.log('🚀 Starting SQLite to Supabase migration...');
    
    try {
      await this.migrateSessions();
      await this.migrateActivities();
      await this.migrateCommits();
      await this.migrateFiles();
      await this.migrateDecisions();
      await this.migrateProblems();
      await this.migrateSolutions();
      
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async migrateSessions() {
    console.log('📊 Migrating sessions...');
    
    const sessions = await this.querySQLite('SELECT * FROM sessions');
    
    for (const session of sessions) {
      const { error } = await this.supabase
        .from('sessions')
        .insert({
          id: session.id,
          start_time: session.start_time,
          end_time: session.end_time,
          duration: session.duration,
          summary: session.summary ? JSON.parse(session.summary) : null,
          statistics: {
            activities: session.activities,
            file_changes: session.file_changes,
            commits: session.commits,
            problems_solved: session.problems_solved
          }
        });
        
      if (error) {
        console.error('Error migrating session:', error);
      }
    }
    
    console.log(\`✅ Migrated \${sessions.length} sessions\`);
  }

  async migrateActivities() {
    console.log('🎯 Migrating activities...');
    
    const activities = await this.querySQLite('SELECT * FROM activities');
    
    const batchSize = 100;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('activities')
        .insert(batch.map(activity => ({
          session_id: activity.session_id,
          timestamp: activity.timestamp,
          type: activity.type,
          details: activity.details ? JSON.parse(activity.details) : null,
          searchable_text: activity.searchable_text
        })));
        
      if (error) {
        console.error('Error migrating activities batch:', error);
      }
    }
    
    console.log(\`✅ Migrated \${activities.length} activities\`);
  }

  async migrateCommits() {
    console.log('💾 Migrating commits...');
    
    const commits = await this.querySQLite('SELECT * FROM commits');
    
    for (const commit of commits) {
      const { error } = await this.supabase
        .from('commits')
        .insert({
          hash: commit.hash,
          session_id: commit.session_id,
          message: commit.message,
          author: commit.author,
          date: commit.date,
          files_changed: commit.files_changed,
          additions: commit.additions,
          deletions: commit.deletions
        });
        
      if (error && !error.message.includes('duplicate')) {
        console.error('Error migrating commit:', error);
      }
    }
    
    console.log(\`✅ Migrated \${commits.length} commits\`);
  }

  async migrateFiles() {
    console.log('📁 Migrating file changes...');
    
    const files = await this.querySQLite('SELECT * FROM files');
    
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('file_changes')
        .insert(batch.map(file => ({
          session_id: file.session_id,
          file_path: file.path,
          action: file.action,
          timestamp: file.timestamp
        })));
        
      if (error) {
        console.error('Error migrating files batch:', error);
      }
    }
    
    console.log(\`✅ Migrated \${files.length} file changes\`);
  }

  async migrateDecisions() {
    console.log('🤔 Migrating decisions...');
    
    const decisions = await this.querySQLite('SELECT * FROM decisions');
    
    for (const decision of decisions) {
      const { error } = await this.supabase
        .from('decisions')
        .insert({
          session_id: decision.session_id,
          category: decision.category,
          description: decision.description,
          reasoning: decision.reasoning,
          impact: decision.impact,
          timestamp: decision.timestamp
        });
        
      if (error) {
        console.error('Error migrating decision:', error);
      }
    }
    
    console.log(\`✅ Migrated \${decisions.length} decisions\`);
  }

  async migrateProblems() {
    console.log('🐛 Migrating problems...');
    
    const problems = await this.querySQLite('SELECT * FROM problems');
    
    for (const problem of problems) {
      const { error } = await this.supabase
        .from('problems')
        .insert({
          session_id: problem.session_id,
          description: problem.description,
          category: problem.category,
          severity: problem.severity,
          timestamp: problem.timestamp
        });
        
      if (error) {
        console.error('Error migrating problem:', error);
      }
    }
    
    console.log(\`✅ Migrated \${problems.length} problems\`);
  }

  async migrateSolutions() {
    console.log('✅ Migrating solutions...');
    
    const solutions = await this.querySQLite('SELECT * FROM solutions');
    
    for (const solution of solutions) {
      const { error } = await this.supabase
        .from('solutions')
        .insert({
          session_id: solution.session_id,
          description: solution.description,
          implementation: solution.implementation,
          effectiveness: solution.effectiveness,
          reusable: solution.reusable,
          timestamp: solution.timestamp
        });
        
      if (error) {
        console.error('Error migrating solution:', error);
      }
    }
    
    console.log(\`✅ Migrated \${solutions.length} solutions\`);
  }

  querySQLite(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}

// Run migration
if (require.main === module) {
  const migration = new SupabaseMigration();
  migration.migrate().catch(console.error);
}

module.exports = SupabaseMigration;
`;

    const migrationPath = path.join(__dirname, '../scripts/migrate-to-supabase.js');
    await fs.writeFile(migrationPath, migrationScript);

    console.log('📦 Migration script created at scripts/migrate-to-supabase.js');
  }

  async createSupabaseAdapter() {
    const adapterCode = `/**
 * Supabase Adapter for Session Recorder
 * Replaces SQLite with cloud Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('./logger');

class SupabaseAdapter {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  async indexSession(sessionData) {
    logger.info(\`Indexing session \${sessionData.sessionId} in Supabase\`);
    
    try {
      // Insert session
      const { error: sessionError } = await this.supabase
        .from('sessions')
        .insert({
          id: sessionData.sessionId,
          start_time: sessionData.start,
          end_time: sessionData.end,
          duration: sessionData.duration,
          summary: sessionData.keyAchievements,
          statistics: sessionData.statistics,
          key_achievements: sessionData.keyAchievements,
          top_files: sessionData.topFiles
        });

      if (sessionError) throw sessionError;

      // Insert activities
      if (sessionData.activities && sessionData.activities.length > 0) {
        const activities = sessionData.activities.map(activity => ({
          session_id: sessionData.sessionId,
          timestamp: activity.timestamp,
          type: activity.type,
          details: activity.details,
          searchable_text: JSON.stringify(activity.details)
        }));

        const { error: activitiesError } = await this.supabase
          .from('activities')
          .insert(activities);

        if (activitiesError) throw activitiesError;
      }

      // Insert commits
      if (sessionData.commits && sessionData.commits.length > 0) {
        for (const commit of sessionData.commits) {
          const { error: commitError } = await this.supabase
            .from('commits')
            .insert({
              hash: commit.hash,
              session_id: sessionData.sessionId,
              message: commit.message,
              author: commit.author,
              date: commit.timestamp,
              files: commit.files
            });

          if (commitError && !commitError.message.includes('duplicate')) {
            throw commitError;
          }
        }
      }

      // Insert file changes
      if (sessionData.fileChanges && sessionData.fileChanges.length > 0) {
        const fileChanges = sessionData.fileChanges.map(change => ({
          session_id: sessionData.sessionId,
          file_path: change.file,
          action: change.action,
          content: change.content?.substring(0, 10000), // Limit content size
          timestamp: change.timestamp
        }));

        const { error: filesError } = await this.supabase
          .from('file_changes')
          .insert(fileChanges);

        if (filesError) throw filesError;
      }

      // Insert decisions
      if (sessionData.decisions && sessionData.decisions.length > 0) {
        const decisions = sessionData.decisions.map(decision => ({
          session_id: sessionData.sessionId,
          category: decision.category,
          description: decision.description,
          reasoning: decision.reasoning,
          impact: decision.impact,
          timestamp: decision.timestamp
        }));

        const { error: decisionsError } = await this.supabase
          .from('decisions')
          .insert(decisions);

        if (decisionsError) throw decisionsError;
      }

      // Insert problems and solutions
      if (sessionData.problems && sessionData.problems.length > 0) {
        for (const problem of sessionData.problems) {
          const { data: problemData, error: problemError } = await this.supabase
            .from('problems')
            .insert({
              session_id: sessionData.sessionId,
              description: problem.description,
              category: problem.category,
              severity: problem.severity,
              timestamp: problem.timestamp
            })
            .select()
            .single();

          if (problemError) throw problemError;

          // Find matching solutions
          const solutions = sessionData.solutions?.filter(s => 
            s.problemId === problem.id || 
            s.description.includes(problem.description)
          ) || [];

          for (const solution of solutions) {
            const { error: solutionError } = await this.supabase
              .from('solutions')
              .insert({
                problem_id: problemData.id,
                session_id: sessionData.sessionId,
                description: solution.description,
                implementation: solution.implementation,
                effectiveness: solution.effectiveness,
                reusable: solution.reusable,
                timestamp: solution.timestamp
              });

            if (solutionError) throw solutionError;
          }
        }
      }

      // Add to knowledge base
      await this.addToKnowledgeBase({
        session_id: sessionData.sessionId,
        title: \`Session \${sessionData.sessionId}\`,
        content: JSON.stringify(sessionData),
        category: 'session',
        doc_type: 'session_summary',
        tags: this.extractTags(sessionData)
      });

      logger.info('✅ Session indexed successfully in Supabase');
      
    } catch (error) {
      logger.error('❌ Failed to index session in Supabase:', error);
      throw error;
    }
  }

  async addToKnowledgeBase(entry) {
    const { error } = await this.supabase
      .from('knowledge_entries')
      .insert({
        session_id: entry.session_id,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        doc_type: entry.doc_type,
        tags: entry.tags,
        metadata: entry.metadata || {}
      });

    if (error) throw error;
  }

  async search(query) {
    logger.info(\`Searching Supabase for: \${query}\`);
    
    try {
      // Use the search function we created
      const { data: knowledgeResults, error: knowledgeError } = await this.supabase
        .rpc('search_knowledge', {
          query_text: query,
          match_count: 20
        });

      if (knowledgeError) throw knowledgeError;

      // Also search sessions directly
      const { data: sessionResults, error: sessionError } = await this.supabase
        .from('sessions')
        .select('*')
        .or(\`summary.cs.\${query},key_achievements.cs.{\${query}}\`)
        .order('start_time', { ascending: false })
        .limit(10);

      if (sessionError) throw sessionError;

      // Search commits
      const { data: commitResults, error: commitError } = await this.supabase
        .from('commits')
        .select('*')
        .ilike('message', \`%\${query}%\`)
        .order('date', { ascending: false })
        .limit(10);

      if (commitError) throw commitError;

      // Search problems
      const { data: problemResults, error: problemError } = await this.supabase
        .from('problems')
        .select('*, solutions(*)')
        .ilike('description', \`%\${query}%\`)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (problemError) throw problemError;

      return {
        knowledge: knowledgeResults || [],
        sessions: sessionResults || [],
        commits: commitResults || [],
        problems: problemResults || [],
        totalResults: (knowledgeResults?.length || 0) + 
                     (sessionResults?.length || 0) + 
                     (commitResults?.length || 0) + 
                     (problemResults?.length || 0)
      };

    } catch (error) {
      logger.error('❌ Search failed:', error);
      throw error;
    }
  }

  async getSessionHistory(days = 30) {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .gte('start_time', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getProductivityMetrics(days = 7) {
    const { data, error } = await this.supabase
      .rpc('calculate_productivity_metrics', {
        days_back: days
      });

    if (error) throw error;
    return data;
  }

  async subscribeToRealTimeUpdates(callback) {
    const subscription = this.supabase
      .channel('session-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities'
      }, (payload) => {
        callback('activity', payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sessions'
      }, (payload) => {
        callback('session', payload.new);
      })
      .subscribe();

    return subscription;
  }

  extractTags(sessionData) {
    const tags = [];
    
    // Extract from commits
    sessionData.commits?.forEach(commit => {
      if (commit.message.includes('feat')) tags.push('feature');
      if (commit.message.includes('fix')) tags.push('bugfix');
      if (commit.message.includes('test')) tags.push('testing');
    });
    
    // Extract from file types
    sessionData.fileChanges?.forEach(change => {
      const ext = change.file.split('.').pop();
      if (ext) tags.push(ext);
    });
    
    return [...new Set(tags)];
  }
}

module.exports = SupabaseAdapter;
`;

    const adapterPath = path.join(__dirname, '../lib/supabase-adapter.js');
    await fs.writeFile(adapterPath, adapterCode);

    console.log('🔌 Supabase adapter created at lib/supabase-adapter.js');
  }

  async createRealTimeFeatures() {
    const realTimeCode = `/**
 * Real-time Features for Supabase Session Recorder
 * Live collaboration and monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const EventEmitter = require('events');
const { logger } = require('./logger');

class RealTimeSessionMonitor extends EventEmitter {
  constructor() {
    super();
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.subscriptions = [];
  }

  async start() {
    logger.info('🚀 Starting real-time session monitoring...');
    
    // Subscribe to live session activities
    const activitySubscription = this.supabase
      .channel('live-activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activities'
      }, (payload) => {
        this.handleLiveActivity(payload.new);
      })
      .subscribe();

    // Subscribe to new sessions
    const sessionSubscription = this.supabase
      .channel('live-sessions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sessions'
      }, (payload) => {
        this.handleNewSession(payload.new);
      })
      .subscribe();

    // Subscribe to commits
    const commitSubscription = this.supabase
      .channel('live-commits')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'commits'
      }, (payload) => {
        this.handleNewCommit(payload.new);
      })
      .subscribe();

    this.subscriptions = [activitySubscription, sessionSubscription, commitSubscription];
    
    logger.info('✅ Real-time monitoring active');
  }

  handleLiveActivity(activity) {
    logger.info(\`📊 Live activity: \${activity.type} in session \${activity.session_id}\`);
    
    this.emit('activity', {
      sessionId: activity.session_id,
      type: activity.type,
      details: activity.details,
      timestamp: activity.timestamp
    });

    // Trigger notifications for important activities
    if (activity.type === 'problem' || activity.type === 'solution') {
      this.emit('important-activity', activity);
    }
  }

  handleNewSession(session) {
    logger.info(\`🎯 New session started: \${session.id}\`);
    
    this.emit('session-started', {
      sessionId: session.id,
      startTime: session.start_time,
      projectName: session.project_name
    });
  }

  handleNewCommit(commit) {
    logger.info(\`💾 New commit: \${commit.hash.substring(0, 7)} - \${commit.message}\`);
    
    this.emit('commit', {
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      sessionId: commit.session_id
    });
  }

  async getTeamActivity() {
    const { data, error } = await this.supabase
      .from('activities')
      .select(\`
        *,
        sessions!inner(
          user_id,
          project_name
        )
      \`)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getLiveTeamMetrics() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('team_metrics')
      .select('*')
      .eq('date', today);

    if (error) throw error;
    
    return {
      activeSessions: data?.reduce((sum, m) => sum + m.sessions_count, 0) || 0,
      totalCommits: data?.reduce((sum, m) => sum + m.commits_count, 0) || 0,
      totalDuration: data?.reduce((sum, m) => sum + m.total_duration, 0) || 0,
      averageProductivity: data?.length > 0 ? 
        data.reduce((sum, m) => sum + m.productivity_score, 0) / data.length : 0
    };
  }

  async stop() {
    for (const subscription of this.subscriptions) {
      await this.supabase.removeChannel(subscription);
    }
    this.subscriptions = [];
    logger.info('🛑 Real-time monitoring stopped');
  }
}

module.exports = RealTimeSessionMonitor;
`;

    const realTimePath = path.join(__dirname, '../lib/realtime-monitor.js');
    await fs.writeFile(realTimePath, realTimeCode);

    console.log('⚡ Real-time monitoring created at lib/realtime-monitor.js');
  }

  async createTeamDashboard() {
    const dashboardCode = `#!/usr/bin/env node

/**
 * Team Collaboration Dashboard
 * Real-time view of team development activity
 */

const RealTimeSessionMonitor = require('../lib/realtime-monitor');
const SupabaseAdapter = require('../lib/supabase-adapter');
const { createClient } = require('@supabase/supabase-js');

class TeamDashboard {
  constructor() {
    this.monitor = new RealTimeSessionMonitor();
    this.adapter = new SupabaseAdapter();
    this.isRunning = false;
  }

  async start() {
    console.log('🚀 Starting Pachacuti Team Dashboard...');
    
    this.isRunning = true;
    
    // Set up real-time monitoring
    await this.monitor.start();
    
    // Set up event handlers
    this.monitor.on('activity', (activity) => {
      this.displayLiveActivity(activity);
    });
    
    this.monitor.on('session-started', (session) => {
      this.displayNewSession(session);
    });
    
    this.monitor.on('commit', (commit) => {
      this.displayNewCommit(commit);
    });

    // Display initial dashboard
    await this.displayDashboard();
    
    // Update dashboard every 30 seconds
    setInterval(async () => {
      if (this.isRunning) {
        await this.updateDashboard();
      }
    }, 30000);
    
    console.log('📊 Team dashboard is live! Press Ctrl+C to stop.');
  }

  async displayDashboard() {
    console.clear();
    console.log('🧠 PACHACUTI TEAM DEVELOPMENT DASHBOARD');
    console.log('=' .repeat(60));
    
    try {
      // Get team metrics
      const metrics = await this.monitor.getLiveTeamMetrics();
      
      console.log('📊 TODAY\'S METRICS:');
      console.log(\`   Active Sessions: \${metrics.activeSessions}\`);
      console.log(\`   Total Commits: \${metrics.totalCommits}\`);
      console.log(\`   Total Duration: \${this.formatDuration(metrics.totalDuration)}\`);
      console.log(\`   Avg Productivity: \${Math.round(metrics.averageProductivity)}/100\`);
      console.log('');
      
      // Get recent activity
      const activities = await this.monitor.getTeamActivity();
      
      console.log('🎯 RECENT TEAM ACTIVITY:');
      activities.slice(0, 10).forEach(activity => {
        const time = new Date(activity.timestamp).toLocaleTimeString();
        const project = activity.sessions.project_name || 'Unknown';
        console.log(\`   \${time} - \${activity.type} in \${project}\`);
      });
      
      console.log('');
      console.log('🔴 LIVE UPDATES (watch this space):');
      console.log('-' .repeat(40));
      
    } catch (error) {
      console.error('❌ Error loading dashboard:', error.message);
    }
  }

  async updateDashboard() {
    // Just update metrics section
    const metrics = await this.monitor.getLiveTeamMetrics();
    
    // Move cursor up to metrics section and update
    process.stdout.write('\\x1b[8A'); // Move up 8 lines
    process.stdout.write('\\x1b[K'); // Clear line
    console.log(\`   Active Sessions: \${metrics.activeSessions}\`);
    process.stdout.write('\\x1b[K');
    console.log(\`   Total Commits: \${metrics.totalCommits}\`);
    process.stdout.write('\\x1b[K');
    console.log(\`   Total Duration: \${this.formatDuration(metrics.totalDuration)}\`);
    process.stdout.write('\\x1b[K');
    console.log(\`   Avg Productivity: \${Math.round(metrics.averageProductivity)}/100\`);
    
    // Move cursor back to live updates section
    process.stdout.write('\\x1b[4B'); // Move down 4 lines
  }

  displayLiveActivity(activity) {
    const time = new Date().toLocaleTimeString();
    const emoji = this.getActivityEmoji(activity.type);
    
    console.log(\`\${emoji} \${time} - \${activity.type} in session \${activity.sessionId.substring(0, 8)}\`);
  }

  displayNewSession(session) {
    const time = new Date().toLocaleTimeString();
    const project = session.projectName || 'Unknown Project';
    
    console.log(\`🎯 \${time} - New session started: \${project}\`);
  }

  displayNewCommit(commit) {
    const time = new Date().toLocaleTimeString();
    const shortHash = commit.hash.substring(0, 7);
    const author = commit.author || 'Unknown';
    
    console.log(\`💾 \${time} - Commit \${shortHash} by \${author}: \${commit.message.substring(0, 50)}\`);
  }

  getActivityEmoji(type) {
    const emojis = {
      'file_change': '📝',
      'git_activity': '🔄',
      'command': '⚡',
      'decision': '🤔',
      'problem': '🐛',
      'solution': '✅',
      'session': '🎯'
    };
    
    return emojis[type] || '📊';
  }

  formatDuration(ms) {
    if (!ms) return '0m';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return \`\${hours}h \${minutes}m\`;
    }
    return \`\${minutes}m\`;
  }

  async stop() {
    this.isRunning = false;
    await this.monitor.stop();
    console.log('\\n🛑 Dashboard stopped');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Shutting down dashboard...');
  process.exit(0);
});

// Start dashboard if run directly
if (require.main === module) {
  const dashboard = new TeamDashboard();
  dashboard.start().catch(console.error);
}

module.exports = TeamDashboard;
`;

    const dashboardPath = path.join(__dirname, '../dashboard.js');
    await fs.writeFile(dashboardPath, dashboardCode);

    console.log('📊 Team dashboard created at dashboard.js');
  }
}

// Run the setup
if (require.main === module) {
  const setup = new SupabaseSetup();
  setup.run();
}

module.exports = SupabaseSetup;