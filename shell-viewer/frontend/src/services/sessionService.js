/**
 * Session Service
 * Handles session-related API calls
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class SessionService {
  async getAllSessions() {
    try {
      const response = await fetch(`${API_BASE}/api/sessions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  async getSessionCommands(sessionId) {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/commands`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commands: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching commands:', error);
      throw error;
    }
  }

  async getSessionTimeline(sessionId) {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/timeline`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching timeline:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const response = await fetch(`${API_BASE}/api/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  async exportSession(sessionId, format = 'json') {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error(`Failed to export session: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `session-${sessionId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return true;
    } catch (error) {
      console.error('Error exporting session:', error);
      throw error;
    }
  }
}

export const sessionService = new SessionService();