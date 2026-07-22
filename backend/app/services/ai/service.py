"""AI Service – orchestrates AI operations with the client and prompt builder.

Provides a high-level interface for AI operations, managing the lifecycle
of AI client interactions and handling common patterns.
"""

import logging
import time
from typing import Any

from app.core.config import settings
from app.core.exceptions import AIProviderError
from app.services.ai.client import AIClient
from app.services.ai.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)


class AIService:
    """High-level AI service for notes generation.

    Orchestrates interactions with the AI provider through the client,
    using the prompt builder for structured prompt construction.

    Attributes:
        client: AI HTTP client instance.
        prompt_builder: Prompt builder instance.
    """

    def __init__(self, client: AIClient | None = None):
        """Initialize the AI service.

        Args:
            client: Optional pre-configured AI client. Creates new if not provided.
        """
        self.client = client or AIClient()
        self.prompt_builder = PromptBuilder()

    async def generate_notes(
        self,
        transcript_text: str,
        model: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        custom_instructions: str | None = None,
    ) -> dict[str, Any]:
        """Generate structured notes from transcript text.

        Args:
            transcript_text: The transcript content to analyze.
            model: Optional model override.
            temperature: Sampling temperature (lower = more deterministic).
            max_tokens: Maximum tokens to generate.
            custom_instructions: Optional additional instructions.

        Returns:
            Dictionary containing:
                - data: Parsed notes data.
                - model: Model used.
                - usage: Token usage stats.
                - processing_time: Time taken in seconds.

        Raises:
            AIProviderError: AI generation failed.
        """
        t0 = time.time()
        logger.info("[AI] Building prompt messages (text length=%d chars)...", len(transcript_text))
        # Build messages
        messages = self.prompt_builder.build_messages(
            transcript_text=transcript_text,
            custom_instructions=custom_instructions,
        )
        logger.info("[TIMING] Step 3: Build LLM prompt — elapsed=%.2fs, messages=%d",
                    time.time() - t0, len(messages))

        # Generate completion with JSON response
        t1 = time.time()
        logger.info("[AI] Calling client.generate_json...")
        result = await self.client.generate_json(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        logger.info("[TIMING] Steps 4-6: Call LLM + Receive + Parse — elapsed=%.2fs",
                    time.time() - t1)

        # Validate response structure
        if not self.prompt_builder.validate_response(result["data"]):
            logger.error("[AI] Invalid response structure: %s", list(result["data"].keys()))
            raise AIProviderError(
                "AI response missing required fields",
                status_code=500,
            )

        logger.info(
            "[AI] Notes generated successfully: model=%s, time=%.2fs",
            result["model"],
            result["processing_time"],
        )

        return result

    async def generate_with_fallback(
        self,
        transcript_text: str,
        primary_model: str | None = None,
        fallback_model: str = "gpt-4o-mini",
        **kwargs,
    ) -> dict[str, Any]:
        """Generate notes with automatic fallback to a simpler model.

        Attempts generation with the primary model first. If it fails,
        falls back to the specified fallback model.

        Args:
            transcript_text: The transcript content.
            primary_model: Primary model to try.
            fallback_model: Fallback model if primary fails.
            **kwargs: Additional arguments for generate_notes.

        Returns:
            Generated notes data.
        """
        try:
            return await self.generate_notes(
                transcript_text=transcript_text,
                model=primary_model,
                **kwargs,
            )
        except AIProviderError as e:
            logger.warning(
                "Primary model failed (%s), trying fallback: %s",
                primary_model,
                fallback_model,
            )
            return await self.generate_notes(
                transcript_text=transcript_text,
                model=fallback_model,
                **kwargs,
            )

    async def close(self) -> None:
        """Close the AI client."""
        await self.client.close()
