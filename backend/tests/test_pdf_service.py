import unittest

from app.services.font_manager import sanitize_text


class TextSanitizationTests(unittest.TestCase):
    def test_preserves_bullets_quotes_and_arabic_text(self) -> None:
        text = '• “Hello” — مرحبا\n'
        result = sanitize_text(text)
        self.assertIn('•', result)
        self.assertIn('“', result)
        self.assertIn('”', result)
        self.assertIn('—', result)
        self.assertIn('مرحبا', result)

    def test_removes_emoji_like_characters(self) -> None:
        text = 'Hello 😀 world 🌍'
        result = sanitize_text(text)
        self.assertEqual(result, 'Hello  world ')


if __name__ == "__main__":
    unittest.main()
