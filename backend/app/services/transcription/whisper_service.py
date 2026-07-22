"""Whisper transcription service using faster-whisper.

Provides lazy-loaded model initialization and transcription capabilities
with support for CPU/GPU execution, language detection, and segment generation.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from faster_whisper import WhisperModel

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionSegment:
    """A single transcription segment with timing information."""

    id: int
    start: float
    end: float
    text: str
    avg_logprob: float | None = None
    no_speech_prob: float | None = None
    compression_ratio: float | None = None


@dataclass
class TranscriptionResult:
    """Complete transcription result with metadata."""

    text: str
    language: str
    language_probability: float
    duration: float
    segments: list[TranscriptionSegment] = field(default_factory=list)
    processing_time: float = 0.0


class WhisperService:
    """Singleton Whisper model service with lazy loading.

    The model is loaded on first transcription request to avoid
    blocking application startup. Thread-safe for concurrent requests.

    Example::

        service = WhisperService()
        result = await service.transcribe("audio.wav")
    """

    _instance: "WhisperService | None" = None
    _model: WhisperModel | None = None
    _model_name: str = ""
    _device: str = ""
    _compute_type: str = ""

    def __new__(cls) -> "WhisperService":
        """Ensure singleton pattern for model sharing."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_model(self) -> WhisperModel:
        """Lazy-load the Whisper model on first use.

        Reinitializes if config has changed (e.g., model switch via env vars).

        Returns:
            Initialized WhisperModel instance.

        Raises:
            RuntimeError: If model loading fails.
        """
        model_name = settings.WHISPER_MODEL
        device = settings.WHISPER_DEVICE
        compute_type = settings.WHISPER_COMPUTE_TYPE

        # Only reload if config changed or first load
        if self._model is None or (
            self._model_name != model_name
            or self._device != device
            or self._compute_type != compute_type
        ):
            logger.info(
                "[WHISPER] Loading model: %s (device=%s, compute_type=%s)",
                model_name,
                device,
                compute_type,
            )
            start_time = time.time()

            try:
                self._model = WhisperModel(
                    model_name,
                    device=device,
                    compute_type=compute_type,
                )
                self._model_name = model_name
                self._device = device
                self._compute_type = compute_type

                load_time = time.time() - start_time
                logger.info("[WHISPER] Model loaded in %.2f seconds", load_time)
            except Exception as e:
                logger.exception("[WHISPER] Failed to load model")
                raise RuntimeError(f"Failed to load Whisper model: {e}") from e

        logger.info("[WHISPER] Model ready: %s on %s", self._model_name, self._device)
        return self._model

    async def transcribe(
        self,
        audio_path: str,
        language: str | None = None,
        beam_size: int | None = None,
        vad_filter: bool | None = None,
    ) -> TranscriptionResult:
        """Transcribe an audio file using Whisper.

        Args:
            audio_path: Path to the audio file (WAV format recommended).
            language: ISO 639-1 language code (e.g., 'en', 'es').
                     If None, auto-detects language.
            beam_size: Beam search size. Higher = better quality, slower.
            vad_filter: Enable Voice Activity Detection to skip silence.

        Returns:
            TranscriptionResult with full transcript, segments, and metadata.

        Raises:
            FileNotFoundError: If audio file doesn't exist.
            RuntimeError: If transcription fails.
        """
        import asyncio
        import os

        # Validate audio file exists
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Get config values with overrides
        effective_beam_size = beam_size or settings.WHISPER_BEAM_SIZE
        effective_vad_filter = vad_filter if vad_filter is not None else settings.WHISPER_VAD_FILTER
        effective_language = language or settings.WHISPER_LANGUAGE

        logger.info(
            "[WHISPER] Starting transcription: %s (language=%s, beam_size=%d)",
            audio_path,
            effective_language or "auto",
            effective_beam_size,
        )
        start_time = time.time()

        def _run_transcription() -> tuple[Any, Any]:
            """Synchronous transcription call (runs in thread)."""
            logger.info("[WHISPER] _run_transcription: ensuring model...")
            model = self._ensure_model()
            logger.info("[WHISPER] _run_transcription: calling model.transcribe()...")
            result = model.transcribe(
                audio_path,
                language=effective_language,
                beam_size=effective_beam_size,
                vad_filter=effective_vad_filter,
                word_timestamps=True,
            )
            logger.info("[WHISPER] _run_transcription: model.transcribe() returned")
            return result

        try:
            # Run CPU-bound transcription in thread pool
            logger.info("[WHISPER] Running transcription in thread pool...")
            segments_generator, info = await asyncio.to_thread(_run_transcription)
            logger.info("[WHISPER] Thread returned, consuming segments generator...")

            # Collect segments (generator must be consumed)
            segments = []
            full_text_parts = []

            for i, segment in enumerate(segments_generator):
                seg = TranscriptionSegment(
                    id=i,
                    start=segment.start,
                    end=segment.end,
                    text=segment.text.strip(),
                    avg_logprob=getattr(segment, "avg_logprob", None),
                    no_speech_prob=getattr(segment, "no_speech_prob", None),
                    compression_ratio=getattr(segment, "compression_ratio", None),
                )
                segments.append(seg)
                full_text_parts.append(seg.text)

            processing_time = time.time() - start_time
            full_text = " ".join(full_text_parts)

            result = TranscriptionResult(
                text=full_text,
                language=info.language,
                language_probability=info.language_probability,
                duration=info.duration,
                segments=segments,
                processing_time=processing_time,
            )

            logger.info(
                "[WHISPER] Complete: %.1fs audio in %.2fs processing time, "
                "language=%s (%.2f%% confidence), %d segments",
                info.duration,
                processing_time,
                info.language,
                info.language_probability * 100,
                len(segments),
            )

            return result

        except Exception as e:
            processing_time = time.time() - start_time
            logger.exception(
                "[WHISPER] Transcription failed after %.2fs",
                processing_time,
            )
            raise RuntimeError(f"Transcription failed: {e}") from e

    def get_model_info(self) -> dict[str, str]:
        """Get current model configuration.

        Returns:
            Dictionary with model name, device, and compute type.
        """
        return {
            "model": settings.WHISPER_MODEL,
            "device": settings.WHISPER_DEVICE,
            "compute_type": settings.WHISPER_COMPUTE_TYPE,
            "loaded": self._model is not None,
        }

    def cleanup(self) -> None:
        """Release model resources to free memory."""
        if self._model is not None:
            del self._model
            self._model = None
            logger.info("Whisper model resources released.")


# Module-level singleton accessor
whisper_service = WhisperService()
