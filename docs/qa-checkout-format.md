# QA Checkout Format for Agents

## Required Agent Checkout Summary Format

When agents complete work and checkout, they must provide a summary in this format:

```
📋 AGENT WORK SUMMARY
━━━━━━━━━━━━━━━━━━━━
Agent: [agent-type]
Task: [main task description]

✅ COMPLETED:
• [Specific action taken]
• [Files created/modified with paths]
• [Tests added if applicable]

📁 FILES MODIFIED:
• src/auth/login.js - Added login functionality
• tests/auth.test.js - Created 5 test cases
• package.json - Added bcrypt dependency

🧪 TESTS:
• All tests passing (5/5)
• Coverage: 85%

📍 LOCATION:
• Main code: /src/auth/
• Tests: /tests/auth/
• Docs: /docs/api/auth.md

⚠️ NOTES:
• [Any issues or incomplete items]
• [Dependencies added]
• [Breaking changes if any]
━━━━━━━━━━━━━━━━━━━━
```

## Example Agent Checkout

```
📋 AGENT WORK SUMMARY
━━━━━━━━━━━━━━━━━━━━
Agent: coder
Task: Implement user authentication system

✅ COMPLETED:
• Created JWT-based authentication
• Added login/logout endpoints
• Implemented password hashing
• Added session management

📁 FILES MODIFIED:
• src/auth/auth.controller.js - New auth controller
• src/auth/auth.service.js - Authentication logic
• src/middleware/auth.js - JWT verification
• tests/auth.test.js - Full test suite
• package.json - Added jsonwebtoken, bcrypt

🧪 TESTS:
• All tests passing (12/12)
• Coverage: 92%

📍 LOCATION:
• Main code: /src/auth/
• Tests: /tests/auth/
• Config: /config/auth.js

⚠️ NOTES:
• Need to add rate limiting
• Consider adding 2FA support
• JWT_SECRET must be set in .env
━━━━━━━━━━━━━━━━━━━━
```

## QA Verification Process

1. **Agent completes work and provides summary above**
2. **User types: `qc` or `quality control`**
3. **New terminal opens with QA verifier running analysis**
4. **User copies agent summary**
5. **In QA terminal, user types: `qc confirm "[paste summary]"`**
6. **QA agent verifies claims against actual code**
7. **Report generated with confirmations, issues, and fixes**

## QA Report Example

```
══════════════════════════════════════════════
       QA VERIFICATION REPORT
══════════════════════════════════════════════

AGENT CLAIMED:
• Implemented user authentication
• Added tests for login flow
• Updated API documentation

VERIFICATION RESULTS:

✅ CONFIRMED (8/10):
  • src/auth/auth.controller.js exists
  • src/auth/auth.service.js has auth logic
  • tests/auth.test.js has 12 test cases
  • Package.json includes jwt and bcrypt
  • All 12 tests are passing
  • Git shows 5 files modified
  • No console.log statements found
  • No linting errors

❌ MISSING (1/10):
  • API documentation not found in /docs

⚠️ ISSUES FOUND (1/10):
  • TODO comment in auth.service.js:45

🔧 RECOMMENDED FIXES:
1. Run: Task('api-docs', 'Document auth endpoints')
2. Run: Task('coder', 'Resolve TODO in auth.service.js:45')

QUALITY METRICS:
• Code Coverage: 92% ✅
• Lint Issues: 0 ✅
• Type Errors: 0 ✅
• TODOs Found: 1 ⚠️

READY FOR PRODUCTION: NO
Required fixes: 2 (estimated 10 min)
══════════════════════════════════════════════
```

## Benefits

1. **Accountability** - Verifies agent claims vs actual implementation
2. **Quality Control** - Catches missing tests, docs, error handling
3. **Clear Feedback** - Specific commands to fix issues
4. **Progress Tracking** - Confirms what's actually done
5. **Standards Enforcement** - Ensures code quality metrics met