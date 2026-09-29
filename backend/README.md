# Friday Backend

Phase 2 backend foundation for the Friday web-based AI agent.

## Principles

- Friday backend is independent of n8n.
- Long-running work will use tasks and workers rather than holding an HTTP request open.
- AI providers and tools will be implemented behind explicit interfaces.
- The existing Phase 1 frontend remains outside this backend directory.

## Development

From this directory:

```bash
npm install
npm run build
npm start
```

The API defaults to port 3001.

## Initial API

- GET /api/health
- GET /api/ready
- POST /api/chat
- POST /api/tasks
- GET /api/tasks/:id
