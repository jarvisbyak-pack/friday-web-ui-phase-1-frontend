# Friday Backend

Phase 2 backend foundation for the Friday web-based AI agent, independent of n8n.

## Current capabilities

- PostgreSQL-backed task persistence and background worker execution.
- Stale-task recovery for interrupted workers.
- Gemini provider abstraction with function/tool calling.
- Agent orchestration with bounded steps.
- Safe built-in status/echo tools.
- Persistent conversations and messages.
- Persistent long-term memory records with text search.
- Database-backed task/agent execution events.
- Server-Sent Events endpoint for live task progress.
- User authentication with hashed passwords and revocable database sessions.
- User ownership checks for conversations, memories, and tasks.
- GitHub read tools for repositories, files, and code search.
- GitHub mutation tools for branches, files, and pull requests, protected by an explicit feature flag.
- Authenticated file storage with per-user ownership, size limits, checksums, and agent read/list tools.
- Explicit API and service boundaries for future files, browser, code-execution, and deployment tools.

## Principles

- Friday backend is independent of n8n.
- Long-running work uses tasks and workers rather than holding an HTTP request open.
- AI providers and tools are implemented behind explicit interfaces.
- Runtime verification remains a separate step and must not be assumed from source-level checks.
- Protected APIs require a Bearer session token.
- GitHub mutations are disabled by default.

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
- GET /api/files
- POST /api/files
- GET /api/files/:id
- POST /api/tasks
- GET /api/tasks/:id
- GET /api/tasks/:id/events — Server-Sent Events stream; supports ?after=<sequence>

### Agent GitHub tools

The agent registry currently exposes:
- github.list_repositories
- github.get_file
- github.search_code
- github.create_branch
- github.upsert_file
- github.create_pull_request
- files.list
- files.read

Set `GITHUB_TOKEN` for GitHub access. Set `FRIDAY_ALLOW_GITHUB_MUTATIONS=true` only when repository mutations are intentionally authorized. The mutation flag defaults to false.

Runtime verification of registration, login, protected routes, migrations, agent execution, GitHub access, and worker behavior remains pending until the local PC is available.
