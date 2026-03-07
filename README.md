# CodeSense — Code Review Platform

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Node](https://img.shields.io/badge/Node-20-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1)
![Redis](https://img.shields.io/badge/Redis-7-DC382D)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Demo
[GIF placeholder: `demo.gif` — show the review flow]

Live demo link: https://codesense.vercel.app

## Architecture
```text
┌─────────────────────────────────────────────────────────────────┐
│                         CodeSense                               │
├──────────────┬──────────────────────────────────────────────────┤
│   React UI   │  Monaco Editor + SSE streaming + Recharts        │
├──────────────┼──────────────────────────────────────────────────┤
│  Express API │  REST routes + GitHub OAuth + Webhook handler    │
├──────────────┼──────────────────────────────────────────────────┤
│  BullMQ      │  Async job queue (concurrency: 3)                │
├──────────────┼──────────────────────────────────────────────────┤
│  Review Flow │  Tree-sitter → Chunker → Embeddings → Agent  │
├──────────────┼──────────────────────────────────────────────────┤
│  PostgreSQL  │  pgvector (embeddings) + Prisma ORM              │
│  + Redis     │  Session store + BullMQ + Rate limiting          │
└──────────────┴──────────────────────────────────────────────────┘
```

## Features
- AST-based function extraction (Tree-sitter)
- Cyclomatic complexity scoring (McCabe algorithm)
- Semantic code search via pgvector embeddings
- Multi-step review agent (analyze → refactor → summarize)
- Real-time streaming output via Server-Sent Events
- GitHub OAuth + webhook for automatic PR analysis
- Redis sliding window rate limiting
- Full review history with health score trends

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Monaco Editor, Recharts |
| Backend | Node.js, Express, TypeScript, Passport.js, express-session |
| Data | PostgreSQL 15 + pgvector, Prisma ORM |
| Async | Redis, BullMQ |
| Review Engine | Hosted model + embeddings |
| Parsing | tree-sitter, tree-sitter-javascript, tree-sitter-python |
| Infra | Vercel (web), Railway (API), Supabase (Postgres), GitHub Actions |

## Getting Started
1. Clone:
```bash
git clone https://github.com/your-org/codesense.git
cd codesense
```
2. Start infrastructure:
```bash
docker compose up -d
```
3. Install dependencies:
```bash
npm install
```
4. Configure environment:
Fill in the `.env` file in the repository root with your local values.
5. Generate Prisma client and run migration:
```bash
npm --workspace @codesense/api run prisma:generate
npm --workspace @codesense/api run prisma:migrate
```
6. Run both apps:
```bash
npm run dev
```
7. Web app: `http://localhost:5173` API: `http://localhost:3001`

## API Reference
### `POST /api/review`
- Auth: required
- Body:
```json
{ "code": "function test() {}", "language": "javascript" }
```
- Response:
```json
{ "reviewId": "clxyz...", "jobId": "42" }
```

### `GET /api/review/:id`
- Auth: required
- Returns persisted review document with status, findings, refactored output, health score.

### `GET /api/review/:id/stream`
- Auth: required
- SSE event types:
```json
{ "type": "progress", "data": { "step": "embed", "percent": 80 } }
{ "type": "token", "data": { "text": "..." } }
{ "type": "findings", "data": [] }
{ "type": "complete", "data": {} }
```

### `POST /api/search`
- Auth: required
- Body:
```json
{ "query": "find authentication handlers", "repositoryId": "repo_id" }
```

### `POST /api/webhook/github`
- Verifies `X-Hub-Signature-256`.
- On `pull_request` events, enqueues async analysis.

### `GET /api/history`
- Auth: required
- Query params: `page`, `limit`, `language`, `sortBy`.

## Architecture Decisions
- **pgvector over Pinecone**: fewer moving parts, easier SQL joins on repository metadata, lower operational overhead.
- **BullMQ over direct async execution**: durable retries, persistent job state, explicit concurrency controls.
- **SSE over WebSockets**: review flow is server-to-client only, so SSE keeps protocol simpler and works cleanly over HTTP infrastructure.
- **Tree-sitter over regex parsing**: syntax-aware, language-aware parsing with robust handling of nested structures and edge cases.

## Monorepo Layout
```text
codesense/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── shared/
├── .github/workflows/
├── docker-compose.yml
└── .env
```
