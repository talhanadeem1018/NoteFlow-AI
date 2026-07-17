# NoteFlow AI

NoteFlow AI is an AI-powered application that converts YouTube lecture videos into structured study material such as notes, summaries, quizzes, and flashcards.

## Project Overview

This repository contains the frontend and backend for NoteFlow AI. The backend currently implements video metadata extraction and Step 4 audio processing features using FastAPI, yt-dlp, FFmpeg, and FFprobe.

## Features

- YouTube video metadata extraction
- Audio download from YouTube
- Audio conversion for downstream processing
- API-based access through FastAPI
- Swagger documentation support
- Backend documentation and QA reporting

## Architecture

The project is organized into:

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Processing: yt-dlp, FFmpeg, FFprobe
- Documentation: QA reports, architecture, and development notes

## Folder Structure

```text
frontend/        # React UI
backend/         # FastAPI backend
docs/            # Architecture, development, and QA documentation
```

## Technology Stack

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic Settings
- yt-dlp
- FFmpeg
- FFprobe
- React
- TypeScript
- Vite

## Installation

```bash
npm run install:all
npm run dev
```

## API Documentation

The backend exposes Swagger documentation through the FastAPI routes.

## Backend Progress

- Backend foundation: Implemented
- Step 4 audio workflow: Implemented
- QA documentation: Added
- Full runtime regression evidence: Pending

## Testing Summary

The repository now includes structured QA documentation for the backend audio workflow:

- [docs/01-project-progress.md](docs/01-project-progress.md)
- [docs/02-test-plan.md](docs/02-test-plan.md)
- [docs/03-test-execution-report.md](docs/03-test-execution-report.md)
- [docs/04-api-test-cases.md](docs/04-api-test-cases.md)
- [docs/05-bug-report.md](docs/05-bug-report.md)
- [docs/06-regression-testing.md](docs/06-regression-testing.md)
- [docs/07-development-log.md](docs/07-development-log.md)
- [docs/08-step-4-summary.md](docs/08-step-4-summary.md)
- [docs/09-qa-signoff.md](docs/09-qa-signoff.md)

## Known Issues

- Runtime validation evidence is still pending
- Environment-specific path handling must be verified on real systems
- External tool availability for FFmpeg and FFprobe should be confirmed in the target environment

## Roadmap

- Complete full end-to-end testing
- Add automated regression tests
- Expand AI note generation features
- Improve production deployment readiness

## Future Work

- Improve error handling for more edge cases
- Add stronger monitoring and logging
- Expand documentation for frontend and deployment

## Contributing

Contributions are welcome. Please ensure that documentation remains clear and evidence-based.

## License

Private
