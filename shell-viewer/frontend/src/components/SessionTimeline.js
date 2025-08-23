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
  InputLabel,
  Card,
  CardContent,
  List,
  ListItem,
  Divider
} from '@mui/material';
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

      {/* Timeline List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ p: 0 }}>
          {filteredCommands.map((command, index) => {
            const isExpanded = expandedItems.has(index);
            const category = getCommandCategory(command.command);
            const hasOutput = command.output && command.output.trim().length > 0;

            return (
              <React.Fragment key={command.id || index}>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch', p: 0 }}>
                  <Card
                    sx={{
                      mb: 2,
                      mx: 2,
                      bgcolor: '#2a2a2a',
                      border: '1px solid #444',
                      '&:hover': {
                        border: '1px solid #00ff41'
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                          {command.exit_code === 0 ? (
                            <SuccessIcon sx={{ color: '#4caf50', mr: 1 }} />
                          ) : (
                            <ErrorIcon sx={{ color: '#f44336', mr: 1 }} />
                          )}
                          
                          <Typography variant="caption" sx={{ color: '#666', mr: 2 }}>
                            {formatTime(command.timestamp)}
                          </Typography>
                          
                          {command.duration && (
                            <Chip
                              icon={<TimeIcon />}
                              label={formatDuration(command.duration)}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          )}
                          
                          <Chip
                            label={category}
                            size="small"
                            sx={{
                              bgcolor: getCategoryColor(category),
                              color: 'white'
                            }}
                          />
                        </Box>
                        
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

                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          color: '#00ff41'
                        }}
                      >
                        $ {command.command}
                      </Typography>

                      {hasOutput && (
                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 2 }}>
                            <CommandBlock
                              command={command.command}
                              output={command.output}
                              exitCode={command.exit_code}
                              duration={command.duration}
                              expanded={true}
                              showActions={false}
                            />
                          </Box>
                        </Collapse>
                      )}

                      {command.working_directory && (
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                          {command.working_directory}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default SessionTimeline;