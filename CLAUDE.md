# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL:
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY:
- Coordination and planning
- Memory management
- Neural features
- Performance tracking
- Swarm orchestration
- GitHub integration

**KEY**: MCP coordinates, Claude Code executes.

## 🚀 Quick Setup

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

## 📋 Agent Coordination Protocol

### Every Agent MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT (Single Message):
```javascript
[BatchTool]:
  // Initialize swarm
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  
  // Spawn agents with Task tool
  Task("Research agent: Analyze requirements...")
  Task("Coder agent: Implement features...")
  Task("Tester agent: Create test suite...")
  
  // Batch todos
  TodoWrite { todos: [
    {id: "1", content: "Research", status: "in_progress", priority: "high"},
    {id: "2", content: "Design", status: "pending", priority: "high"},
    {id: "3", content: "Implement", status: "pending", priority: "high"},
    {id: "4", content: "Test", status: "pending", priority: "medium"},
    {id: "5", content: "Document", status: "pending", priority: "low"}
  ]}
  
  // File operations
  Bash "mkdir -p app/{src,tests,docs}"
  Write "app/src/index.js"
  Write "app/tests/index.test.js"
  Write "app/docs/README.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

Remember: **Claude Flow coordinates, Claude Code creates!**

## 📚 Claude Code Full Tool Awareness

### Complete Tool Reference (16 Tools)

#### File Operations
- **Read**: Read files, images, PDFs, Jupyter notebooks (multimodal support)
- **Write**: Create new files (must read existing files first)
- **Edit**: Precise string replacements (single edit)
- **MultiEdit**: Multiple edits to single file (batch operation)
- **NotebookEdit**: Edit Jupyter notebook cells

#### Search & Navigation
- **Glob**: Fast file pattern matching (e.g., "**/*.js")
- **Grep**: Powerful regex search (ripgrep-based, multiline support)
- **LS**: List directory contents (absolute paths required)

#### Shell & System
- **Bash**: Execute commands (timeout up to 600000ms, background support)
- **BashOutput**: Get output from background shells
- **KillBash**: Terminate background processes

#### Web & Task Management
- **WebSearch**: Search web for current information (US only)
- **WebFetch**: Fetch and analyze web content (15-min cache)
- **TodoWrite**: Task management (only ONE in_progress at a time)
- **ExitPlanMode**: Exit planning mode to start coding
- **Task**: Spawn 54 specialized agents for parallel execution

### Current Capabilities Summary
- ✅ All major programming languages
- ✅ 54 specialized AI agents for parallel work
- ✅ 2.8-4.4x faster with parallel execution
- ✅ Git/GitHub integration (gh CLI)
- ✅ TDD/BDD workflows
- ✅ Multi-modal support (text, images, PDFs)
- ✅ Background process management
- ✅ Web search and content fetching
- ✅ Automated testing frameworks

### Critical Workflow Patterns
- **ALWAYS batch operations**: Multiple tools in ONE message
- **Read before Edit/Write**: Must read files before modifying
- **Use absolute paths**: Never relative paths
- **Quote paths with spaces**: "path with spaces"
- **Tool precedence**: Grep > grep, Glob > find, Read > cat
- **Concurrent agents**: Launch multiple agents together
- **Immediate todo updates**: Mark complete right after finishing
- **Run linting**: After code changes (npm run lint, etc.)

### Tool Usage Quick Reference
```javascript
// Batch operations (CORRECT)
Read(file1); Read(file2); Edit(file3)  // Single message

// Search patterns
Glob("**/*.test.js")  // Find test files
Grep("function.*async", {multiline: true})  // Cross-line search

// Background execution
Bash("npm run dev", run_in_background=true)
BashOutput(bash_id)  // Check output later

// Agent orchestration
Task("coder", "Implement feature X")
Task("tester", "Write tests for X")
Task("reviewer", "Review implementation")
```

### Performance Optimizations
- Batch file operations: 70% faster
- Parallel agent execution: 2.8-4.4x speedup
- Smart caching: 15-min WebFetch cache
- Token optimization: 32.3% reduction
- Concurrent bash commands: Significant time savings

### Common Issues & Solutions
- **Edit fails**: Add more context to make old_string unique
- **Path errors**: Always use absolute paths and quote spaces
- **Timeout**: Increase timeout or use background execution
- **Agent blocked**: Check hooks configuration
- **No matches**: Use broader search patterns or Task agent

### Documentation Location
Full documentation available in `/docs/claude-code/`:
- tool-reference.md - Complete tool documentation
- capabilities.md - All capabilities listed
- best-practices.md - Usage guidelines
- workflow-patterns.md - Common patterns
- troubleshooting.md - Issue solutions
- advanced-features.md - Advanced usage

## 🛑 SESSION CHECKOUT COMMAND

When user says "checkout" or "/checkout", execute complete session termination protocol:

### CHECKOUT PROTOCOL (MANDATORY - NO SHORTCUTS):

**1. GIT OPERATIONS:**
- Check git status for uncommitted changes
- Stage all changes: `git add .`
- Create meaningful commit message based on work accomplished
- Push to GitHub: `git push origin main`
- Verify push succeeded

**2. CODE REVIEW & LOOSE ENDS:**
- Scan modified files for TODOs, console.logs, incomplete code
- Flag any issues for immediate attention
- Note work needing continuation in next session

**3. SECOND BRAIN DOCUMENTATION:**
- Create comprehensive session summary
- Document work accomplished, decisions made, problems solved
- Save to session logs with searchable metadata
- Link to git commits and file changes

**4. PACHACUTI COORDINATION:**
- Generate CTO summary (resource usage, progress, optimization opportunities)
- Flag strategic decisions needing review
- Update project coordination data

**5. NEXT SESSION PREP:**
- Document stopping point and context
- Prepare restoration information
- Note immediate next steps

**6. FINAL VERIFICATION:**
- Confirm GitHub updated ✅
- Confirm session documented ✅  
- Confirm Pachacuti has data ✅
- Ready for clean termination ✅

Execute ALL steps when user says "checkout" - no exceptions.

**7. CHECKOUT COMPLETION:**
- Always end checkout process by saying: "checkout completed."

## 🚀 PROJECT STARTUP COMMAND

When user says "startup [project-name]" or just "startup", execute complete project initialization protocol:

### STARTUP PROTOCOL (MANDATORY):

**1. PROJECT IDENTIFICATION & SETUP:**
- Identify current project from directory or user specification
- Load project-specific context and configuration
- Restore previous session state and priorities
- Check project health and dependencies

**2. OVERALL TASK MANAGER COORDINATION:**
- Connect with Pachacuti (CTO) for company-wide context
- Get current project priorities and resource allocation
- Check for cross-project dependencies and conflicts
- Update company-wide project status

**3. PROJECT-SPECIFIC AGENT ACTIVATION:**
- Spawn or connect to dedicated project manager agent
- Load project-specific goals, constraints, and context
- Initialize project workflows and automation
- Set up project-specific monitoring and tracking

**4. ENVIRONMENT PREPARATION:**
- git pull latest changes
- Check for dependency updates or issues
- Verify development environment setup
- Initialize any required services or tools

**5. CONTEXT RESTORATION:**
- Load last session summary and stopping point
- Review recent progress and completed work
- Identify immediate priorities and blockers
- Prepare work queue and next actions

**6. COORDINATION SETUP:**
- Establish communication between agents
- Set up progress reporting and monitoring
- Configure approval workflows and decision making
- Initialize session documentation and tracking

**7. READY STATE CONFIRMATION:**
- Confirm all systems operational
- Verify agent coordination working
- Display current project status and priorities
- Ready for productive development work

Execute ALL steps when user says "startup" - coordinate all agents properly.

**8. STARTUP COMPLETION:**
- Always end startup process by saying: "Start up complete, ready to work."

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
