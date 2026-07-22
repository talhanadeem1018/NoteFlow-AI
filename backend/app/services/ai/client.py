"""AI Client – HTTP client for OpenRouter API with provider abstraction.

Supports multiple AI providers through a unified interface.
Handles authentication, retries, and error handling."""

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import AIProviderError, AIRateLimitError, AITimeoutError

logger = logging.getLogger(__name__)


class AIClient:
    """HTTP client for OpenRouter AI API.

    Provides a unified interface to interact with various AI providers
    through OpenRouter's routing layer.

    Attributes:
        base_url: OpenRouter API base URL.
        api_key: API key for authentication.
        default_model: Default LLM model to use.
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        default_model: str | None = None,
    ):
        """Initialize the AI client.

        Args:
            base_url: OpenRouter API base URL. Defaults to settings.
            api_key: API key. Defaults to settings.
            default_model: Default model name. Defaults to settings.
        """
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.default_model = default_model or settings.DEFAULT_LLM_MODEL

        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not configured")

        # Create httpx client with connection pooling
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "NoteFlow-AI/1.0",
            },
            timeout=httpx.Timeout(120.0, connect=10.0),
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def generate_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: dict | None = None,
    ) -> dict[str, Any]:
        """Generate a completion using the AI provider.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            model: Model name. Uses default_model if not specified.
            temperature: Sampling temperature (0.0 to 2.0).
            max_tokens: Maximum tokens to generate.
            response_format: Optional response format specification.

        Returns:
            Dictionary containing:
                - content: Generated text content.
                - model: Model used for generation.
                - usage: Token usage statistics.
                - processing_time: Time taken in seconds.

        Raises:
            AIProviderError: API request failed.
            AIRateLimitError: Rate limit exceeded.
            AITimeoutError: Request timed out.
        """
        model = model or self.default_model
        start_time = time.time()

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_format:
            payload["response_format"] = response_format

        try:
            logger.info("[AI_CLIENT] Calling OpenRouter API with model=%s", model)
            logger.info("[AI_CLIENT] Payload size: %d messages, max_tokens=%d",
                       len(payload.get("messages", [])), max_tokens)
            response = await self._client.post("/chat/completions", json=payload)
            response.raise_for_status()

            data = response.json()
            processing_time = time.time() - start_time
            logger.info("[AI_CLIENT] Response received in %.2fs", processing_time)

            # Extract content from response
            choices = data.get("choices", [])
            if not choices:
                logger.error("[AI_CLIENT] No choices in response: %s", data)
                raise AIProviderError("No choices returned from AI provider")

            content = choices[0].get("message", {}).get("content", "")
            usage = data.get("usage", {})

            logger.info(
                "[AI_CLIENT] Success: model=%s, tokens=%d, time=%.2fs, content_len=%d",
                model,
                usage.get("total_tokens", 0),
                processing_time,
                len(content),
            )

            return {
                "content": content,
                "model": model,
                "usage": usage,
                "processing_time": processing_time,
            }

        except httpx.TimeoutException as e:
            processing_time = time.time() - start_time
            logger.exception("[AI_CLIENT] Request timed out after %.2fs", processing_time)
            raise AITimeoutError(f"AI request timed out: {str(e)}") from e

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            processing_time = time.time() - start_time

            if status_code == 429:
                logger.warning("[AI_CLIENT] Rate limit exceeded")
                raise AIRateLimitError("Rate limit exceeded") from e

            # Try to extract error message from response
            try:
                error_data = e.response.json()
                error_message = error_data.get("error", {}).get("message", str(e))
            except Exception:
                error_message = str(e)

            logger.exception(
                "[AI_CLIENT] HTTP error: status=%d, error=%s, time=%.2fs",
                status_code,
                error_message,
                processing_time,
            )
            raise AIProviderError(
                f"AI request failed: {error_message}",
                status_code=status_code,
            ) from e

        except Exception as e:
            processing_time = time.time() - start_time
            logger.exception("[AI_CLIENT] Unexpected error after %.2fs", processing_time)
            raise AIProviderError(f"AI request failed: {str(e)}") from e

    async def generate_json(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Generate a JSON completion.

        Similar to generate_completion but ensures JSON response format
        and parses the response.

        Args:
            messages: List of message dicts.
            model: Model name.
            temperature: Lower temperature for more deterministic JSON.
            max_tokens: Maximum tokens.

        Returns:
            Parsed JSON response as a dictionary.

        Raises:
            AIProviderError: API request failed or invalid JSON response.
        """
        result = await self.generate_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        try:
            parsed = json.loads(result["content"])
            return {
                "data": parsed,
                "model": result["model"],
                "usage": result["usage"],
                "processing_time": result["processing_time"],
            }
        except json.JSONDecodeError as e:
            logger.error("Failed to parse AI response as JSON: %s", e)
            raise AIProviderError(
                f"Invalid JSON response from AI: {str(e)}",
                status_code=500,
            ) from e
