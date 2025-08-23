/**
 * AI Search Page
 * AI-powered search interface for shell sessions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
  Terminal as TerminalIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';

import { searchService } from '../services/searchService';
import { socketService } from '../services/socketService';
import CommandBlock from '../components/CommandBlock';
import AIChat from '../components/AIChat';

const AISearch = ({ sessions }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [chatMode, setChatMode] = useState(false);

  const searchInputRef = useRef();

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await searchService.search({
        query: searchQuery,
        filters: selectedFilters
      });

      setSearchResults(results);
      setSuggestions(results.suggestions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const copyCommand = (command) => {
    navigator.clipboard.writeText(command);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (exitCode) => {
    return exitCode === 0 ? 
      <SuccessIcon sx={{ color: '#4caf50', fontSize: 16 }} /> : 
      <ErrorIcon sx={{ color: '#f44336', fontSize: 16 }} />;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {/* Search Header */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: 'background.paper',
          border: '1px solid #333'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1, color: '#00ff41' }} />
          <Typography variant="h5">
            AI-Powered Shell Search
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            ref={searchInputRef}
            fullWidth
            variant="outlined"
            placeholder="Ask me anything about your shell commands... (e.g., 'Show me git commands that failed')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              sx: {
                bgcolor: '#2a2a2a',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#444',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00ff41',
                },
              }
            }}
          />
          
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
            sx={{
              bgcolor: '#00ff41',
              color: 'black',
              '&:hover': {
                bgcolor: '#00cc33',
              },
              minWidth: 120
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setChatMode(!chatMode)}
            sx={{ 
              borderColor: '#00ff41',
              color: '#00ff41'
            }}
          >
            {chatMode ? 'Search Mode' : 'Chat Mode'}
          </Button>
        </Box>

        {/* Search Suggestions */}
        {suggestions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Suggestions:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: '#666',
                    '&:hover': {
                      borderColor: '#00ff41',
                      bgcolor: 'rgba(0, 255, 65, 0.1)'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Chat Mode */}
      {chatMode && (
        <AIChat />
      )}

      {/* Search Results */}
      {!chatMode && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {searchResults && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 3,
                bgcolor: 'background.paper',
                border: '1px solid #333'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Badge badgeContent={searchResults.totalResults} color="primary" sx={{ mr: 2 }}>
                  <SearchIcon />
                </Badge>
                Search Results for "{searchResults.query}"
              </Typography>

              {searchResults.results.length === 0 ? (
                <Typography color="textSecondary">
                  No results found. Try adjusting your search query.
                </Typography>
              ) : (
                <Box>
                  {searchResults.results.map((result, index) => (
                    <Card 
                      key={result.id || index}
                      sx={{ 
                        mb: 2,
                        bgcolor: '#2a2a2a',
                        border: '1px solid #444',
                        '&:hover': {
                          border: '1px solid #00ff41'
                        }
                      }}
                    >
                      <CardContent>
                        {/* Command Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                            {getStatusIcon(result.exit_code)}
                            <Typography 
                              variant="subtitle2" 
                              sx={{ ml: 1, color: '#00ff41' }}
                            >
                              Command {index + 1}
                            </Typography>
                            <Chip
                              label={`Score: ${Math.round(result.relevanceScore)}`}
                              size="small"
                              sx={{ ml: 2, bgcolor: '#444' }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              {formatTimestamp(result.timestamp)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Command Block */}
                        <CommandBlock
                          command={result.command}
                          output={result.output}
                          exitCode={result.exit_code}
                          duration={result.duration}
                        />

                        {/* AI Insights */}
                        {result.aiInsights && (
                          <Box sx={{ mt: 2 }}>
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <AIIcon sx={{ mr: 1, color: '#00ff41' }} />
                                  <Typography variant="subtitle2">AI Analysis</Typography>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Typography variant="body2" color="textSecondary">
                                  {result.aiInsights}
                                </Typography>
                              </AccordionDetails>
                            </Accordion>
                          </Box>
                        )}

                        {/* Context Info */}
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #444' }}>
                          <Typography variant="caption" color="textSecondary">
                            Session: {result.session_id?.substring(0, 8)}... | 
                            Directory: {result.working_directory || 'Unknown'} | 
                            User: {result.user_name || 'Unknown'}
                          </Typography>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Tooltip title="Copy Command">
                            <IconButton 
                              size="small" 
                              onClick={() => copyCommand(result.command)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Run in Terminal">
                            <IconButton size="small">
                              <PlayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* Quick Search Examples */}
          {!searchResults && !loading && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 3,
                bgcolor: 'background.paper',
                border: '1px solid #333'
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>
                Try These Searches:
              </Typography>
              
              <List>
                {[
                  'git commands that failed',
                  'npm install errors',
                  'docker commands from last week',
                  'long running commands',
                  'commands with sudo',
                  'python scripts that ran successfully'
                ].map((example, index) => (
                  <ListItem 
                    key={index}
                    button
                    onClick={() => handleSuggestionClick(example)}
                    sx={{ 
                      border: '1px solid transparent',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        border: '1px solid #00ff41',
                        bgcolor: 'rgba(0, 255, 65, 0.1)'
                      }
                    }}
                  >
                    <SearchIcon sx={{ mr: 2, color: '#666' }} />
                    <ListItemText 
                      primary={example}
                      primaryTypographyProps={{
                        color: '#00ff41'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AISearch;