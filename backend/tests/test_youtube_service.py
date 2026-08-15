import tempfile
import unittest
from pathlib import Path

from app.core.config import settings
from app.services.youtube import build_ytdlp_options, is_bot_check_error


class BotCheckDetectionTests(unittest.TestCase):
    def test_detects_bot_check_message(self) -> None:
        self.assertTrue(
            is_bot_check_error(
                "ERROR: [youtube] abc123: Sign in to confirm you're not a bot"
            )
        )

    def test_detects_captcha(self) -> None:
        self.assertTrue(is_bot_check_error("ERROR: please solve a captcha to continue"))

    def test_ignores_unrelated_errors(self) -> None:
        self.assertFalse(is_bot_check_error("ERROR: HTTP Error 429"))
        self.assertFalse(is_bot_check_error("Video is private"))


class BuildYtDlpOptionsTests(unittest.TestCase):
    def setUp(self) -> None:
        # Snapshot settings so tests never leak mutations into other tests.
        self._old_proxy = settings.YTDLP_PROXY
        self._old_cookies_file = settings.YTDLP_COOKIES_FILE
        self._old_player_clients = settings.YTDLP_PLAYER_CLIENTS

    def tearDown(self) -> None:
        settings.YTDLP_PROXY = self._old_proxy
        settings.YTDLP_COOKIES_FILE = self._old_cookies_file
        settings.YTDLP_PLAYER_CLIENTS = self._old_player_clients

    def test_defaults_use_player_client_fallback_chain_and_no_cookies(self) -> None:
        opts = build_ytdlp_options()
        self.assertIn("extractor_args", opts)
        clients = opts["extractor_args"]["youtube"]["player_client"]
        self.assertIsInstance(clients, list)
        self.assertIn("android", clients)
        # Never read browser cookies on the server.
        self.assertNotIn("cookiesfrombrowser", opts)
        self.assertNotIn("cookiefile", opts)
        self.assertTrue(opts["skip_download"])
        self.assertNotIn("proxy", opts)

    def test_download_mode_adds_format_and_outtmpl(self) -> None:
        opts = build_ytdlp_options(download=True, output_path="/tmp/video_raw")
        self.assertEqual(opts["format"], "bestaudio/best")
        self.assertEqual(opts["outtmpl"], "/tmp/video_raw")
        self.assertNotIn("skip_download", opts)

    def test_proxy_setting_adds_proxy(self) -> None:
        settings.YTDLP_PROXY = "http://user:pass@proxy.example:8080"
        opts = build_ytdlp_options()
        self.assertEqual(opts["proxy"], "http://user:pass@proxy.example:8080")

    def test_cookies_file_only_used_when_file_exists(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cookies_file = Path(tmp) / "cookies.txt"
            cookies_file.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")

            settings.YTDLP_COOKIES_FILE = str(cookies_file)
            opts = build_ytdlp_options()
            self.assertEqual(opts["cookiefile"], str(cookies_file))

            # Missing file is ignored (with a warning), never a crash.
            settings.YTDLP_COOKIES_FILE = str(Path(tmp) / "missing.txt")
            opts = build_ytdlp_options()
            self.assertNotIn("cookiefile", opts)

    def test_empty_player_clients_defaults_to_android(self) -> None:
        settings.YTDLP_PLAYER_CLIENTS = "  ,  , "
        opts = build_ytdlp_options()
        self.assertEqual(opts["extractor_args"]["youtube"]["player_client"], ["android"])


if __name__ == "__main__":
    unittest.main()
