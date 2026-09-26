import logging
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from jose import jwt, JWTError
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, check_db_connection, get_last_db_error
import app.models
from app.services.websocket import ws_manager
from app.seed.seed_data import seed_database

logger = logging.getLogger(__name__)

from app.routers import (
    auth, users, skills, matches, exchanges, messages, reviews, trust,
    notifications, connections, feed, community, search, reports, admin, learning
)


def migrate_monetization_columns():
    """Add monetization columns to existing deployments without requiring Alembic."""
    if engine.dialect.name != "postgresql":
        return
    columns = {
        "premium": "BOOLEAN NOT NULL DEFAULT FALSE",
        "premium_until": "TIMESTAMP NULL",
        "verified": "BOOLEAN NOT NULL DEFAULT FALSE",
        "verification_requested_at": "TIMESTAMP NULL",
        "featured_until": "TIMESTAMP NULL",
        "priority_matching": "BOOLEAN NOT NULL DEFAULT FALSE",
        "credits": "INTEGER NOT NULL DEFAULT 100",
        "workshops_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
        "corporate_interest": "BOOLEAN NOT NULL DEFAULT FALSE",
        "sponsored_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
        "lead_generation_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
        "priority_matches_used": "INTEGER NOT NULL DEFAULT 0",
        "priority_matches_date": "VARCHAR(10) NULL",
        "boosts_used": "INTEGER NOT NULL DEFAULT 0",
        "last_boost_at": "TIMESTAMP NULL",
    }
    with engine.begin() as connection:
        for name, definition in columns.items():
            connection.execute(text(f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {definition}'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    max_retries = 5
    retry_delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Checking database connection (attempt {attempt}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
            migrate_monetization_columns()
            logger.info("Database schema verified and tables ready.")
            try:
                seed_database()
            except Exception as seed_err:
                logger.info(f"Seed note: {seed_err}")
            break
        except Exception as db_err:
            logger.warning(f"Database connection attempt {attempt}/{max_retries} failed: {db_err}")
            if attempt < max_retries:
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 10)
            else:
                logger.error("Could not complete database initialization after all retries. App starting in degraded state.")
    yield

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(skills.router, prefix=settings.API_V1_STR)
app.include_router(matches.router, prefix=settings.API_V1_STR)
app.include_router(exchanges.router, prefix=settings.API_V1_STR)
app.include_router(messages.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(trust.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(connections.router, prefix=settings.API_V1_STR)
app.include_router(feed.router, prefix=settings.API_V1_STR)
app.include_router(community.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(learning.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    db_ok = check_db_connection()
    resp = {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "zero_cash_policy": "Enforced"
    }
    if not db_ok:
        err = get_last_db_error()
        if err:
            resp["database_error"] = err
    return resp

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f'{{"event":"PONG","received":{data}}}')
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)
