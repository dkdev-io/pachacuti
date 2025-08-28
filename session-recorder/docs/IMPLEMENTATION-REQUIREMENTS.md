# QA Verifier Implementation Requirements

## Backend-Dev Agent Instructions

Based on TDD London School analysis and contract definition, implement the missing `scripts/qa-verifier.js` component following these exact specifications.

## Architecture Overview

The QA Verifier integrates with the existing session-recorder system as a quality assurance layer:

```
session-recorder/
├── lib/
│   ├── session-capture.js     # Existing - generates session data
│   ├── session-monitor.js     # Existing - monitors real-time activity  
│   ├── safe-serializer.js     # Existing - prevents serialization crashes
│   └── logger.js             # Existing - centralized logging
├── scripts/
│   └── qa-verifier.js        # NEW - quality assessment system
└── tests/
    └── qa-verifier.test.js   # EXISTS - TDD test suite
```

## Implementation Checklist

### 1. Core QAVerifier Class Structure

Create `/Users/Danallovertheplace/pachacuti/session-recorder/scripts/qa-verifier.js` with:

```javascript
/**
 * QA Verifier Module - Quality Assessment for Session Data
 * Implements London School TDD patterns with behavior verification
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../lib/logger');
const SafeSerializer = require('../lib/safe-serializer');

class QAVerifier {
  constructor(options = {}) {
    // Initialize with circuit breaker and configuration
    // Reference existing SafeSerializer patterns
  }
  
  // Implement all methods defined in interface contract
}

module.exports = QAVerifier;
```

### 2. Required Methods Implementation

#### Core Quality Assessment
- `async verifySessionCompleteness(sessionId)` - Validates session data structure
- `async validateSessionSize(sessionId)` - Checks for oversized sessions  
- `async calculateQualityScore(sessionData)` - Comprehensive scoring algorithm

#### Batch Operations
- `async assessSessionDirectory(directoryPath)` - Process multiple sessions
- `async generateQualityReport(assessmentResults)` - Generate markdown reports

#### Recovery Operations  
- `async attemptSessionRecovery(sessionId)` - Handle corrupted sessions

#### Real-time Integration
- `async monitorActiveSession(sessionInstance)` - Connect to live sessions
- `connectToMonitor(monitorInstance)` - Integrate with SessionMonitor

### 3. File System Integration

Follow existing patterns from `session-capture.js`:

```javascript
// Session file path pattern (line 384-388)
const sessionFile = path.join(__dirname, '../data/sessions', `${sessionId}.json`);

// Directory structure (line 407)
await fs.mkdir(path.dirname(sessionFile), { recursive: true });

// Error handling pattern (lines 415-425)
try {
  // File operations
} catch (error) {
  logger.error('Operation failed:', { error: error.message });
  // Create fallback/backup
}
```

### 4. SafeSerializer Integration

Use existing SafeSerializer patterns from `session-capture.js`:

```javascript
// Initialize serializer with session-specific limits (lines 26-30)
this.serializer = new SafeSerializer({
  maxContentLength: 50 * 1024,
  maxStringLength: 50 * 1024 * 1024,
  maxArrayItems: 500
});

// Safe serialization (lines 409-411)
const serializedData = this.serializer.safeStringify(data, null, 2);
```

### 5. Logger Integration

Follow logging patterns from existing modules:

```javascript
// Info logging (session-monitor.js line 35)
logger.info('Starting quality assessment...', { sessionId });

// Warning for issues (session-capture.js line 308) 
logger.warn('Large session detected', { size, threshold });

// Error with context (session-capture.js lines 416-420)
logger.error('Quality check failed:', {
  sessionId: sessionId,
  error: error.message,
  context: additionalInfo
});

// Debug for detailed info (session-capture.js line 413)
logger.debug('Quality assessment completed', { score, factors });
```

### 6. Session Data Structure Understanding

Based on `session-capture.js`, sessions contain:

```javascript
// Core session structure (lines 391-405)
const sessionData = {
  sessionId: string,
  start: Date,
  lastUpdate: string (ISO),
  activities: Array, // Different activity types
  fileChanges: Array,
  gitCommits: Array, 
  commands: Array,
  decisions: Array,
  problems: Array,
  solutions: Array,
  metadata: {
    activitiesCount: number,
    serializedSafely: boolean
  }
};

// Activity types (lines 51-55, 73-77, etc.)
// - file_change, git_activity, git_commit, command, decision, problem, solution
```

### 7. Quality Scoring Algorithm

Implement comprehensive scoring based on:

- **Completeness** (40%): Has activities, file changes, commits, metadata
- **Consistency** (25%): Timestamps in order, proper structure
- **Activity Level** (20%): Sufficient activity for session duration
- **Problem Resolution** (10%): Problems matched with solutions
- **Data Integrity** (5%): No corruption, proper serialization

### 8. Circuit Breaker Pattern

Follow SafeSerializer circuit breaker pattern (lines 26-33, 246-252):

```javascript
this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
this.circuitBreakerTimeout = options.circuitBreakerTimeout || 60000;
this.failures = 0;
this.circuitOpen = false;
```

### 9. CLI Interface Implementation

Add CLI handling at the end of the file:

```javascript
// CLI interface for standalone usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const qaVerifier = new QAVerifier();
  
  // Handle --session, --batch, --report, --recover flags
  // Follow patterns from existing CLI modules
}
```

### 10. Error Recovery Patterns

Based on session-capture.js recovery patterns (lines 352-380):

```javascript
// Try main file, fallback to backup
async attemptSessionRecovery(sessionId) {
  try {
    // Try main session file
  } catch (error) {
    // Try backup file (sessionId + '.backup.json')
    // If both fail, create minimal recovery info
  }
}
```

## Test Integration Requirements

The implementation MUST pass all tests in `/tests/qa-verifier.test.js`. Key test behaviors:

1. **Mock Interactions**: All file operations, logger calls, and serializer usage
2. **Behavior Verification**: Tests verify HOW objects collaborate, not just results
3. **Error Scenarios**: Corrupted files, missing files, oversized data
4. **Circuit Breaker**: Failure threshold and recovery testing
5. **Batch Processing**: Multiple session handling workflows

## Configuration Integration

Add to `package.json` scripts section:

```json
{
  "qa-check": "node scripts/qa-verifier.js",
  "qa-batch": "node scripts/qa-verifier.js --batch --directory=data/sessions", 
  "qa-report": "node scripts/qa-verifier.js --report --output=reports/quality"
}
```

## Performance Requirements

- Single session analysis: < 500ms
- Batch processing 100 sessions: < 30s
- Memory usage: < 100MB during batch operations
- Circuit breaker prevents cascade failures

## Integration Testing

After implementation, verify integration with:

```bash
# Test single session
npm run qa-check -- --session session-2025-08-27-example

# Test batch processing  
npm run qa-batch

# Generate quality report
npm run qa-report
```

## Success Criteria

1. All tests in `qa-verifier.test.js` pass
2. Successfully analyzes existing session files without errors
3. Generates quality reports in markdown format
4. Integrates with existing session-recorder workflow  
5. Handles corrupted sessions gracefully
6. Circuit breaker activates under failure conditions
7. CLI interface works for all specified operations

## Common Pitfalls to Avoid

1. **Don't replicate SafeSerializer logic** - use existing instance
2. **Don't bypass logger** - use centralized logging patterns
3. **Don't hardcode paths** - use path.join() and relative paths
4. **Don't ignore circuit breaker** - implement failure protection
5. **Don't skip error recovery** - corrupted sessions are common
6. **Don't break existing patterns** - follow session-capture.js conventions

## Implementation Order

1. Basic class structure and constructor
2. File system integration (reading session files)
3. Quality scoring algorithm
4. Error handling and recovery
5. Circuit breaker implementation
6. Batch processing functionality
7. CLI interface
8. Integration with monitoring systems
9. Report generation
10. Test validation and debugging

This implementation will provide a robust quality assurance system that integrates seamlessly with the existing session-recorder architecture while following London School TDD principles.