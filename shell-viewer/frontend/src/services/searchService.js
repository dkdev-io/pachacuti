/**
 * Search Service
 * Handles AI-powered search API calls
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class SearchService {
  async search({ query, sessionIds, filters = {} }) {
    try {
      const response = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sessionIds,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  async askQuestion({ question, context }) {
    try {
      const response = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Question failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Question error:', error);
      throw error;
    }
  }

  async analyzeCommand({ command, output, context }) {
    try {
      const response = await fetch(`${API_BASE}/api/analyze-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          output,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();