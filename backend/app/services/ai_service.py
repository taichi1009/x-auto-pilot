import json
import logging
from typing import Optional, List, Dict, Any

import anthropic
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(
        self,
        provider: Optional[str] = None,
        claude_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ) -> None:
        self.provider = provider or settings.AI_PROVIDER
        self._claude_api_key = claude_api_key or settings.CLAUDE_API_KEY
        self._openai_api_key = openai_api_key or settings.OPENAI_API_KEY
        self._claude_client: Optional[anthropic.Anthropic] = None
        self._openai_client = None

    @property
    def client(self) -> anthropic.Anthropic:
        """Legacy accessor for Claude client (backward compat)."""
        if self._claude_client is None:
            if not self._claude_api_key:
                raise HTTPException(
                    status_code=500,
                    detail="CLAUDE_API_KEY is not configured.",
                )
            self._claude_client = anthropic.Anthropic(api_key=self._claude_api_key)
        return self._claude_client

    @property
    def openai_client(self):
        if self._openai_client is None:
            import openai

            if not self._openai_api_key:
                raise HTTPException(
                    status_code=500,
                    detail="OPENAI_API_KEY is not configured.",
                )
            self._openai_client = openai.OpenAI(api_key=self._openai_api_key)
        return self._openai_client

    def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 1024,
    ) -> str:
        """Call the configured LLM provider and return the text response."""
        if self.provider == "openai":
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content.strip()
        else:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return message.content[0].text.strip()

    def _build_persona_context(self, persona) -> str:
        """Build a system prompt section from a persona object."""
        if not persona:
            return ""
        parts = [f"\n\nYou are writing as the persona '{persona.name}'."]
        if persona.description:
            parts.append(f"Description: {persona.description}")
        if persona.personality_traits:
            parts.append(f"Personality traits: {', '.join(persona.personality_traits)}")
        if persona.background_story:
            parts.append(f"Background: {persona.background_story}")
        if persona.target_audience:
            parts.append(f"Target audience: {persona.target_audience}")
        if persona.expertise_areas:
            parts.append(f"Expertise: {', '.join(persona.expertise_areas)}")
        if persona.communication_style:
            parts.append(f"Communication style: {persona.communication_style}")
        if persona.tone:
            parts.append(f"Tone: {persona.tone}")
        if persona.language_patterns:
            parts.append(f"Language patterns: {', '.join(persona.language_patterns)}")
        if persona.example_posts:
            parts.append("Example posts:\n" + "\n".join(f"- {p}" for p in persona.example_posts[:3]))
        return "\n".join(parts)

    def _build_strategy_context(self, strategy) -> str:
        """Build a system prompt section from a strategy object."""
        if not strategy:
            return ""
        parts = [f"\n\nContent Strategy '{strategy.name}':"]
        if strategy.content_pillars:
            parts.append(f"Content pillars: {', '.join(strategy.content_pillars)}")
        if strategy.avoid_topics:
            parts.append(f"Avoid topics: {', '.join(strategy.avoid_topics)}")
        if strategy.hashtag_groups:
            for group, tags in strategy.hashtag_groups.items():
                parts.append(f"Hashtags ({group}): {' '.join(tags[:5])}")
        return "\n".join(parts)

    def generate_posts(
        self,
        genre: str,
        style: str = "casual",
        count: int = 3,
        custom_prompt: Optional[str] = None,
        post_format: str = "tweet",
        persona=None,
        strategy=None,
        thread_length: int = 3,
    ) -> Dict[str, Any]:
        if post_format == "long_form":
            return self.generate_long_form(genre, style, count, custom_prompt, persona, strategy)
        if post_format == "thread":
            return self.generate_thread(genre, style, count, custom_prompt, persona, strategy, thread_length)

        system_prompt = (
            "You are an expert social media strategist specializing in X (Twitter). "
            "You create viral, engaging posts that drive impressions and engagement. "
            "Every post MUST be 280 characters or fewer. "
            "Include relevant hashtags when appropriate. "
            "Return ONLY a valid JSON array of strings, no other text."
        )
        system_prompt += self._build_persona_context(persona)
        system_prompt += self._build_strategy_context(strategy)

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
            response_text = self.call_llm(system_prompt, user_prompt, 1024)
            posts = json.loads(response_text)
            if not isinstance(posts, list):
                raise ValueError("Response is not a list")
            validated_posts = []
            for post in posts:
                if isinstance(post, str) and len(post) <= 280:
                    validated_posts.append(post)
                elif isinstance(post, str):
                    validated_posts.append(post[:277] + "...")
            return {"posts": validated_posts[:count], "post_format": "tweet"}
        except json.JSONDecodeError:
            logger.error("Failed to parse AI response as JSON: %s", response_text)
            raise HTTPException(
                status_code=502,
                detail="AI returned an invalid response format.",
            )
        except Exception as exc:
            logger.error("AI API error: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"AI API error: {exc}"
            ) from exc

    def generate_long_form(
        self,
        genre: str,
        style: str = "casual",
        count: int = 1,
        custom_prompt: Optional[str] = None,
        persona=None,
        strategy=None,
    ) -> Dict[str, Any]:
        """Generate long-form posts (1,000-5,000 chars)."""
        system_prompt = (
            "You are an expert content creator for X (Twitter) long-form posts. "
            "Create compelling, in-depth posts between 1,000 and 5,000 characters. "
            "Structure them with clear paragraphs and engaging hooks. "
            "Return ONLY a valid JSON array of strings, no other text."
        )
        system_prompt += self._build_persona_context(persona)
        system_prompt += self._build_strategy_context(strategy)

        user_prompt = (
            f"Generate {count} long-form X post(s) about '{genre}'. "
            f"Writing style: {style}. "
            f"Each post should be 1,000-5,000 characters. "
            f"Include compelling hooks, clear structure, and a call to action."
        )

        if custom_prompt:
            user_prompt += f"\n\nAdditional instructions: {custom_prompt}"

        user_prompt += (
            f"\n\nReturn exactly {count} posts as a JSON array of strings."
        )

        try:
            response_text = self.call_llm(system_prompt, user_prompt, 4096)
            posts = json.loads(response_text)
            if not isinstance(posts, list):
                raise ValueError("Response is not a list")
            validated = [p for p in posts if isinstance(p, str)]
            return {"posts": validated[:count], "post_format": "long_form"}
        except json.JSONDecodeError:
            logger.error("Failed to parse long-form response")
            raise HTTPException(status_code=502, detail="AI returned invalid format.")
        except Exception as exc:
            logger.error("AI API error: %s", exc)
            raise HTTPException(status_code=502, detail=f"AI API error: {exc}") from exc

    def generate_thread(
        self,
        genre: str,
        style: str = "casual",
        count: int = 1,
        custom_prompt: Optional[str] = None,
        persona=None,
        strategy=None,
        thread_length: int = 3,
    ) -> Dict[str, Any]:
        """Generate thread posts (each tweet 280 chars max)."""
        system_prompt = (
            "You are an expert X (Twitter) thread creator. "
            "Create compelling threads that tell a story or explain a topic step by step. "
            "Each tweet in the thread MUST be 280 characters or fewer. "
            "Return ONLY a valid JSON object with key 'threads' containing an array of arrays of strings."
        )
        system_prompt += self._build_persona_context(persona)
        system_prompt += self._build_strategy_context(strategy)

        user_prompt = (
            f"Generate {count} X thread(s) about '{genre}', each with {thread_length} tweets. "
            f"Writing style: {style}. "
            f"Each tweet must be 280 characters max. "
            f"First tweet should be a strong hook. Last tweet should have a CTA."
        )

        if custom_prompt:
            user_prompt += f"\n\nAdditional instructions: {custom_prompt}"

        user_prompt += (
            f'\n\nReturn JSON: {{"threads": [["tweet1", "tweet2", ...], ...]}}'
        )

        try:
            response_text = self.call_llm(system_prompt, user_prompt, 4096)
            result = json.loads(response_text)
            threads = result.get("threads", [])
            validated_threads = []
            for thread in threads[:count]:
                validated_thread = []
                for tweet in thread[:thread_length]:
                    if isinstance(tweet, str) and len(tweet) <= 280:
                        validated_thread.append(tweet)
                    elif isinstance(tweet, str):
                        validated_thread.append(tweet[:277] + "...")
                if validated_thread:
                    validated_threads.append(validated_thread)
            first_thread_posts = validated_threads[0] if validated_threads else []
            return {
                "posts": first_thread_posts,
                "threads": validated_threads,
                "post_format": "thread",
            }
        except json.JSONDecodeError:
            logger.error("Failed to parse thread response")
            raise HTTPException(status_code=502, detail="AI returned invalid format.")
        except Exception as exc:
            logger.error("AI API error: %s", exc)
            raise HTTPException(status_code=502, detail=f"AI API error: {exc}") from exc

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
            response_text = self.call_llm(system_prompt, user_prompt, 512)
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
        except Exception as exc:
            logger.error("AI API error: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"AI API error: {exc}"
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
            response_text = self.call_llm(system_prompt, user_prompt, 2048)
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
        except Exception as exc:
            logger.error("AI API error during analysis: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"AI API error: {exc}"
            ) from exc


def create_ai_service(db: Session, user_id: int) -> AIService:
    """Factory: build an AIService using per-user settings from the DB."""
    from app.services.user_settings import get_ai_settings

    cfg = get_ai_settings(db, user_id)
    return AIService(
        provider=cfg["provider"] or None,
        claude_api_key=cfg["claude_api_key"] or None,
        openai_api_key=cfg["openai_api_key"] or None,
    )
