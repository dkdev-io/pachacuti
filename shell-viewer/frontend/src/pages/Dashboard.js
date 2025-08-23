import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent 
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

const Dashboard = ({ sessions }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#00ff41' }}>
        Shell Session Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TerminalIcon sx={{ color: '#00ff41', mr: 1 }} />
                <Typography variant="h6">Total Sessions</Typography>
              </Box>
              <Typography variant="h3">{sessions.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SearchIcon sx={{ color: '#00ff41', mr: 1 }} />
                <Typography variant="h6">AI Search</Typography>
              </Box>
              <Typography variant="body1">Ready</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ color: '#00ff41', mr: 1 }} />
                <Typography variant="h6">Latest Session</Typography>
              </Box>
              <Typography variant="body2">
                {sessions.length > 0 ? 
                  new Date(sessions[0].start_time).toLocaleString() : 
                  'No sessions yet'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;