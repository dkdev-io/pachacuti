/**
 * Session Timeline Component
 * Visualizes session commands in a timeline format
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Terminal as TerminalIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as TimeIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

import CommandBlock from './CommandBlock';

const SessionTimeline = ({ sessionId, commands = [], autoRefresh = false }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');

  const filteredCommands = useMemo(() => {
    let filtered = commands.filter(cmd => {
      const matchesText = !filter || 
        cmd.command.toLowerCase().includes(filter.toLowerCase()) ||
        (cmd.output && cmd.output.toLowerCase().includes(filter.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'success' && cmd.exit_code === 0) ||
        (statusFilter === 'error' && cmd.exit_code !== 0);

      return matchesText && matchesStatus;
    });

    // Sort commands
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'command':
          return a.command.localeCompare(b.command);
        default:
          return 0;
      }
    });

    return filtered;
  }, [commands, filter, statusFilter, sortBy]);

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getTimelineDotColor = (exitCode) => {
    return exitCode === 0 ? 'success' : 'error';
  };

  const getCommandCategory = (command) => {
    if (command.startsWith('git ')) return 'git';
    if (command.startsWith('npm ') || command.startsWith('yarn ')) return 'package';
    if (command.startsWith('docker ')) return 'docker';
    if (command.startsWith('python ') || command.startsWith('node ')) return 'runtime';
    if (command.includes('sudo ')) return 'system';
    return 'general';
  };

  const getCategoryColor = (category) => {
    const colors = {
      git: '#ff6b35',
      package: '#4ecdc4',
      docker: '#2196f3',
      runtime: '#9c27b0',
      system: '#ff9800',
      general: '#757575'
    };
    return colors[category] || colors.general;
  };

  if (!commands || commands.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <TerminalIcon sx={{ fontSize: 48, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No commands found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Commands will appear here as they are executed
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filters */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Filter commands..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="timestamp">Time</MenuItem>
              <MenuItem value="duration">Duration</MenuItem>
              <MenuItem value="command">Command</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="textSecondary">
            {filteredCommands.length} of {commands.length} commands
          </Typography>
        </Box>
      </Paper>

      {/* Timeline */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Timeline position="right" sx={{ p: 0 }}>
          {filteredCommands.map((command, index) => {
            const isExpanded = expandedItems.has(index);
            const category = getCommandCategory(command.command);
            const hasOutput = command.output && command.output.trim().length > 0;

            return (
              <TimelineItem key={command.id || index}>
                <TimelineOppositeContent sx={{ maxWidth: '200px', pr: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(command.timestamp)}
                  </Typography>
                  {command.duration && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      <TimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
                      {formatDuration(command.duration)}
                    </Typography>
                  )}
                  
                  <Chip
                    label={category}
                    size="small"
                    sx={{
                      mt: 1,
                      fontSize: '0.7rem',
                      height: 20,
                      bgcolor: getCategoryColor(category),
                      color: 'white'
                    }}
                  />
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot 
                    color={getTimelineDotColor(command.exit_code)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 40,
                      height: 40
                    }}
                  >
                    {command.exit_code === 0 ? (
                      <SuccessIcon fontSize="small" />
                    ) : (
                      <ErrorIcon fontSize="small" />
                    )}
                  </TimelineDot>
                  {index < filteredCommands.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent>
                  <Paper 
                    elevation={2}
                    sx={{ 
                      p: 2,
                      bgcolor: '#2a2a2a',
                      border: '1px solid #444',
                      mb: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ flexGrow: 1, color: '#00ff41' }}>
                        $ {command.command}
                      </Typography>
                      
                      {hasOutput && (
                        <IconButton 
                          size="small" 
                          onClick={() => toggleExpanded(index)}
                        >
                          {isExpanded ? 
                            <CollapseIcon fontSize="small" /> : 
                            <ExpandIcon fontSize="small" />
                          }
                        </IconButton>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={command.exit_code === 0 ? 'Success' : `Error (${command.exit_code})`}
                        size="small"
                        color={command.exit_code === 0 ? 'success' : 'error'}
                        variant="outlined"
                      />
                      
                      {command.working_directory && (
                        <Typography variant="caption" color="textSecondary">
                          {command.working_directory}
                        </Typography>
                      )}
                    </Box>

                    {hasOutput && (
                      <Collapse in={isExpanded}>
                        <CommandBlock
                          command={command.command}
                          output={command.output}
                          exitCode={command.exit_code}
                          duration={command.duration}
                          expanded={true}
                          showActions={false}
                        />
                      </Collapse>
                    )}
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </Box>
    </Box>
  );
};

export default SessionTimeline;