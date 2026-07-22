# NoteFlow AI 🚀
[](https://github.com/talhanadeem1018/NoteFlow-AI#noteflow-ai-)
[![FastAPI](https://camo.githubusercontent.com/98e8bf612f3cbe8f22e249901c30675f08dcf4b54f3f17ecece109b1840764a4/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4261636b656e642d466173744150492d3030393638383f7374796c653d666c61742d737175617265266c6f676f3d66617374617069266c6f676f436f6c6f723d7768697465)](https://fastapi.tiangolo.com/) [![React](https://camo.githubusercontent.com/aa93740f9f4eac2f039d3061e3809bd48fd82d5140c48c0949fd629dc5c64250/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f46726f6e74656e642d526561637425323031392d3631444146423f7374796c653d666c61742d737175617265266c6f676f3d7265616374266c6f676f436f6c6f723d626c61636b)](https://react.dev/) [![TypeScript](https://camo.githubusercontent.com/0a78456eb1c8a9f457a4558ec91001506442db220f57f8b7e199d5b180f9721f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c616e67756167652d547970655363726970742d3331373843363f7374796c653d666c61742d737175617265266c6f676f3d74797065736372697074266c6f676f436f6c6f723d7768697465)](https://www.typescriptlang.org/) [![PostgreSQL](https://camo.githubusercontent.com/14c2d3a84766645cbabd9a131d2c4c260b47cc186e279d46980046f3a76dac52/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f44617461626173652d506f737467726553514c2d3431363945313f7374796c653d666c61742d737175617265266c6f676f3d706f737467726573716c266c6f676f436f6c6f723d7768697465)](https://www.postgresql.org/) [![Supabase](https://camo.githubusercontent.com/c770e1f0b3662d13c4dfab88c3e29ca733229e808386e2d5c546a1e25266a7b7/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f417574482d53757061626173652d3345434638453f7374796c653d666c61742d737175617265266c6f676f3d7375706162617365266c6f676f436f6c6f723d7768697465)](https://supabase.com/) [![Tailwind CSS v4](https://camo.githubusercontent.com/2efc58c57dfc363cf99adab232a442adb435852f212aa152fbcd998cedfe46bd/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f5374796c696e672d5461696c77696e6425323043535325323076342d3338423241433f7374796c653d666c61742d737175617265266c6f676f3d7461696c77696e64637373266c6f676f436f6c6f723d7768697465)](https://tailwindcss.com/)

**NoteFlow AI** is an enterprise-grade, asynchronous full-stack application designed to convert YouTube lecture videos into structured, high-yield study materials (notes, summaries, quizzes, and flashcards).

---

## 📌 Executive Summary for Recruiters & Hiring Managers
[](https://github.com/talhanadeem1018/NoteFlow-AI#-executive-summary-for-recruiters--hiring-managers)
This repository has been designed with production-ready guidelines, strict design patterns, and engineering standards. Below is a summary of the architectural and engineering competency demonstrated in this project:

### 1. Robust Clean Architecture (SOLID)
[](https://github.com/talhanadeem1018/NoteFlow-AI#1-robust-clean-architecture-solid)

- **Decoupling of Contracts and DB Models:** Rather than sharing database state directly with clients, the backend separates **SQLAlchemy 2.0 ORM models** from **Pydantic v2 schemas**. This prevents schema exposure and guarantees strict type validation at the network boundary.
- **Service-Based Encapsulation:** Business logic (YouTube downloading, audio conversion, metadata extraction, auth) is decoupled into dedicated, testable service modules.
- **Application Factory Pattern:** FastAPI is initiated using `create_app()` factories, allowing seamless injection of mock dependencies, testing environments, and lifespan hooks.

### 2. High-Performance State Synchronization
[](https://github.com/talhanadeem1018/NoteFlow-AI#2-high-performance-state-synchronization)

- **Client-State vs. Server-State Separation:** The frontend uses **Zustand** for lightweight global client state (e.g., UI preferences, current modal state) and **TanStack Query (React Query)** for server state. This yields zero-redundancy caching, automatic refetching, and instantaneous UX responses.
- **Type-Safe Routing:** Uses the latest **React Router v7** with layout-driven nesting and protected/guest-only client-side route guards linked to active user sessions.

### 3. Enterprise-Grade Security & Identity
[](https://github.com/talhanadeem1018/NoteFlow-AI#3-enterprise-grade-security--identity)

- **Federated Auth with Local Sync:** Uses **Supabase Identity** with JWT authorization. The React frontend handles auth tokens securely using an `AuthContext` provider, while the FastAPI backend intercepts requests to extract and verify the bearer token securely on each API call.
- **Row-Level Security Readiness:** User tables use UUID keys matching Supabase Auth IDs, facilitating database-level column visibility and cascaded deletes.

### 4. Resource Efficiency & Background Lifespans
[](https://github.com/talhanadeem1018/NoteFlow-AI#4-resource-efficiency--background-lifespans)

- **Automatic Disk Cleanup:** Real-world deployments require careful disk budget management. The backend runs **scheduled startup and maintenance hooks** to automatically scrub stale temporary audio/video files (via custom cleanup logic), avoiding server storage exhaustion.
- **Asynchronous Lifespan Management:** Database connection pools are managed asynchronously during startup and clean shutdown via FastAPI's `lifespan` hook.

### 5. Uncompromising QA and Testing Culture
[](https://github.com/talhanadeem1018/NoteFlow-AI#5-uncompromising-qa-and-testing-culture)

- NoteFlow AI stands out by maintaining a comprehensive suite of verification artifacts under the `/docs` directory. This includes complete test cases, security auditing reports, API validation matrices, and phase sign-offs, validating a professional **QA-First development mindset**.

---

## 🏗 System Architecture & Data Flow
[](https://github.com/talhanadeem1018/NoteFlow-AI#-system-architecture--data-flow)

```
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
[](https://github.com/talhanadeem1018/NoteFlow-AI#-core-features-implemented)

- **Secure Authentication & Guarded Routes:**
- Full registration, login, logout, and password recovery.
- `ProtectedRoute` and `GuestRoute` components dynamically guard screens and redirect users based on real-time auth states.
- **YouTube Processing & Extraction:**
- Extraction of real-time metadata (title, views, channel, duration, upload date) directly from a pasted YouTube URL.
- Server-side download stream orchestrator with automatic background formatting (converting streams to lightweight high-quality `.mp3` audio via `FFmpeg`).
- **Authenticated Notes CRUD:**
- Secure endpoints allowing users to create, read, update, and delete study notes.
- Multi-tier validation enforces that users can only interact with records they explicitly own.
- **Auto-generated Documentation:**
- Complete, interactive Swagger UI available out of the box with token authentication configuration for direct testing of secure endpoints.

---

## 💻 Tech Stack Summary
[](https://github.com/talhanadeem1018/NoteFlow-AI#-tech-stack-summary)
LayerTechnologiesKey Highlights**Frontend**React 19, TypeScript, Vite, Tailwind CSS v4Ultra-fast HMR, strict type safety, modular Tailwind components, React Router v7.**Backend**Python 3.11, FastAPI, Pydantic v2Fully asynchronous runtime, automatic OpenAPI generation, type-safe settings parsing.**Database**PostgreSQL, SQLAlchemy 2.0, AlembicAsync connection pool, model relationships, migration tracking and deployment safety.**Authentication**Supabase Auth, JSON Web Tokens (JWT)Scalable identity management with instant secure route protection.**Process Tools**`yt-dlp`, `ffmpeg`, `ffprobe`Robust audio download, decoding, and millisecond-accurate metadata extraction.
---

## 💾 Relational Data Model
[](https://github.com/talhanadeem1018/NoteFlow-AI#-relational-data-model)
The application models relationships natively using UUIDs, tracking users and notes explicitly:

```
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

- **Cascade Rules:** Deleting a user triggers automatic server-level deletion (`ondelete="CASCADE"`) of all associated notes, maintaining database referential integrity.
- **Index Strategies:** Primary indexes on unique user emails and foreign user IDs guarantee optimal query lookups.

---

## 📊 Rigorous QA and Verification Culture
[](https://github.com/talhanadeem1018/NoteFlow-AI#-rigorous-qa-and-verification-culture)
Quality is not an afterthought in this project. The system includes exhaustive engineering verification artifacts under `docs/` summarizing rigorous testing phases:

- 📄 **[API Validation Report (PHASE5_API_VALIDATION_REPORT.md)](https://github.com/talhanadeem1018/NoteFlow-AI/blob/main/docs/PHASE5_API_VALIDATION_REPORT.md):** Exhaustive checks on JSON response contracts, status codes, and input bounds.
- 📄 **[Auth Flow Verification (PHASE5_AUTH_FLOW_TESTING.md)](https://github.com/talhanadeem1018/NoteFlow-AI/blob/main/docs/PHASE5_AUTH_FLOW_TESTING.md):** Dynamic step-by-step verification of identity, token storage, expiry, and token refresh.
- 📄 **[Security Review (PHASE5_SECURITY_REVIEW.md)](https://github.com/talhanadeem1018/NoteFlow-AI/blob/main/docs/PHASE5_SECURITY_REVIEW.md):** Validates password policies, sanitizes user content, and ensures cross-origin safety.
- 📄 **[Implementation Summary (PHASE5_IMPLEMENTATION_SUMMARY.md)](https://github.com/talhanadeem1018/NoteFlow-AI/blob/main/docs/PHASE5_IMPLEMENTATION_SUMMARY.md):** Detailed retrospective on implementation quality and release milestones.

---

## 🛠 Installation & Quickstart
[](https://github.com/talhanadeem1018/NoteFlow-AI#-installation--quickstart)
To run the full stack concurrently in development mode, follow these steps:

### Prerequisites
[](https://github.com/talhanadeem1018/NoteFlow-AI#prerequisites)
Make sure you have [Node.js v18+](https://nodejs.org/) and [Python v3.11+](https://www.python.org/) installed.

### 1. Clone & Install Dependencies
[](https://github.com/talhanadeem1018/NoteFlow-AI#1-clone--install-dependencies)
Run the unified project-level installer to fetch root, frontend, and backend packages:

```
git clone https://github.com/your-username/noteflow-ai.git
cd noteflow-ai
npm run install:all
```

### 2. Configure Environment Variables
[](https://github.com/talhanadeem1018/NoteFlow-AI#2-configure-environment-variables)
Copy the templates to `.env` files and add your credentials:

```
# Frontend configurations
cp frontend/.env.example frontend/.env

# Backend configurations
cp backend/.env.example backend/.env
```

### 3. Launch Development Servers
[](https://github.com/talhanadeem1018/NoteFlow-AI#3-launch-development-servers)
Run the concurrent script from the root folder:

```
npm run dev
```

- **Frontend UI:** `http://localhost:5173`
- **FastAPI Gateway:** `http://localhost:8000`
- **Swagger Documentation Playground:** `http://localhost:8000/api/v1/docs`

---

## 💎 Engineering & Code Quality Standards
[](https://github.com/talhanadeem1018/NoteFlow-AI#-engineering--code-quality-standards)

- **TypeScript Strictness:** `"strict": true` is enforced. No `any` types are permitted; type guards and narrowing are preferred.
- **Path Aliases:** Avoids tedious directory nesting. All imports use clean `@/` prefix resolution (e.g. `import { Button } from "@/components/ui/Button"`).
- **PEP 8 Compliance:** Python style uses descriptive variables, unified snake_case format, docstrings, and strict type annotations for all function signatures.
- **Concurrency:** The backend leverages asynchronous `async/await` syntax for all I/O boundary requests to maximize request throughput.

---
*For inquiries, architectural discussions, or technical deep-dives regarding this project, please feel free to reach out.*

---

## ✅ Step 6 — Whisper Transcription Engine
[](https://github.com/talhanadeem1018/NoteFlow-AI#-step-6--whisper-transcription-engine)
Step 6 has been completed successfully and adds a production-ready transcription pipeline to the platform.

### Implemented Features
[](https://github.com/talhanadeem1018/NoteFlow-AI#implemented-features)

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
[](https://github.com/talhanadeem1018/NoteFlow-AI#testing--validation)

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
[](https://github.com/talhanadeem1018/NoteFlow-AI#project-progress--status)

- Step 1: Core backend foundation — Completed
- Step 2: Authentication and protected routes — Completed
- Step 3: Notes CRUD and database integration — Completed
- Step 4: YouTube metadata and audio processing — Completed
- Step 5: QA, security, and production documentation — Completed
- Step 6: Whisper transcription pipeline — Completed
- Step 7: AI Notes Generation with OpenRouter — Completed

---

## ✅ Step 7 — AI Notes Generation with OpenRouter
[](https://github.com/talhanadeem1018/NoteFlow-AI#-step-7--ai-notes-generation-with-openrouter)
Step 7 implements a production-ready AI Notes Generation module using OpenRouter as the LLM routing layer.

### Implemented Features
[](https://github.com/talhanadeem1018/NoteFlow-AI#implemented-features-1)

- OpenRouter integration for AI-powered note generation
- Provider abstraction for swappable AI backends
- Structured prompts for executive summary, key concepts, detailed notes
- Response caching to avoid redundant AI calls
- Updated Note model with AI-specific fields
- Alembic migration for new database schema
- Comprehensive error handling (API failures, timeouts, rate limits)
- Processing time logging and metrics
- GET/DELETE endpoints for AI-generated notes

### API Endpoints
[](https://github.com/talhanadeem1018/NoteFlow-AI#api-endpoints)

- `POST /api/v1/notes/generate` — Generate AI notes from a transcript
- `GET /api/v1/notes/ai/{note_id}` — Get a single AI-generated note
- `GET /api/v1/notes/ai` — List all AI-generated notes (paginated)
- `DELETE /api/v1/notes/ai/{note_id}` — Delete an AI-generated note

### Configuration
[](https://github.com/talhanadeem1018/NoteFlow-AI#configuration)

```
# OpenRouter Configuration
OPENROUTER_API_KEY=your-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_LLM_MODEL=google/gemini-2.5-flash
```

### Testing & Validation
[](https://github.com/talhanadeem1018/NoteFlow-AI#testing--validation-1)

- Backend startup successful
- Models load correctly
- Migration script created
- Error handling verified
- Caching logic implemented
- Documentation complete

### Documentation
[](https://github.com/talhanadeem1018/NoteFlow-AI#documentation)

- 📄 **[Step 7 Documentation](https://github.com/talhanadeem1018/NoteFlow-AI/blob/main/docs/STEP_07_AI_NOTES.md)** — Complete technical documentation
