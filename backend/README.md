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
- User authentication with hashed passwords and revocable database sessions.
- User ownership checks for conversations, memories, and tasks.
- Explicit API and service boundaries so GitHub, files, browser, and code-execution tools can be added without replacing the core.

## Principles

- Friday backend is independent of n8n.
- Long-running work uses tasks and workers rather than holding an HTTP request open.
- AI providers and tools are implemented behind explicit interfaces.
- Runtime verification remains a separate step and must not be assumed from source-level checks.
- Protected APIs require a Bearer session token.

## Development

From this directory:

```bash
npm install
npm run build
npm start
```

The API defaults to port 3001.

## API

### Public
- GET /api/health
- GET /api/ready
- POST /api/auth/register
- POST /api/auth/login

### Authenticated
- GET /api/auth/me
- POST /api/auth/logout
- POST /api/chat
- POST /api/agent
- POST /api/conversations
- GET /api/conversations
- GET /api/conversations/:id/messages
- POST /api/conversations/:id/messages
- POST /api/memories
- GET /api/memories?q=...
- POST /api/tasks
- GET /api/tasks/:id
- GET /api/tasks/:id/events — Server-Sent Events stream; supports ?after=<sequence>

Authentication and ownership are now enforced at the API boundary. Runtime verification of registration, login, protected routes, database migrations, and agent execution remains pending until the local PC is available.
