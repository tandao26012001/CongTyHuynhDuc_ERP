import pytest

from backend.services.errors import KhongCoQuyen, ThieuDuLieu
from backend.services.loai_tai_khoan import vai_tro_tuong_thich
from backend.services.phan_quyen_service import kiem_quyen


@pytest.mark.parametrize("loai,bo_phan,vai_tro", [
    ("QUAN_TRI_HE_THONG", "MH", "ADMIN"),
    ("BAN_LANH_DAO", "DH", "BAN_LANH_DAO"),
    ("TRUONG_BO_PHAN", "MH", "TBP_MUA_HANG"),
    ("TRUONG_BO_PHAN", "KV", "TBP_KHO_VAN"),
    ("TRUONG_BO_PHAN", "QC", "TBP_YEU_CAU"),
    ("NHAN_VIEN", "MH", "NV_MUA_HANG"),
    ("NHAN_VIEN", "KD", "NV_KINH_DOANH"),
    ("NHAN_VIEN", "QC", "QC"),
    ("NHAN_VIEN", "KC1", "NV_YEU_CAU"),
    ("KY_THUAT", "KT", "KY_THUAT"),
    ("KE_TOAN", "DH", "KE_TOAN"),
    ("CHI_XEM", "DH", "CHI_XEM"),
])
def test_legacy_role_matches_type_and_department(loai, bo_phan, vai_tro):
    assert vai_tro_tuong_thich(loai, bo_phan) == vai_tro


def test_unknown_account_type_is_rejected():
    with pytest.raises(ThieuDuLieu):
        vai_tro_tuong_thich("ADMIN", "MH")


def test_only_system_admin_type_can_manage_accounts():
    assert kiem_quyen({"ma_loai_tk": "QUAN_TRI_HE_THONG", "vai_tro": "QUAN_TRI_NGHIEP_VU"},
                     "quan_tri", "sua") == "toan_bo"
    with pytest.raises(KhongCoQuyen):
        kiem_quyen({"ma_loai_tk": "TRUONG_BO_PHAN", "vai_tro": "TBP_MUA_HANG"},
                   "quan_tri", "xem")
