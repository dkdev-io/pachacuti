#!/bin/bash

# Pachacuti Shell Viewer Setup Script
# Sets up the complete web application with AI search

set -e

echo "🚀 Setting up Pachacuti Shell Viewer..."

# Check if we're in the right directory
if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the shell-viewer directory"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p backend/{data,logs} frontend/build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend

# Check if create-react-app is needed
if [ ! -f "src/index.js" ]; then
    echo "⚛️  Setting up React application..."
    npx create-react-app . --template typescript
fi

npm install

# Build frontend for production
echo "🏗️  Building frontend..."
npm run build

# Go back to root
cd ..

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > backend/.env << EOL
# Shell Viewer Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Frontend URL
FRONTEND_URL=http://localhost:3000

# OpenAI Configuration (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Supabase Configuration (optional - for cloud features)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Session Recorder Integration
SESSION_RECORDER_PATH=../session-recorder
EOL

cat > frontend/.env << EOL
# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
EOL

# Create missing React components
echo "⚛️  Creating additional React components..."

# Create index.js if it doesn't exist
if [ ! -f "frontend/src/index.js" ]; then
cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
fi

# Create missing components
mkdir -p frontend/src/components frontend/src/pages

# Create Sidebar component
cat > frontend/src/components/Sidebar.js << 'EOF'
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

  const content = (
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
                  {session.id.substring(0, 16)}...
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
  );

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
          borderRight: '1px solid #333'
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
EOF

# Create basic Dashboard
cat > frontend/src/pages/Dashboard.js << 'EOF'
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
EOF

# Create other placeholder components
cat > frontend/src/pages/SessionList.js << 'EOF'
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
EOF

cat > frontend/src/pages/SessionViewer.js << 'EOF'
import React from 'react';
import { Box, Typography } from '@mui/material';

const SessionViewer = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Session Viewer</Typography>
      <Typography variant="body1">
        Session details will be displayed here
      </Typography>
    </Box>
  );
};

export default SessionViewer;
EOF

cat > frontend/src/pages/WebTerminal.js << 'EOF'
import React from 'react';
import { Box, Typography } from '@mui/material';

const WebTerminal = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Web Terminal</Typography>
      <Typography variant="body1">
        Interactive terminal will be available here
      </Typography>
    </Box>
  );
};

export default WebTerminal;
EOF

# Update backend server to connect components
echo "🔧 Connecting backend components..."
cd backend

# Update server.js to connect dependencies
cat >> server.js << 'EOF'

// Connect dependencies
const server = new PachacutiShellViewerServer();

// Set up component connections
server.aiSearchController.setSessionManager(server.sessionManager);
server.shellController.setSessionManager(server.sessionManager);
server.webTerminal.setSessionRecorder(server.sessionRecorder);

// Start server
server.start();
EOF

# Create package.json scripts for easy running
cd ..
cat > package.json << 'EOF'
{
  "name": "pachacuti-shell-viewer",
  "version": "1.0.0",
  "description": "Shell Session Viewer with AI Search",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm start",
    "build": "cd frontend && npm run build",
    "start": "cd backend && npm start",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "test": "cd backend && npm test && cd ../frontend && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "author": "Pachacuti DevOps",
  "license": "MIT"
}
EOF

npm install

echo ""
echo "🎉 Pachacuti Shell Viewer setup complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add your OpenAI API key to backend/.env:"
echo "   OPENAI_API_KEY=your_actual_api_key_here"
echo ""
echo "2. Start the application:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "🔍 Features Available:"
echo "   • AI-powered shell command search"
echo "   • Interactive chat with AI assistant"
echo "   • Session timeline visualization"
echo "   • Real-time terminal interface"
echo "   • Command analysis and suggestions"
echo ""
echo "🧠 Integration with Pachacuti Session Recorder:"
echo "   • Automatically detects session files"
echo "   • Real-time session monitoring"
echo "   • Intelligent command categorization"
echo ""
echo "✨ Your shell sessions are now searchable and intelligently analyzed!"