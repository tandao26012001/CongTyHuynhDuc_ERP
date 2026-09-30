"""Chay mot lan de tao file Excel ban giao lich su Dieu xe cho Kho van."""

import sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.services.dieu_xe_archive_service import xuat_lich_su  # noqa: E402


if __name__ == '__main__':
    output = Path(__file__).resolve().parents[1] / 'output'
    timestamp = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh')).strftime('%Y%m%d-%H%M')
    path = output / f'MUAHANG_DIEUXE_LICHSU_{timestamp}.xlsx'
    counts = xuat_lich_su(path)
    print(f'Da xuat {path.name}: ' + ', '.join(f'{name}={count}' for name, count in counts.items()))
