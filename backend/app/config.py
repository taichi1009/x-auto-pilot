from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # X (Twitter) API credentials
    X_API_KEY: str = ""
    X_API_SECRET: str = ""
    X_ACCESS_TOKEN: str = ""
    X_ACCESS_TOKEN_SECRET: str = ""
    X_BEARER_TOKEN: str = ""

    # X API tier: free, basic, or pro
    X_API_TIER: str = "free"

    # Claude API key
    CLAUDE_API_KEY: str = ""

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
