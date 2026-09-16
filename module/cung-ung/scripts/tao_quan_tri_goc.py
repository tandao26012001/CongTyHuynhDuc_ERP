"""Tạo duy nhất tài khoản QUAN_TRI_KY_THUAT đầu tiên."""

import argparse
import getpass
import sys
from pathlib import Path

# Cho phép chạy trực tiếp: python3 scripts/tao_quan_tri_goc.py ...
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.bootstrap_service import tao_quan_tri_goc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ma_tai_khoan", help="Tên đăng nhập quản trị")
    parser.add_argument("ma_nhan_vien", help="Mã nhân viên trong schema mua_hang")
    args = parser.parse_args()
    mat_khau = getpass.getpass("Mật khẩu mới: ")
    nhap_lai = getpass.getpass("Nhập lại mật khẩu: ")
    if mat_khau != nhap_lai:
        raise SystemExit("Hai lần nhập mật khẩu không khớp")
    tao_quan_tri_goc(args.ma_tai_khoan, args.ma_nhan_vien, mat_khau)
    print("Đã tạo tài khoản quản trị kỹ thuật gốc.")


if __name__ == "__main__":
    main()
