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
    ips = []
    # Primary lookup: IPv4 stream socket
    try:
        addr_info = socket.getaddrinfo(hostname, port or 5432, socket.AF_INET, socket.SOCK_STREAM)
        for item in addr_info:
            ip = item[4][0]
            if ip not in ips:
                ips.append(ip)
    except Exception as e:
        logger.warning(f"AF_INET resolution failed for {hostname}: {e}")
    
    # Fallback lookup: unconstrained getaddrinfo filtering for IPv4
    if not ips:
        try:
            addr_info = socket.getaddrinfo(hostname, port or 5432)
            for item in addr_info:
                ip = item[4][0]
                if ":" not in ip and ip not in ips:
                    ips.append(ip)
        except Exception as e:
            logger.warning(f"Default resolution failed for {hostname}: {e}")
    return ips

def pick_reachable_ip(ips, port: int = 5432, timeout: float = 2.0) -> Optional[str]:
    """Test TCP reachability to choose the active working IP among resolved addresses."""
    if not ips:
        return None
    for ip in ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            s.connect((ip, port or 5432))
            s.close()
            return ip
        except Exception:
            continue
    # If TCP pre-check times out, return first resolved IP
    return ips[0]

def sanitize_db_error(error_str: str) -> str:
    """Scrub sensitive credentials (passwords, tokens, keys) from error strings."""
    scrubbed = re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", error_str)
    scrubbed = re.sub(r"password=['\"][^'\"]*['\"]", "password='***'", scrubbed, flags=re.IGNORECASE)
    return scrubbed

db_url = settings.normalized_database_url
is_sqlite = db_url.startswith("sqlite")

connect_args = {}
if is_sqlite:
    connect_args["check_same_thread"] = False
else:
    try:
        parsed_url = make_url(db_url)
        hostname = parsed_url.host
        port = parsed_url.port or 5432
        if hostname and hostname not in ("localhost", "127.0.0.1"):
            connect_args.setdefault("sslmode", "require")
            initial_ips = resolve_database_ips(hostname, port)
            working_ip = pick_reachable_ip(initial_ips, port)
            if working_ip:
                connect_args["hostaddr"] = working_ip
                logger.info(f"Initialized hostaddr for {hostname} to {working_ip}")
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

@event.listens_for(engine, "do_connect")
def receive_do_connect(dialect, conn_rec, cargs, cparams):
    if dialect.name != "postgresql":
        return

    orig_host = cparams.get("host")
    port = cparams.get("port") or 5432
    dbname = cparams.get("dbname") or cparams.get("database")
    user = cparams.get("user") or cparams.get("username")

    resolved_ips = []
    if orig_host and orig_host not in ("localhost", "127.0.0.1"):
        resolved_ips = resolve_database_ips(orig_host, port)
        working_ip = pick_reachable_ip(resolved_ips, port)
        if working_ip:
            cparams["hostaddr"] = working_ip
        cparams.setdefault("sslmode", "require")

    final_host = cparams.get("host")
    final_hostaddr = cparams.get("hostaddr")

    diag_lines = [
        "----- [START DO_CONNECT DIAGNOSTIC] -----",
        "event triggered: yes",
        f"original host: {orig_host}",
        f"resolved IPv4 addresses: {resolved_ips}",
        f"final hostaddr value passed to psycopg2: {final_hostaddr}",
        f"final host value passed to psycopg2: {final_host}",
        f"port: {port}",
        f"database name: {dbname}",
        f"username: {user}",
        "----- [END DO_CONNECT DIAGNOSTIC] -----",
    ]
    diag_output = "\n".join(diag_lines)
    print(diag_output, flush=True)
    logger.info(diag_output)

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
