/**
 * Command Replay Component
 * Interactive command replay with playback controls
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Replay as ReplayIcon
} from '@mui/icons-material';

import { socketService } from '../services/socketService';
import CommandBlock from './CommandBlock';

const CommandReplay = ({ commands = [], sessionId, onCommandSelect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [filterByExitCode, setFilterByExitCode] = useState('all');

  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  // Filter commands based on settings
  const filteredCommands = commands.filter(cmd => {
    if (filterByExitCode === 'success') return cmd.exit_code === 0;
    if (filterByExitCode === 'error') return cmd.exit_code !== 0;
    return true;
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const currentElement = containerRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentIndex, autoScroll]);

  const play = () => {
    if (filteredCommands.length === 0) return;

    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex >= filteredCommands.length) {
          pause();
          return prev;
        }
        setProgress((nextIndex / filteredCommands.length) * 100);
        return nextIndex;
      });
    }, 1000 / playbackSpeed);
  };

  const pause = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const stop = () => {
    pause();
    setCurrentIndex(0);
    setProgress(0);
  };

  const nextCommand = () => {
    if (currentIndex < filteredCommands.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setProgress((newIndex / filteredCommands.length) * 100);
    }
  };

  const prevCommand = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setProgress((newIndex / filteredCommands.length) * 100);
    }
  };

  const handleProgressChange = (event, newValue) => {
    const newIndex = Math.floor((newValue / 100) * filteredCommands.length);
    setCurrentIndex(Math.min(newIndex, filteredCommands.length - 1));
    setProgress(newValue);
  };

  const executeCommand = (command) => {
    if (socketService.isConnected()) {
      // Send command to terminal if connected
      socketService.sendTerminalInput(sessionId, command + '\r');
    }
    
    // Trigger callback for parent component
    if (onCommandSelect) {
      onCommandSelect(command);
    }
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '0s';
    const duration = new Date(end) - new Date(start);
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  const getCurrentCommand = () => {
    return filteredCommands[currentIndex];
  };

  if (filteredCommands.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ReplayIcon sx={{ fontSize: 48, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No commands to replay
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Commands will appear here when available
        </Typography>
      </Box>
    );
  }

  const currentCommand = getCurrentCommand();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Playback Controls */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ReplayIcon sx={{ mr: 2, color: '#00ff41' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Command Replay
          </Typography>
          
          <Chip
            label={`${currentIndex + 1} / ${filteredCommands.length}`}
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
          />

          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Box>

        {/* Progress Slider */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={progress}
            onChange={handleProgressChange}
            aria-label="Playback progress"
            sx={{
              color: '#00ff41',
              '& .MuiSlider-thumb': {
                backgroundColor: '#00ff41',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#00ff41',
              }
            }}
          />
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={prevCommand} disabled={currentIndex === 0}>
            <PrevIcon />
          </IconButton>

          {!isPlaying ? (
            <IconButton onClick={play} sx={{ color: '#00ff41' }}>
              <PlayIcon />
            </IconButton>
          ) : (
            <IconButton onClick={pause} sx={{ color: '#ffab00' }}>
              <PauseIcon />
            </IconButton>
          )}

          <IconButton onClick={stop} sx={{ color: '#f44336' }}>
            <StopIcon />
          </IconButton>

          <IconButton 
            onClick={nextCommand} 
            disabled={currentIndex === filteredCommands.length - 1}
          >
            <NextIcon />
          </IconButton>

          {/* Speed Control */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <SpeedIcon sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ mr: 1 }}>
              {playbackSpeed}x
            </Typography>
            <Slider
              value={playbackSpeed}
              onChange={(e, value) => setPlaybackSpeed(value)}
              min={0.25}
              max={4}
              step={0.25}
              sx={{ width: 100 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Command Display */}
      <Paper
        elevation={1}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: 'background.paper',
          border: '1px solid #333'
        }}
        ref={containerRef}
      >
        {/* Current Command Highlight */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#00ff41' }}>
            Current Command ({currentIndex + 1}/{filteredCommands.length})
          </Typography>

          {currentCommand && (
            <Box sx={{ mb: 3 }}>
              <CommandBlock
                command={currentCommand.command}
                output={showOutput ? currentCommand.output : null}
                exitCode={currentCommand.exit_code}
                duration={currentCommand.duration}
                timestamp={currentCommand.timestamp}
                workingDirectory={currentCommand.working_directory}
                expanded={showOutput}
                showActions={true}
              />

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => executeCommand(currentCommand.command)}
                  size="small"
                  sx={{ bgcolor: '#00ff41', color: 'black' }}
                >
                  Execute Command
                </Button>
                
                <Chip
                  label={`Duration: ${formatDuration(currentCommand.start_time, currentCommand.end_time)}`}
                  variant="outlined"
                  size="small"
                />
                
                <Chip
                  label={new Date(currentCommand.timestamp).toLocaleString()}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
          )}

          {/* All Commands List */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Command Timeline
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredCommands.map((command, index) => (
              <Box
                key={command.id || index}
                data-index={index}
                sx={{
                  p: 2,
                  border: index === currentIndex ? '2px solid #00ff41' : '1px solid #333',
                  borderRadius: 1,
                  bgcolor: index === currentIndex ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': {
                    border: '1px solid #00ff41'
                  }
                }}
                onClick={() => {
                  setCurrentIndex(index);
                  setProgress((index / filteredCommands.length) * 100);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#888', mr: 2 }}>
                    #{index + 1}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      color: index === currentIndex ? '#00ff41' : '#fff',
                      flexGrow: 1
                    }}
                  >
                    $ {command.command}
                  </Typography>
                  <Chip
                    label={command.exit_code === 0 ? 'Success' : 'Error'}
                    size="small"
                    color={command.exit_code === 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Box>
                
                <Typography variant="caption" color="textSecondary">
                  {new Date(command.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Replay Settings</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Filter by Exit Code</InputLabel>
            <Select
              value={filterByExitCode}
              onChange={(e) => setFilterByExitCode(e.target.value)}
              label="Filter by Exit Code"
            >
              <MenuItem value="all">All Commands</MenuItem>
              <MenuItem value="success">Successful Only</MenuItem>
              <MenuItem value="error">Failed Only</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showOutput}
                onChange={(e) => setShowOutput(e.target.checked)}
              />
            }
            label="Show Command Output"
            sx={{ mt: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
            }
            label="Auto Scroll to Current"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommandReplay;