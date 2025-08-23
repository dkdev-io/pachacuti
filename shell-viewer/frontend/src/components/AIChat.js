/**
 * AI Chat Component
 * Interactive chat interface for asking questions about shell sessions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AIIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

import { searchService } from '../services/searchService';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your AI assistant for shell session analysis. Ask me anything about your command history, like:\n\n• \"Show me all git commands that failed\"\n• \"What npm packages did I install last week?\"\n• \"Why did my docker build fail?\"\n• \"What's the most common error I encounter?\""
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await searchService.askQuestion({
        question: userMessage.content,
        context: {
          previousMessages: messages.slice(-5) // Send last 5 messages for context
        }
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer,
        timestamp: new Date().toISOString(),
        context: response.context
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err.message);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.",
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: "Chat cleared! How can I help you with your shell sessions?"
      }
    ]);
    setError(null);
  };

  const formatMessage = (content) => {
    // Simple formatting for code blocks and lists
    return content.split('\n').map((line, index) => (
      <Typography 
        key={index}
        component="div"
        variant="body2"
        sx={{ 
          mb: line.trim() === '' ? 1 : 0,
          fontFamily: line.startsWith('•') || line.includes('$') ? 
            'Monaco, Menlo, "Ubuntu Mono", monospace' : 'inherit',
          color: line.includes('$') ? '#00ff41' : 'inherit'
        }}
      >
        {line || ' '}
      </Typography>
    ));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <ClearIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Messages Container */}
      <Paper
        elevation={1}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: 'background.paper',
          border: '1px solid #333',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Chat Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AIIcon sx={{ mr: 1, color: '#00ff41' }} />
            <Typography variant="h6">AI Assistant</Typography>
          </Box>
          <IconButton onClick={clearChat} size="small">
            <ClearIcon />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                mb: 3,
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {message.type === 'ai' && (
                <Avatar
                  sx={{
                    bgcolor: message.isError ? '#f44336' : '#00ff41',
                    color: 'black',
                    mr: 1,
                    mt: 0.5,
                    width: 32,
                    height: 32
                  }}
                >
                  <AIIcon sx={{ fontSize: 16 }} />
                </Avatar>
              )}

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  bgcolor: message.type === 'user' ? '#00ff41' : '#2a2a2a',
                  color: message.type === 'user' ? 'black' : 'white',
                  border: message.type === 'ai' ? '1px solid #444' : 'none'
                }}
              >
                {formatMessage(message.content)}
                
                {message.timestamp && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 1,
                      color: message.type === 'user' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
              </Paper>

              {message.type === 'user' && (
                <Avatar
                  sx={{
                    bgcolor: '#666',
                    ml: 1,
                    mt: 0.5,
                    width: 32,
                    height: 32
                  }}
                >
                  <PersonIcon sx={{ fontSize: 16 }} />
                </Avatar>
              )}
            </Box>
          ))}

          {loading && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 3
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#00ff41',
                  color: 'black',
                  mr: 1,
                  width: 32,
                  height: 32
                }}
              >
                <AIIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#2a2a2a',
                  border: '1px solid #444',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Thinking...
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </Paper>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: 1
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask me anything about your shell sessions..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
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
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || loading}
          sx={{
            bgcolor: '#00ff41',
            color: 'black',
            '&:hover': {
              bgcolor: '#00cc33',
            },
            '&:disabled': {
              bgcolor: '#333',
              color: '#666'
            }
          }}
        >
          {loading ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default AIChat;