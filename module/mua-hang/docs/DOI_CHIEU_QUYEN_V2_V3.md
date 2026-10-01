# Permission comparison: v2 roles to 7 v3 account types

Read-only snapshot from the database on 2026-10-01. Migration 064 assigned account types; the running permission matrix is still role-based.

Legend: X=view, S=edit, D=approve, E=export; value after slash is scope. `-` means no permission.

240 v2 permission rows, 105 account-type/page pairs, 42 pairs with conflicting old permissions. Database has 15 pages; DOCX v3 calls for 17 pages (remove `dieu_xe`, add three).

| Account type | Page | Existing roles and rights | v3 rule accepted from DOCX PQ-07 |
|---|---|---|---|
| NHAN_VIEN | bao_cao | NV_KHO_VAN: -/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: -/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | bao_gia | NV_KHO_VAN: -/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: -/ca_nhan<br>QC: -/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | cong_viec | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | danh_muc | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/bo_phan; CAN_DUYET (TRUONG_BO_PHAN) |
| NHAN_VIEN | dat_ngoai | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: XSE/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: -/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | de_nghi | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: XS/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | dieu_xe | NV_KHO_VAN: XS/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: XS/ca_nhan<br>QC: -/ca_nhan | REMOVE (outside this module) |
| NHAN_VIEN | don_hang | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | giao_nhan | NV_KHO_VAN: XS/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: XSD/toan_bo | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | home | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: X/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/- |
| NHAN_VIEN | ncc | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/toan_bo<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; CAN_DUYET (TRUONG_BO_PHAN/MH) |
| NHAN_VIEN | thanh_toan | NV_KHO_VAN: -/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: -/ca_nhan<br>QC: -/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | tien_ich | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/ca_nhan; THANG |
| NHAN_VIEN | xac_nhan_kt | NV_KHO_VAN: X/ca_nhan<br>NV_KINH_DOANH: -/ca_nhan<br>NV_MUA_HANG: XS/ca_nhan<br>NV_YEU_CAU: X/ca_nhan<br>QC: X/ca_nhan | X/toan_bo; S/- |
| QUAN_TRI_HE_THONG | bao_cao | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: XE/toan_bo<br>QUAN_TRI_NGHIEP_VU: XE/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | bao_gia | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | cong_viec | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | danh_muc | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: XS/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | dat_ngoai | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: X/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | de_nghi | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XSD/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | dieu_xe | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | REMOVE (outside this module) |
| QUAN_TRI_HE_THONG | don_hang | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XSD/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | giao_nhan | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: X/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | home | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: X/toan_bo | X/toan_bo; S/- |
| QUAN_TRI_HE_THONG | ncc | ADMIN: XDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XSD/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | quan_tri | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: XSDE/toan_bo<br>QUAN_TRI_NGHIEP_VU: X/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | thanh_toan | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | tien_ich | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: XS/toan_bo<br>QUAN_TRI_NGHIEP_VU: XS/toan_bo | X/toan_bo; S/toan_bo; THANG |
| QUAN_TRI_HE_THONG | xac_nhan_kt | ADMIN: XSDE/toan_bo<br>QUAN_TRI_KY_THUAT: X/toan_bo<br>QUAN_TRI_NGHIEP_VU: XD/toan_bo | X/toan_bo; S/toan_bo; THANG |
| TRUONG_BO_PHAN | bao_cao | TBP_KHO_VAN: X/bo_phan<br>TBP_KINH_DOANH: X/bo_phan<br>TBP_MUA_HANG: XE/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | bao_gia | TBP_KHO_VAN: -/ca_nhan<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XSD/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | cong_viec | TBP_KHO_VAN: X/bo_phan<br>TBP_KINH_DOANH: X/bo_phan<br>TBP_MUA_HANG: XS/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | danh_muc | TBP_KHO_VAN: XS/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: X/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; CAN_DUYET (QUAN_TRI_HE_THONG) |
| TRUONG_BO_PHAN | dat_ngoai | TBP_KHO_VAN: X/toan_bo<br>TBP_KINH_DOANH: XSD/toan_bo<br>TBP_MUA_HANG: X/toan_bo<br>TBP_YEU_CAU: -/ca_nhan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | de_nghi | TBP_KHO_VAN: X/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XSD/toan_bo<br>TBP_YEU_CAU: XSD/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | dieu_xe | TBP_KHO_VAN: XSD/toan_bo<br>TBP_KINH_DOANH: XS/toan_bo<br>TBP_MUA_HANG: XS/toan_bo<br>TBP_YEU_CAU: XS/bo_phan | REMOVE (outside this module) |
| TRUONG_BO_PHAN | don_hang | TBP_KHO_VAN: X/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XSD/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | giao_nhan | TBP_KHO_VAN: XSD/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: X/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | ncc | TBP_KHO_VAN: X/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XSD/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; CAN_DUYET (TRUONG_BO_PHAN/MH) |
| TRUONG_BO_PHAN | thanh_toan | TBP_KHO_VAN: -/ca_nhan<br>TBP_KINH_DOANH: -/ca_nhan<br>TBP_MUA_HANG: XS/toan_bo<br>TBP_YEU_CAU: -/ca_nhan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | tien_ich | TBP_KHO_VAN: X/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XS/toan_bo<br>TBP_YEU_CAU: X/bo_phan | X/toan_bo; S/bo_phan; THANG |
| TRUONG_BO_PHAN | xac_nhan_kt | TBP_KHO_VAN: XD/toan_bo<br>TBP_KINH_DOANH: X/toan_bo<br>TBP_MUA_HANG: XD/toan_bo<br>TBP_YEU_CAU: XS/bo_phan | X/toan_bo; S/- |

## Legacy roles without permission rows

- `TBP_QC` maps to `TRUONG_BO_PHAN` but has no `phan_quyen` rows.

User accepted the DOCX v3 model for all previously pending cells. The v3 rule column follows PQ-07; implementation still requires a new matrix, approval workflow and backend/frontend changes. Special technical confirmation is reserved for KY_THUAT (and system administrator).
