"""DB connection — duy nhat noi dung psycopg, cac tang khac goi qua ham o day."""
from contextlib import contextmanager
import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from backend.config.settings import DATABASE_URL, DB_SCHEMA


def _dsn() -> str:
    if not DATABASE_URL:
        raise RuntimeError("Thieu DATABASE_URL — dat bien moi truong truoc khi chay")
    return DATABASE_URL


@contextmanager
def get_conn():
    conn = psycopg.connect(_dsn(), row_factory=dict_row)
    try:
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
