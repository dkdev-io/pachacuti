# Claude Code Workflow Patterns

## Common Development Workflows

### 1. New Feature Implementation

#### Pattern: Research → Plan → Test → Implement → Verify

```javascript
// Step 1: Research existing code
Glob("**/user*.js")  // Find related files
Grep("authentication", {output_mode: "files_with_matches"})
Read("/src/auth/index.js")  // Understand current implementation

// Step 2: Plan with todos
TodoWrite([
  {content: "Research authentication flow", status: "completed"},
  {content: "Design new feature API", status: "in_progress"},
  {content: "Write unit tests", status: "pending"},
  {content: "Implement feature", status: "pending"},
  {content: "Integration testing", status: "pending"},
  {content: "Update documentation", status: "pending"}
])

// Step 3: Write tests first (TDD)
Write("/tests/newFeature.test.js", testContent)

// Step 4: Implement feature
MultiEdit("/src/features/newFeature.js", edits)

// Step 5: Verify
Bash("npm test")
Bash("npm run lint")
```

### 2. Bug Fixing Workflow

#### Pattern: Reproduce → Isolate → Test → Fix → Verify

```javascript
// Step 1: Understand the bug
Read("/src/buggy-component.js")
Grep("error.*message", {output_mode: "content", -B: 5, -A: 5})

// Step 2: Create failing test
Write("/tests/bug-fix.test.js", `
  test('should handle edge case', () => {
    expect(buggyFunction(null)).not.toThrow();
  });
`)

// Step 3: Run test to confirm failure
Bash("npm test bug-fix.test.js")

// Step 4: Fix the bug
Edit("/src/buggy-component.js", 
  "if (data) {",
  "if (data !== null && data !== undefined) {"
)

// Step 5: Verify fix
Bash("npm test")
Bash("npm run lint")
```

### 3. Code Refactoring

#### Pattern: Analyze → Test Coverage → Refactor → Verify

```javascript
// Step 1: Analyze current code
Read("/src/legacy-code.js")
Grep("TODO|FIXME|HACK", {output_mode: "content"})

// Step 2: Ensure test coverage
Bash("npm test -- --coverage")

// Step 3: Refactor incrementally
MultiEdit("/src/legacy-code.js", [
  {old_string: "var", new_string: "const", replace_all: true},
  {old_string: "function(", new_string: "() =>"},
  // More refactoring edits
])

// Step 4: Verify behavior unchanged
Bash("npm test")
Bash("npm run build")
```

### 4. Full Stack Feature

#### Pattern: Backend → API → Frontend → Integration

```javascript
// Backend implementation
Task("backend-dev", "Create REST API for user profiles")

// API documentation
Task("api-docs", "Generate OpenAPI spec for new endpoints")

// Frontend implementation
Task("coder", "Create React components for profile UI")

// Integration testing
Write("/tests/e2e/profile.test.js", e2eTests)
Bash("npm run test:e2e")
```

## Search and Discovery Patterns

### 1. Codebase Exploration

```javascript
// Find all test files
Glob("**/*.test.{js,ts}")

// Find specific patterns
Grep("class.*Component", {glob: "**/*.jsx"})

// Find TODOs
Grep("TODO|FIXME", {output_mode: "content", -n: true})

// Find imports of a module
Grep("import.*'react'", {output_mode: "files_with_matches"})
```

### 2. Dependency Analysis

```javascript
// Find package usage
Grep("require\\(['\"]lodash", {output_mode: "content"})

// Check for deprecated APIs
Grep("componentWillMount|componentWillReceiveProps")

// Find all API calls
Grep("fetch\\(|axios\\.", {output_mode: "content", -B: 2, -A: 2})
```

### 3. Security Audit

```javascript
// Find hardcoded secrets
Grep("api[_-]?key|secret|password|token", {-i: true})

// Check for SQL injection risks
Grep("query.*\\+.*\\$|query.*\\+.*req\\.", {output_mode: "content"})

// Find eval usage
Grep("eval\\(|Function\\(", {output_mode: "content"})
```

## File Management Patterns

### 1. Batch File Creation

```javascript
// Create project structure
Bash("mkdir -p src/{components,utils,services,hooks}")

// Create multiple files
Write("/src/components/Header.jsx", headerComponent)
Write("/src/components/Footer.jsx", footerComponent)
Write("/src/utils/helpers.js", helperFunctions)
Write("/tests/components/Header.test.jsx", headerTests)
```

### 2. File Reorganization

```javascript
// Read old structure
Read("/src/old-file.js")

// Create new structure
Write("/src/features/new-feature/index.js", refactoredCode)
Write("/src/features/new-feature/styles.css", styles)

// Update imports
MultiEdit("/src/index.js", [
  {old_string: "./old-file", new_string: "./features/new-feature"}
])
```

### 3. Configuration Updates

```javascript
// Update multiple config files
MultiEdit("/package.json", packageEdits)
MultiEdit("/.eslintrc.json", eslintEdits)
MultiEdit("/tsconfig.json", tsConfigEdits)

// Verify configuration
Bash("npm run lint")
Bash("npm run typecheck")
```

## Testing Patterns

### 1. Test-Driven Development (TDD)

```javascript
// Red: Write failing test
Write("/tests/calculator.test.js", `
  test('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
`)

// Run test (should fail)
Bash("npm test calculator.test.js")

// Green: Implement minimum code
Write("/src/calculator.js", `
  export const add = (a, b) => a + b;
`)

// Run test (should pass)
Bash("npm test calculator.test.js")

// Refactor if needed
Edit("/src/calculator.js", improvements)
```

### 2. Integration Testing

```javascript
// Set up test environment
Bash("npm run test:setup")

// Create integration test
Write("/tests/integration/api.test.js", apiTests)

// Run with test database
Bash("NODE_ENV=test npm run test:integration")

// Clean up
Bash("npm run test:cleanup")
```

### 3. E2E Testing

```javascript
// Start application
Bash("npm run dev", run_in_background=true)

// Run E2E tests
Bash("npm run cypress:run")

// Check results
BashOutput(bash_id)

// Stop application
KillBash(bash_id)
```

## Git Workflow Patterns

### 1. Feature Branch Workflow

```javascript
// Create feature branch
Bash("git checkout -b feature/user-auth")

// Make changes
MultiEdit("/src/auth.js", authChanges)

// Stage and commit
Bash("git add -A")
Bash("git commit -m 'feat: Add user authentication'")

// Push to remote
Bash("git push -u origin feature/user-auth")

// Create PR
Bash("gh pr create --title 'Add user authentication' --body 'Implements JWT-based auth'")
```

### 2. Hotfix Workflow

```javascript
// Switch to main
Bash("git checkout main")
Bash("git pull origin main")

// Create hotfix branch
Bash("git checkout -b hotfix/critical-bug")

// Fix bug
Edit("/src/critical.js", bugFix)

// Test fix
Bash("npm test")

// Commit and push
Bash("git add -A && git commit -m 'fix: Critical bug in payment processing'")
Bash("git push -u origin hotfix/critical-bug")

// Create urgent PR
Bash("gh pr create --title 'HOTFIX: Critical payment bug' --label 'urgent'")
```

### 3. Release Workflow

```javascript
// Update version
Edit("/package.json", 
  '"version": "1.0.0"',
  '"version": "1.1.0"'
)

// Update changelog
Write("/CHANGELOG.md", changelogContent)

// Create release commit
Bash("git add -A")
Bash("git commit -m 'chore: Release v1.1.0'")

// Tag release
Bash("git tag -a v1.1.0 -m 'Release version 1.1.0'")

// Push with tags
Bash("git push origin main --tags")

// Create GitHub release
Bash("gh release create v1.1.0 --title 'v1.1.0' --notes-file CHANGELOG.md")
```

## Performance Optimization Patterns

### 1. Code Analysis

```javascript
// Analyze bundle size
Bash("npm run build:analyze")

// Check for large dependencies
Bash("npm ls --depth=0 | grep -E '[0-9]+\\.[0-9]+MB'")

// Find performance bottlenecks
Grep("setTimeout|setInterval", {output_mode: "content"})
```

### 2. Optimization Implementation

```javascript
// Add lazy loading
MultiEdit("/src/App.jsx", [
  {old_string: "import Component", new_string: "const Component = lazy(() => import"},
])

// Add memoization
Edit("/src/expensive.js",
  "const result = calculate(data)",
  "const result = useMemo(() => calculate(data), [data])"
)

// Optimize images
Bash("npx imagemin images/* --out-dir=images/optimized")
```

## Multi-Agent Patterns

### 1. Parallel Development

```javascript
// Spawn multiple agents for different tasks
Task("backend-dev", "Create user API endpoints")
Task("mobile-dev", "Build React Native profile screen")
Task("tester", "Write comprehensive test suite")
Task("api-docs", "Generate API documentation")

// Coordinate results
TodoWrite([
  {content: "Backend API complete", status: "completed"},
  {content: "Mobile UI complete", status: "completed"},
  {content: "Tests written", status: "completed"},
  {content: "Documentation updated", status: "completed"},
  {content: "Integration testing", status: "in_progress"}
])
```

### 2. Code Review Workflow

```javascript
// Analyze changes
Bash("git diff main...HEAD")

// Spawn review agents
Task("reviewer", "Review code quality and patterns")
Task("security-manager", "Audit for security issues")
Task("performance-benchmarker", "Analyze performance impact")

// Aggregate feedback
Task("general-purpose", "Synthesize all review feedback")
```

## Debugging Patterns

### 1. Log Analysis

```javascript
// Search logs for errors
Grep("ERROR|FATAL|CRITICAL", {path: "/logs", output_mode: "content"})

// Find specific timestamp
Grep("2024-08-23.*ERROR", {path: "/logs/app.log", -A: 10})

// Monitor logs in real-time
Bash("tail -f /logs/app.log", run_in_background=true)
BashOutput(bash_id, filter="ERROR")
```

### 2. Interactive Debugging

```javascript
// Add debug statements
MultiEdit("/src/problem.js", [
  {old_string: "function process(data) {", 
   new_string: "function process(data) {\n  console.log('Processing:', data);"},
])

// Run with debug mode
Bash("NODE_ENV=debug npm run dev")

// Remove debug statements after fixing
MultiEdit("/src/problem.js", [
  {old_string: "console.log", new_string: "// console.log", replace_all: true}
])
```

## Documentation Patterns

### 1. API Documentation

```javascript
// Generate from code
Task("api-docs", "Generate OpenAPI specification from code")

// Create examples
Write("/docs/api-examples.md", exampleContent)

// Update README
MultiEdit("/README.md", [
  {old_string: "## API", new_string: "## API\n\nSee [API Documentation](./docs/api.md)"}
])
```

### 2. Code Documentation

```javascript
// Add JSDoc comments
Edit("/src/utils.js",
  "function calculate(x, y) {",
  `/**
   * Calculates the result of x and y
   * @param {number} x - First number
   * @param {number} y - Second number
   * @returns {number} The calculation result
   */
  function calculate(x, y) {`
)

// Generate documentation
Bash("npx jsdoc -c jsdoc.json")
```

## Migration Patterns

### 1. Framework Migration

```javascript
// Analyze current framework usage
Grep("import.*from 'old-framework'", {output_mode: "files_with_matches"})

// Create migration plan
TodoWrite([
  {content: "Install new framework", status: "pending"},
  {content: "Update build configuration", status: "pending"},
  {content: "Migrate components", status: "pending"},
  {content: "Update tests", status: "pending"},
  {content: "Remove old framework", status: "pending"}
])

// Execute migration
Task("migration-planner", "Create detailed migration plan from old-framework to new-framework")
```

### 2. Database Migration

```javascript
// Create migration file
Write("/migrations/001_add_user_table.sql", migrationSQL)

// Test migration
Bash("npm run db:migrate:test")

// Apply migration
Bash("npm run db:migrate")

// Verify migration
Bash("npm run db:status")
```

## CI/CD Patterns

### 1. GitHub Actions Setup

```javascript
// Create workflow
Write("/.github/workflows/ci.yml", workflowContent)

// Test locally
Bash("act -j test")

// Commit workflow
Bash("git add .github/workflows/ci.yml")
Bash("git commit -m 'ci: Add GitHub Actions workflow'")
```

### 2. Deployment Pipeline

```javascript
// Build for production
Bash("npm run build:prod")

// Run tests
Bash("npm run test:ci")

// Deploy
Bash("npm run deploy:staging")

// Smoke tests
Bash("npm run test:smoke")

// Deploy to production
Bash("npm run deploy:prod")
```

## Advanced Patterns

### 1. Monorepo Management

```javascript
// Navigate monorepo
Glob("packages/*/package.json")

// Update all packages
Bash("lerna run build")
Bash("lerna run test")

// Publish changes
Bash("lerna publish --conventional-commits")
```

### 2. Performance Profiling

```javascript
// Start profiling
Bash("node --inspect-brk app.js", run_in_background=true)

// Run performance test
Bash("npm run test:performance")

// Analyze results
Read("/performance-results.json")

// Stop profiling
KillBash(bash_id)
```

### 3. Security Scanning

```javascript
// Dependency audit
Bash("npm audit")

// Security scan
Task("security-manager", "Perform comprehensive security audit")

// Fix vulnerabilities
Bash("npm audit fix")

// Verify fixes
Bash("npm audit --audit-level=moderate")
```