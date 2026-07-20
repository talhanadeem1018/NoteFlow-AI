"""Prompt Builder – constructs prompts for AI notes generation.

Builds structured prompts that instruct the AI to generate comprehensive
notes from transcript text, including executive summary, key concepts,
detailed notes, keywords, action items, and conclusion.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Current prompt version for tracking
PROMPT_VERSION = "1.0.0"

# System prompt that defines the AI's role
SYSTEM_PROMPT = """You are an expert note-taker and content summarizer. Your task is to analyze
transcript text from a video and generate comprehensive, well-structured notes.

You must respond with valid JSON that matches the exact structure specified.
Be concise yet thorough. Focus on extracting the most valuable information."""

# User prompt template
USER_PROMPT_TEMPLATE = """Analyze the following transcript and generate comprehensive notes.

## Transcript:
{transcript_text}

## Instructions:
Generate notes in the following JSON format:

{{
    "title": "A concise, descriptive title for the content",
    "executive_summary": "A 2-3 sentence overview of the main points and purpose of the content",
    "key_concepts": [
        "Concept 1: Brief explanation",
        "Concept 2: Brief explanation"
    ],
    "detailed_notes": "Well-organized markdown notes covering all important points, organized with headers",
    "bullet_points": [
        "Bullet point 1",
        "Bullet point 2",
        "Bullet point 3"
    ],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "action_items": [
        "Action item 1: Clear and specific",
        "Action item 2: Clear and specific"
    ],
    "conclusion": "A brief conclusion summarizing the key takeaways and any next steps"
}}

## Requirements:
- Title should be descriptive and concise (max 100 characters)
- Executive summary should capture the essence in 2-3 sentences
- Key concepts should be a list of 3-7 main ideas with brief explanations
- Detailed notes should be in markdown format, organized with headers (##)
- Bullet points should be a list of 5-15 key takeaways or important points
- Keywords should be 5-10 relevant terms for searchability
- Action items should be specific, actionable items (if applicable, otherwise empty list)
- Conclusion should summarize key takeaways

## Output:
Return ONLY the JSON object, no additional text or markdown code blocks."""


class PromptBuilder:
    """Builds prompts for AI notes generation.

    Constructs system and user prompts that instruct the AI to generate
    structured notes from transcript text.
    """

    @staticmethod
    def build_messages(
        transcript_text: str,
        custom_instructions: str | None = None,
    ) -> list[dict[str, str]]:
        """Build the message list for AI completion.

        Args:
            transcript_text: The transcript content to analyze.
            custom_instructions: Optional additional instructions.

        Returns:
            List of message dicts with 'role' and 'content' keys.
        """
        # Truncate very long transcripts to fit within context window
        max_transcript_length = 50000  # ~12k tokens
        if len(transcript_text) > max_transcript_length:
            logger.warning(
                "Transcript truncated from %d to %d chars",
                len(transcript_text),
                max_transcript_length,
            )
            transcript_text = transcript_text[:max_transcript_length] + "\n\n[Transcript truncated...]"

        user_prompt = USER_PROMPT_TEMPLATE.format(transcript_text=transcript_text)

        if custom_instructions:
            user_prompt += f"\n\n## Additional Instructions:\n{custom_instructions}"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        return messages

    @staticmethod
    def get_prompt_version() -> str:
        """Get the current prompt version.

        Returns:
            Version string for tracking.
        """
        return PROMPT_VERSION

    @staticmethod
    def validate_response(response: dict[str, Any]) -> bool:
        """Validate that the AI response contains all required fields.

        Args:
            response: Parsed JSON response from AI.

        Returns:
            True if response is valid, False otherwise.
        """
        required_fields = [
            "title",
            "executive_summary",
            "key_concepts",
            "detailed_notes",
            "keywords",
            "action_items",
            "conclusion",
        ]

        for field in required_fields:
            if field not in response:
                logger.warning("Missing required field: %s", field)
                return False

        # Validate types
        if not isinstance(response.get("key_concepts"), list):
            logger.warning("key_concepts must be a list")
            return False

        if not isinstance(response.get("bullet_points"), list):
            logger.warning("bullet_points must be a list")
            return False

        if not isinstance(response.get("keywords"), list):
            logger.warning("keywords must be a list")
            return False

        if not isinstance(response.get("action_items"), list):
            logger.warning("action_items must be a list")
            return False

        # Validate non-empty
        if not response.get("title", "").strip():
            logger.warning("title cannot be empty")
            return False

        if not response.get("executive_summary", "").strip():
            logger.warning("executive_summary cannot be empty")
            return False

        return True
