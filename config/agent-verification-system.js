/**
 * Agent Verification System - Prevents false confidence claims
 * Ensures agents only report completion when they can prove it
 */

const VERIFICATION_LEVELS = {
  VISUAL: 'visual',        // Must see output/result
  TESTED: 'tested',        // Must run test that passes
  EXECUTED: 'executed',    // Must run command successfully
  CONFIRMED: 'confirmed'   // Must get explicit confirmation
};

const CONFIDENCE_THRESHOLDS = {
  CERTAIN: 0.95,    // Only for verified actions
  LIKELY: 0.80,     // For high-confidence predictions
  POSSIBLE: 0.60,   // For medium confidence
  UNCERTAIN: 0.40   // For low confidence
};

class VerificationSystem {
  constructor() {
    this.verificationLog = [];
    this.activeVerifications = new Map();
  }

  // Core verification methods
  requireVerification(agentId, taskId, level = VERIFICATION_LEVELS.VISUAL) {
    const verification = {
      agentId,
      taskId,
      level,
      timestamp: new Date().toISOString(),
      verified: false,
      evidence: null
    };
    
    this.activeVerifications.set(`${agentId}-${taskId}`, verification);
    return verification;
  }

  addEvidence(agentId, taskId, evidence) {
    const key = `${agentId}-${taskId}`;
    const verification = this.activeVerifications.get(key);
    
    if (!verification) {
      throw new Error(`No active verification for ${agentId}-${taskId}`);
    }

    verification.evidence = evidence;
    verification.verified = this.validateEvidence(verification);
    
    if (verification.verified) {
      this.verificationLog.push({...verification, completedAt: new Date().toISOString()});
      this.activeVerifications.delete(key);
    }
    
    return verification.verified;
  }

  validateEvidence(verification) {
    const { level, evidence } = verification;
    
    switch (level) {
      case VERIFICATION_LEVELS.VISUAL:
        return evidence && evidence.output && evidence.output.length > 0;
        
      case VERIFICATION_LEVELS.TESTED:
        return evidence && evidence.testResult && evidence.testResult.passed === true;
        
      case VERIFICATION_LEVELS.EXECUTED:
        return evidence && evidence.commandResult && evidence.commandResult.exitCode === 0;
        
      case VERIFICATION_LEVELS.CONFIRMED:
        return evidence && evidence.confirmation === true;
        
      default:
        return false;
    }
  }

  // Confidence scoring
  calculateConfidence(verification) {
    if (!verification.verified) {
      return CONFIDENCE_THRESHOLDS.UNCERTAIN;
    }

    switch (verification.level) {
      case VERIFICATION_LEVELS.VISUAL:
        return CONFIDENCE_THRESHOLDS.LIKELY;
      case VERIFICATION_LEVELS.TESTED:
        return CONFIDENCE_THRESHOLDS.CERTAIN;
      case VERIFICATION_LEVELS.EXECUTED:
        return CONFIDENCE_THRESHOLDS.CERTAIN;
      case VERIFICATION_LEVELS.CONFIRMED:
        return CONFIDENCE_THRESHOLDS.CERTAIN;
      default:
        return CONFIDENCE_THRESHOLDS.UNCERTAIN;
    }
  }

  // Agent communication filters
  filterCommunication(message, agentId) {
    const certaintyWords = [
      'completed', 'finished', 'done', 'successful', 'working',
      'fixed', 'implemented', 'created', 'deployed', 'built'
    ];
    
    const uncertainWords = [
      'should', 'likely', 'probably', 'appears', 'seems',
      'attempting', 'trying', 'may have', 'might be'
    ];

    let hasCertainty = certaintyWords.some(word => 
      message.toLowerCase().includes(word)
    );

    if (hasCertainty) {
      // Check if agent has verification for recent tasks
      const recentVerifications = this.verificationLog
        .filter(v => v.agentId === agentId)
        .filter(v => Date.now() - new Date(v.timestamp) < 300000); // 5 minutes

      if (recentVerifications.length === 0) {
        return {
          filtered: true,
          originalMessage: message,
          filteredMessage: this.addUncertaintyMarkers(message),
          reason: 'No verification evidence for completion claim'
        };
      }
    }

    return { filtered: false, message };
  }

  addUncertaintyMarkers(message) {
    return message
      .replace(/completed/gi, 'attempted to complete')
      .replace(/finished/gi, 'worked on')
      .replace(/done/gi, 'processed')
      .replace(/successful/gi, 'ran')
      .replace(/working/gi, 'appears to be working')
      .replace(/fixed/gi, 'attempted to fix')
      .replace(/implemented/gi, 'worked on implementing')
      .replace(/created/gi, 'attempted to create')
      .replace(/deployed/gi, 'attempted to deploy')
      .replace(/built/gi, 'attempted to build');
  }

  // Hook integration points
  createPreTaskHook(agentId, taskDescription) {
    return {
      hook: 'pre-task-verification',
      agentId,
      taskDescription,
      verification: this.requireVerification(agentId, this.generateTaskId()),
      instructions: [
        'You must provide evidence before claiming task completion',
        'Use verification methods appropriate to the task type',
        'Do not claim success without proof'
      ]
    };
  }

  createPostTaskHook(agentId, taskId, result) {
    return {
      hook: 'post-task-verification',
      agentId,
      taskId,
      verificationRequired: this.activeVerifications.has(`${agentId}-${taskId}`),
      evidence: result,
      confidence: this.calculateConfidence({ verified: true, level: VERIFICATION_LEVELS.VISUAL })
    };
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Verification prompt templates
const VERIFICATION_PROMPTS = {
  TASK_START: `
VERIFICATION REQUIREMENT: You must prove task completion with evidence.

Before claiming you have:
- Completed any task
- Fixed any issue  
- Created any file
- Deployed anything
- Built anything successfully

You MUST provide one of:
1. VISUAL: Show command output/file contents
2. TESTED: Run a test that passes
3. EXECUTED: Show successful command execution
4. CONFIRMED: Get explicit user confirmation

Do not use confident language without proof. Use "attempted" or "worked on" until verified.
`,

  EVIDENCE_REQUEST: `
Please provide verification evidence for your completion claim:

If you completed a file operation: Show the file contents
If you fixed a bug: Show the test passing or error resolved
If you deployed something: Show deployment success output
If you built something: Show build success and functionality

Without evidence, rephrase your response to indicate uncertainty.
`,

  CONFIDENCE_CALIBRATION: `
Rate your confidence (0-100%) and provide reasoning:

95-100%: I have direct proof (test passed, saw output, user confirmed)
80-94%: Strong evidence suggests success
60-79%: Likely successful based on normal patterns
40-59%: Uncertain, needs verification
0-39%: Likely failed or incomplete

Current confidence: ___%
Reasoning: [explain why this confidence level]
Evidence: [what proof do you have]
`
};

module.exports = {
  VerificationSystem,
  VERIFICATION_LEVELS,
  CONFIDENCE_THRESHOLDS,
  VERIFICATION_PROMPTS
};