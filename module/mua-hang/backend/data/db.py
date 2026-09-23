"""DB connection — duy nhat noi dung psycopg, cac tang khac goi qua ham o day."""
from contextlib import contextmanager
import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from backend.config.settings import (
    DATABASE_URL,
    DB_CONNECT_TIMEOUT_SECONDS,
    DB_SCHEMA,
    DB_STATEMENT_TIMEOUT_MS,
)


def _dsn() -> str:
    if not DATABASE_URL:
        raise RuntimeError("Thieu DATABASE_URL — dat bien moi truong truoc khi chay")
    return DATABASE_URL


@contextmanager
def get_conn():
    conn = psycopg.connect(
        _dsn(),
        row_factory=dict_row,
        connect_timeout=DB_CONNECT_TIMEOUT_SECONDS,
    )
    try:
        # PostgreSQL tự hủy truy vấn quá hạn thay vì giữ worker vô thời hạn.
        conn.execute(
            "SELECT set_config('statement_timeout', %s, false)",
            (f"{DB_STATEMENT_TIMEOUT_MS}ms",),
        )
        conn.execute(
            sql.SQL("SET search_path TO {}, public").format(sql.Identifier(DB_SCHEMA))
        )
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


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
