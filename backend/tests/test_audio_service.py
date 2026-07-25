import unittest

from app.services import audio


class AudioServiceCookieErrorTests(unittest.TestCase):
    def test_detects_yt_dlp_browser_cookie_parse_error(self) -> None:
        error_message = "ERROR: _parse_browser_specification() takes from 1 to 4 positional arguments but 5 were given"
        self.assertTrue(audio._is_browser_cookie_error(error_message))


if __name__ == "__main__":
    unittest.main()
