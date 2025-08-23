/**
 * Session Viewer Page
 * Detailed view of a specific shell session with timeline
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Schedule as TimeIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Person as UserIcon,
  Folder as FolderIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

import { sessionService } from '../services/sessionService';
import SessionTimeline from '../components/SessionTimeline';
import CommandBlock from '../components/CommandBlock';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`session-tabpanel-${index}`}
      aria-labelledby={`session-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SessionViewer = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [commands, setCommands] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (id) {
      loadSessionData();
    }
  }, [id]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionData, commandsData, timelineData] = await Promise.all([
        sessionService.getSession(id),
        sessionService.getSessionCommands(id),
        sessionService.getSessionTimeline(id).catch(() => [])
      ]);

      setSession(sessionData);
      setCommands(commandsData);
      setTimeline(timelineData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading session data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExport = async (format) => {
    try {
      await sessionService.exportSession(id, format);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'Unknown';
    const duration = new Date(end) - new Date(start);
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  const getSuccessRate = (commands) => {
    if (!commands.length) return 0;
    const successful = commands.filter(cmd => cmd.exit_code === 0).length;
    return Math.round((successful / commands.length) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading session...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading session: {error}
        </Alert>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Session not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {/* Session Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TerminalIcon sx={{ mr: 2, color: '#00ff41', fontSize: 32 }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#00ff41' }}>
                Session Details
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                {session.id.substring(0, 16)}...
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('json')}
              variant="outlined"
              size="small"
            >
              Export JSON
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              variant="outlined"
              size="small"
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Session Stats */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimeIcon sx={{ mr: 1, color: '#00ff41' }} />
                  <Typography variant="h6">Duration</Typography>
                </Box>
                <Typography variant="h4">
                  {formatDuration(session.start_time, session.end_time)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TerminalIcon sx={{ mr: 1, color: '#00ff41' }} />
                  <Typography variant="h6">Commands</Typography>
                </Box>
                <Typography variant="h4">
                  {commands.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SuccessIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h6">Success Rate</Typography>
                </Box>
                <Typography variant="h4">
                  {getSuccessRate(commands)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <UserIcon sx={{ mr: 1, color: '#00ff41' }} />
                  <Typography variant="h6">User</Typography>
                </Box>
                <Typography variant="body1">
                  {session.user_name || 'Unknown'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Session Metadata */}
        <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Chip
            icon={<TimeIcon />}
            label={`Started: ${new Date(session.start_time).toLocaleString()}`}
            variant="outlined"
          />
          {session.end_time && (
            <Chip
              icon={<TimeIcon />}
              label={`Ended: ${new Date(session.end_time).toLocaleString()}`}
              variant="outlined"
            />
          )}
          {session.working_directory && (
            <Chip
              icon={<FolderIcon />}
              label={session.working_directory}
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Session Content Tabs */}
      <Paper elevation={1} sx={{ flexGrow: 1, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="session tabs"
            sx={{
              '& .MuiTab-root': {
                color: '#ccc'
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#00ff41'
              }
            }}
          >
            <Tab label="Timeline View" />
            <Tab label="Command List" />
            <Tab label="Session Info" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <SessionTimeline
            sessionId={id}
            commands={commands}
            autoRefresh={false}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 2 }}>
            {commands.length === 0 ? (
              <Typography color="textSecondary">
                No commands found in this session
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {commands.map((command, index) => (
                  <CommandBlock
                    key={command.id || index}
                    command={command.command}
                    output={command.output}
                    exitCode={command.exit_code}
                    duration={command.duration}
                    timestamp={command.timestamp}
                    workingDirectory={command.working_directory}
                    expanded={false}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Session Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Session ID
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                  {session.id}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary">
                  Start Time
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {new Date(session.start_time).toLocaleString()}
                </Typography>

                {session.end_time && (
                  <>
                    <Typography variant="subtitle2" color="textSecondary">
                      End Time
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(session.end_time).toLocaleString()}
                    </Typography>
                  </>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  User
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {session.user_name || 'Unknown'}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary">
                  Working Directory
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                  {session.working_directory || 'Unknown'}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary">
                  Total Commands
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {session.command_count || commands.length}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SessionViewer;