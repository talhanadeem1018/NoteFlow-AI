# Development Guide

## Prerequisites

- **Node.js** v18+ (recommend v20+)
- **Python** 3.11+
- **pip** (or poetry/uv)
- **Git**

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd ai-youtube-notes

# 2. Install all dependencies
npm run install:all

# 3. Set up environment variables
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# Edit .env files with your actual keys

# 4. Start development servers
npm run dev
```

This runs both frontend (port 5173) and backend (port 8000) concurrently.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Start frontend only (Vite) |
| `npm run dev:backend` | Start backend only (uvicorn) |
| `npm run build` | Production build of frontend |
| `npm run lint` | Run oxlint on frontend |
| `npm run format` | Format frontend code with Prettier |
| `npm run install:all` | Install all dependencies (root + frontend + backend) |

## Frontend Development

### Tech Stack

- React 19 + TypeScript
- Vite 8 (bundler)
- Tailwind CSS v4 (styling)
- React Router v7 (routing)
- TanStack Query (server state)
- Zustand (client state)
- Axios (HTTP client)

### File Conventions

| Pattern | Convention |
|---------|-----------|
| Components | PascalCase (`Button.tsx`, `Header.tsx`) |
| Pages | PascalCase + `Page` suffix (`HomePage.tsx`) |
| Hooks | camelCase + `use` prefix (`useNotes.ts`) |
| Services | camelCase + `.service.ts` suffix |
| Types | PascalCase interfaces (`User`, `Note`) |
| Utils | camelCase + `.ts` suffix (`cn.ts`) |
| Stores | camelCase + `.store.ts` suffix (`app.store.ts`) |

### Path Aliases

```typescript
// Use @/ instead of relative paths
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { User } from "@/types";
```

## Backend Development

### Tech Stack

- Python 3.11+
- FastAPI (web framework)
- SQLAlchemy 2.0+ (ORM)
- Alembic (migrations)
- Pydantic v2 (validation)
- Supabase (PostgreSQL + Auth)

### Running the Backend

```bash
# From project root
npm run dev:backend

# Or directly
cd backend
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/api/v1/docs`

### Adding a New Endpoint

1. Create schema in `app/schemas/`
2. Create route in `app/api/v1/endpoints/`
3. Register router in `app/api/v1/router.py`
4. Add business logic in `app/services/`

## Coding Standards

### TypeScript

- Strict mode enabled (`"strict": true`)
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `const` assertions for enum-like objects
- No `any` – use `unknown` and narrow with type guards

### Python

- Follow PEP 8
- Type hints on all function signatures
- Use `async/await` for I/O operations
- Docstrings on all public functions/classes

## VS Code Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "ms-python.pylint",
    "charliermarsh.ruff",
    "ms-python.mypy-type-checker",
    "mtxr.sqltools",
    "cweijan.dbclient-jdbc"
  ]
}
```
