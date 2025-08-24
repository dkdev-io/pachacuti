/**
 * Header Component
 * Main application header with navigation and session info
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Terminal as TerminalIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = ({ onMenuClick, currentSession }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/sessions':
        return 'Sessions';
      case '/search':
        return 'AI Search';
      case '/terminal':
        return 'Web Terminal';
      case '/stats':
        return 'Session Stats';
      default:
        if (location.pathname.startsWith('/sessions/')) {
          return 'Session Viewer';
        }
        return 'Pachacuti Shell Viewer';
    }
  };

  const openDailyReport = () => {
    const dailyReportPath = `file:///Users/Danallovertheplace/pachacuti/devops/daily-report.html`;
    window.open(dailyReportPath, '_blank');
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: '#1a1a1a',
        borderBottom: '1px solid #333'
      }}
    >
      <Toolbar>
        {/* Menu Button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo and Title */}
        <TerminalIcon sx={{ mr: 1, color: '#00ff41' }} />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>

        {/* Current Session Info */}
        {currentSession && (
          <Box sx={{ mr: 2 }}>
            <Chip
              label={`Session: ${currentSession.id.substring(0, 8)}...`}
              size="small"
              variant="outlined"
              sx={{ 
                color: '#00ff41',
                borderColor: '#00ff41'
              }}
            />
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Dashboard">
            <IconButton
              color="inherit"
              onClick={() => navigate('/dashboard')}
              sx={{ 
                color: location.pathname === '/dashboard' ? '#00ff41' : 'inherit'
              }}
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="AI Search">
            <IconButton
              color="inherit"
              onClick={() => navigate('/search')}
              sx={{ 
                color: location.pathname === '/search' ? '#00ff41' : 'inherit'
              }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Web Terminal">
            <IconButton
              color="inherit"
              onClick={() => navigate('/terminal')}
              sx={{ 
                color: location.pathname === '/terminal' ? '#00ff41' : 'inherit'
              }}
            >
              <TerminalIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Session Stats">
            <IconButton
              color="inherit"
              onClick={() => navigate('/stats')}
              sx={{ 
                color: location.pathname === '/stats' ? '#00ff41' : 'inherit'
              }}
            >
              <AssessmentIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Daily Report">
            <IconButton
              color="inherit"
              onClick={openDailyReport}
              sx={{ 
                color: '#00ff41',
                '&:hover': {
                  color: '#00ff41'
                }
              }}
            >
              <LaunchIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;