# Test Plan

## Purpose

This document defines the QA approach for the backend audio processing workflow in NoteFlow AI, specifically the Step 4 implementation related to YouTube audio download and conversion.

## Scope

The scope includes validation of:

- YouTube URL processing
- Audio download via yt-dlp
- Audio conversion via FFmpeg
- Metadata extraction via FFprobe
- API request and response handling
- Error behavior and cleanup logic

## Testing Objectives

- Verify that valid YouTube URLs are accepted.
- Verify that audio download succeeds when required tools are available.
- Verify that conversion output is produced.
- Verify that metadata duration extraction works.
- Verify that API responses are structured correctly.
- Verify that invalid input and download failures are handled cleanly.

## Testing Strategy

The strategy is based on repository evidence and functional review of the implemented backend services. Formal execution evidence was not available in the workspace, so the plan below should be treated as a structured QA guide rather than a completed execution record.

## Test Environment

- Operating System: Windows 11
- Python Version: 3.14
- FastAPI
- Uvicorn
- yt-dlp
- FFmpeg
- FFprobe
- Swagger UI
- Postman / cURL

## Out of Scope

- Full frontend UI testing
- Database migration validation
- AI note generation workflows
- Production deployment validation

## Risks

- Missing system binaries for FFmpeg or FFprobe
- Network or download failures from YouTube
- Environment-specific temporary path issues
- Incomplete test evidence in the repository

## Entry Criteria

- Backend code is available in the repository
- Required Python dependencies are installed
- FFmpeg and FFprobe are available in the environment

## Exit Criteria

- Core audio workflow is documented
- Main error paths are understood
- Known issues are tracked
- Formal regression testing is scheduled
