# MCP Server Setup Guide for Claude Desktop

## ✅ Fixed Configuration Location

MCP servers must be configured in Claude Desktop's config file, NOT in `.claude.json`.

**Correct Location**: 
`~/Library/Application Support/Claude/claude_desktop_config.json`

## 📋 Currently Configured MCP Servers

1. **claude-flow** - AI swarm orchestration ✅
2. **ruv-swarm** - Distributed agent coordination ✅  
3. **github** - Repository operations (needs token)
4. **figma** - Design file access ✅
5. **supabase** - Database operations (needs credentials)
6. **puppeteer** - Browser automation ✅

## 🔧 Configuration Status

### Working Servers:
- ✅ **Figma MCP**: Token configured and ready
- ✅ **Claude Flow**: No credentials needed
- ✅ **Puppeteer**: No credentials needed

### Need Setup:
- ⚠️ **GitHub**: Add personal access token
- ⚠️ **Supabase**: Add project URL and anon key

## 📝 How to Add Credentials

1. Open config file:
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Add missing credentials:
- GitHub token in `GITHUB_PERSONAL_ACCESS_TOKEN`
- Supabase URL in `SUPABASE_URL`
- Supabase key in `SUPABASE_ANON_KEY`

3. Restart Claude Desktop app

## 🚨 Important Notes

- **DO NOT** configure MCP servers in `~/.claude.json` - they won't work
- Always restart Claude Desktop after config changes
- Figma token is already configured and working
- Test servers using the MCP tools in Claude Desktop

## 🔍 Troubleshooting

If MCP servers don't appear:
1. Check config file exists at correct location
2. Verify JSON syntax is valid
3. Restart Claude Desktop completely
4. Check Console.app for errors

## 📂 File Locations

- Config: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Figma token backup: `~/.figma-mcp-config.json`
- Logs: Check Console.app for "Claude" entries