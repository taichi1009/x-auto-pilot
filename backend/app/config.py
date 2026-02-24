from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # X (Twitter) API credentials
    X_API_KEY: str = ""
    X_API_SECRET: str = ""
    X_ACCESS_TOKEN: str = ""
    X_ACCESS_TOKEN_SECRET: str = ""
    X_BEARER_TOKEN: str = ""

    # X OAuth 2.0 (PKCE) credentials
    X_CLIENT_ID: str = ""
    X_CLIENT_SECRET: str = ""
    X_OAUTH_REDIRECT_URI: str = "http://localhost:3000/auth/x/callback"

    # X API tier: free, basic, or pro
    X_API_TIER: str = "free"

    # Claude API key
    CLAUDE_API_KEY: str = ""

    # OpenAI API key
    OPENAI_API_KEY: str = ""

    # AI provider: "claude" or "openai"
    AI_PROVIDER: str = "claude"

    # Gemini API key (for image generation)
    GEMINI_API_KEY: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_BASIC_PRICE_ID: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_ENTERPRISE_PRICE_ID: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./x_auto_pilot.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
