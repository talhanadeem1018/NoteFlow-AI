# NoteFlow AI 🚀

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Supabase](https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**NoteFlow AI** is an enterprise-grade, asynchronous full-stack application designed to convert YouTube lecture videos into structured, high-yield study materials (notes, summaries, quizzes, and flashcards). 

---

## 📌 Executive Summary for Recruiters & Hiring Managers

This repository has been designed with production-ready guidelines, strict design patterns, and engineering standards. Below is a summary of the architectural and engineering competency demonstrated in this project:

### 1. Robust Clean Architecture (SOLID)
* **Decoupling of Contracts and DB Models:** Rather than sharing database state directly with clients, the backend separates **SQLAlchemy 2.0 ORM models** from **Pydantic v2 schemas**. This prevents schema exposure and guarantees strict type validation at the network boundary.
* **Service-Based Encapsulation:** Business logic (YouTube downloading, audio conversion, metadata extraction, auth) is decoupled into dedicated, testable service modules.
* **Application Factory Pattern:** FastAPI is initiated using `create_app()` factories, allowing seamless injection of mock dependencies, testing environments, and lifespan hooks.

### 2. High-Performance State Synchronization
* **Client-State vs. Server-State Separation:** The frontend uses **Zustand** for lightweight global client state (e.g., UI preferences, current modal state) and **TanStack Query (React Query)** for server state. This yields zero-redundancy caching, automatic refetching, and instantaneous UX responses.
* **Type-Safe Routing:** Uses the latest **React Router v7** with layout-driven nesting and protected/guest-only client-side route guards linked to active user sessions.

### 3. Enterprise-Grade Security & Identity
* **Federated Auth with Local Sync:** Uses **Supabase Identity** with JWT authorization. The React frontend handles auth tokens securely using an `AuthContext` provider, while the FastAPI backend intercepts requests to extract and verify the bearer token securely on each API call.
* **Row-Level Security Readiness:** User tables use UUID keys matching Supabase Auth IDs, facilitating database-level column visibility and cascaded deletes.

### 4. Resource Efficiency & Background Lifespans
* **Automatic Disk Cleanup:** Real-world deployments require careful disk budget management. The backend runs **scheduled startup and maintenance hooks** to automatically scrub stale temporary audio/video files (via custom cleanup logic), avoiding server storage exhaustion.
* **Asynchronous Lifespan Management:** Database connection pools are managed asynchronously during startup and clean shutdown via FastAPI's `lifespan` hook.

### 5. Uncompromising QA and Testing Culture
* NoteFlow AI stands out by maintaining a comprehensive suite of verification artifacts under the `/docs` directory. This includes complete test cases, security auditing reports, API validation matrices, and phase sign-offs, validating a professional **QA-First development mindset**.

---

## 🏗 System Architecture & Data Flow

```text
       ┌────────────────────────┐
       │   Frontend (React)     │
       │   Port: 5173 (Vite)    │
       └───────────┬────────────┘
                   │
                   │ HTTP REST (JSON) + JWT
                   ▼
       ┌────────────────────────┐
       │   Backend (FastAPI)    │
       │   Port: 8000 (uvicorn) │
       └───────────┬────────────┘
                   │
         ┌─────────┴─────────────────────┐
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  Database (Postg)│            │ External Services│
│  Supabase + RLS  │            │ - yt-dlp         │
│  Alembic Migrat  │            │ - ffmpeg/ffprobe │
└──────────────────┘            └──────────────────┘
```

1. **User interaction:** The user initiates an operation (e.g., URL metadata fetch, login, notes creation) on the React frontend.
2. **Network translation:** The API request travels over HTTP to the backend. If protected, the frontend's Axios interceptor automatically attaches the user's Supabase JWT.
3. **Validation & Routing:** FastAPI intercepts, validates incoming data shapes against Pydantic schemas, and injects dependencies (DB session, verified user ID).
4. **Service Execution:** Dedicated services execute external processes (like downloading high-fidelity audio with `yt-dlp` or transcribing/extracting duration with `ffprobe`).
5. **Data Persistence:** Database state changes are written to Postgres via an async SQLAlchemy 2.0 connection pool and mapped back to JSON responses.

---

## ⚡ Core Features Implemented

* **Secure Authentication & Guarded Routes:** 
  * Full registration, login, logout, and password recovery.
  * `ProtectedRoute` and `GuestRoute` components dynamically guard screens and redirect users based on real-time auth states.
* **YouTube Processing & Extraction:**
  * Extraction of real-time metadata (title, views, channel, duration, upload date) directly from a pasted YouTube URL.
  * Server-side download stream orchestrator with automatic background formatting (converting streams to lightweight high-quality `.mp3` audio via `FFmpeg`).
* **Authenticated Notes CRUD:**
  * Secure endpoints allowing users to create, read, update, and delete study notes.
  * Multi-tier validation enforces that users can only interact with records they explicitly own.
* **Auto-generated Documentation:**
  * Complete, interactive Swagger UI available out of the box with token authentication configuration for direct testing of secure endpoints.

---

## 💻 Tech Stack Summary

| Layer | Technologies | Key Highlights |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 | Ultra-fast HMR, strict type safety, modular Tailwind components, React Router v7. |
| **Backend** | Python 3.11, FastAPI, Pydantic v2 | Fully asynchronous runtime, automatic OpenAPI generation, type-safe settings parsing. |
| **Database** | PostgreSQL, SQLAlchemy 2.0, Alembic | Async connection pool, model relationships, migration tracking and deployment safety. |
| **Authentication** | Supabase Auth, JSON Web Tokens (JWT) | Scalable identity management with instant secure route protection. |
| **Process Tools** | `yt-dlp`, `ffmpeg`, `ffprobe` | Robust audio download, decoding, and millisecond-accurate metadata extraction. |

---

## 💾 Relational Data Model

The application models relationships natively using UUIDs, tracking users and notes explicitly:

```text
 ┌──────────────────────┐             ┌──────────────────────┐
 │        users         │             │        notes         │
 ├──────────────────────┤             ├──────────────────────┤
 │ id (UUID, PK)        │ 1         * │ id (UUID, PK)        │
 │ email (String)       ├────────────▶│ user_id (UUID, FK)   │
 │ full_name (String)   │             │ video_id (String)    │
 │ created_at (DateTime)│             │ title (String)       │
 │ updated_at (DateTime)│             │ content (Text)       │
 └──────────────────────┘             │ note_type (String)   │
                                      │ ai_provider (String) │
                                      │ created_at (DateTime)│
                                      │ updated_at (DateTime)│
                                      └──────────────────────┘
```

* **Cascade Rules:** Deleting a user triggers automatic server-level deletion (`ondelete="CASCADE"`) of all associated notes, maintaining database referential integrity.
* **Index Strategies:** Primary indexes on unique user emails and foreign user IDs guarantee optimal query lookups.

---

## 📊 Rigorous QA and Verification Culture

Quality is not an afterthought in this project. The system includes exhaustive engineering verification artifacts under `docs/` summarizing rigorous testing phases:

* 📄 **[API Validation Report (PHASE5_API_VALIDATION_REPORT.md)](docs/PHASE5_API_VALIDATION_REPORT.md):** Exhaustive checks on JSON response contracts, status codes, and input bounds.
* 📄 **[Auth Flow Verification (PHASE5_AUTH_FLOW_TESTING.md)](docs/PHASE5_AUTH_FLOW_TESTING.md):** Dynamic step-by-step verification of identity, token storage, expiry, and token refresh.
* 📄 **[Security Review (PHASE5_SECURITY_REVIEW.md)](docs/PHASE5_SECURITY_REVIEW.md):** Validates password policies, sanitizes user content, and ensures cross-origin safety.
* 📄 **[Implementation Summary (PHASE5_IMPLEMENTATION_SUMMARY.md)](docs/PHASE5_IMPLEMENTATION_SUMMARY.md):** Detailed retrospective on implementation quality and release milestones.

---

## 🛠 Installation & Quickstart

To run the full stack concurrently in development mode, follow these steps:

### Prerequisites
Make sure you have [Node.js v18+](https://nodejs.org/) and [Python v3.11+](https://www.python.org/) installed.

### 1. Clone & Install Dependencies
Run the unified project-level installer to fetch root, frontend, and backend packages:
```bash
git clone https://github.com/your-username/noteflow-ai.git
cd noteflow-ai
npm run install:all
```

### 2. Configure Environment Variables
Copy the templates to `.env` files and add your credentials:
```bash
# Frontend configurations
cp frontend/.env.example frontend/.env

# Backend configurations
cp backend/.env.example backend/.env
```

### 3. Launch Development Servers
Run the concurrent script from the root folder:
```bash
npm run dev
```
* **Frontend UI:** `http://localhost:5173`
* **FastAPI Gateway:** `http://localhost:8000`
* **Swagger Documentation Playground:** `http://localhost:8000/api/v1/docs`

---

## 💎 Engineering & Code Quality Standards

* **TypeScript Strictness:** `"strict": true` is enforced. No `any` types are permitted; type guards and narrowing are preferred.
* **Path Aliases:** Avoids tedious directory nesting. All imports use clean `@/` prefix resolution (e.g. `import { Button } from "@/components/ui/Button"`).
* **PEP 8 Compliance:** Python style uses descriptive variables, unified snake_case format, docstrings, and strict type annotations for all function signatures.
* **Concurrency:** The backend leverages asynchronous `async/await` syntax for all I/O boundary requests to maximize request throughput.

---

*For inquiries, architectural discussions, or technical deep-dives regarding this project, please feel free to reach out.*

---

## ✅ Step 6 — Whisper Transcription Engine

Step 6 has been completed successfully and adds a production-ready transcription pipeline to the platform.

### Implemented Features
- Faster-Whisper transcription pipeline
- YouTube audio download using yt-dlp
- FFmpeg audio processing
- Whisper Base model integration
- Language detection
- Timestamped transcript segments
- Supabase PostgreSQL transcript storage
- JWT-protected transcription API
- Cached transcript support
- Processing time measurement
- Production-ready API structure

### Testing & Validation
- Backend startup successful
- Swagger API testing completed
- JWT authentication verified
- YouTube URL transcription tested successfully
- Whisper model downloaded and executed successfully
- English language detection verified
- Transcript generated successfully
- API returned HTTP 200 response
- Transcript persistence verified
- Error handling tested for invalid language input

### Project Progress & Status
- Step 1: Core backend foundation — Completed
- Step 2: Authentication and protected routes — Completed
- Step 3: Notes CRUD and database integration — Completed
- Step 4: YouTube metadata and audio processing — Completed
- Step 5: QA, security, and production documentation — Completed
- Step 6: Whisper transcription engine — Completed
