# 🚦 PORT ASSIGNMENT PROTOCOL FOR CLAUDE AGENTS

**Created:** 2025-08-25  
**Purpose:** Prevent localhost port conflicts across multiple projects

## 🚨 CRITICAL ISSUE IDENTIFIED

Multiple projects have been assigned to the same localhost ports, causing conflicts:
- **Port 8080**: Used by 4 different projects simultaneously
- **Port 3000**: Potential conflicts with default React/Node ports

## ✅ SOLUTION IMPLEMENTED

### 1. Port Registry System
- Location: `/Users/Danallovertheplace/pachacuti/config/port-registry.json`
- Tracks all port assignments across projects
- Identifies conflicts automatically
- Maintains list of available ports

### 2. Port Availability Checker Script
- Location: `/Users/Danallovertheplace/pachacuti/scripts/check-port-availability.sh`
- Checks both system processes and registry
- Suggests available ports based on project type
- Registers new assignments

## 📋 CURRENT PORT ASSIGNMENTS

| Port | Project | Type | Status |
|------|---------|------|--------|
| 3000 | slack-integration | Webhook | ✅ Active |
| 3001 | shell-viewer-backend | Backend API | ✅ Active |
| 3002 | shell-viewer-frontend | Frontend | ✅ Active |
| 5173 | crypto-campaign-setup | Frontend | ✅ Active |
| 8080 | MULTIPLE PROJECTS | Frontend | ❌ CONFLICT |

## 🔧 HOW TO USE

### Before Starting Any Project:

1. **Check if your desired port is available:**
   ```bash
   ./scripts/check-port-availability.sh check 3000 my-project
   ```

2. **Get a suggested available port:**
   ```bash
   ./scripts/check-port-availability.sh suggest frontend
   # or
   ./scripts/check-port-availability.sh suggest backend
   ```

3. **Register your port assignment:**
   ```bash
   ./scripts/check-port-availability.sh register 3003 my-project frontend /path/to/project
   ```

4. **List all current assignments:**
   ```bash
   ./scripts/check-port-availability.sh list
   ```

## 🎯 PORT ASSIGNMENT GUIDELINES

### Frontend Applications
- **Primary Range:** 3003-3010
- **Secondary Range:** 5174-5180
- **Tertiary Range:** 8081-8090
- **Default Frameworks:**
  - React (CRA): 3000 (avoid if possible)
  - Vite: 5173 (already taken)
  - Next.js: 3000 (avoid if possible)

### Backend APIs
- **Primary Range:** 3001, 3006-3020
- **Secondary Range:** 4000-4010
- **Tertiary Range:** 5000-5010
- **Express/Node defaults:** Often 3000 or 5000

### Reserved Ports (DO NOT USE)
- 3306: MySQL
- 5432: PostgreSQL
- 6379: Redis
- 27017: MongoDB
- 9200: Elasticsearch

## 🚀 AUTOMATED CHECKS

### For Claude Agents
The following has been added to CLAUDE.md:
- Mandatory port checking before assignment
- Registry consultation requirement
- Conflict resolution protocol

### Pre-flight Checks
Before running any development server:
1. Check port availability
2. Update vite.config.js/package.json if needed
3. Register the port in the registry
4. Document in project README

## 📝 RESOLVING EXISTING CONFLICTS

### Projects Needing Port Reassignment:
1. **note-clarify-organizer**: Change from 8080 → 8081
2. **voter-analytics-hub**: Change from 8080 → 8082
3. **social-survey-secure-haven**: Change from 8080 → 8083
4. **minimalist-web-design**: Change from 8080 → 8084

### How to Fix:
```javascript
// In vite.config.js or vite.config.ts
export default defineConfig({
  server: {
    host: "::",
    port: 8081,  // Changed from 8080
  },
  // ... rest of config
})
```

## 🔍 MONITORING

### Check Active Ports:
```bash
# See what's actually running
lsof -i :3000-9000 | grep LISTEN

# Check specific port
lsof -i :3000
```

### Update Registry:
After any port changes, update:
`/Users/Danallovertheplace/pachacuti/config/port-registry.json`

## 🎓 BEST PRACTICES

1. **Always check before assigning**
2. **Register immediately after assignment**
3. **Use project-specific ports consistently**
4. **Document in project README**
5. **Clean up registry when projects are archived**
6. **Prefer higher port numbers for new projects**
7. **Group related services (e.g., backend: 3001, frontend: 3002)**

## 🛡️ GUARDRAILS ADDED

The following guardrails are now active in CLAUDE.md:
- Port checking is mandatory
- Registry consultation required
- Conflict alerts before assignment
- Suggested port ranges by project type
- Automated conflict detection

## 📊 METRICS

- **Total Projects Tracked:** 13+
- **Active Port Assignments:** 5
- **Identified Conflicts:** 1 (affecting 4 projects)
- **Available Ports:** 50+
- **Success Rate Target:** 100% conflict-free assignments

---

**Remember:** A properly managed port assignment system prevents development friction and ensures smooth multi-project workflows!