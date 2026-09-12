import logging
import socket
import re
from typing import Optional
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

_last_db_error: Optional[str] = None

def get_last_db_error() -> Optional[str]:
    return _last_db_error

def resolve_database_ips(hostname: str, port: int = 5432):
    """Resolve IPv4 addresses dynamically for remote database hostnames."""
    if not hostname or hostname in ("localhost", "127.0.0.1"):
        return []
    try:
        addr_info = socket.getaddrinfo(hostname, port, socket.AF_INET, socket.SOCK_STREAM)
        ips = []
        for item in addr_info:
            ip = item[4][0]
            if ip not in ips:
                ips.append(ip)
        return ips
    except Exception as e:
        logger.warning(f"Could not resolve hostaddr dynamically for {hostname}: {e}")
        return []

def sanitize_db_error(error_str: str) -> str:
    """Scrub sensitive credentials (passwords, tokens, keys) from error strings."""
    scrubbed = re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", error_str)
    scrubbed = re.sub(r"password=['\"][^'\"]*['\"]", "password='***'", scrubbed, flags=re.IGNORECASE)
    return scrubbed

db_url = settings.normalized_database_url
is_sqlite = db_url.startswith("sqlite")
is_postgres = db_url.startswith("postgresql")

connect_args = {}
if is_sqlite:
    connect_args["check_same_thread"] = False
elif is_postgres:
    try:
        parsed_url = make_url(db_url)
        hostname = parsed_url.host
        port = parsed_url.port or 5432
        if hostname and hostname not in ("localhost", "127.0.0.1"):
            connect_args.setdefault("sslmode", "require")
            initial_ips = resolve_database_ips(hostname, port)
            if initial_ips:
                connect_args["hostaddr"] = initial_ips[0]
                logger.info(f"Initialized hostaddr for {hostname} to {initial_ips[0]}")
    except Exception as parse_err:
        logger.warning(f"Could not parse database URL for initial connect_args: {parse_err}")

engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
    "pool_pre_ping": True,
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    })

engine = create_engine(db_url, **engine_kwargs)

if is_postgres:
    @event.listens_for(engine, "do_connect")
    def receive_do_connect(dialect, conn_rec, cargs, cparams):
        host = cparams.get("host")
        port = cparams.get("port", 5432)
        if host and host not in ("localhost", "127.0.0.1") and "," not in host:
            ips = resolve_database_ips(host, port)
            if ips:
                if len(ips) > 1:
                    cparams["host"] = ",".join([host] * len(ips))
                    cparams["hostaddr"] = ",".join(ips)
                else:
                    cparams["hostaddr"] = ips[0]
            cparams.setdefault("sslmode", "require")

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
    global _last_db_error
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        _last_db_error = None
        return True
    except Exception as e:
        _last_db_error = sanitize_db_error(f"{type(e).__name__}: {e}")
        logger.error(f"Database health check failed: {_last_db_error}")
        return False
