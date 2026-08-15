import asyncio
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

from app.core.config import settings
from app.services import audio
from app.services.youtube import BOT_CHECK_ERROR_MESSAGE


class AudioServiceErrorMappingTests(unittest.TestCase):
    def test_bot_check_error_maps_to_friendly_message(self) -> None:
        error_message = (
            "ERROR: [youtube] otK7Ot9y7jU: Sign in to confirm you're not a bot. "
            "Use --cookies-from-browser or --cookies for the authentication."
        )
        message = audio._get_download_error_message(error_message)
        self.assertEqual(message, BOT_CHECK_ERROR_MESSAGE)
        # Never instruct SaaS users to configure cookies/browsers themselves.
        self.assertNotIn("cookie", message.lower())
        self.assertNotIn("browser", message.lower())

    def test_private_video_error_maps_to_clear_message(self) -> None:
        message = audio._get_download_error_message(
            "ERROR: [youtube] abc123: Video unavailable"
        )
        self.assertEqual(message, "Video is private, deleted, or unavailable.")

    def test_rate_limit_error_maps_to_clear_message(self) -> None:
        message = audio._get_download_error_message("ERROR: HTTP Error 429: Too Many Requests")
        self.assertEqual(message, "YouTube temporarily rate-limited the download. Please try again shortly.")

    def test_unknown_error_uses_generic_message(self) -> None:
        message = audio._get_download_error_message("ERROR: something unexpected happened")
        self.assertEqual(message, "The audio download failed. Please try again later.")

    def test_bot_check_is_retryable(self) -> None:
        self.assertTrue(
            audio._is_retryable_download_error("Sign in to confirm you're not a bot")
        )

    def test_private_video_is_not_retryable(self) -> None:
        self.assertFalse(audio._is_retryable_download_error("Video unavailable"))
        self.assertFalse(audio._is_retryable_download_error("Private video"))

    def test_rate_limit_is_retryable(self) -> None:
        self.assertTrue(audio._is_retryable_download_error("HTTP Error 429"))


class FfmpegResolutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_ffmpeg_path = settings.FFMPEG_PATH

    def tearDown(self) -> None:
        settings.FFMPEG_PATH = self._old_ffmpeg_path

    def test_explicit_configured_path_wins(self) -> None:
        settings.FFMPEG_PATH = "C:/custom/ffmpeg.exe"
        with (
            patch("app.services.audio.shutil.which") as mock_which,
            patch("app.services.audio._get_bundled_ffmpeg") as mock_bundled,
        ):
            self.assertEqual(audio._resolve_ffmpeg_path(), "C:/custom/ffmpeg.exe")
        mock_which.assert_not_called()
        mock_bundled.assert_not_called()

    def test_default_uses_ffmpeg_on_system_path(self) -> None:
        settings.FFMPEG_PATH = "ffmpeg"  # default value
        with (
            patch("app.services.audio.shutil.which", return_value="/usr/bin/ffmpeg") as mock_which,
            patch("app.services.audio._get_bundled_ffmpeg") as mock_bundled,
        ):
            self.assertEqual(audio._resolve_ffmpeg_path(), "/usr/bin/ffmpeg")
        mock_which.assert_called_once_with("ffmpeg")
        mock_bundled.assert_not_called()

    def test_falls_back_to_bundled_ffmpeg(self) -> None:
        settings.FFMPEG_PATH = "ffmpeg"
        with (
            patch("app.services.audio.shutil.which", return_value=None),
            patch("app.services.audio._get_bundled_ffmpeg", return_value="/bundled/ffmpeg.exe"),
        ):
            self.assertEqual(audio._resolve_ffmpeg_path(), "/bundled/ffmpeg.exe")

    def test_returns_configured_default_when_nothing_available(self) -> None:
        settings.FFMPEG_PATH = "ffmpeg"
        with (
            patch("app.services.audio.shutil.which", return_value=None),
            patch("app.services.audio._get_bundled_ffmpeg", return_value=None),
        ):
            self.assertEqual(audio._resolve_ffmpeg_path(), "ffmpeg")

    def test_bundled_ffmpeg_returns_none_when_package_missing(self) -> None:
        real_import = __import__

        def fake_import(name: str, *args, **kwargs):
            if name == "imageio_ffmpeg":
                raise ImportError("No module named 'imageio_ffmpeg'")
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=fake_import):
            self.assertIsNone(audio._get_bundled_ffmpeg())

    def test_validate_ffmpeg_raises_clear_error_when_missing(self) -> None:
        with (
            patch("app.services.audio._resolve_ffmpeg_path", return_value="ffmpeg"),
            patch(
                "app.services.audio.subprocess.run",
                side_effect=FileNotFoundError("ffmpeg"),
            ),
        ):
            with self.assertRaises(audio.AudioDownloadError) as ctx:
                audio._validate_ffmpeg()
        self.assertIn("FFmpeg not found", str(ctx.exception))


class AudioDurationTests(unittest.TestCase):
    def test_duration_read_from_wav_header(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wav_path = str(Path(tmp) / "test.wav")
            with wave.open(wav_path, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(16000)
                wav.writeframes(b"\x00\x00" * 16000)  # 1 second of silence
            self.assertEqual(asyncio.run(audio._get_audio_duration(wav_path)), 1)

    def test_duration_returns_none_for_invalid_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wav_path = str(Path(tmp) / "not-a-wav.wav")
            Path(wav_path).write_bytes(b"definitely not a wav file")
            self.assertIsNone(asyncio.run(audio._get_audio_duration(wav_path)))


if __name__ == "__main__":
    unittest.main()
