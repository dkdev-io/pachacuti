# QA Verifier Interface Contract

## Overview
The QA Verifier module provides quality assessment and verification capabilities for session-recorder data. It follows the London School TDD approach with behavior verification and mock-driven contract definition.

## Core Interface Contracts

### Primary QAVerifier Class Contract

```javascript
class QAVerifier {
  constructor(options = {})
  
  // Core Quality Assessment Methods
  async verifySessionCompleteness(sessionId): Promise<QualityAssessment>
  async validateSessionSize(sessionId): Promise<SizeValidation>
  async calculateQualityScore(sessionData): Promise<QualityScore>
  
  // Batch Operations
  async assessSessionDirectory(directoryPath): Promise<BatchAssessment>
  async generateQualityReport(assessmentResults): Promise<string>
  
  // Recovery Operations  
  async attemptSessionRecovery(sessionId): Promise<RecoveryResult>
  
  // Real-time Monitoring
  async monitorActiveSession(sessionInstance): Promise<void>
  connectToMonitor(monitorInstance): void
  
  // Circuit Breaker
  isCircuitOpen(): boolean
}
```

## Type Definitions

### QualityAssessment
```javascript
{
  sessionId: string,
  isValid: boolean,
  score: number, // 0.0 to 1.0
  completeness: {
    hasActivities: boolean,
    hasFileChanges: boolean,
    hasCommits: boolean,
    hasMetadata: boolean,
    timestampConsistency: boolean
  },
  errors: Array<{
    type: 'corruption' | 'missing_data' | 'format_error',
    severity: 'critical' | 'warning' | 'info',
    message: string,
    context?: any
  }>,
  warnings: string[],
  recommendations: string[]
}
```

### SizeValidation
```javascript
{
  sessionId: string,
  estimatedSize: number,
  actualSize?: number,
  isOversized: boolean,
  sizeWarnings: string[],
  truncationRequired: boolean,
  compressionRecommended: boolean
}
```

### QualityScore
```javascript
{
  overall: number, // 0.0 to 1.0
  factors: {
    completeness: number,
    consistency: number,
    activity_level: number,
    problem_resolution: number,
    data_integrity: number
  },
  breakdown: {
    activitiesScore: number,
    fileChangesScore: number,
    commitsScore: number,
    decisionsScore: number,
    problemSolutionRatio: number
  },
  recommendations: string[]
}
```

### BatchAssessment
```javascript
{
  directoryPath: string,
  totalSessions: number,
  healthySessions: number,
  corruptedSessions: number,
  emptySessions: number,
  oversizedSessions: number,
  averageQualityScore: number,
  sessionsAnalyzed: Array<{
    sessionId: string,
    status: 'healthy' | 'corrupted' | 'empty' | 'oversized',
    qualityScore: number
  }>,
  summary: {
    totalSize: number,
    oldestSession: string,
    newestSession: string,
    mostActiveSession: string
  }
}
```

### RecoveryResult
```javascript
{
  sessionId: string,
  recoverable: boolean,
  status: 'recovered' | 'partial_recovery' | 'complete_loss',
  recoveredData?: any,
  backupUsed?: boolean,
  dataLoss?: {
    activities: number,
    fileChanges: number,
    commits: number
  },
  recoveryMethod?: 'backup_file' | 'partial_parse' | 'metadata_only'
}
```

## Collaborator Contracts

### File System Collaborations
```javascript
// Expected interactions with fs.promises
await fs.promises.readFile(sessionFilePath, 'utf-8')
await fs.promises.writeFile(reportPath, reportContent)
await fs.promises.readdir(sessionDirectoryPath)
await fs.promises.stat(filePath)
await fs.promises.access(backupFilePath)
```

### Logger Collaborations
```javascript
// Expected logging interactions
logger.info('Quality assessment started', { sessionId })
logger.warn('Large session detected', { size, threshold })
logger.error('Session corruption detected', { sessionId, error })
logger.debug('Quality check completed', { score, factors })
```

### SafeSerializer Collaborations
```javascript
// Expected serializer interactions
serializer.estimateSize(sessionData)
serializer.safeStringify(qualityReport, null, 2)
```

### SessionCapture Integration
```javascript
// Expected session capture interactions
sessionInstance.on('fileChange', qualityCheckHandler)
sessionInstance.on('gitCommit', qualityUpdateHandler)
sessionInstance.generateSummary()
```

### SessionMonitor Integration
```javascript
// Expected monitor interactions
monitor.on('sessionQualityIssue', alertHandler)
monitor.emit('qualityAlert', { sessionId, issue })
```

## Error Handling Contracts

### Expected Error Types
- `SyntaxError`: JSON parsing failures (corrupted sessions)
- `RangeError`: Memory/size limit exceeded
- `ENOENT`: Missing session files
- `EACCES`: Permission denied
- `TypeError`: Invalid data structure

### Circuit Breaker Behavior
- Opens after 5 consecutive failures
- Remains open for 60 seconds
- Logs circuit breaker state changes
- Returns cached failure responses when open

## Configuration Options

```javascript
const qaVerifier = new QAVerifier({
  maxSessionSize: 10 * 1024 * 1024, // 10MB
  qualityThreshold: 0.7, // Minimum acceptable quality score
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  enableRealTimeMonitoring: true,
  backupFileExtension: '.backup.json',
  reportOutputDirectory: '../reports/quality'
});
```

## Integration Points

### Package.json Script Addition
```json
{
  "scripts": {
    "qa-check": "node scripts/qa-verifier.js",
    "qa-batch": "node scripts/qa-verifier.js --batch --directory=data/sessions",
    "qa-report": "node scripts/qa-verifier.js --report --output=reports/quality"
  }
}
```

### CLI Interface Contract
```bash
# Single session verification
node scripts/qa-verifier.js --session session-2025-08-27-abc123

# Batch directory assessment  
node scripts/qa-verifier.js --batch --directory data/sessions

# Generate quality report
node scripts/qa-verifier.js --report --output reports/quality/qa-report.md

# Recovery mode
node scripts/qa-verifier.js --recover --session corrupted-session-id
```

## Test Coverage Requirements

### Mock Interactions to Verify
1. File system operations (read, write, access)
2. Logger calls with appropriate levels and messages  
3. SafeSerializer integration for size checks
4. SessionCapture event handling
5. SessionMonitor alert system
6. Circuit breaker state transitions
7. Error recovery workflows
8. Batch processing coordination

### Behavior Assertions
- Quality score calculations are consistent
- Circuit breaker activates and resets properly
- Recovery attempts follow correct workflow
- File operations happen in expected order
- Error handling is graceful and informative
- Batch processing handles mixed session states
- Real-time monitoring responds to events

## Performance Requirements

- Single session verification: < 500ms
- Batch assessment of 100 sessions: < 30s  
- Memory usage should not exceed 100MB during batch operations
- Circuit breaker should prevent cascade failures
- Recovery operations should timeout after 10s

## Security Considerations

- No sensitive data should be logged
- File paths are validated before access
- JSON parsing uses safe methods
- Memory limits prevent DoS attacks
- Error messages don't expose system internals