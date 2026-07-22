"""Whisper transcription service using faster-whisper.

Provides lazy-loaded model initialization and transcription capabilities
with support for CPU/GPU execution, language detection, and segment generation.
"""

import logging
import os
import time
import wave
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
            RuntimeError: If transcription fails or produces empty transcript.
        """
        import asyncio

        # Validate audio file exists
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Get config values with overrides
        effective_beam_size = beam_size or settings.WHISPER_BEAM_SIZE
        effective_vad_filter = vad_filter if vad_filter is not None else settings.WHISPER_VAD_FILTER
        effective_language = language or settings.WHISPER_LANGUAGE

        logger.info(
            "[WHISPER] Starting transcription: %s (language=%s, beam_size=%d, vad_filter=%s)",
            audio_path,
            effective_language or "auto",
            effective_beam_size,
            effective_vad_filter,
        )
        start_time = time.time()

        def _run_with_retry() -> TranscriptionResult:
            """Synchronous transcription call (runs entirely in thread pool).

            Consumes the segments generator INSIDE the thread to prevent
            blocking the async event loop during beam search decoding.

            Automatically retries with fallback parameters if the
            initial transcription produces an empty result:
            - Retry 1: Disable VAD filter (if it was enabled)
            - Retry 2: Auto-detect language (if a language hint was given)
            """
            logger.info("[WHISPER] _run_with_retry: ensuring model...")
            model = self._ensure_model()

            # ── Audio file validation ───────────────────────────────────
            audio_exists = os.path.exists(audio_path)
            audio_size = os.path.getsize(audio_path) if audio_exists else 0
            logger.info(
                "[WHISPER] Audio file check: path=%s, exists=%s, size=%d bytes",
                audio_path, audio_exists, audio_size,
            )

            audio_duration_sec = 0.0
            audio_sample_rate = 0
            audio_channels = 0
            try:
                with wave.open(audio_path, 'rb') as wf:
                    audio_sample_rate = wf.getframerate()
                    audio_channels = wf.getnchannels()
                    audio_frames = wf.getnframes()
                    audio_duration_sec = audio_frames / audio_sample_rate if audio_sample_rate > 0 else 0.0
                logger.info(
                    "[WHISPER] WAV validation: sample_rate=%d Hz, channels=%d, frames=%d, duration=%.2fs",
                    audio_sample_rate, audio_channels, audio_frames, audio_duration_sec,
                )
            except Exception as wav_err:
                logger.warning("[WHISPER] Failed to read WAV headers: %s", wav_err)

            # ── Build retry parameter combinations ──────────────────────
            # Try progressively more lenient settings if output is empty.
            retry_params: list[tuple[bool, str | None]] = []
            retry_params.append((effective_vad_filter, effective_language))
            if effective_vad_filter:
                retry_params.append((False, effective_language))
            if effective_language is not None:
                retry_params.append((effective_vad_filter, None))
            if effective_vad_filter and effective_language is not None:
                retry_params.append((False, None))

            # Deduplicate while preserving order
            seen_params: set[tuple[bool, str | None]] = set()
            unique_params: list[tuple[bool, str | None]] = []
            for p in retry_params:
                if p not in seen_params:
                    seen_params.add(p)
                    unique_params.append(p)

            last_info = None

            for attempt, (current_vad, current_lang) in enumerate(unique_params, 1):
                if attempt > 1:
                    logger.info(
                        "[WHISPER] Retry attempt %d/%d: vad_filter=%s, language=%s",
                        attempt, len(unique_params), current_vad, current_lang or "auto",
                    )

                logger.info(
                    "[WHISPER] Calling model.transcribe() (attempt %d/%d): vad_filter=%s, language=%s, beam_size=%d",
                    attempt, len(unique_params),
                    current_vad, current_lang or "auto", effective_beam_size,
                )

                segments_generator, info = model.transcribe(
                    audio_path,
                    language=current_lang,
                    beam_size=effective_beam_size,
                    vad_filter=current_vad,
                    word_timestamps=True,
                )
                last_info = info

                logger.info(
                    "[WHISPER] model.transcribe() returned: language=%s, language_probability=%.4f, duration=%.2fs",
                    info.language, info.language_probability, info.duration,
                )

                # Consume the generator INSIDE the thread
                segments: list[TranscriptionSegment] = []
                full_text_parts: list[str] = []

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

                logger.info(
                    "[WHISPER] Attempt %d result: %d segments, full_text_length=%d chars, processing_time=%.2fs",
                    attempt, len(segments), len(full_text), processing_time,
                )

                if len(segments) > 0 and full_text.strip():
                    logger.info(
                        "[WHISPER] Attempt %d succeeded: %.1fs audio in %.2fs, "
                        "language=%s (%.2f%%), %d segments",
                        attempt, info.duration, processing_time,
                        info.language, info.language_probability * 100,
                        len(segments),
                    )
                    return TranscriptionResult(
                        text=full_text,
                        language=info.language,
                        language_probability=info.language_probability,
                        duration=info.duration,
                        segments=segments,
                        processing_time=processing_time,
                    )

                logger.warning(
                    "[WHISPER] Attempt %d produced empty output! "
                    "language=%s (prob=%.4f), duration=%.2fs, "
                    "vad_filter=%s, language_param=%s",
                    attempt,
                    info.language, info.language_probability,
                    info.duration, current_vad, current_lang or "auto",
                )

            # ── All retries exhausted, raise descriptive error ──────────
            processing_time = time.time() - start_time
            error_msg = (
                f"Whisper produced an empty transcript after {len(unique_params)} attempt(s). "
                f"audio_path={audio_path}, "
                f"audio_size={audio_size} bytes, "
                f"audio_duration={audio_duration_sec:.1f}s (wave), "
                f"whisper_duration={last_info.duration:.1f}s (model), "
                f"language={last_info.language} (prob={last_info.language_probability:.2%}), "
                f"vad_filter={effective_vad_filter}, "
                f"language_hint={effective_language}"
            )
            logger.error("[WHISPER] %s", error_msg)
            raise RuntimeError(error_msg)

        try:
            # Run the ENTIRE transcription (model + generator consumption) in the thread pool
            logger.info("[WHISPER] Running transcription in thread pool...")
            result = await asyncio.to_thread(_run_with_retry)
            logger.info(
                "[WHISPER] Complete: %.1fs audio in %.2fs processing time, "
                "language=%s (%.2f%% confidence), %d segments",
                result.duration,
                result.processing_time,
                result.language,
                result.language_probability * 100,
                len(result.segments),
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
