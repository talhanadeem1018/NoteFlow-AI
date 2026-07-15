# NoteFlow AI

A production-ready AI SaaS application that extracts video metadata, audio, transcript, and description from YouTube videos to generate high-quality study notes, summaries, quizzes, and flashcards using AI.

## Tech Stack

### Frontend

| Tool | Purpose |
|------|---------|
| React 19 | UI library |
| TypeScript 6 | Type safety |
| Vite 8 | Bundler + dev server |
| Tailwind CSS v4 | Utility-first styling |
| React Router v7 | Client-side routing |
| TanStack Query | Server state (caching, refetching) |
| Zustand | Client state management |
| Axios | HTTP client with interceptors |

### Backend

| Tool | Purpose |
|------|---------|
| Python 3.11+ | Runtime |
| FastAPI | Async web framework |
| Pydantic v2 | Request/response validation |
| SQLAlchemy 2.0+ | ORM (async + sync) |
| Alembic | Database migrations |
| Supabase | PostgreSQL + Auth + Storage |

### Video Processing

| Tool | Purpose |
|------|---------|
| yt-dlp | YouTube video/audio extraction |
| FFmpeg | Audio processing |
| Whisper | Speech-to-text transcription |

### AI (Provider-Agnostic)

| Provider | SDK |
|----------|-----|
| OpenAI GPT | `openai` |
| Anthropic Claude | `anthropic` |
| Google Gemini | `google-genai` |

### Deployment

| Service | Role |
|---------|------|
| Vercel | Frontend hosting |
| Railway | Backend hosting |
| Supabase | Database + Auth + Storage |

## Project Structure

```
noteflow-ai/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── layout/    # Header, Footer, Layout
│   │   │   └── ui/        # Button, Input, Modal
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Axios instance, constants
│   │   ├── pages/         # Route-level pages
│   │   ├── services/      # API query hooks (TanStack)
│   │   ├── stores/        # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── .env.example       # Environment template
│   └── vite.config.ts     # Vite + Tailwind + aliases
│
├── backend/               # Python + FastAPI
│   ├── app/
│   │   ├── api/v1/        # Versioned API routes
│   │   ├── core/          # Config, security, deps
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic layer
│   ├── alembic/           # Database migrations
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment template
│
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   └── DEVELOPMENT.md     # Dev guide + conventions
│
├── package.json           # Root orchestration scripts
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js v18+ (recommend v20+)
- Python 3.11+
- pip

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Environment Setup

```bash
# Copy env templates
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit with your actual API keys and database URL
```

### Development

```bash
# Start both frontend + backend
npm run dev

# Frontend only (port 5173)
npm run dev:frontend

# Backend only (port 8000)
npm run dev:backend
```

### Build

```bash
npm run build
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Vite dev server on :5173 |
| `npm run dev:backend` | uvicorn on :8000 with auto-reload |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run oxlint on frontend |
| `npm run format` | Format with Prettier |
| `npm run install:all` | Install root + frontend + backend deps |

## Coding Standards

### TypeScript

- Strict mode enabled (`"strict": true`)
- Path aliases: `@/*` → `./src/*`
- Prefer `interface` for object shapes
- No `any` – use `unknown` and narrow
- PascalCase for components and types
- camelCase for functions, hooks, and utilities

### Python

- PEP 8 style
- Type hints on all function signatures
- async/await for database and I/O operations
- Pydantic for all request/response validation
- Docstrings on public functions and classes

### Naming Conventions

| Pattern | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `Button.tsx` |
| Pages | PascalCase + `Page` | `HomePage.tsx` |
| Hooks | `use` prefix | `useNotes.ts` |
| Services | `.service.ts` suffix | `notes.service.ts` |
| Stores | `.store.ts` suffix | `app.store.ts` |
| Python models | Singular PascalCase | `User`, `Note` |
| Python schemas | Verb prefix | `UserCreate`, `NoteRead` |
| API endpoints | kebab-case | `/api/v1/video-notes` |

## Architecture Principles

- **SOLID** – Single Responsibility, Open/Closed, Dependency Inversion
- **Clean Architecture** – Presentation → Application → Domain → Infrastructure
- **API Versioning** – All routes under `/api/v1/`
- **Provider Agnostic** – AI providers implement a common interface
- **Environment Separation** – `.env.example` committed, `.env` gitignored

## License

Private – All rights reserved.
