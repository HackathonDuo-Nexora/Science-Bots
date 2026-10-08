# Science Bots — Backend

Express API backend for the Science Bots autonomous AI research system.

## Quick Start

```bash
cd Backend
cp .env.example .env
npm install
npm run dev
```

Server starts on `http://localhost:3000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/research` | Start a research session |
| GET | `/api/research/:id` | Get research state |
| GET | `/api/research/:id/events` | SSE stream |
| GET | `/api/research/:id/paper` | Get generated paper |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

## SSE Integration

Frontend connects via:

```js
const es = new EventSource(`${BACKEND_URL}/api/research/${researchId}/events`);
es.addEventListener('agent_update', (e) => { ... });
```

## Event Types

`research_started` · `agent_update` · `handoff` · `source_found` · `claim_verified`  
`insufficient_evidence` · `conflict_detected` · `revision_required` · `paper_updated`  
`paper_completed` · `error`
