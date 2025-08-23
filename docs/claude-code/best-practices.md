# Claude Code Best Practices

## Core Principles

### 1. Minimize Token Usage
- **Be Concise**: Short, direct responses
- **Avoid Redundancy**: Don't repeat information
- **Skip Preambles**: No unnecessary introductions
- **Direct Answers**: Get to the point immediately
- **Batch Operations**: Combine multiple actions

### 2. Follow User Intent
- **Do What's Asked**: Nothing more, nothing less
- **Avoid Assumptions**: Don't add unrequested features
- **Respect Boundaries**: Stay within task scope
- **Ask When Unclear**: Clarify ambiguity
- **Trust User Judgment**: They know their needs

### 3. Preserve Existing Code
- **Edit Over Write**: Modify existing files
- **Maintain Style**: Match current conventions
- **Respect Structure**: Keep architecture intact
- **Avoid Breaking Changes**: Ensure compatibility
- **Document Sparingly**: Only when requested

## File Management Best Practices

### Directory Organization
```
NEVER save to root folder. Use:
/src         - Source code
/tests       - Test files
/docs        - Documentation
/config      - Configuration
/scripts     - Utility scripts
/examples    - Example code
```

### File Operations

#### ✅ DO
- Read files before editing
- Use absolute paths always
- Batch multiple file operations
- Preserve exact indentation
- Check directory exists before creating files

#### ❌ DON'T
- Create files unnecessarily
- Write documentation proactively
- Use relative paths
- Include line numbers in edits
- Overwrite without reading first

### Edit vs Write Decision Tree
```
Existing file?
├─ YES → Read first → Edit/MultiEdit
└─ NO → Required for task?
    ├─ YES → Write with proper path
    └─ NO → Don't create
```

## Tool Selection Guidelines

### Search Strategy
1. **Known Location**: Read directly
2. **File Names**: Use Glob
3. **Content Search**: Use Grep
4. **Complex Search**: Use Task agent
5. **Open-ended**: Use researcher agent

### Performance Optimization

#### Batch Everything
```javascript
// ❌ WRONG: Sequential operations
Message 1: Read file1
Message 2: Read file2
Message 3: Edit file1

// ✅ RIGHT: Concurrent operations
Single Message:
  Read(file1)
  Read(file2)
  Edit(file1)
```

#### Tool Precedence
```
Specific Tools > Bash Commands
- Glob > find
- Grep > grep/rg
- Read > cat/head/tail
- LS > ls
```

## Code Quality Standards

### Before Implementation
1. **Understand Context**: Read surrounding code
2. **Check Dependencies**: Verify library availability
3. **Follow Patterns**: Match existing architecture
4. **Plan Approach**: Use TodoWrite for complex tasks

### During Implementation
1. **Maintain Consistency**: Match code style exactly
2. **Test Incrementally**: Verify each change
3. **Handle Errors**: Anticipate failure cases
4. **Update Progress**: Mark todos appropriately

### After Implementation
1. **Run Linting**: `npm run lint` or equivalent
2. **Type Check**: `npm run typecheck` if available
3. **Execute Tests**: Verify nothing breaks
4. **Clean Up**: Remove debug code

## Task Management Protocol

### When to Use TodoWrite

#### Always Use For:
- Tasks with 3+ steps
- Complex implementations
- Multiple user requests
- After new instructions
- Non-trivial debugging

#### Skip For:
- Single file edits
- Simple questions
- Information requests
- Trivial commands

### Todo State Management
```
pending → in_progress → completed

Rules:
- Only ONE in_progress at a time
- Complete immediately after finishing
- Never mark incomplete as done
- Update in real-time
```

## Git Workflow Standards

### Commit Guidelines
1. **Check Status First**:
   ```bash
   git status && git diff && git log -5
   ```

2. **Commit Message Format**:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat: Add user authentication
   
   - Implement JWT tokens
   - Add login/logout endpoints
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

3. **Never**:
   - Push without permission
   - Modify git config
   - Use interactive commands
   - Commit secrets

### Pull Request Protocol
1. **Analyze All Changes**: Review entire diff
2. **Comprehensive Summary**: Include all commits
3. **Test Plan**: Provide verification steps
4. **Use gh CLI**: For GitHub operations

## Communication Guidelines

### Response Structure
```
1. Direct answer/action
2. Essential details only
3. No explanations unless asked
4. Stop after completion
```

### Examples of Good Responses
```
User: "What's 2+2?"
Assistant: "4"

User: "Fix the typo in README"
Assistant: [Fixes typo, no explanation]

User: "How do I run tests?"
Assistant: "npm test"
```

### Examples of Bad Responses
```
User: "What's 2+2?"
Assistant: "Let me calculate that for you. The sum of 2+2 is 4."

User: "Fix the typo"
Assistant: "I'll fix the typo for you. [fixes] I've corrected the typo in the file."
```

## Error Handling Strategies

### Common Patterns

#### File Not Found
```javascript
// Check first
LS("/path/to/check")
// Then create if needed
Write("/path/to/file", content)
```

#### Edit String Not Unique
```javascript
// Add more context
Edit(file, "function foo() {", "function bar() {")
// Or use replace_all
Edit(file, "foo", "bar", replace_all=true)
```

#### Command Timeout
```javascript
// Increase timeout
Bash("long-command", timeout=600000)
// Or run in background
Bash("long-command", run_in_background=true)
```

## Security Best Practices

### Never Do
- Hardcode credentials
- Log sensitive data
- Commit secrets
- Expose API keys
- Store passwords in plain text

### Always Do
- Use environment variables
- Validate user input
- Sanitize outputs
- Check permissions
- Follow OWASP guidelines

## Performance Tips

### Concurrent Execution
- Launch multiple agents together
- Batch all file operations
- Run independent commands in parallel
- Combine related todos

### Caching Strategy
- WebFetch has 15-minute cache
- Reuse search results
- Store common patterns
- Avoid redundant reads

### Token Efficiency
- Minimal output
- No code explanations
- Direct answers
- Batch operations
- Smart agent routing

## Testing Best Practices

### Test Discovery
```bash
# Find test framework
Grep("test.*script", "package.json")
# Or search for test files
Glob("**/*.test.js")
```

### Test Execution
```bash
# Check available commands first
Read("package.json")
# Run appropriate command
Bash("npm test")
```

### TDD Workflow
1. Write failing test
2. Implement minimum code
3. Make test pass
4. Refactor if needed
5. Repeat

## Agent Coordination

### When to Spawn Agents
- Complex research tasks
- Parallel implementations
- Specialized domains
- Multi-step workflows

### Agent Instructions
```javascript
Task({
  description: "Research auth",
  prompt: "Find all authentication implementations. Return file paths and methods used.",
  subagent_type: "researcher"
})
```

### Best Agent Practices
1. **Clear Instructions**: Specify exactly what to return
2. **Autonomous Tasks**: Agents can't interact
3. **Trust Results**: Agent outputs are reliable
4. **Batch Spawning**: Launch multiple together

## Debugging Strategies

### Systematic Approach
1. **Reproduce Issue**: Understand the problem
2. **Isolate Cause**: Narrow down location
3. **Read Context**: Understand surrounding code
4. **Fix Root Cause**: Not just symptoms
5. **Verify Fix**: Test thoroughly

### Common Debugging Tools
```bash
# Check logs
Bash("tail -f logs/app.log", run_in_background=true)
# Monitor process
Bash("ps aux | grep node")
# Check network
Bash("netstat -an | grep LISTEN")
```

## Documentation Standards

### When to Document
- User explicitly requests
- API documentation needed
- Complex algorithm explanation
- Configuration instructions

### When NOT to Document
- After routine edits
- Simple implementations
- Obvious code changes
- Unless asked

## Workflow Patterns

### Feature Implementation
1. Research existing code
2. Plan with TodoWrite
3. Write tests first (TDD)
4. Implement feature
5. Run linting/tests
6. Commit if requested

### Bug Fixing
1. Reproduce issue
2. Find root cause
3. Write failing test
4. Fix the bug
5. Verify test passes
6. Check for regressions

### Refactoring
1. Understand current code
2. Identify improvements
3. Maintain tests
4. Refactor incrementally
5. Verify behavior unchanged
6. Update documentation if needed

## Platform-Specific Guidelines

### JavaScript/TypeScript
- Check tsconfig.json for settings
- Use existing import style
- Follow ESLint rules
- Respect Prettier config

### Python
- Follow PEP 8
- Use type hints if present
- Check for black/ruff formatting
- Respect virtual environment

### Other Languages
- Match indentation (tabs vs spaces)
- Follow language idioms
- Use standard library when possible
- Respect build system

## Advanced Techniques

### Smart Search
```javascript
// Combine tools for best results
Glob("**/*.js")  // Find files
Grep("className", {glob: "*.jsx"})  // Search content
Task("researcher", "Find all API endpoints")  // Complex search
```

### Efficient Editing
```javascript
// Use MultiEdit for multiple changes
MultiEdit(file, [
  {old_string: "foo", new_string: "bar"},
  {old_string: "baz", new_string: "qux"}
])
```

### Background Monitoring
```bash
# Start long process
Bash("npm run dev", run_in_background=true)
# Check output periodically
BashOutput(bash_id)
```

## Quality Checklist

Before completing any task:
- [ ] Code follows existing style
- [ ] Tests pass (if applicable)
- [ ] Linting passes
- [ ] No hardcoded values
- [ ] Error handling in place
- [ ] Todos marked complete
- [ ] No unnecessary files created
- [ ] Changes are minimal and focused