from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillBarter API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "skillbarter-super-secret-production-key-2026-hyperlocal")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database - default to sqlite for instant local test & standalone execution,
    # or postgresql://... for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./skillbarter.db")
    
    # CORS - dynamically configurable via FRONTEND_URL or CORS_ORIGINS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")
    
    # Hyperlocal defaults
    DEFAULT_EXCHANGE_RADIUS_KM: float = 10.0

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        # SQLAlchemy requires postgresql:// instead of postgres://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        for src in (self.FRONTEND_URL, self.CORS_ORIGINS):
            if src:
                for item in src.split(","):
                    item = item.strip().rstrip("/")
                    if item and item not in origins:
                        origins.append(item)
        return origins
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
