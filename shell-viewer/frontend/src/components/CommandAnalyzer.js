/**
 * Command Analyzer Component
 * AI-powered command analysis and suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Lightbulb as SuggestionIcon,
  BugReport as IssueIcon,
  CheckCircle as BestPracticeIcon,
  Timeline as PatternIcon
} from '@mui/icons-material';

import { searchService } from '../services/searchService';

const CommandAnalyzer = ({ commands = [], sessionId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (commands.length > 0) {
      analyzeCommands();
    }
  }, [commands]);

  const analyzeCommands = async () => {
    setLoading(true);
    setError(null);

    try {
      // Analyze command patterns
      const commandPatterns = analyzeCommandPatterns();
      setPatterns(commandPatterns);

      // Identify potential issues
      const commandIssues = identifyIssues();
      setIssues(commandIssues);

      // Generate AI suggestions for improvement
      const aiSuggestions = await generateAISuggestions();
      setSuggestions(aiSuggestions);

      // Overall analysis
      const overallAnalysis = generateOverallAnalysis(commandPatterns, commandIssues);
      setAnalysis(overallAnalysis);

    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCommandPatterns = () => {
    const patterns = [];
    const commandFrequency = {};
    const errorCommands = [];
    const longRunningCommands = [];
    const toolUsage = {};

    commands.forEach(cmd => {
      // Command frequency
      const baseCommand = cmd.command.split(' ')[0];
      commandFrequency[baseCommand] = (commandFrequency[baseCommand] || 0) + 1;

      // Error tracking
      if (cmd.exit_code !== 0) {
        errorCommands.push(cmd);
      }

      // Long running commands (>30s)
      if (cmd.duration && cmd.duration > 30000) {
        longRunningCommands.push(cmd);
      }

      // Tool usage patterns
      if (baseCommand === 'git') {
        const action = cmd.command.split(' ')[1];
        toolUsage.git = toolUsage.git || {};
        toolUsage.git[action] = (toolUsage.git[action] || 0) + 1;
      }
      if (baseCommand === 'npm' || baseCommand === 'yarn') {
        toolUsage.package_manager = (toolUsage.package_manager || 0) + 1;
      }
      if (baseCommand === 'docker') {
        toolUsage.docker = (toolUsage.docker || 0) + 1;
      }
    });

    // Most used commands
    const topCommands = Object.entries(commandFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    patterns.push({
      type: 'frequency',
      title: 'Most Used Commands',
      data: topCommands,
      icon: <TrendingUpIcon />
    });

    // Error analysis
    if (errorCommands.length > 0) {
      patterns.push({
        type: 'errors',
        title: 'Failed Commands',
        data: errorCommands.slice(0, 5),
        icon: <IssueIcon />
      });
    }

    // Performance insights
    if (longRunningCommands.length > 0) {
      patterns.push({
        type: 'performance',
        title: 'Long Running Commands',
        data: longRunningCommands.slice(0, 5),
        icon: <PerformanceIcon />
      });
    }

    // Tool usage
    if (Object.keys(toolUsage).length > 0) {
      patterns.push({
        type: 'tools',
        title: 'Development Tools Usage',
        data: toolUsage,
        icon: <PatternIcon />
      });
    }

    return patterns;
  };

  const identifyIssues = () => {
    const issues = [];

    // Check for security issues
    const securityRisks = commands.filter(cmd => 
      cmd.command.includes('sudo rm -rf') ||
      cmd.command.includes('chmod 777') ||
      cmd.command.includes('wget http://') ||
      cmd.command.includes('curl http://')
    );

    if (securityRisks.length > 0) {
      issues.push({
        type: 'security',
        severity: 'high',
        title: 'Security Risks Detected',
        description: 'Commands with potential security implications found',
        commands: securityRisks,
        icon: <SecurityIcon color="error" />
      });
    }

    // Check for repeated failed commands
    const failedCommands = commands.filter(cmd => cmd.exit_code !== 0);
    const repeatedFails = {};
    
    failedCommands.forEach(cmd => {
      const baseCmd = cmd.command.split(' ').slice(0, 2).join(' ');
      repeatedFails[baseCmd] = (repeatedFails[baseCmd] || 0) + 1;
    });

    const frequentFails = Object.entries(repeatedFails)
      .filter(([, count]) => count >= 3);

    if (frequentFails.length > 0) {
      issues.push({
        type: 'repeated_failures',
        severity: 'medium',
        title: 'Repeated Command Failures',
        description: 'Some commands are failing multiple times',
        data: frequentFails,
        icon: <WarningIcon color="warning" />
      });
    }

    // Check for inefficient patterns
    const inefficientPatterns = [];
    
    // Multiple cd commands in sequence
    for (let i = 0; i < commands.length - 1; i++) {
      if (commands[i].command.startsWith('cd ') && 
          commands[i + 1].command.startsWith('cd ')) {
        inefficientPatterns.push({
          description: 'Multiple consecutive directory changes',
          commands: [commands[i], commands[i + 1]]
        });
      }
    }

    if (inefficientPatterns.length > 0) {
      issues.push({
        type: 'inefficiency',
        severity: 'low',
        title: 'Inefficient Command Patterns',
        description: 'Patterns that could be optimized',
        data: inefficientPatterns,
        icon: <PerformanceIcon color="info" />
      });
    }

    return issues;
  };

  const generateAISuggestions = async () => {
    try {
      const recentCommands = commands.slice(-10);
      const context = {
        commandCount: commands.length,
        errorRate: commands.filter(c => c.exit_code !== 0).length / commands.length,
        patterns: patterns,
        sessionId
      };

      const response = await searchService.analyzeCommand({
        command: recentCommands.map(c => c.command).join('; '),
        output: recentCommands.map(c => c.output).join('\n'),
        context
      });

      return [
        {
          type: 'workflow',
          title: 'Workflow Optimization',
          suggestion: response.workflowSuggestions || 'Consider using command aliases for frequently used commands',
          icon: <SuggestionIcon />
        },
        {
          type: 'best_practices',
          title: 'Best Practices',
          suggestion: response.bestPractices || 'Add error checking and use version control for important changes',
          icon: <BestPracticeIcon />
        },
        {
          type: 'automation',
          title: 'Automation Opportunities',
          suggestion: response.automationSuggestions || 'Consider creating scripts for repeated command sequences',
          icon: <AIIcon />
        }
      ];

    } catch (error) {
      console.error('AI suggestions error:', error);
      return [];
    }
  };

  const generateOverallAnalysis = (patterns, issues) => {
    const totalCommands = commands.length;
    const successfulCommands = commands.filter(c => c.exit_code === 0).length;
    const errorRate = ((totalCommands - successfulCommands) / totalCommands) * 100;
    
    const avgDuration = commands.reduce((sum, cmd) => 
      sum + (cmd.duration || 0), 0) / commands.length;

    let productivity = 'High';
    if (errorRate > 20) productivity = 'Low';
    else if (errorRate > 10) productivity = 'Medium';

    let efficiency = 'Good';
    if (avgDuration > 10000) efficiency = 'Could be improved';
    if (avgDuration > 30000) efficiency = 'Needs attention';

    return {
      totalCommands,
      successfulCommands,
      errorRate: errorRate.toFixed(1),
      avgDuration: Math.round(avgDuration),
      productivity,
      efficiency,
      riskLevel: issues.some(i => i.severity === 'high') ? 'High' : 
                 issues.some(i => i.severity === 'medium') ? 'Medium' : 'Low'
    };
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Analyzing commands...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Analysis failed: {error}
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <AIIcon sx={{ fontSize: 48, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No analysis available
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Execute commands to generate analysis
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Overall Analysis */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 2, color: '#00ff41' }} />
          <Typography variant="h5">Command Analysis</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`${analysis.totalCommands} Total Commands`} variant="outlined" />
          <Chip 
            label={`${analysis.errorRate}% Error Rate`} 
            color={analysis.errorRate < 10 ? 'success' : analysis.errorRate < 20 ? 'warning' : 'error'}
            variant="outlined"
          />
          <Chip label={`Avg Duration: ${formatDuration(analysis.avgDuration)}`} variant="outlined" />
          <Chip 
            label={`Productivity: ${analysis.productivity}`}
            color={analysis.productivity === 'High' ? 'success' : analysis.productivity === 'Medium' ? 'warning' : 'error'}
            variant="outlined"
          />
          <Chip 
            label={`Risk Level: ${analysis.riskLevel}`}
            color={analysis.riskLevel === 'Low' ? 'success' : analysis.riskLevel === 'Medium' ? 'warning' : 'error'}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Issues */}
      {issues.length > 0 && (
        <Accordion sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid #333' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IssueIcon sx={{ mr: 1, color: '#f44336' }} />
              <Typography>Issues & Risks ({issues.length})</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {issues.map((issue, index) => (
              <Card key={index} sx={{ mb: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {issue.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {issue.title}
                    </Typography>
                    <Chip 
                      label={issue.severity} 
                      size="small" 
                      color={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info'}
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {issue.description}
                  </Typography>
                  {issue.commands && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Related Commands:
                      </Typography>
                      {issue.commands.slice(0, 3).map((cmd, cmdIndex) => (
                        <Typography 
                          key={cmdIndex}
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            bgcolor: '#1a1a1a', 
                            p: 1, 
                            mb: 1,
                            borderRadius: 1
                          }}
                        >
                          $ {cmd.command}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Patterns */}
      <Accordion sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PatternIcon sx={{ mr: 1, color: '#00ff41' }} />
            <Typography>Command Patterns ({patterns.length})</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {patterns.map((pattern, index) => (
            <Card key={index} sx={{ mb: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {pattern.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {pattern.title}
                  </Typography>
                </Box>
                
                {pattern.type === 'frequency' && (
                  <List dense>
                    {pattern.data.map(([cmd, count], cmdIndex) => (
                      <ListItem key={cmdIndex}>
                        <ListItemText 
                          primary={cmd} 
                          secondary={`${count} times`}
                          primaryTypographyProps={{ fontFamily: 'monospace' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {pattern.type === 'errors' && (
                  pattern.data.map((cmd, cmdIndex) => (
                    <Typography 
                      key={cmdIndex}
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        bgcolor: '#1a1a1a', 
                        p: 1, 
                        mb: 1,
                        borderRadius: 1,
                        color: '#ff5555'
                      }}
                    >
                      $ {cmd.command} (exit code: {cmd.exit_code})
                    </Typography>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Accordion sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid #333' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SuggestionIcon sx={{ mr: 1, color: '#ffab00' }} />
              <Typography>AI Suggestions ({suggestions.length})</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {suggestions.map((suggestion, index) => (
              <Card key={index} sx={{ mb: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {suggestion.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {suggestion.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {suggestion.suggestion}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      <Button 
        variant="contained" 
        onClick={analyzeCommands}
        sx={{ bgcolor: '#00ff41', color: 'black' }}
        fullWidth
      >
        Refresh Analysis
      </Button>
    </Box>
  );
};

export default CommandAnalyzer;