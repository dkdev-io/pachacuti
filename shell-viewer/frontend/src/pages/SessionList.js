import React from 'react';
import { Box, Typography } from '@mui/material';

const SessionList = ({ sessions, onSessionSelect }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Session List</Typography>
      <Typography variant="body1">
        {sessions.length} sessions available
      </Typography>
    </Box>
  );
};

export default SessionList;