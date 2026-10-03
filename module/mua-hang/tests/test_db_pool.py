from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest

from backend.data import db


def test_pool_is_shared_and_can_restart(monkeypatch):
    factory = MagicMock()
    monkeypatch.setattr(db, "ConnectionPool", factory)
    monkeypatch.setattr(db, "_dsn", lambda: "postgresql://example/test")
    monkeypatch.setattr(db, "_pool", None)
    first = db.open_pool()
    assert db.open_pool() is first
    assert factory.call_count == 1
    kwargs = factory.call_args.kwargs
    assert kwargs["max_size"] == db.DB_POOL_MAX_SIZE
    assert kwargs["kwargs"]["prepare_threshold"] is None
    db.close_pool()
    first.close.assert_called_once()
    assert db._pool is None
    db.open_pool()
    assert factory.call_count == 2
    db.close_pool()


@pytest.mark.parametrize("fails", [False, True])
def test_checkout_returns_connection_and_propagates_errors(monkeypatch, fails):
    conn = MagicMock()
    outcomes = []

    @contextmanager
    def checkout():
        try:
            yield conn
        except ValueError:
            outcomes.append("rollback")
            raise
        else:
            outcomes.append("commit")

    pool = MagicMock()
    pool.connection.side_effect = checkout
    monkeypatch.setattr(db, "open_pool", lambda: pool)
    monkeypatch.setattr(db, "DB_SCHEMA", 'schema"name')

    def run():
        with db.get_conn() as borrowed:
            assert borrowed is conn
            if fails:
                raise ValueError("failed operation")

    if fails:
        with pytest.raises(ValueError, match="failed operation"):
            run()
    else:
        run()
    assert outcomes == ["rollback" if fails else "commit"]
    conn.close.assert_not_called()
    query, params = conn.execute.call_args.args
    assert "set_config('statement_timeout', %s, true)" in query
    assert "set_config('search_path', %s, true)" in query
    assert params == (f"{db.DB_STATEMENT_TIMEOUT_MS}ms", '"schema""name", public')
