import unittest

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


if __name__ == "__main__":
    unittest.main()
