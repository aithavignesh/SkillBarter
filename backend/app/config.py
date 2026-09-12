from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillBarter API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "skillbarter-super-secret-production-key-2026-hyperlocal"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database - default to sqlite for instant local test & standalone execution,
    # or postgresql://postgres:postgres@localhost:5432/skillbarter for PostGIS/Postgres production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./skillbarter.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Hyperlocal defaults
    DEFAULT_EXCHANGE_RADIUS_KM: float = 10.0
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
