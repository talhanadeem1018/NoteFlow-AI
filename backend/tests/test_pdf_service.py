import unittest

from app.services import pdf_service


class PdfServiceTextSanitizationTests(unittest.TestCase):
    def test_preserves_bullets_quotes_and_arabic_text(self) -> None:
        text = '• “Hello” — مرحبا
'
        result = pdf_service._sanitize_text(text, font_name="DejaVuSans")
        self.assertIn('•', result)
        self.assertIn('“', result)
        self.assertIn('”', result)
        self.assertIn('—', result)
        self.assertIn('مرحبا', result)

    def test_removes_emoji_like_characters(self) -> None:
        text = 'Hello 😀 world 🌍'
        result = pdf_service._sanitize_text(text, font_name="DejaVuSans")
        self.assertEqual(result, 'Hello  world ')


if __name__ == "__main__":
    unittest.main()
