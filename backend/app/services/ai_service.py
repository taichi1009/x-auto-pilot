import json
import logging
from typing import Optional, List, Dict, Any

import anthropic
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self) -> None:
        self._client: Optional[anthropic.Anthropic] = None

    @property
    def client(self) -> anthropic.Anthropic:
        if self._client is None:
            if not settings.CLAUDE_API_KEY:
                raise HTTPException(
                    status_code=500,
                    detail="CLAUDE_API_KEY is not configured.",
                )
            self._client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
        return self._client

    def generate_posts(
        self,
        genre: str,
        style: str = "casual",
        count: int = 3,
        custom_prompt: Optional[str] = None,
    ) -> List[str]:
        system_prompt = (
            "You are an expert social media strategist specializing in X (Twitter). "
            "You create viral, engaging posts that drive impressions and engagement. "
            "Every post MUST be 280 characters or fewer. "
            "Include relevant hashtags when appropriate. "
            "Return ONLY a valid JSON array of strings, no other text."
        )

        user_prompt = (
            f"Generate {count} buzz-worthy X (Twitter) posts about '{genre}'. "
            f"Writing style: {style}. "
            f"Each post must be 280 characters max including hashtags. "
            f"Make them attention-grabbing with hooks that stop scrolling."
        )

        if custom_prompt:
            user_prompt += f"\n\nAdditional instructions: {custom_prompt}"

        user_prompt += (
            f"\n\nReturn exactly {count} posts as a JSON array of strings. "
            "Example: [\"Post 1 text here\", \"Post 2 text here\"]"
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            response_text = message.content[0].text.strip()
            # Parse the JSON response
            posts = json.loads(response_text)
            if not isinstance(posts, list):
                raise ValueError("Response is not a list")
            # Ensure all posts are within the 280 char limit
            validated_posts = []
            for post in posts:
                if isinstance(post, str) and len(post) <= 280:
                    validated_posts.append(post)
                elif isinstance(post, str):
                    validated_posts.append(post[:277] + "...")
            return validated_posts[:count]
        except json.JSONDecodeError:
            logger.error("Failed to parse AI response as JSON: %s", response_text)
            raise HTTPException(
                status_code=502,
                detail="AI returned an invalid response format.",
            )
        except anthropic.APIError as exc:
            logger.error("Claude API error: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Claude API error: {exc}"
            ) from exc

    def improve_post(
        self,
        content: str,
        feedback: Optional[str] = None,
    ) -> Dict[str, str]:
        system_prompt = (
            "You are an expert social media copywriter. "
            "Improve the given X (Twitter) post to maximize engagement. "
            "The improved version MUST be 280 characters or fewer. "
            "Return ONLY valid JSON with keys: 'improved' and 'explanation'."
        )

        user_prompt = f'Improve this X post:\n\n"{content}"'
        if feedback:
            user_prompt += f"\n\nSpecific feedback: {feedback}"

        user_prompt += (
            "\n\nReturn JSON: "
            '{\"improved\": \"the improved post\", \"explanation\": \"why this is better\"}'
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            response_text = message.content[0].text.strip()
            result = json.loads(response_text)
            improved = result.get("improved", content)
            if len(improved) > 280:
                improved = improved[:277] + "..."
            return {
                "original": content,
                "improved": improved,
                "explanation": result.get("explanation", "Improved for better engagement."),
            }
        except (json.JSONDecodeError, KeyError):
            logger.error("Failed to parse AI improvement response")
            raise HTTPException(
                status_code=502,
                detail="AI returned an invalid response format.",
            )
        except anthropic.APIError as exc:
            logger.error("Claude API error: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Claude API error: {exc}"
            ) from exc

    def analyze_performance(
        self,
        metrics_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are a social media analytics expert. "
            "Analyze the provided X (Twitter) post performance data and provide "
            "actionable insights and recommendations. "
            "Return ONLY valid JSON with keys: 'analysis', 'top_performing', "
            "'improvement_areas', 'recommendations'."
        )

        user_prompt = (
            "Analyze these X post performance metrics:\n\n"
            f"{json.dumps(metrics_data, indent=2)}\n\n"
            "Provide analysis with:\n"
            "- Overall performance summary\n"
            "- Top performing content patterns\n"
            "- Areas for improvement\n"
            "- Specific, actionable recommendations\n\n"
            "Return as JSON."
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            response_text = message.content[0].text.strip()
            result = json.loads(response_text)
            return result
        except (json.JSONDecodeError, KeyError):
            logger.error("Failed to parse AI analysis response")
            return {
                "analysis": "Unable to parse analysis. Please try again.",
                "top_performing": [],
                "improvement_areas": [],
                "recommendations": [],
            }
        except anthropic.APIError as exc:
            logger.error("Claude API error during analysis: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Claude API error: {exc}"
            ) from exc
