import logging
import socket
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

def get_connect_args(db_url: str) -> dict:
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        return connect_args

    if db_url.startswith("postgresql"):
        parsed = urllib.parse.urlparse(db_url)
        hostname = parsed.hostname
        port = parsed.port or 5432
        # If connecting to a remote host, resolve IPv4 dynamically to prevent container C resolver issues
        if hostname and hostname not in ("localhost", "127.0.0.1"):
            try:
                addr_info = socket.getaddrinfo(hostname, port, socket.AF_INET, socket.SOCK_STREAM)
                if addr_info:
                    resolved_ip = addr_info[0][4][0]
                    connect_args["hostaddr"] = resolved_ip
                    logger.info(f"Dynamically resolved database host {hostname} to {resolved_ip}")
            except Exception as e:
                logger.warning(f"Could not resolve hostaddr dynamically for {hostname}: {e}")
    return connect_args

db_url = settings.normalized_database_url
connect_args = get_connect_args(db_url)

engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
    "pool_pre_ping": True,
}

if not db_url.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    })

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> bool:
    """Test if database is reachable and accepting queries."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
