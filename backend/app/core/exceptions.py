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
