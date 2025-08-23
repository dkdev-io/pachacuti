/**
 * Command Block Component
 * Displays shell commands with syntax highlighting and actions
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Collapse,
  Chip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  PlayArrow as PlayIcon,
  Schedule as TimeIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const CommandBlock = ({ 
  command, 
  output, 
  exitCode = 0, 
  duration = 0,
  timestamp,
  workingDirectory,
  showActions = true,
  expanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const isSuccessful = exitCode === 0;
  const hasOutput = output && output.trim().length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Command Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          bgcolor: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          {isSuccessful ? (
            <SuccessIcon sx={{ color: '#4caf50', fontSize: 16 }} />
          ) : (
            <ErrorIcon sx={{ color: '#f44336', fontSize: 16 }} />
          )}
          
          <Typography variant="caption" sx={{ color: '#00ff41' }}>
            $
          </Typography>
          
          {duration > 0 && (
            <Chip
              icon={<TimeIcon />}
              label={formatDuration(duration)}
              size="small"
              variant="outlined"
              sx={{ 
                fontSize: '0.75rem',
                height: 20,
                borderColor: '#666',
                color: '#ccc'
              }}
            />
          )}

          <Chip
            label={`Exit: ${exitCode}`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 20,
              borderColor: isSuccessful ? '#4caf50' : '#f44336',
              color: isSuccessful ? '#4caf50' : '#f44336'
            }}
          />
        </Box>

        {showActions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Copy Command">
              <IconButton size="small" onClick={handleCopy}>
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {hasOutput && (
              <Tooltip title={isExpanded ? "Collapse Output" : "Show Output"}>
                <IconButton 
                  size="small" 
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 
                    <CollapseIcon sx={{ fontSize: 16 }} /> : 
                    <ExpandIcon sx={{ fontSize: 16 }} />
                  }
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* Command Text */}
      <Box sx={{ p: 2, bgcolor: '#1e1e1e' }}>
        <Typography
          component="pre"
          sx={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '0.875rem',
            color: '#fff',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.4
          }}
        >
          {command}
        </Typography>
      </Box>

      {/* Command Output */}
      {hasOutput && (
        <Collapse in={isExpanded}>
          <Box
            sx={{
              borderTop: '1px solid #333',
              bgcolor: '#0a0a0a',
              maxHeight: 400,
              overflow: 'auto'
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: '#888', mb: 1, display: 'block' }}
              >
                Output:
              </Typography>
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '0.8rem',
                  color: isSuccessful ? '#ccc' : '#ffcdd2',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.3
                }}
              >
                {output}
              </Typography>
            </Box>
          </Box>
        </Collapse>
      )}

      {/* Context Info */}
      {(timestamp || workingDirectory) && (
        <Box
          sx={{
            p: 1,
            bgcolor: '#2a2a2a',
            borderTop: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="caption" color="textSecondary">
            {workingDirectory && `Directory: ${workingDirectory}`}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {timestamp && new Date(timestamp).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CommandBlock;