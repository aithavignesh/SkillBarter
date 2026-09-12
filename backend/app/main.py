import logging
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from jose import jwt, JWTError

from app.config import settings
from app.database import engine, Base, check_db_connection
import app.models # ensure all models are registered
from app.services.websocket import ws_manager
from app.seed.seed_data import seed_database

logger = logging.getLogger(__name__)

# Routers
from app.routers import (
    auth,
    users,
    skills,
    matches,
    exchanges,
    messages,
    reviews,
    trust,
    notifications,
    connections,
    feed,
    community,
    search,
    reports,
    admin
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and demo seed data with retries for cloud environments
    max_retries = 5
    retry_delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Checking database connection (attempt {attempt}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
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

@app.get("/health")
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "zero_cash_policy": "Enforced"
    }

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Real-time WebSocket endpoint for instant messaging and live notifications.
    Authenticates via JWT token in URL path.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Echo / keepalive / incoming events
            data = await websocket.receive_text()
            # Can process incoming client events if needed
            await websocket.send_text(f'{{"event":"PONG","received":{data}}}')
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)
