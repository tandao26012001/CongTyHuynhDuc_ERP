"""DB connection — duy nhat noi dung psycopg, cac tang khac goi qua ham o day."""
from contextlib import contextmanager
from threading import Lock
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

from backend.config.settings import (
    DATABASE_URL,
    DB_CONNECT_TIMEOUT_SECONDS,
    DB_SCHEMA,
    DB_POOL_MAX_SIZE,
    DB_POOL_TIMEOUT_SECONDS,
    DB_STATEMENT_TIMEOUT_MS,
)


def _dsn() -> str:
    if not DATABASE_URL:
        raise RuntimeError("Thieu DATABASE_URL — dat bien moi truong truoc khi chay")
    return DATABASE_URL


_pool = None
_pool_lock = Lock()


def open_pool():
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = ConnectionPool(
                _dsn(),
                kwargs={"row_factory": dict_row,
                        "connect_timeout": DB_CONNECT_TIMEOUT_SECONDS,
                        "prepare_threshold": None},
                min_size=1,
                max_size=DB_POOL_MAX_SIZE,
                timeout=DB_POOL_TIMEOUT_SECONDS,
                open=True,
            )
        return _pool


def close_pool():
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.close()
            _pool = None


@contextmanager
def get_conn():
    # The pool commits/rolls back before returning the connection for reuse.
    with open_pool().connection() as conn:
        # Transaction-local settings also work with external transaction poolers.
        conn.execute(
            "SELECT set_config('statement_timeout', %s, true), "
            "set_config('search_path', %s, true)",
            (f"{DB_STATEMENT_TIMEOUT_MS}ms",
             '"' + DB_SCHEMA.replace('"', '""') + '", public'),
        )
        yield conn


def fetch_one(sql: str, params=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()


def fetch_all(sql: str, params=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()


def execute(sql: str, params=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount
