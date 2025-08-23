/**
 * Web Terminal Page
 * Real-time interactive terminal with session recording
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Toolbar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';

import { socketService } from '../services/socketService';

const WebTerminal = () => {
  const [terminal, setTerminal] = useState(null);
  const [terminalId, setTerminalId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [settings, setSettings] = useState({
    shell: 'bash',
    fontSize: 14,
    theme: 'dark',
    cursorBlink: true,
    recordSession: true
  });

  const terminalRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    setupSocketHandlers();
    checkConnection();

    const interval = setInterval(checkConnection, 1000);
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when output changes
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const setupSocketHandlers = () => {
    // Terminal created
    socketService.on('terminal-created', (data) => {
      setTerminalId(data.terminalId);
      setSessionActive(true);
      appendOutput(`🚀 Terminal session started: ${data.terminalId}\r\n`);
    });

    // Terminal output
    socketService.on('terminal-output', (data) => {
      if (data.terminalId === terminalId) {
        appendOutput(data.data);
      }
    });

    // Terminal exit
    socketService.on('terminal-exit', (data) => {
      if (data.terminalId === terminalId) {
        appendOutput(`\r\n💀 Terminal session ended (exit code: ${data.exitCode})\r\n`);
        setSessionActive(false);
        setTerminalId(null);
      }
    });
  };

  const checkConnection = () => {
    setIsConnected(socketService.isConnected());
  };

  const appendOutput = (data) => {
    setTerminalOutput(prev => prev + data);
  };

  const startTerminal = () => {
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    setTerminalOutput('');
    socketService.startTerminal({
      shell: settings.shell,
      cols: 80,
      rows: 24,
      recordSession: settings.recordSession
    });
  };

  const stopTerminal = () => {
    if (terminalId) {
      socketService.closeTerminal(terminalId);
      setSessionActive(false);
      setTerminalId(null);
    }
  };

  const clearTerminal = () => {
    setTerminalOutput('');
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (terminalId && currentInput.trim()) {
      socketService.sendTerminalInput(terminalId, currentInput + '\r');
      setCurrentInput('');
    }
  };

  const cleanup = () => {
    if (terminalId) {
      socketService.closeTerminal(terminalId);
    }
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applySettings = () => {
    setSettingsOpen(false);
  };

  // Convert terminal output to HTML with basic formatting
  const formatOutput = (output) => {
    return output
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line, index) => (
        <div key={index} style={{ minHeight: '1.2em' }}>
          {line || ' '}
        </div>
      ));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Toolbar>
          <TerminalIcon sx={{ mr: 2, color: '#00ff41' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: '#00ff41' }}>
            Interactive Web Terminal
          </Typography>

          {/* Connection Status */}
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
          />

          {/* Session Status */}
          {sessionActive && (
            <Chip
              label="Session Active"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ mr: 2 }}
            />
          )}

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!sessionActive ? (
              <IconButton
                onClick={startTerminal}
                disabled={!isConnected}
                sx={{ color: '#00ff41' }}
                title="Start Terminal"
              >
                <PlayIcon />
              </IconButton>
            ) : (
              <IconButton
                onClick={stopTerminal}
                sx={{ color: '#ff5555' }}
                title="Stop Terminal"
              >
                <StopIcon />
              </IconButton>
            )}

            <IconButton
              onClick={clearTerminal}
              title="Clear Terminal"
            >
              <ClearIcon />
            </IconButton>

            <IconButton
              onClick={() => setSettingsOpen(true)}
              title="Terminal Settings"
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Paper>

      {/* Terminal Container */}
      <Paper
        elevation={2}
        sx={{
          flexGrow: 1,
          bgcolor: '#0a0a0a',
          border: '1px solid #333',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Terminal Output */}
        <Box
          ref={outputRef}
          sx={{
            flexGrow: 1,
            p: 2,
            overflow: 'auto',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: `${settings.fontSize}px`,
            lineHeight: 1.4,
            color: '#ffffff',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {terminalOutput ? formatOutput(terminalOutput) : (
            <Box sx={{ color: '#666', fontStyle: 'italic' }}>
              Terminal output will appear here...
            </Box>
          )}
        </Box>

        {/* Command Input */}
        {sessionActive && (
          <Box
            component="form"
            onSubmit={handleInputSubmit}
            sx={{
              p: 2,
              borderTop: '1px solid #333',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Typography
              sx={{
                color: '#00ff41',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                mr: 1
              }}
            >
              $
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type commands here..."
              InputProps={{
                sx: {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: `${settings.fontSize}px`,
                  bgcolor: '#1a1a1a',
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#444',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00ff41',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00ff41',
                  }
                }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Welcome Message */}
      {!sessionActive && (
        <Paper
          elevation={1}
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'background.paper',
            border: '1px solid #333',
            textAlign: 'center'
          }}
        >
          <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
            Welcome to Pachacuti Web Terminal
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Click the play button to start a new terminal session. 
            All commands will be recorded and available for AI analysis.
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
            Note: This is a simplified terminal interface. For full xterm functionality, 
            install the xterm and xterm-addon packages.
          </Typography>
        </Paper>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Terminal Settings</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField
            fullWidth
            label="Shell"
            value={settings.shell}
            onChange={(e) => handleSettingsChange('shell', e.target.value)}
            margin="normal"
            helperText="Default shell to use (bash, zsh, sh, etc.)"
          />

          <TextField
            fullWidth
            label="Font Size"
            type="number"
            value={settings.fontSize}
            onChange={(e) => handleSettingsChange('fontSize', parseInt(e.target.value))}
            margin="normal"
            inputProps={{ min: 8, max: 24 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.cursorBlink}
                onChange={(e) => handleSettingsChange('cursorBlink', e.target.checked)}
              />
            }
            label="Cursor Blink"
            sx={{ mt: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.recordSession}
                onChange={(e) => handleSettingsChange('recordSession', e.target.checked)}
              />
            }
            label="Record Session"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={applySettings} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebTerminal;