/**
 * Main App Component
 * Pachacuti Shell Session Viewer with AI Search
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SessionList from './pages/SessionList';
import SessionViewer from './pages/SessionViewer';
import AISearch from './pages/AISearch';
import WebTerminal from './pages/WebTerminal';
import Dashboard from './pages/Dashboard';

// Services
import { socketService } from './services/socketService';
import { sessionService } from './services/sessionService';

// Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff41', // Matrix green
    },
    secondary: {
      main: '#ffab00',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      color: '#00ff41',
    },
    h5: {
      color: '#00ff41',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
        },
      },
    },
  },
});

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize services
    socketService.connect();
    loadSessions();

    // Socket event handlers
    socketService.on('sessionProcessed', (data) => {
      console.log('New session processed:', data);
      loadSessions(); // Refresh session list
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionData = await sessionService.getAllSessions();
      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = (session) => {
    setCurrentSession(session);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* Header */}
          <Header 
            onMenuClick={toggleSidebar}
            currentSession={currentSession}
          />
          
          {/* Sidebar */}
          <Sidebar 
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            sessions={sessions}
            onSessionSelect={handleSessionSelect}
            currentSession={currentSession}
            loading={loading}
          />
          
          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              bgcolor: 'background.default',
              overflow: 'hidden',
              marginTop: '64px', // Height of AppBar
              marginLeft: sidebarOpen ? '300px' : '0px',
              transition: 'margin-left 0.3s',
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard sessions={sessions} />} />
              <Route path="/sessions" element={<SessionList sessions={sessions} onSessionSelect={handleSessionSelect} />} />
              <Route path="/sessions/:id" element={<SessionViewer />} />
              <Route path="/search" element={<AISearch sessions={sessions} />} />
              <Route path="/terminal" element={<WebTerminal />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;