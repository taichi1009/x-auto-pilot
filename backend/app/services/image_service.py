import logging
import tempfile
import os
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class ImageService:
    """Generate images using Google Gemini API (Nano Banana Pro)."""

    def __init__(self) -> None:
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def generate_image(self, prompt: str) -> Optional[str]:
        """Generate an image from a text prompt.

        Returns the path to the generated image file, or None on failure.
        """
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set, skipping image generation")
            return None

        try:
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
                config={
                    "response_modalities": ["TEXT", "IMAGE"],
                },
            )

            # Extract image from response parts
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    image_data = part.inline_data.data
                    mime_type = part.inline_data.mime_type or "image/png"
                    ext = ".png" if "png" in mime_type else ".jpg"

                    # Save to temp file
                    fd, filepath = tempfile.mkstemp(suffix=ext, prefix="xap_img_")
                    with os.fdopen(fd, "wb") as f:
                        f.write(image_data)

                    logger.info("Image generated: %s (%d bytes)", filepath, len(image_data))
                    return filepath

            logger.warning("No image data in Gemini response")
            return None

        except Exception as exc:
            logger.error("Image generation failed: %s", exc)
            return None

    def cleanup_image(self, filepath: str) -> None:
        """Remove a temporary image file."""
        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
        except OSError as exc:
            logger.warning("Failed to cleanup image %s: %s", filepath, exc)
