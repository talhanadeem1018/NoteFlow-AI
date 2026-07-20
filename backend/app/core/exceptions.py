"""Custom exception classes for structured error handling."""


class AppError(Exception):
    """Base application error."""

    def __init__(self, detail: str, status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class VideoNotFoundError(AppError):
    """Video does not exist, is private, or unavailable."""

    def __init__(self, detail: str = "Video not found, private, or unavailable"):
        super().__init__(detail=detail, status_code=404)


class InvalidURLError(AppError):
    """YouTube URL is malformed or invalid."""

    def __init__(self, detail: str = "Invalid YouTube URL provided"):
        super().__init__(detail=detail, status_code=422)


class VideoProcessingError(AppError):
    """Error during video metadata extraction."""

    def __init__(self, detail: str = "Failed to process video metadata"):
        super().__init__(detail=detail, status_code=500)


class AudioDownloadError(AppError):
    """Error during audio download or conversion."""

    def __init__(self, detail: str = "Failed to download or convert audio"):
        super().__init__(detail=detail, status_code=500)


class TranscriptionError(AppError):
    """Error during transcription processing."""

    def __init__(self, detail: str = "Failed to transcribe audio", status_code: int = 500):
        super().__init__(detail=detail, status_code=status_code)


# ── AI Provider Exceptions ────────────────────────────────────────
class AIProviderError(AppError):
    """Error from AI provider API."""

    def __init__(self, detail: str = "AI provider request failed", status_code: int = 500):
        super().__init__(detail=detail, status_code=status_code)


class AIRateLimitError(AIProviderError):
    """Rate limit exceeded by AI provider."""

    def __init__(self, detail: str = "Rate limit exceeded. Please try again later."):
        super().__init__(detail=detail, status_code=429)


class AITimeoutError(AIProviderError):
    """AI provider request timed out."""

    def __init__(self, detail: str = "AI request timed out. Please try again."):
        super().__init__(detail=detail, status_code=504)


class AIResponseError(AIProviderError):
    """Invalid response from AI provider."""

    def __init__(self, detail: str = "Invalid response from AI provider"):
        super().__init__(detail=detail, status_code=502)


class TranscriptNotFoundError(AppError):
    """Transcript not found or unauthorized."""

    def __init__(self, detail: str = "Transcript not found or unauthorized"):
        super().__init__(detail=detail, status_code=404)


class TranscriptEmptyError(AppError):
    """Transcript is empty."""

    def __init__(self, detail: str = "Transcript is empty"):
        super().__init__(detail=detail, status_code=422)


class NotesNotFoundError(AppError):
    """Notes not found."""

    def __init__(self, detail: str = "Notes not found"):
        super().__init__(detail=detail, status_code=404)
