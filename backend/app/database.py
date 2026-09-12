from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# ==============================================================================
# TEMPORARY STARTUP DIAGNOSTIC: RENDER DNS CHECK (Remove after diagnosis)
# ==============================================================================
import sys
import platform
import socket
import urllib.parse

try:
    print("----- [START DNS DIAGNOSTIC] -----")
    print(f"[DNS DIAGNOSTIC] Python version: {sys.version}")
    print(f"[DNS DIAGNOSTIC] Platform: {platform.platform()}")
    
    parsed_db_url = urllib.parse.urlparse(settings.DATABASE_URL)
    db_host = parsed_db_url.hostname or "ju9c3u2p.us-east.database.insforge.app"
    print(f"[DNS DIAGNOSTIC] DATABASE_URL host only: {db_host}")
    
    target_host = "ju9c3u2p.us-east.database.insforge.app"
    print(f"[DNS DIAGNOSTIC] Attempting socket.getaddrinfo() for: {target_host}")
    addr_info = socket.getaddrinfo(target_host, 5432)
    resolved_ips = list({item[4][0] for item in addr_info})
    print(f"[DNS DIAGNOSTIC] Resolution successful! Resolved IPs: {resolved_ips}")
    print(f"[DNS DIAGNOSTIC] Full getaddrinfo result: {addr_info}")
    print("----- [END DNS DIAGNOSTIC] -----")
except Exception as diag_err:
    print(f"[DNS DIAGNOSTIC] Resolution failed with error: {type(diag_err).__name__}: {diag_err}")
    print("----- [END DNS DIAGNOSTIC] -----")
# ==============================================================================
# END TEMPORARY STARTUP DIAGNOSTIC
# ==============================================================================

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
