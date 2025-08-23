# Claude Code Troubleshooting Guide

## Common Issues and Solutions

### File Operation Errors

#### Issue: "Edit failed - old_string not found"
**Symptoms**: Edit tool fails with error that old_string doesn't match

**Solutions**:
1. Read the file first to see exact content:
   ```javascript
   Read("/path/to/file.js")
   ```

2. Copy the exact text including whitespace:
   - Include all spaces and tabs
   - Don't include line numbers from Read output
   - Preserve exact indentation

3. Make old_string unique by including more context:
   ```javascript
   Edit(file, 
     "function foo() {\n  return bar;",  // More context
     "function foo() {\n  return baz;"
   )
   ```

4. Use replace_all for multiple occurrences:
   ```javascript
   Edit(file, "oldVar", "newVar", replace_all=true)
   ```

#### Issue: "Write failed - file already exists"
**Symptoms**: Cannot overwrite existing file

**Solutions**:
1. Read the file first:
   ```javascript
   Read("/existing/file.js")
   Write("/existing/file.js", newContent)
   ```

2. Use Edit/MultiEdit for existing files:
   ```javascript
   MultiEdit("/existing/file.js", edits)
   ```

#### Issue: "Path not found"
**Symptoms**: File or directory doesn't exist

**Solutions**:
1. Check path exists:
   ```javascript
   LS("/parent/directory")
   ```

2. Create directory first:
   ```javascript
   Bash("mkdir -p /path/to/directory")
   Write("/path/to/directory/file.js", content)
   ```

3. Use absolute paths:
   ```javascript
   // ❌ Wrong
   Read("src/file.js")
   
   // ✅ Right
   Read("/Users/name/project/src/file.js")
   ```

### Bash Command Issues

#### Issue: "Command not found"
**Symptoms**: Bash command fails with "command not found"

**Solutions**:
1. Check if command is installed:
   ```javascript
   Bash("which npm")
   ```

2. Use full path to command:
   ```javascript
   Bash("/usr/local/bin/npm install")
   ```

3. Check PATH environment:
   ```javascript
   Bash("echo $PATH")
   ```

#### Issue: "Command timeout"
**Symptoms**: Long-running command times out

**Solutions**:
1. Increase timeout:
   ```javascript
   Bash("npm install", timeout=600000)  // 10 minutes
   ```

2. Run in background:
   ```javascript
   Bash("npm run dev", run_in_background=true)
   BashOutput(bash_id)  // Check output later
   ```

3. Break into smaller commands:
   ```javascript
   Bash("npm ci")  // Faster than npm install
   ```

#### Issue: "Path with spaces"
**Symptoms**: Commands fail when paths contain spaces

**Solutions**:
1. Always quote paths:
   ```javascript
   // ❌ Wrong
   Bash("cd /My Documents/project")
   
   // ✅ Right
   Bash("cd \"/My Documents/project\"")
   ```

2. Escape spaces:
   ```javascript
   Bash("cd /My\\ Documents/project")
   ```

### Search Tool Issues

#### Issue: "No matches found"
**Symptoms**: Grep/Glob returns no results

**Solutions**:
1. Check pattern syntax:
   ```javascript
   // Grep uses regex, not glob
   Grep("function.*test")  // ✅ Regex
   Grep("*.js")  // ❌ Glob pattern in Grep
   ```

2. Use case-insensitive search:
   ```javascript
   Grep("error", {-i: true})
   ```

3. Check file filters:
   ```javascript
   Grep("test", {glob: "**/*.js"})  // Only JS files
   ```

4. Try broader patterns:
   ```javascript
   Glob("**/*")  // All files
   Grep(".", {output_mode: "files_with_matches"})  // Any content
   ```

#### Issue: "Pattern too complex"
**Symptoms**: Complex regex fails or times out

**Solutions**:
1. Simplify pattern:
   ```javascript
   // Instead of complex regex
   Grep("simple", {output_mode: "files_with_matches"})
   // Then read and process
   ```

2. Use multiline mode for cross-line patterns:
   ```javascript
   Grep("start.*end", {multiline: true})
   ```

3. Use Task agent for complex searches:
   ```javascript
   Task("researcher", "Find all authentication flows")
   ```

### Git Operation Issues

#### Issue: "Nothing to commit"
**Symptoms**: Git commit fails with no changes

**Solutions**:
1. Check status first:
   ```javascript
   Bash("git status")
   ```

2. Stage changes:
   ```javascript
   Bash("git add -A")
   ```

3. Check for .gitignore:
   ```javascript
   Read("/.gitignore")
   ```

#### Issue: "Pre-commit hook failed"
**Symptoms**: Commit blocked by hooks

**Solutions**:
1. Fix issues and retry:
   ```javascript
   Bash("npm run lint:fix")
   Bash("git add -A")
   Bash("git commit -m 'message'")
   ```

2. Check hook requirements:
   ```javascript
   Read("/.husky/pre-commit")
   ```

#### Issue: "Merge conflicts"
**Symptoms**: Git operations blocked by conflicts

**Solutions**:
1. Check conflict status:
   ```javascript
   Bash("git status")
   ```

2. Read conflicted files:
   ```javascript
   Read("/conflicted/file.js")
   ```

3. Resolve and continue:
   ```javascript
   Edit("/conflicted/file.js", "<<<<<<", resolvedContent)
   Bash("git add /conflicted/file.js")
   ```

### Agent and Task Issues

#### Issue: "Agent blocked by hook"
**Symptoms**: Task tool fails with hook error

**Solutions**:
1. Check hook configuration:
   ```javascript
   Read("/.claude/hooks.js")
   ```

2. Adjust approach based on feedback:
   ```javascript
   // If blocked for security
   Task("general-purpose", "Review code for security issues only")
   ```

3. Ask user to check hooks:
   ```
   "The task was blocked by a hook. Please check your hooks configuration."
   ```

#### Issue: "Agent timeout"
**Symptoms**: Agent doesn't return results

**Solutions**:
1. Simplify task:
   ```javascript
   // Break into smaller tasks
   Task("researcher", "Find authentication files")
   Task("coder", "Update auth logic")
   ```

2. Provide more specific instructions:
   ```javascript
   Task("coder", `
     SPECIFIC: Update only the login function in auth.js
     Return: Modified code
   `)
   ```

### Performance Issues

#### Issue: "Slow file operations"
**Symptoms**: File operations take too long

**Solutions**:
1. Batch operations:
   ```javascript
   // Single message with multiple operations
   Read(file1)
   Read(file2)
   Read(file3)
   ```

2. Use specific tools:
   ```javascript
   // Use Glob instead of LS for patterns
   Glob("**/*.test.js")
   ```

3. Limit search scope:
   ```javascript
   Grep("pattern", {path: "/src"})  // Search only in /src
   ```

#### Issue: "Out of memory"
**Symptoms**: Operations fail with memory errors

**Solutions**:
1. Process files in chunks:
   ```javascript
   Read("/large-file.txt", {offset: 0, limit: 1000})
   Read("/large-file.txt", {offset: 1000, limit: 1000})
   ```

2. Use streaming for large operations:
   ```javascript
   Bash("cat large.log | grep ERROR | head -100")
   ```

3. Clear unnecessary data:
   ```javascript
   // Process and discard
   Grep("pattern", {head_limit: 100})
   ```

### Web Tool Issues

#### Issue: "URL fetch failed"
**Symptoms**: WebFetch returns error

**Solutions**:
1. Check URL format:
   ```javascript
   WebFetch("https://example.com", "Extract title")  // Include https://
   ```

2. Handle redirects:
   ```javascript
   // If redirect message received
   WebFetch(redirectUrl, "Extract content")
   ```

3. Use WebSearch for general info:
   ```javascript
   WebSearch("react hooks documentation")
   ```

#### Issue: "Web search not available"
**Symptoms**: WebSearch fails with availability error

**Solutions**:
1. Use WebFetch with specific URL:
   ```javascript
   WebFetch("https://docs.example.com", "Find API information")
   ```

2. Use local documentation:
   ```javascript
   Read("/docs/api.md")
   ```

### Testing Issues

#### Issue: "Tests not found"
**Symptoms**: Test commands fail

**Solutions**:
1. Find test script:
   ```javascript
   Read("/package.json")  // Check scripts section
   ```

2. Search for test files:
   ```javascript
   Glob("**/*.{test,spec}.{js,ts}")
   ```

3. Check test configuration:
   ```javascript
   Read("/jest.config.js")  // or other test config
   ```

#### Issue: "Test failures"
**Symptoms**: Tests fail after changes

**Solutions**:
1. Run specific test:
   ```javascript
   Bash("npm test -- specific.test.js")
   ```

2. Check test output:
   ```javascript
   Bash("npm test -- --verbose")
   ```

3. Update snapshots if needed:
   ```javascript
   Bash("npm test -- -u")
   ```

### Environment Issues

#### Issue: "Module not found"
**Symptoms**: Node/Python modules missing

**Solutions**:
1. Install dependencies:
   ```javascript
   Bash("npm install")  // or pip install
   ```

2. Check package.json:
   ```javascript
   Read("/package.json")
   ```

3. Clear cache and reinstall:
   ```javascript
   Bash("rm -rf node_modules package-lock.json")
   Bash("npm install")
   ```

#### Issue: "Permission denied"
**Symptoms**: Operations fail with permission errors

**Solutions**:
1. Check file permissions:
   ```javascript
   Bash("ls -la /path/to/file")
   ```

2. Use proper paths:
   ```javascript
   // Work in user directory
   Bash("pwd")  // Check current directory
   ```

3. Don't modify system files:
   ```javascript
   // Avoid /etc, /usr, /System
   ```

## Error Recovery Strategies

### General Recovery Process

1. **Identify Error**:
   ```javascript
   // Read error message carefully
   // Check tool output
   ```

2. **Gather Context**:
   ```javascript
   Bash("pwd")  // Current directory
   LS("/working/directory")  // Check files
   Bash("git status")  // Check git state
   ```

3. **Attempt Fix**:
   ```javascript
   // Apply solution from above
   ```

4. **Verify Fix**:
   ```javascript
   // Retry original operation
   // Check for side effects
   ```

5. **Document Issue**:
   ```javascript
   TodoWrite([
     {content: "Resolved: [issue description]", status: "completed"}
   ])
   ```

### Rollback Strategies

#### Code Changes
```javascript
// Revert file to previous state
Bash("git checkout -- /path/to/file")

// Undo last commit
Bash("git reset --soft HEAD~1")
```

#### Database Changes
```javascript
// Use transactions
Bash("npm run db:rollback")
```

#### Dependency Changes
```javascript
// Restore package-lock
Bash("git checkout -- package-lock.json")
Bash("npm ci")
```

## Prevention Best Practices

### Before Starting Work
1. Read existing code first
2. Check dependencies are installed
3. Verify test suite passes
4. Understand project structure

### During Development
1. Test changes incrementally
2. Commit working states
3. Use version control
4. Keep backups of critical files

### After Changes
1. Run full test suite
2. Check for linting errors
3. Verify build succeeds
4. Document any issues

## Getting Help

### Self-Diagnosis
```javascript
// Check Claude Code version
Bash("claude --version")

// Check environment
Bash("env | grep CLAUDE")

// Check available tools
// Review this documentation
```

### Reporting Issues
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Include error messages
- Provide reproduction steps
- Share relevant file paths

### Community Resources
- Documentation: Review /docs/claude-code/
- Examples: Check workflow-patterns.md
- Best Practices: See best-practices.md

## Quick Reference

### Most Common Fixes
1. **Read before Edit**: Always read files first
2. **Use Absolute Paths**: Start with /
3. **Quote Spaces**: "path with spaces"
4. **Batch Operations**: Multiple in one message
5. **Check Status**: Git/test status before operations

### Tool Precedence
```
Read > cat
Grep > grep command
Glob > find command
LS > ls command
Edit > sed/awk
```

### Emergency Commands
```javascript
// Stop runaway process
KillBash(bash_id)

// Check system state
Bash("ps aux | grep node")

// Clear and restart
Bash("npm run clean && npm install")

// Recovery mode
Task("general-purpose", "Diagnose and fix current issues")
```