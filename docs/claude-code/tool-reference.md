# Claude Code Tool Reference

## Complete Tool Directory

### 1. File Operations

#### Read Tool
- **Purpose**: Read files from local filesystem
- **Parameters**:
  - `file_path` (required): Absolute path to file
  - `offset` (optional): Line number to start reading from
  - `limit` (optional): Number of lines to read (default: 2000)
- **Features**:
  - Reads text, images (PNG, JPG, etc.), PDFs, Jupyter notebooks
  - Returns content with line numbers (cat -n format)
  - Truncates lines over 2000 characters
  - Multimodal support for visual content
- **Best Practices**:
  - Always use absolute paths
  - Batch multiple reads in single message for performance
  - Read whole file when possible (don't specify offset/limit)

#### Write Tool
- **Purpose**: Write new files to filesystem
- **Parameters**:
  - `file_path` (required): Absolute path for new file
  - `content` (required): File content to write
- **Important Rules**:
  - MUST read existing files first before overwriting
  - Overwrites existing files completely
  - Prefer Edit/MultiEdit for existing files
  - Never proactively create documentation files

#### Edit Tool
- **Purpose**: Make precise string replacements in files
- **Parameters**:
  - `file_path` (required): Absolute path to file
  - `old_string` (required): Exact text to replace
  - `new_string` (required): Replacement text
  - `replace_all` (optional): Replace all occurrences (default: false)
- **Requirements**:
  - Must Read file first before editing
  - `old_string` must be unique unless using `replace_all`
  - Preserve exact indentation from file
  - Never include line numbers in strings

#### MultiEdit Tool
- **Purpose**: Multiple edits to single file in one operation
- **Parameters**:
  - `file_path` (required): Absolute path to file
  - `edits` (required): Array of edit operations
    - `old_string`: Text to replace
    - `new_string`: Replacement text
    - `replace_all`: Optional, replace all occurrences
- **Features**:
  - Applies edits sequentially
  - Atomic operation (all succeed or none apply)
  - More efficient than multiple Edit calls
  - Can create new files with empty `old_string` on first edit

#### NotebookEdit Tool
- **Purpose**: Edit Jupyter notebook cells
- **Parameters**:
  - `notebook_path` (required): Absolute path to .ipynb file
  - `new_source` (required): New cell content
  - `cell_id` (optional): ID of cell to edit
  - `cell_type` (optional): 'code' or 'markdown'
  - `edit_mode` (optional): 'replace', 'insert', or 'delete'
- **Features**:
  - Replace, insert, or delete cells
  - Supports code and markdown cells
  - Cell insertion after specified ID

### 2. Search & Navigation

#### Glob Tool
- **Purpose**: Fast file pattern matching
- **Parameters**:
  - `pattern` (required): Glob pattern (e.g., "**/*.js")
  - `path` (optional): Directory to search (default: current)
- **Features**:
  - Works with any codebase size
  - Returns paths sorted by modification time
  - Supports standard glob patterns
- **Best For**: Finding files by name patterns

#### Grep Tool
- **Purpose**: Powerful content search (ripgrep-based)
- **Parameters**:
  - `pattern` (required): Regex pattern to search
  - `path` (optional): File/directory to search
  - `output_mode` (optional): 'files_with_matches', 'content', 'count'
  - `glob` (optional): File pattern filter
  - `type` (optional): File type filter
  - `-i` (optional): Case insensitive
  - `-n` (optional): Show line numbers
  - `-A/-B/-C` (optional): Context lines
  - `multiline` (optional): Enable cross-line patterns
  - `head_limit` (optional): Limit output lines
- **Important**: NEVER use grep/rg in Bash, always use this tool

#### LS Tool
- **Purpose**: List directory contents
- **Parameters**:
  - `path` (required): Absolute directory path
  - `ignore` (optional): Array of glob patterns to ignore
- **Note**: Prefer Glob/Grep when you know what to search

### 3. Shell & System

#### Bash Tool
- **Purpose**: Execute shell commands
- **Parameters**:
  - `command` (required): Command to execute
  - `description` (optional): 5-10 word description
  - `timeout` (optional): Timeout in ms (max 600000)
  - `run_in_background` (optional): Run asynchronously
- **Important Rules**:
  - Quote paths with spaces
  - Use absolute paths, avoid `cd`
  - Never use find/grep/cat/head/tail - use dedicated tools
  - Always use `rg` instead of `grep` if needed
  - Batch multiple commands with `;` or `&&`
  - Max output: 30000 characters

#### BashOutput Tool
- **Purpose**: Get output from background shells
- **Parameters**:
  - `bash_id` (required): Background shell ID
  - `filter` (optional): Regex to filter output
- **Features**:
  - Returns only new output since last check
  - Includes stdout and stderr
  - Optional regex filtering

#### KillBash Tool
- **Purpose**: Terminate background shells
- **Parameters**:
  - `shell_id` (required): Shell ID to terminate

### 4. Web & Research

#### WebSearch Tool
- **Purpose**: Search the web for current information
- **Parameters**:
  - `query` (required): Search query (min 2 chars)
  - `allowed_domains` (optional): Include only these domains
  - `blocked_domains` (optional): Exclude these domains
- **Notes**:
  - US-only availability
  - Returns formatted search results
  - Use for info beyond knowledge cutoff

#### WebFetch Tool
- **Purpose**: Fetch and analyze web content
- **Parameters**:
  - `url` (required): Full URL to fetch
  - `prompt` (required): What to extract/analyze
- **Features**:
  - Converts HTML to markdown
  - AI-powered content analysis
  - 15-minute cache for repeated URLs
  - Handles redirects
  - Read-only operation

### 5. Task Management

#### TodoWrite Tool
- **Purpose**: Manage task lists for coding sessions
- **Parameters**:
  - `todos` (required): Array of todo items
    - `content`: Task description (imperative)
    - `activeForm`: Present continuous form
    - `status`: 'pending', 'in_progress', 'completed'
- **When to Use**:
  - Complex multi-step tasks (3+ steps)
  - Non-trivial implementations
  - Multiple user requests
  - After receiving new instructions
- **Rules**:
  - Only ONE task in_progress at a time
  - Mark completed immediately after finishing
  - Never mark incomplete work as completed
  - Always provide both content and activeForm

#### ExitPlanMode Tool
- **Purpose**: Exit planning mode and start coding
- **Parameters**:
  - `plan` (required): Markdown-formatted plan
- **Use Only When**: Planning implementation steps that require code

### 6. Agent Orchestration

#### Task Tool (Agent Spawning)
- **Purpose**: Launch specialized AI agents
- **Parameters**:
  - `description` (required): 3-5 word task description
  - `prompt` (required): Detailed task instructions
  - `subagent_type` (required): Agent type to spawn
- **Available Agents** (54 total):
  - **General**: general-purpose, coder, reviewer, tester, planner, researcher
  - **SPARC**: sparc-coord, sparc-coder, specification, pseudocode, architecture, refinement
  - **Swarm**: swarm-init, smart-agent, task-orchestrator, adaptive-coordinator
  - **GitHub**: pr-manager, issue-tracker, release-manager, github-modes
  - **Specialized**: backend-dev, mobile-dev, ml-developer, api-docs, cicd-engineer
  - **Testing**: tdd-london-swarm, production-validator, code-analyzer
  - **Consensus**: byzantine-coordinator, raft-manager, gossip-coordinator
- **Best Practices**:
  - Launch multiple agents concurrently
  - Provide detailed, autonomous instructions
  - Specify expected return information
  - Trust agent outputs

## Git Operations Reference

### Committing Changes
1. **Parallel Status Check**:
   ```bash
   git status  # Check untracked files
   git diff    # See all changes
   git log -5  # Recent commits for style
   ```

2. **Stage & Commit**:
   ```bash
   git add <files>
   git commit -m "$(cat <<'EOF'
   Your message here
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

3. **Important**:
   - Never update git config
   - Don't push unless asked
   - Retry once if pre-commit hooks fail
   - Use HEREDOC for commit messages

### Pull Requests
1. **Analyze Changes**:
   ```bash
   git status
   git diff
   git log main..HEAD
   git diff main...HEAD
   ```

2. **Create PR**:
   ```bash
   gh pr create --title "Title" --body "$(cat <<'EOF'
   ## Summary
   - Point 1
   - Point 2
   
   ## Test plan
   - [ ] Test 1
   - [ ] Test 2
   
   🤖 Generated with Claude Code
   EOF
   )"
   ```

## Performance Guidelines

### Batching Operations
**ALWAYS batch operations in single message**:
- Multiple file reads
- Multiple file edits
- Multiple bash commands
- Multiple agent spawns
- Multiple todo updates

### Tool Selection Priority
1. **For file search**: Glob → Grep → Task agent
2. **For code search**: Grep with appropriate filters
3. **For complex search**: Task agent with researcher
4. **For file reading**: Read tool directly
5. **For multiple edits**: MultiEdit over multiple Edits

### Avoid These Commands in Bash
- `find` → Use Glob tool
- `grep` → Use Grep tool
- `cat`, `head`, `tail` → Use Read tool
- `ls` → Use LS tool
- Interactive commands (`-i` flags)

## Special Features

### Multi-modal Support
- Read tool handles images (PNG, JPG, etc.)
- PDF processing with text and visual extraction
- Jupyter notebook complete cell reading

### Background Execution
- Use `run_in_background` for long-running commands
- Monitor with BashOutput tool
- Terminate with KillBash tool

### Session Management
- TodoWrite for task tracking
- Hooks for automated workflows
- Memory coordination across agents

## Common Patterns

### File Creation Workflow
```javascript
// Wrong: Create files unnecessarily
Write("/new-file.md", content)

// Right: Edit existing or create only when needed
Read("/existing-file.md")
Edit("/existing-file.md", old, new)
```

### Search Workflow
```javascript
// Find files by pattern
Glob("**/*.test.js")

// Search content
Grep("function.*test", {output_mode: "content"})

// Complex search
Task("researcher", "Find all authentication flows")
```

### Concurrent Workflow
```javascript
// Single message with all operations
[BatchOperations]:
  Read("/file1.js")
  Read("/file2.js")
  Bash("npm test")
  Bash("npm run lint")
  TodoWrite([todo1, todo2, todo3])
```

## Error Handling

### Common Issues
- **Edit fails**: old_string not unique - add more context
- **Write fails**: Didn't read file first
- **Bash timeout**: Increase timeout or use background
- **Agent blocked**: Check hooks configuration

### Recovery Strategies
1. Read file before any edit/write
2. Use replace_all for multiple occurrences
3. Quote paths with spaces in Bash
4. Batch operations to reduce failures
5. Mark todos in_progress before starting