"""AI services package – provider abstraction and notes generation."""

from app.services.ai.client import AIClient  # noqa: F401
from app.services.ai.service import AIService  # noqa: F401
from app.services.ai.prompt_builder import PromptBuilder  # noqa: F401
from app.services.ai.notes_generator import NotesGenerator  # noqa: F401

__all__ = ["AIClient", "AIService", "PromptBuilder", "NotesGenerator"]
