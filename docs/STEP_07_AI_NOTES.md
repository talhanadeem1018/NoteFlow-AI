# Step 7 — AI Notes Generation using OpenRouter

## Overview

Step 7 implements a production-ready AI Notes Generation module for NoteFlow AI. This module uses OpenRouter as the AI routing layer to generate structured notes from video transcripts, including executive summaries, key concepts, detailed notes, keywords, action items, and conclusions.

## Architecture

### Provider Abstraction

The AI notes generation system uses a provider abstraction pattern that allows swapping AI providers without changing business logic:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│              NotesGeneratorService                           │
│         (Orchestration & Caching Logic)                      │
├─────────────────────────────────────────────────────────────┤
│                    AIService                                 │
│            (High-level AI Operations)                        │
├─────────────────────────────────────────────────────────────┤
│    AIClient              │        PromptBuilder              │
│  (HTTP Client)           │    (Prompt Construction)          │
├─────────────────────────────────────────────────────────────┤
│              OpenRouter API (LLM Routing)                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **AIClient** | HTTP client for OpenRouter API with retry logic and error handling |
| **AIService** | High-level AI operations with fallback support |
| **PromptBuilder** | Constructs structured prompts for notes generation |
| **NotesGeneratorService** | Orchestrates validation, caching, generation, and storage |

## AI Flow

### Request Flow

1. **Validation Phase**
   - Validate transcript exists in database
   - Verify user owns the transcript
   - Check transcript is not empty

2. **Cache Check Phase**
   - Check if notes already exist for this transcript
   - Return cached notes if available (unless `force_regenerate=true`)

3. **Generation Phase**
   - Build structured prompt with transcript content
   - Call OpenRouter API with JSON response format
   - Parse and validate AI response

4. **Storage Phase**
   - Store generated notes in database
   - Link to transcript via `transcript_id`
   - Store metadata (model, prompt version, processing time)

5. **Response Phase**
   - Return structured notes with all sections

### Prompt Engineering

The prompt instructs the AI to generate notes in a specific JSON structure:

```json
{
  "title": "Concise, descriptive title",
  "executive_summary": "2-3 sentence overview",
  "key_concepts": ["Concept 1", "Concept 2"],
  "detailed_notes": "Markdown-formatted detailed notes",
  "bullet_points": ["Bullet point 1", "Bullet point 2"],
  "keywords": ["keyword1", "keyword2"],
  "action_items": ["Action 1", "Action 2"],
  "conclusion": "Conclusion with takeaways"
}
```

## API Endpoints

### POST /api/v1/notes/generate

Generate AI notes from a transcript.

**Request Body:**
```json
{
  "transcript_id": "uuid",
  "force_regenerate": false,
  "model": "google/gemini-2.5-flash",
  "temperature": 0.3,
  "max_tokens": 4096,
  "custom_instructions": "Optional additional instructions"
}
```

**Response (201):**
```json
{
  "id": "note-uuid",
  "transcript_id": "transcript-uuid",
  "user_id": "user-uuid",
  "title": "Generated Title",
  "executive_summary": "Summary text",
  "key_concepts": ["Concept 1", "Concept 2"],
  "detailed_notes": "Markdown notes",
  "bullet_points": ["Point 1", "Point 2"],
  "keywords": ["keyword1", "keyword2"],
  "action_items": ["Action 1", "Action 2"],
  "conclusion": "Conclusion text",
  "model_used": "google/gemini-2.5-flash",
  "prompt_version": "1.0.0",
  "processing_time": 2.34,
  "created_at": "2026-07-20T12:00:00Z"
}
```

### GET /api/v1/notes/{id}

Get a single note (AI-generated or manual).

### GET /api/v1/notes

List all notes for the authenticated user (paginated).

### DELETE /api/v1/notes/{id}

Delete a note.

## Database Changes

### New Columns in `notes` Table

| Column | Type | Description |
|--------|------|-------------|
| `transcript_id` | UUID | Foreign key to transcripts table |
| `executive_summary` | TEXT | AI-generated executive summary |
| `key_concepts` | JSON | Array of key concepts |
| `detailed_notes` | TEXT | Detailed markdown notes |
| `bullet_points` | JSON | Array of bullet points |
| `keywords` | JSON | Array of keywords |
| `action_items` | JSON | Array of action items |
| `conclusion` | TEXT | AI-generated conclusion |
| `model_used` | VARCHAR(100) | AI model used for generation |
| `prompt_version` | VARCHAR(20) | Version of prompt template |
| `processing_time` | FLOAT | Processing time in seconds |

### Indexes

- `ix_notes_transcript_id`: Index on transcript_id for faster lookups

### Foreign Keys

- `fk_notes_transcript_id`: References `transcripts.id` with `SET NULL` on delete

## Prompt Strategy

### System Prompt

Defines the AI's role as an expert note-taker and sets expectations for output format.

### User Prompt Structure

1. **Transcript Section**: Full transcript text (truncated if >50k chars)
2. **Instructions**: Detailed JSON structure requirements
3. **Requirements**: Specific guidelines for each section
4. **Output Format**: JSON-only output instruction

### Version Control

Prompt version is tracked (`PROMPT_VERSION = "1.0.0"`) for:
- A/B testing different prompt versions
- Debugging quality issues
- Prompt evolution tracking

## Caching Strategy

### Cache Key

Notes are cached based on:
- `transcript_id`: Source transcript
- `user_id`: User ownership
- `video_id`: Associated video

### Cache Invalidation

Cache is invalidated when:
- User requests `force_regenerate=true`
- Transcript is re-processed
- Manual deletion

### Cache Hit Detection

```python
# Check for existing notes
existing_note = await db.execute(
    select(Note).where(
        Note.user_id == user_id,
        Note.video_id == transcript.video_id,
        Note.ai_provider == "openrouter",
    )
)
```

## Error Handling

### Error Types

| Error | Status Code | Description |
|-------|-------------|-------------|
| `AIProviderError` | 500 | General AI API failure |
| `AIRateLimitError` | 429 | Rate limit exceeded |
| `AITimeoutError` | 504 | AI request timed out |
| `AIResponseError` | 502 | Invalid AI response |
| `TranscriptNotFoundError` | 404 | Transcript not found |
| `TranscriptEmptyError` | 422 | Transcript is empty |

### Retry Logic

The AI client implements:
- Connection timeout: 10 seconds
- Request timeout: 120 seconds
- Connection pooling with recycling

### Fallback Strategy

```python
# Primary model fails → fallback to simpler model
try:
    return await generate_notes(model="google/gemini-2.5-flash")
except AIProviderError:
    return await generate_notes(model="google/gemini-2.0-flash")
```

## Logging

### Metrics Logged

- **Processing Time**: Total time for generation
- **Model Used**: AI model selected
- **Cache Hits**: When cached notes are returned
- **API Failures**: Error details and context

### Log Levels

```python
logger.info("Notes generated successfully: model=%s, time=%.2fs", ...)
logger.warning("Transcript truncated from %d to %d chars", ...)
logger.error("AI request failed: status=%d, error=%s", ...)
```

## Configuration

### Environment Variables

```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=your-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_LLM_MODEL=google/gemini-2.5-flash

# AI Provider Fallback
DEFAULT_AI_PROVIDER=openai
```

### Settings Class

```python
class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_LLM_MODEL: str = "google/gemini-2.5-flash"
```

## Testing

### Unit Tests

1. **PromptBuilder Tests**
   - Validate message structure
   - Test transcript truncation
   - Verify response validation

2. **AIClient Tests**
   - Mock API responses
   - Test error handling
   - Verify retry logic

3. **NotesGeneratorService Tests**
   - Test validation flow
   - Test caching behavior
   - Test storage logic

### Integration Tests

1. **End-to-End Flow**
   - Create transcript
   - Generate notes
   - Verify storage
   - Test cache hit

2. **Authentication Tests**
   - Unauthorized access
   - Cross-user access attempts

3. **Error Scenarios**
   - Invalid transcript ID
   - Empty transcript
   - AI provider failure

### Test Checklist

- [ ] Notes generated successfully
- [ ] Notes saved in Supabase
- [ ] Cached notes returned correctly
- [ ] Unauthorized users cannot access other users' notes
- [ ] Invalid transcript IDs return proper errors
- [ ] Empty transcripts return proper errors
- [ ] AI provider failures handled gracefully
- [ ] Rate limits handled appropriately
- [ ] Timeouts handled correctly
- [ ] Processing time logged accurately

## Performance

### Optimization Strategies

1. **Connection Pooling**: Reuse HTTP connections
2. **Response Caching**: Avoid redundant AI calls
3. **Async Operations**: Non-blocking I/O
4. **Truncation**: Limit transcript length for context window

### Metrics

- **Average Generation Time**: ~2-5 seconds
- **Cache Hit Rate**: Depends on usage patterns
- **Token Usage**: ~2-4k tokens per generation

## Known Limitations

1. **Context Window**: Large transcripts are truncated to fit context
2. **JSON Parsing**: AI responses must be valid JSON
3. **Rate Limits**: Subject to OpenRouter API limits
4. **Cost**: AI generation incurs API costs
5. **Quality**: Output quality depends on transcript quality

## Future Enhancements

1. **Streaming Responses**: Real-time note generation
2. **Batch Processing**: Generate notes for multiple transcripts
3. **Custom Prompts**: User-defined prompt templates
4. **Quality Scoring**: AI-assisted quality assessment
5. **Export Formats**: PDF, DOCX, Notion export

## Git Commit Message

```
feat(notes): implement AI notes generation with OpenRouter

- Add OpenRouter integration for AI-powered note generation
- Create provider abstraction for swappable AI backends
- Implement structured prompts for executive summary, key concepts, detailed notes
- Add caching to avoid redundant AI calls for same transcript
- Update Note model with AI-specific fields (transcript_id, executive_summary, etc.)
- Create Alembic migration for new database schema
- Add comprehensive error handling for API failures, timeouts, rate limits
- Implement processing time logging and metrics
- Add GET/DELETE endpoints for AI-generated notes
```

## Testing Checklist

### Pre-Deployment

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Type checking passes (mypy/pyright)
- [ ] Linting passes (ruff/flake8)
- [ ] Documentation complete

### Manual Testing

- [ ] Generate notes from valid transcript
- [ ] Verify cached notes returned on second request
- [ ] Test force_regenerate=true
- [ ] Test unauthorized access (401)
- [ ] Test invalid transcript ID (404)
- [ ] Test empty transcript (422)
- [ ] Test AI provider failure handling
- [ ] Verify processing time logged

### Performance Testing

- [ ] Measure generation time
- [ ] Test concurrent requests
- [ ] Verify connection pooling
- [ ] Check memory usage
