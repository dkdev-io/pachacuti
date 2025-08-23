/**
 * AI Search Controller
 * OpenAI-powered intelligent search and question answering for shell sessions
 */

const OpenAI = require('openai');
const logger = require('./logger');

class AISearchController {
  constructor() {
    this.openai = null;
    this.sessionManager = null;
    this.initialized = false;
    
    // AI context templates
    this.systemPrompts = {
      search: `You are an expert system administrator and developer assistant. You help users find and understand shell command history and development sessions. Analyze shell commands, outputs, and session data to provide helpful insights.

When searching, focus on:
- Command patterns and sequences
- Error messages and troubleshooting
- Development workflows and best practices
- Time-based patterns and efficiency
- Similar commands and their outcomes

Always provide context about WHY something might be relevant.`,
      
      question: `You are a helpful assistant that answers questions about shell command history and development sessions. You have access to detailed command history, outputs, timestamps, and session context.

When answering questions:
- Be specific and provide exact commands when relevant
- Explain the purpose and outcome of commands
- Suggest improvements or alternatives when appropriate
- Reference timestamps and session context
- Help identify patterns or issues

If you don't have enough information, say so clearly.`,
      
      analysis: `You are an expert at analyzing shell commands and their outputs. Provide detailed analysis including:
- What the command does
- Potential issues or improvements
- Best practices
- Security considerations
- Performance implications
- Alternative approaches

Be thorough but concise.`
    };
  }

  async initialize() {
    logger.info('🤖 Initializing AI Search Controller...');
    
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('⚠️  OpenAI API key not found - AI features will be disabled');
      this.initialized = true; // Allow demo mode
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Test connection
    try {
      await this.openai.models.list();
      this.initialized = true;
      logger.info('✅ OpenAI connection established');
    } catch (error) {
      logger.error('❌ OpenAI initialization failed:', error);
      throw error;
    }
  }

  async search({ query, sessionIds, filters = {} }) {
    if (!this.initialized) {
      throw new Error('AI search not available - OpenAI not initialized');
    }

    logger.info(`🔍 AI search: "${query}"`);
    
    try {
      // Get relevant shell commands and sessions
      const searchResults = await this.performDatabaseSearch(query, sessionIds, filters);
      
      // Enhance results with AI analysis
      const enhancedResults = await this.enhanceSearchResults(query, searchResults);
      
      return {
        query,
        totalResults: enhancedResults.length,
        results: enhancedResults,
        suggestions: await this.generateSearchSuggestions(query),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('AI search error:', error);
      throw error;
    }
  }

  async performDatabaseSearch(query, sessionIds, filters) {
    // This would be injected from the session manager
    if (!this.sessionManager) {
      throw new Error('Session manager not available');
    }
    
    // Search commands and sessions
    const commands = await this.sessionManager.searchCommands(query, {
      ...filters,
      sessionIds
    });
    
    return commands;
  }

  async enhanceSearchResults(query, searchResults) {
    if (searchResults.length === 0) {
      return [];
    }
    
    // Group results by relevance and add AI insights
    const enhanced = [];
    
    for (const result of searchResults.slice(0, 20)) { // Limit for API efficiency
      try {
        const context = this.buildCommandContext(result);
        const insights = await this.analyzeCommand({
          command: result.command,
          output: result.output,
          context: context
        });
        
        enhanced.push({
          ...result,
          relevanceScore: this.calculateRelevance(query, result),
          aiInsights: insights,
          context: context
        });
        
      } catch (error) {
        logger.error('Error enhancing result:', error);
        enhanced.push({
          ...result,
          relevanceScore: this.calculateRelevance(query, result),
          aiInsights: null,
          context: this.buildCommandContext(result)
        });
      }
    }
    
    return enhanced.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  buildCommandContext(commandResult) {
    return {
      sessionId: commandResult.session_id,
      timestamp: commandResult.timestamp,
      workingDirectory: commandResult.working_directory,
      exitCode: commandResult.exit_code,
      duration: commandResult.duration,
      sequenceNumber: commandResult.sequence_number,
      user: commandResult.user_name
    };
  }

  calculateRelevance(query, result) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const commandLower = result.command.toLowerCase();
    const outputLower = (result.output || '').toLowerCase();
    
    // Exact command match
    if (commandLower.includes(queryLower)) {
      score += 100;
    }
    
    // Command starts with query
    if (commandLower.startsWith(queryLower)) {
      score += 50;
    }
    
    // Output contains query
    if (outputLower.includes(queryLower)) {
      score += 25;
    }
    
    // Successful commands get slight boost
    if (result.exit_code === 0) {
      score += 5;
    }
    
    // Recent commands get boost
    const daysSince = (Date.now() - new Date(result.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      score += 10;
    }
    
    return score;
  }

  async analyzeCommand({ command, output, context }) {
    if (!this.initialized) {
      return null;
    }
    
    try {
      const prompt = `Analyze this shell command and its execution:

Command: ${command}
Output: ${output ? output.substring(0, 1000) : 'No output'}
Exit Code: ${context.exitCode}
Working Directory: ${context.workingDirectory}
Duration: ${context.duration}ms
Timestamp: ${context.timestamp}

Provide a brief analysis including:
1. What the command does
2. The outcome/result
3. Any issues or suggestions
4. Potential improvements

Keep the response concise (2-3 sentences max).`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.systemPrompts.analysis },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return response.choices[0].message.content;
      
    } catch (error) {
      logger.error('Command analysis error:', error);
      return null;
    }
  }

  async askQuestion({ question, context }) {
    if (!this.initialized) {
      throw new Error('AI question answering not available - OpenAI not initialized');
    }

    logger.info(`❓ AI question: "${question}"`);
    
    try {
      // Get relevant context from sessions
      const contextData = await this.gatherQuestionContext(question, context);
      
      // Generate AI response
      const prompt = `User question: "${question}"

Based on the following shell command history and session data:
${this.formatContextForAI(contextData)}

Please provide a helpful answer. If the data doesn't contain relevant information, say so clearly.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: this.systemPrompts.question },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.4
      });

      const answer = response.choices[0].message.content;
      
      return {
        question,
        answer,
        context: contextData.slice(0, 5), // Return limited context
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('AI question error:', error);
      throw error;
    }
  }

  async gatherQuestionContext(question, providedContext) {
    // Extract potential search terms from question
    const searchTerms = this.extractSearchTerms(question);
    
    // Search for relevant commands
    const relevantCommands = [];
    
    for (const term of searchTerms) {
      try {
        if (this.sessionManager) {
          const results = await this.sessionManager.searchCommands(term, {});
          relevantCommands.push(...results.slice(0, 10));
        }
      } catch (error) {
        logger.warn(`Error searching for term "${term}":`, error);
      }
    }
    
    // Combine with provided context
    const allContext = [...relevantCommands];
    
    if (providedContext && providedContext.sessionId && this.sessionManager) {
      try {
        const sessionCommands = await this.sessionManager.getSessionCommands(
          providedContext.sessionId, 
          50
        );
        allContext.push(...sessionCommands);
      } catch (error) {
        logger.warn('Error fetching session context:', error);
      }
    }
    
    // Remove duplicates and sort by relevance
    const uniqueContext = Array.from(
      new Map(allContext.map(cmd => [cmd.id || cmd.timestamp, cmd])).values()
    );
    
    return uniqueContext
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }

  extractSearchTerms(question) {
    // Simple extraction of potential command names and technical terms
    const terms = [];
    
    // Common command patterns
    const commandPatterns = [
      /\b(git|npm|node|docker|kubectl|ssh|scp|curl|wget|grep|find|ls|cd|mkdir|rm|cp|mv)\b/g,
      /\b\w+\.(js|py|sh|json|yaml|yml|md|txt)\b/g,
      /\b(install|build|test|deploy|run|start|stop|restart)\b/g
    ];
    
    commandPatterns.forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    });
    
    // Extract quoted terms
    const quotedTerms = question.match(/"([^"]+)"/g);
    if (quotedTerms) {
      terms.push(...quotedTerms.map(term => term.replace(/"/g, '')));
    }
    
    // Remove duplicates
    return [...new Set(terms)];
  }

  formatContextForAI(contextData) {
    if (!contextData || contextData.length === 0) {
      return 'No relevant command history found.';
    }
    
    let formatted = `Recent relevant commands (${contextData.length} found):\n\n`;
    
    contextData.slice(0, 15).forEach((cmd, index) => {
      formatted += `${index + 1}. [${cmd.timestamp}] $ ${cmd.command}\n`;
      if (cmd.output && cmd.output.length > 0) {
        const shortOutput = cmd.output.length > 200 ? 
          cmd.output.substring(0, 200) + '...' : 
          cmd.output;
        formatted += `   Output: ${shortOutput}\n`;
      }
      formatted += `   Exit code: ${cmd.exit_code}, Duration: ${cmd.duration}ms\n\n`;
    });
    
    return formatted;
  }

  async generateSearchSuggestions(query) {
    if (!this.initialized) {
      return [];
    }
    
    try {
      const prompt = `Given the search query "${query}", suggest 3-5 related search terms that might be helpful for searching shell command history. Focus on:
      - Related commands
      - Common variations
      - Associated tools or workflows
      
      Return only the suggested terms, one per line, no explanations.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You help generate search suggestions for shell command history.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.5
      });

      const suggestions = response.choices[0].message.content
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 5);

      return suggestions;
      
    } catch (error) {
      logger.warn('Error generating search suggestions:', error);
      return [];
    }
  }

  async liveSearch(data) {
    // Real-time search for socket.io
    return await this.search(data);
  }

  // Inject session manager dependency
  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
  }
}

module.exports = AISearchController;