"""Pham vi vat tu dung chung khi cham diem va chon NCC."""


def dieu_kien_vat_tu(vat_tu: str = 'v', mat_hang: str = 'm') -> str:
    """Alias chi duoc truyen tu ma nguon, khong nhan dau vao HTTP."""
    return f"""(
      ({mat_hang}.pham_vi_danh_gia='MA_VAT_TU'
       AND {vat_tu}.ma_vat_tu={mat_hang}.ma_vat_tu)
      OR ({mat_hang}.pham_vi_danh_gia='NHOM_HANG'
          AND {mat_hang}.loai='HANG_HOA'
          AND {vat_tu}.ma_chung_loai IN (
            WITH RECURSIVE nhom AS (
              SELECT ma_chung_loai FROM chung_loai
              WHERE ma_chung_loai=coalesce({mat_hang}.nhom_hang_chi_tiet,
                                         {mat_hang}.nhom_hang_chinh)
              UNION
              SELECT c.ma_chung_loai FROM chung_loai c
              JOIN nhom ON c.ma_cha=nhom.ma_chung_loai
            ) SELECT ma_chung_loai FROM nhom
          ))
    )"""
