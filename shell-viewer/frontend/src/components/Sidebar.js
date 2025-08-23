import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const Sidebar = ({ open, onClose, sessions, onSessionSelect, currentSession, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid #333',
          width: 300,
          mt: 8
        },
      }}
    >
      <Box sx={{ width: 300, mt: 8 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
          <Typography variant="h6" sx={{ color: '#00ff41' }}>
            Shell Sessions
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">Loading sessions...</Typography>
            </Box>
          )}
        </Box>
        
        <List>
          {sessions.map((session) => (
            <ListItem
              key={session.id}
              button
              onClick={() => onSessionSelect(session)}
              selected={currentSession?.id === session.id}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'rgba(0, 255, 65, 0.1)',
                  borderRight: '3px solid #00ff41'
                },
                '&:hover': {
                  bgcolor: 'rgba(0, 255, 65, 0.05)'
                }
              }}
            >
              <ListItemIcon>
                <TerminalIcon sx={{ color: '#00ff41' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" noWrap>
                    {session.id?.substring(0, 16)}...
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      <ScheduleIcon sx={{ fontSize: 12, mr: 0.5 }} />
                      {formatDate(session.start_time)}
                    </Typography>
                    <Chip
                      label={`${session.command_count || 0} commands`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5, fontSize: '0.7rem', height: 18 }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;