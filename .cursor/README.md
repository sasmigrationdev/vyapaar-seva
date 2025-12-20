# Cursor/Factory MCP Configuration

This directory contains the Model Context Protocol (MCP) configuration for this project.

## Files

- **`mcp.json`** - MCP server configuration for Supabase integration

## Quick Start

1. **Create Supabase Personal Access Token**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Generate new token
   - Copy it immediately

2. **Add to .env file** (in project root)
   ```bash
   SUPABASE_ACCESS_TOKEN=your_token_here
   ```

3. **Restart your IDE** (Cursor/VSCode) or Factory CLI

4. **Test it**
   Ask Droid: "Show me all tables in my database"

## Configuration Overview

This project uses **3 MCP servers**:

### 1. khatabook-supabase (Primary)
```json
{
  "command": "npx @supabase/mcp-server-supabase@latest",
  "project-ref": "yardyctualuppxckvobx",
  "requires": "SUPABASE_ACCESS_TOKEN"
}
```
**Use for:** Schema queries, migrations, type generation, full Supabase features

### 2. khatabook-supabase-hosted (Fallback)
```json
{
  "type": "http",
  "url": "https://mcp.supabase.com/mcp?project_ref=yardyctualuppxckvobx"
}
```
**Use for:** Quick queries, no token needed initially

### 3. khatabook-db-direct (Advanced)
```json
{
  "command": "npx @modelcontextprotocol/server-postgres",
  "requires": "DATABASE_URL"
}
```
**Use for:** Direct PostgreSQL access, raw SQL queries

## Environment Variables

Required in `.env`:

```bash
# Primary MCP server
SUPABASE_ACCESS_TOKEN=sbp_xxxxx

# Optional: Direct database access
DATABASE_URL=postgresql://postgres.yardyctualuppxckvobx:password@db.yardyctualuppxckvobx.supabase.co:5432/postgres
```

## Troubleshooting

**MCP not working?**
1. Check `.env` has `SUPABASE_ACCESS_TOKEN`
2. Restart IDE/Factory
3. Verify Node.js installed: `node --version`
4. Check you're in project directory

**Need help?**
See `../MCP_SETUP.md` for detailed instructions.
