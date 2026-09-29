# Friday Backend

Phase 2 backend foundation for the Friday web-based AI agent, independent of n8n.

## Current capabilities

- PostgreSQL-backed task persistence and background worker execution.
- Stale-task recovery for interrupted workers.
- Gemini provider abstraction with function/tool calling.
- Agent orchestration with bounded steps and safe built-in tools.
- Persistent conversations and messages.
- Persistent long-term memory records with text search.
- Database-backed task/agent execution events.
- Server-Sent Events endpoint for live task progress.
- Explicit API and service boundaries so GitHub, files, browser, and code-execution tools can be added without replacing the core.

## Principles

- Friday backend is independent of n8n.
- Long-running work uses tasks and workers rather than holding an HTTP request open.
- AI providers and tools are implemented behind explicit interfaces.
- Runtime verification remains a separate step and must not be assumed from source-level checks.

## Development

From this directory:

```bash
npm install
npm run build
npm start
```

The API defaults to port 3001.

## API

### Core
- GET /api/health
- GET /api/ready
- POST /api/chat
- POST /api/agent

### Conversations and memory
- POST /api/conversations
- GET /api/conversations
- GET /api/conversations/:id/messages
- POST /api/conversations/:id/messages
- POST /api/memories
- GET /api/memories?q=...

### Tasks and progress
- POST /api/tasks
- GET /api/tasks/:id
- GET /api/tasks/:id/events — Server-Sent Events stream; supports ?after=<sequence>

Authentication/user ownership is intentionally not wired yet; that is the next security phase. Until authentication is added, these persistence endpoints should be treated as development-only interfaces.
