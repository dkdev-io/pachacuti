import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  FolderOpen as RepoIcon,
  People as AgentsIcon,
  Schedule as TimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Mock data for projects - in real implementation, this would come from an API
const mockProjects = [
  {
    id: 1,
    repoName: 'pachacuti',
    dateLastAccessed: '2025-08-24',
    activeAgents: 3,
    status: 'in_progress',
    description: 'Main orchestration system'
  },
  {
    id: 2,
    repoName: 'claude-flow',
    dateLastAccessed: '2025-08-23',
    activeAgents: 2,
    status: 'in_progress',
    description: 'Agent coordination framework'
  },
  {
    id: 3,
    repoName: 'shell-viewer',
    dateLastAccessed: '2025-08-22',
    activeAgents: 1,
    status: 'in_progress',
    description: 'Terminal session visualization'
  },
  {
    id: 4,
    repoName: 'session-recorder',
    dateLastAccessed: '2025-08-21',
    activeAgents: 0,
    status: 'held',
    description: 'Session capture and analysis'
  },
  {
    id: 5,
    repoName: 'daily-briefing',
    dateLastAccessed: '2025-08-20',
    activeAgents: 1,
    status: 'finished',
    description: 'Automated reporting system'
  },
  {
    id: 6,
    repoName: 'approval-system',
    dateLastAccessed: '2025-08-19',
    activeAgents: 0,
    status: 'finished',
    description: 'Command approval workflow'
  },
  {
    id: 7,
    repoName: 'task-manager',
    dateLastAccessed: '2025-08-18',
    activeAgents: 2,
    status: 'in_progress',
    description: 'Multi-agent task coordination'
  }
];

const ProjectManagement = () => {
  const [projects, setProjects] = useState(mockProjects);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'finished':
        return '#4caf50'; // Green
      case 'in_progress':
        return '#ff9800'; // Orange
      case 'held':
        return '#f44336'; // Red
      default:
        return '#757575'; // Grey
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'finished':
        return 'Finished';
      case 'in_progress':
        return 'In Progress';
      case 'held':
        return 'On Hold';
      default:
        return 'Unknown';
    }
  };

  const handleStatusChange = (projectId, newStatus) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, status: newStatus }
          : project
      )
    );
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h4" sx={{ color: '#00ff41' }}>
          Project Management Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton 
            onClick={handleRefresh}
            disabled={loading}
            sx={{ color: '#00ff41' }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ 
        bgcolor: 'background.paper', 
        border: '1px solid #333',
        overflow: 'hidden'
      }}>
        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  bgcolor: '#1e1e1e', 
                  color: '#00ff41',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #00ff41'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <RepoIcon sx={{ mr: 1, fontSize: 20 }} />
                    Repository Name
                  </Box>
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#1e1e1e', 
                  color: '#00ff41',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #00ff41'
                }}>
                  Description
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#1e1e1e', 
                  color: '#00ff41',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #00ff41'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimeIcon sx={{ mr: 1, fontSize: 20 }} />
                    Last Accessed
                  </Box>
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#1e1e1e', 
                  color: '#00ff41',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #00ff41'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AgentsIcon sx={{ mr: 1, fontSize: 20 }} />
                    Active Agents
                  </Box>
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#1e1e1e', 
                  color: '#00ff41',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #00ff41'
                }}>
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => (
                <TableRow 
                  key={project.id}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(0, 255, 65, 0.05)' 
                    },
                    '&:nth-of-type(odd)': {
                      bgcolor: 'rgba(255, 255, 255, 0.02)'
                    }
                  }}
                >
                  <TableCell sx={{ 
                    color: '#ffffff',
                    fontFamily: 'Monaco, monospace',
                    fontSize: '14px',
                    borderBottom: '1px solid #333'
                  }}>
                    {project.repoName}
                  </TableCell>
                  <TableCell sx={{ 
                    color: '#b0b0b0',
                    borderBottom: '1px solid #333'
                  }}>
                    {project.description}
                  </TableCell>
                  <TableCell sx={{ 
                    color: '#ffffff',
                    borderBottom: '1px solid #333'
                  }}>
                    {formatDate(project.dateLastAccessed)}
                  </TableCell>
                  <TableCell sx={{ 
                    borderBottom: '1px solid #333'
                  }}>
                    <Chip
                      label={project.activeAgents}
                      size="small"
                      sx={{
                        bgcolor: project.activeAgents > 0 ? '#00ff41' : '#757575',
                        color: project.activeAgents > 0 ? '#000000' : '#ffffff',
                        fontWeight: 'bold',
                        minWidth: '40px'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ 
                    borderBottom: '1px solid #333'
                  }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={project.status}
                        onChange={(e) => handleStatusChange(project.id, e.target.value)}
                        sx={{
                          color: getStatusColor(project.status),
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(project.status)
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(project.status)
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(project.status)
                          },
                          '& .MuiSvgIcon-root': {
                            color: getStatusColor(project.status)
                          }
                        }}
                      >
                        <MenuItem value="finished" sx={{ color: '#4caf50' }}>
                          Finished
                        </MenuItem>
                        <MenuItem value="in_progress" sx={{ color: '#ff9800' }}>
                          In Progress
                        </MenuItem>
                        <MenuItem value="held" sx={{ color: '#f44336' }}>
                          On Hold
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary Statistics */}
      <Box sx={{ 
        mt: 3, 
        display: 'flex', 
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Paper sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#4caf50' }}>
            {projects.filter(p => p.status === 'finished').length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            Finished
          </Typography>
        </Paper>
        
        <Paper sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#ff9800' }}>
            {projects.filter(p => p.status === 'in_progress').length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            In Progress
          </Typography>
        </Paper>
        
        <Paper sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#f44336' }}>
            {projects.filter(p => p.status === 'held').length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            On Hold
          </Typography>
        </Paper>
        
        <Paper sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          border: '1px solid #333',
          minWidth: '150px',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#00ff41' }}>
            {projects.reduce((sum, p) => sum + p.activeAgents, 0)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            Total Agents
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default ProjectManagement;