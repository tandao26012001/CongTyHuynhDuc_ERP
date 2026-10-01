from contextlib import contextmanager

from backend.services import dat_ngoai_chi_tiet_service as service


def test_line_detail_reuses_one_database_connection(monkeypatch):
    connection = object()
    opened = []
    calls = []

    @contextmanager
    def fake_connection():
        opened.append(connection)
        yield connection

    monkeypatch.setattr(service, "get_conn", fake_connection)
    monkeypatch.setattr(service, "kiem_quyen", lambda profile, page, action, conn: calls.append((page, action, conn)))
    monkeypatch.setattr(service.dat_ngoai_chi_tiet_repo, "lay_dong",
                        lambda request_id, line_id, conn: {"id": line_id, "ma_hang": "MH-1"})
    monkeypatch.setattr(service.dat_ngoai_chi_tiet_repo, "danh_sach_xac_nhan",
                        lambda line_id, item_code, conn: calls.append(("history", conn)) or [])
    monkeypatch.setattr(service.dat_ngoai_chi_tiet_repo, "danh_sach_dot_giao",
                        lambda line_id, conn: calls.append(("deliveries", conn)) or [])

    result = service.chi_tiet("DNG-1", "DNGD-1", {"vai_tro": "KY_THUAT"})

    assert result["id"] == "DNGD-1"
    assert len(opened) == 1
    assert calls == [("dat_ngoai", "xem", connection),
                     ("history", connection), ("deliveries", connection)]
