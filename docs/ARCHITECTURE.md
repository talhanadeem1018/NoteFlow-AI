# NoteFlow AI – Architecture

## Overview

This document describes the high-level architecture, design decisions, and conventions for the NoteFlow AI project.

---

## 1. System Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│   Database   │
│  React+Vite  │ HTTP │  FastAPI     │      │  PostgreSQL  │
│  Port 5173   │◀─────│  Port 8000   │◀─────│  (Supabase)  │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐   ┌──────▼──────┐
              │  AI APIs   │   │  YouTube    │
              │ OpenAI etc │   │  yt-dlp +   │
              └───────────┘   │  Whisper    │
                              └─────────────┘
```

### Communication Flow

1. **User** pastes YouTube URL in the React frontend.
2. **Frontend** sends request to the FastAPI backend via Axios (`/api/v1/...`).
3. **Backend** validates input, orchestrates processing:
   - Extracts video metadata + audio via `yt-dlp`.
   - Transcribes audio via Whisper.
   - Sends transcript + prompt to AI provider (OpenAI/Claude/Gemini).
4. **Backend** returns generated notes to frontend.
5. **Frontend** renders notes with rich formatting.

---

## 2. Frontend Architecture

### Directory Structure

```
frontend/src/
├── assets/              # Static assets (images, fonts)
├── components/          # Reusable UI components
│   ├── layout/          # Header, Footer, Layout wrapper
│   └── ui/              # Button, Input, Modal, etc.
├── hooks/               # Custom React hooks
├── lib/                 # Core utilities (Axios instance, constants)
├── pages/               # Route-level page components
├── services/            # TanStack Query hooks (API layer)
├── stores/              # Zustand global state stores
├── types/               # TypeScript type definitions
├── utils/               # Pure utility functions (cn, format, etc.)
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point with providers
└── index.css            # Tailwind CSS v4 entry
```

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Vite** over CRA | Faster HMR, ESM-native, better DX |
| **Tailwind CSS v4** | CSS-first config, no JS config file, fastest possible iteration |
| **TanStack Query** | Server state management with caching, deduplication, refetching |
| **Zustand** | Lightweight client state (no boilerplate vs Redux) |
| **Axios** | Interceptor support, better error handling than fetch |
| **React Router v7** | File-convention-ready, nested layouts, type-safe routes |
| **Path aliases** (`@/`) | Clean imports, no `../../../` nesting |

---

## 3. Backend Architecture

### Directory Structure

```
backend/
├── app/
│   ├── api/             # Route handlers
│   │   └── v1/          # Versioned API endpoints
│   ├── core/            # Config, security, dependencies
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   └── services/        # Business logic (AI, video processing)
├── alembic/             # Database migrations
├── alembic.ini          # Alembic config
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variable template
```

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **FastAPI** | Async-first, auto OpenAPI docs, Pydantic validation |
| **Application Factory** (`create_app()`) | Testable, configurable, clear initialization |
| **API Versioning** (`/api/v1/`) | Backward-compatible evolution |
| **Pydantic Settings** | Type-safe env vars with validation |
| **SQLAlchemy 2.0+** | Modern mapped_column syntax, async support |
| **Separate schemas vs models** | API contracts decoupled from DB schema |

---

## 4. Design Principles

### SOLID Application

- **S**ingle Responsibility: Each service handles one domain (notes, videos, auth).
- **O**pen/Closed: AI provider abstraction allows adding providers without modifying existing code.
- **L**iskov Substitution: AI providers implement a common interface.
- **I**nterface Segregation: Narrow, focused API endpoints.
- **D**ependency Inversion: Services depend on abstractions (config), not concrete implementations.

### Clean Architecture Layers

```
Presentation (React components)
       ↓
Application (pages, hooks, services)
       ↓
Domain (types, interfaces, contracts)
       ↓
Infrastructure (Axios, API, database)
```

Each layer only depends on the layer below it. Business logic never depends on UI or HTTP details.

---

## 5. Environment Strategy

- **`.env.example`** files committed to git (templates, no secrets).
- **`.env`** files gitignored (actual secrets).
- Frontend vars prefixed with `VITE_` (exposed to browser).
- Backend vars are server-only (never exposed).
- Supabase keys: `SUPABASE_KEY` (anon, public) vs `SUPABASE_SERVICE_KEY` (admin, server-only).
