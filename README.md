# NoteFlow AI

NoteFlow AI is an AI-powered application that converts YouTube lecture videos into structured study materials such as notes, summaries, quizzes, and flashcards.

## Project Overview

This repository contains the full frontend and backend for NoteFlow AI. Phase 5 completed the authentication layer, protected routing, notes CRUD, and production-ready QA documentation.

## Highlights

- Supabase-based authentication flow
- Login, register, logout, and forgot password support
- JWT verification for protected API access
- ProtectedRoute and GuestRoute handling
- Notes CRUD with user ownership enforcement
- Swagger authorization support
- Professional QA and testing documentation

## Architecture

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Database: PostgreSQL via SQLAlchemy
- Authentication: Supabase + JWT
- Documentation: QA, testing, and release reports

## Folder Structure

```text
frontend/        # React UI
backend/         # FastAPI backend
docs/            # Phase-based QA and development documentation
```

## Technology Stack

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic Settings
- SQLAlchemy
- PostgreSQL
- Supabase
- React
- TypeScript
- Vite

## Installation

```bash
npm run install:all
npm run dev
```

## API Documentation

The backend exposes Swagger documentation and supports authorized access through the Swagger Authorize flow.

## Phase 5 Progress

- Authentication foundation: Implemented
- Protected routes: Implemented
- Notes CRUD: Implemented
- QA documentation: Added
- Production readiness: Completed

## Testing and QA Documentation

- [docs/PHASE5_IMPLEMENTATION_SUMMARY.md](docs/PHASE5_IMPLEMENTATION_SUMMARY.md)
- [docs/PHASE5_TEST_CASES.md](docs/PHASE5_TEST_CASES.md)
- [docs/PHASE5_TESTING_REPORT.md](docs/PHASE5_TESTING_REPORT.md)
- [docs/PHASE5_API_VALIDATION_REPORT.md](docs/PHASE5_API_VALIDATION_REPORT.md)
- [docs/PHASE5_SECURITY_REVIEW.md](docs/PHASE5_SECURITY_REVIEW.md)
- [docs/PHASE5_FRONTEND_VALIDATION.md](docs/PHASE5_FRONTEND_VALIDATION.md)
- [docs/PHASE5_BACKEND_VALIDATION.md](docs/PHASE5_BACKEND_VALIDATION.md)
- [docs/PHASE5_AUTH_FLOW_TESTING.md](docs/PHASE5_AUTH_FLOW_TESTING.md)
- [docs/PHASE5_FINAL_QA_REPORT.md](docs/PHASE5_FINAL_QA_REPORT.md)
- [docs/PHASE5_RELEASE_NOTES.md](docs/PHASE5_RELEASE_NOTES.md)

## Roadmap

- Expand AI note generation features
- Add automated regression tests
- Improve deployment and monitoring readiness

## License

Private
