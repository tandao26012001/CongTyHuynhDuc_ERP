# F01 — Đề nghị vật tư & Gia công ngoài

> Chức năng **cốt lõi số 1**. Đây là điểm vào của toàn bộ hệ thống và là nơi quyết định app có thắng được Zalo hay không.
> Thay thế: nhóm Zalo `ĐỀ NGHỊ VẬT TƯ`, nhóm `HD - GCN`, biểu mẫu giấy `QT-MH-01-BM01` và `BM02`, cột A–F của sheet `THEO DOI MUA HANG`.

---

## 1. Mục đích và phạm vi

| | |
|---|---|
| Ai dùng | Trưởng BP và nhân viên các bộ phận sản xuất (44 người) · Trưởng BP duyệt · Mua hàng tiếp nhận |
| Tần suất | **~95 dòng/ngày làm việc**, cao điểm 2.343 dòng/tháng |
| Hai loại | `MUA_HANG` (vật tư, hàng hoá, dịch vụ) · `GIA_CONG_NGOAI` (một công đoạn của LSX) |
| Bảng | `DE_NGHI` (đầu) · `DE_NGHI_DONG` (chi tiết) |
| Quy tắc áp dụng | `TG-01` `TG-02` · `DN-01` … `DN-11` · `SLA-01` `SLA-03` |

---

## 2. Luồng nghiệp vụ

```
BP yêu cầu tạo phiếu (điện thoại / máy tính)
        │  ├─ quét mã vạch LSX → tự điền LSX, mã hàng, mức ưu tiên
        │  ├─ thêm dòng: tìm mã vật tư (hoặc gửi yêu cầu cấp mã)
        │  └─ đính kèm bản vẽ / ảnh
        ▼
   [Gửi duyệt]  → hệ thống đóng dấu NGAY_HIEU_LUC theo giờ chốt 13:30 / 15:00
        ▼
   CHO_DUYET ──────────────────────► Trưởng BP duyệt
        │                                │
        │                    vắng mặt → duyệt online → CHO_KY_BU
        │                                              (nhắc ký bù hôm sau)
        ▼
   DA_DUYET  ─────► Mua hàng tiếp nhận
        │              ├─ thiếu thông tin → [Trả lại] → TRA_LAI (bắt buộc lý do)
        │              ├─ cần xác nhận KT → CHO_XAC_NHAN_KT  (F02)
        │              ├─ chưa có mã VT   → CHO_CAP_MA       (F02)
        │              └─ phân công NV mua hàng → sang F03 báo giá
        ▼
   (đi tiếp qua F03 → F04 → F05)
```

**Với gia công ngoài**, sau `DA_DUYET` còn có nhánh riêng: chọn NCC gia công → tính `KY_HAN_QUY_DINH` → gửi yêu cầu điều xe **đưa hàng đi** (F07) → theo dõi → điều xe **lấy hàng về** → nhận hàng (F05).

---

## 3. Logic backend

### 3.1 Endpoint

```
GET    /api/v1/de-nghi                     danh sách, phân trang, lọc
GET    /api/v1/de-nghi/{id}                chi tiết + các dòng + trao đổi + đính kèm
POST   /api/v1/de-nghi                     tạo mới (nháp)
PUT    /api/v1/de-nghi/{id}                sửa khi còn NHAP hoặc TRA_LAI
POST   /api/v1/de-nghi/{id}/gui            NHAP → CHO_DUYET
POST   /api/v1/de-nghi/{id}/duyet          CHO_DUYET → DA_DUYET | CHO_KY_BU
POST   /api/v1/de-nghi/{id}/ky-bu          CHO_KY_BU → DA_DUYET
POST   /api/v1/de-nghi/{id}/tra-lai        → TRA_LAI  (bắt buộc lý do)
POST   /api/v1/de-nghi/{id}/huy            → HUY      (bắt buộc lý do)
POST   /api/v1/de-nghi/{id}/phan-cong      gán NGUOI_MUA_HANG
GET    /api/v1/de-nghi/{id}/in             xuất PDF theo mẫu BM01 / BM02
GET    /api/v1/de-nghi/tai-xuong           xuất CSV (có kiểm quyền)
POST   /api/v1/de-nghi/duyet-hang-loat     { ids: [...] }
GET    /api/v1/de-nghi/cho-duyet           hàng đợi duyệt của tôi
```

### 3.2 Tạo phiếu

```python
def tao_de_nghi(du_lieu, ho_so) -> DeNghi:
    with giao_dich() as conn:
        # 1. đóng dấu thời gian và áp giờ chốt
        thoi_diem = now_vn()
        gio_chot = tham_so('GIO_CHOT_DNVT' if du_lieu.loai == 'MUA_HANG' else 'GIO_CHOT_GCN')
        ngay_hieu_luc, tre = tinh_ngay_hieu_luc(thoi_diem, gio_chot)      # TG-01, TG-02

        # 2. suy ra thông tin từ tài khoản — KHÔNG bắt người dùng nhập
        ma_bo_phan   = ho_so.MA_BO_PHAN
        nguoi_yeu_cau = ho_so.MA_NHAN_VIEN

        # 3. mức ưu tiên đọc từ LSX (nếu có), KHÔNG nhập tay
        uu_tien = None
        lsx_list = {d.LENH_SAN_XUAT for d in du_lieu.dong if d.LENH_SAN_XUAT}
        if lsx_list:
            uu_tien = min(catalog.lay_lenh_san_xuat(l).MUC_DO_UU_TIEN for l in lsx_list)

        id_dn = sinh_ma(conn, 'DN', thoi_diem.year)
        repo.tao_de_nghi(conn, id_dn, ..., ngay_hieu_luc, tre, uu_tien, 'NHAP')

        for i, d in enumerate(du_lieu.dong, 1):
            xu_ly_dong(conn, id_dn, i, d, ho_so)

        nhat_ky.ghi(conn, 'DE_NGHI', id_dn, 'TAO', nguoi=nguoi_yeu_cau)
        return repo.lay_de_nghi(conn, id_dn)


def xu_ly_dong(conn, id_dn, stt, d, ho_so):
    vt = catalog.lay_vat_tu(d.id_vat_tu) if d.id_vat_tu else None

    # DN-01: bắt buộc tên hàng, ĐVT, số lượng, kỳ hạn
    kiem_bat_buoc(d, ['ten_hang', 'dvt', 'so_luong', 'ky_han_yc'])
    if d.so_luong <= 0: raise LoiNghiepVu('Số lượng phải lớn hơn 0.', 'SL_KHONG_HOP_LE')

    # DN-02: GCN bắt buộc có công đoạn
    if d.loai == 'GIA_CONG_NGOAI' and not d.ma_cong_doan:
        raise LoiNghiepVu('Đề nghị gia công ngoài phải chọn công đoạn.', 'THIEU_CONG_DOAN')

    # DN-10: cảnh báo khi hàng dự kiến về TRỄ hơn kỳ hạn — KHÔNG chặn
    bat_kha_thi, thong_diep, ngay_du_kien_ve = soi_ky_han(d)

    # DN-05: chưa có mã vật tư → tạo yêu cầu cấp mã
    trang_thai_dong = 'NHAP'
    if not vt:
        quy_tac.canh_bao('DN-05', 'Mặt hàng chưa có trong danh mục.')
        trang_thai_dong = 'CHO_CAP_MA'

    repo.tao_dong(conn, id_dn, stt,
        id_vt_de_nghi   = vt.ID if vt else None,
        id_vt_duyet_mua = vt.ID if vt else None,          # ban đầu bằng nhau
        ten_hang_chup   = vt.TEN_HANG if vt else d.ten_hang,   # CHỤP
        dvt_chup        = vt.DVT      if vt else d.dvt,        # CHỤP
        phan_loai_chup  = vt.PHAN_LOAI if vt else 'THONG_DUNG_SX',  # CHỤP
        bat_kha_thi = bat_kha_thi, trang_thai_dong = trang_thai_dong, ...)
```

### 3.3 Gửi duyệt

```python
def gui_duyet(id_dn, ho_so, phien_ban):
    with giao_dich() as conn:
        dn = repo.lay(conn, id_dn, khoa=True)
        kiem_phien_ban(dn, phien_ban)
        if dn.TRANG_THAI not in ('NHAP', 'TRA_LAI'):
            raise LoiNghiepVu('Phiếu đã gửi rồi.', 'DA_GUI')
        if not repo.dem_dong(conn, id_dn):
            raise LoiNghiepVu('Phiếu chưa có dòng nào.', 'PHIEU_RONG')

        # DN-03: một LSX chỉ được đề nghị vật tư một lần
        for lsx in repo.lay_cac_lsx(conn, id_dn):
            if repo.lsx_da_co_de_nghi(conn, lsx, tru_id=id_dn):
                quy_tac.ap_dung('DN-03',
                    f'Lệnh sản xuất {lsx} đã có đề nghị vật tư trước đó.')

        # DN-04: không gắn LSX → cần Ban lãnh đạo duyệt
        if not repo.lay_cac_lsx(conn, id_dn):
            quy_tac.ap_dung('DN-04',
                'Đề nghị không gắn lệnh sản xuất — cần Ban lãnh đạo duyệt kèm lý do.')
            repo.dat_co(conn, id_dn, CAN_BLD_DUYET=True)

        doi_trang_thai(conn, 'DE_NGHI', id_dn, 'CHO_DUYET', ho_so)
        # thông báo cho người duyệt của bộ phận
        for nd in phanquyen.nguoi_duyet_cua(dn.MA_BO_PHAN, 'de_nghi'):
            thong_bao.gui(conn, nd, 'CHO_DUYET',
                f'Đề nghị {id_dn} của {dn.NGUOI_YEU_CAU} chờ duyệt', 'DE_NGHI', id_dn)
```

### 3.4 Duyệt / trả lại

```python
def duyet(id_dn, ho_so, online: bool, ghi_chu, phien_ban):
    with giao_dich() as conn:
        dn = repo.lay(conn, id_dn, khoa=True); kiem_phien_ban(dn, phien_ban)
        if dn.TRANG_THAI != 'CHO_DUYET':
            raise LoiNghiepVu('Phiếu không ở trạng thái chờ duyệt.', 'SAI_TRANG_THAI')
        kiem_quyen_duyet_bo_phan(ho_so, dn.MA_BO_PHAN)

        moi = 'CHO_KY_BU' if online else 'DA_DUYET'          # DN-07
        repo.cap_nhat(conn, id_dn, NGUOI_DUYET_BP=ho_so.MA_NHAN_VIEN,
                      NGAY_DUYET_BP=now_vn(), DUYET_ONLINE=online,
                      NGAY_KY_BU=cong_ngay_lam_viec(today(), 1) if online else None)
        doi_trang_thai(conn, 'DE_NGHI', id_dn, moi, ho_so, ghi_chu)
        nhat_ky.ghi(conn, 'DE_NGHI', id_dn, 'DUYET', nguoi=ho_so.MA_NHAN_VIEN,
                    request=request)      # ghi IP + thiết bị — thay chữ ký giấy
        thong_bao.gui(conn, dn.NGUOI_YEU_CAU, 'DA_DUYET', ...)
        for nv in phanquyen.nhan_vien_mua_hang():
            thong_bao.gui(conn, nv, 'DE_NGHI_MOI', ...)


def tra_lai(id_dn, ho_so, ly_do, phien_ban):
    if not ly_do or not ly_do.strip():
        raise ThieuDuLieu('Phải nhập lý do trả lại.', 'THIEU_LY_DO')   # DN-06
    ...  # → TRA_LAI, thông báo cho người tạo
```

### 3.5 Khoá sửa sau khi duyệt (DN-08)

```python
TRUONG_KHOA_SAU_DUYET = {'SO_LUONG', 'TEN_HANG_CHUP', 'KY_HAN_YC',
                          'ID_VT_DUYET_MUA', 'MA_CONG_DOAN'}

def sua_dong(...):
    if dn.TRANG_THAI not in ('NHAP', 'TRA_LAI'):
        thay_doi = set(du_lieu.keys()) & TRUONG_KHOA_SAU_DUYET
        if thay_doi:
            raise LoiNghiepVu(
                f'Phiếu đã duyệt nên không sửa được: {", ".join(thay_doi)}. '
                'Huỷ phiếu và lập lại nếu cần thay đổi.', 'DA_DUYET_KHOA_SUA')
```
Ghi chú, đính kèm, trao đổi **vẫn sửa/thêm được** sau khi duyệt.

### 3.6 Danh sách và bộ lọc

```python
def danh_sach(loc, ho_so):
    pham_vi = kiem_quyen(ho_so, 'de_nghi', 'xem')
    q = repo.truy_van_de_nghi()
    q = loc_theo_pham_vi(q, pham_vi, ho_so)
    if loc.tu_ngay:     q = q.where(NGAY_HIEU_LUC >= loc.tu_ngay)
    if loc.den_ngay:    q = q.where(NGAY_HIEU_LUC <= loc.den_ngay)
    if loc.trang_thai:  q = q.where(TRANG_THAI in loc.trang_thai)
    if loc.ma_bo_phan:  q = q.where(MA_BO_PHAN == loc.ma_bo_phan)
    if loc.loai:        q = q.where(LOAI == loc.loai)
    if loc.tu_khoa:     q = q.where_dong(TEN_HANG_CHUP ILIKE % OR MA_VACH = % OR LENH_SAN_XUAT = %)
    if loc.chi_tre_han: q = q.where_dong(KY_HAN_YC < today() AND chưa nhận đủ)
    if loc.chi_bat_kha_thi: q = q.where_dong(BAT_KHA_THI)
    return q.sap_xep(NGAY_HIEU_LUC DESC).phan_trang(loc.trang, 50)
```

### 3.7 Thẻ số liệu trên đầu danh sách

```sql
SELECT
  count(*)                                        AS tong,
  count(*) FILTER (WHERE TRANG_THAI='CHO_DUYET')  AS cho_duyet,
  count(*) FILTER (WHERE TRANG_THAI='TRA_LAI')    AS tra_lai,
  count(*) FILTER (WHERE TRANG_THAI='CHO_CAP_MA') AS cho_cap_ma,
  (SELECT count(*) FROM DE_NGHI_DONG d WHERE d.BAT_KHA_THI
     AND d.ID_DE_NGHI IN (...))                   AS bat_kha_thi
FROM DE_NGHI WHERE ...;
```

---

## 4. Thiết kế giao diện

### 4.1 Màn hình DANH SÁCH ĐỀ NGHỊ (máy tính)

```
┌ Đề nghị vật tư & gia công ngoài ──────────────── [+ Tạo đề nghị] ┐
│ [Tất cả] [Của tôi] [Chờ tôi duyệt (5)] [Trả lại (2)]             │  ← tabs
├───────────────────────────────────────────────────────────────────┤
│ [01/08/26] [31/08/26] [Bộ phận ▾] [Trạng thái ▾] [Loại ▾]        │
│ [🔍 mã hàng / mã vạch / LSX…]      ☐ Chỉ trễ hạn ☐ Chỉ bất khả thi│
│                                        [Lọc] [Xoá lọc] [⭳ Tải xuống]│
├───────────────────────────────────────────────────────────────────┤
│ [Tổng 1.243] [Chờ duyệt 18] [Trả lại 2] [Chờ cấp mã 47] [BKT 12] │
├───────────────────────────────────────────────────────────────────┤
│   Mã           Ngày HL    BP   Người YC   Dòng  Trạng thái    ⚠   │
│ ▌ DN-2026-000123 27/08   CX   Mr. Sáng     3   ●Chờ duyệt        │
│ ▌ DN-2026-000122 27/08   KC3  Mr. Lương    8   ●Đã duyệt     ⚠BKT │
│   DN-2026-000121 26/08   TD   Mr. Nghĩa    1   ●Hoàn thành        │
│ ▌ DN-2026-000120 26/08   CX   Mr. Mạnh    12   ●Trả lại           │
└───────────────────────────────────────────────────────────────────┘
```

| Chi tiết | Quy định |
|---|---|
| Sắp xếp mặc định | `NGAY_HIEU_LUC` mới nhất trước |
| Vạch màu trái `▌` | vàng = có dòng bất khả thi hoặc sắp trễ · đỏ = trễ hạn · xanh = bình thường |
| Cột trạng thái | `.pill` có màu: xám `NHAP` · xanh dương `CHO_DUYET` · xanh lá `DA_DUYET` · đỏ `TRA_LAI`/`HUY` · vàng `CHO_KY_BU`/`CHO_CAP_MA` |
| Bấm dòng | Mở chi tiết. Không có nút "Xem" riêng |
| Tab "Chờ tôi duyệt" | Hiện số đếm, đồng bộ với chuông thông báo |

### 4.2 Màn hình CHI TIẾT / TẠO MỚI (máy tính)

```
┌───────────────────────────────────────────────────────────────────┐
│ ← DN-2026-000123                    ●CHỜ DUYỆT      [In] [⋯]      │
├───────────────────────────────────────────────────────────────────┤
│ Loại      ⦿ Mua hàng   ○ Gia công ngoài                           │
│ Bộ phận   Gia Công Chính Xác (CX)      Người YC  Trần Văn Sáng    │
│ Ngày hiệu lực  2026-08-27                                         │
│    ⓘ Gửi lúc 14:05, sau giờ chốt 13:30 → tính vào ngày làm việc   │
│      kế tiếp                                                       │
│ Ưu tiên   2  (đọc từ LSX MBC0326-018-CKCT)                        │
│ Tình trạng YC  [Bình thường ▾]                                    │
├───────────────────────────────────────────────────────────────────┤
│ CHI TIẾT                                                          │
│ # │Mã VT      │Tên hàng          │ĐVT│  SL│Kỳ hạn  │LSX/Mã vạch │✕│
│ 1 │TH-SX-203  │Đá mài từ Ø500…   │PCS│   5│12/09/26│MBC0326-018 │✕│
│ 2 │—  ⚠chưa có│Bạc đạn HK1210    │PCS│   2│05/09/26│MBC0326-018 │✕│
│   │           │  ⚠ Hàng dự kiến về 07/09 — TRỄ hơn kỳ hạn 05/09  │ │
│                                              [+ Thêm dòng]        │
├───────────────────────────────────────────────────────────────────┤
│ 📎 Đính kèm (2)   ban-ve-A123.pdf · anh-mau.jpg      [+ Thêm]     │
├───────────────────────────────────────────────────────────────────┤
│ 💬 Trao đổi (3)                                        [Mở ▾]     │
├───────────────────────────────────────────────────────────────────┤
│ [Lưu nháp]                      [Gửi duyệt]  [Trả lại]  [Huỷ]     │
└───────────────────────────────────────────────────────────────────┘
```

**Ô tìm mã vật tư — combobox tìm mờ:**
```
┌ Tên hàng ─────────────────────────────────────┐
│ [bac dan hk                                 ] │
├───────────────────────────────────────────────┤
│ TH-SX-014  Bạc đạn đũa kim HK1210      PCS    │
│ TH-SX-015  Bạc đạn đũa kim HK0810      PCS    │
│ —          Bạc đạn 6204ZZ  ⚠ chưa có mã       │
├───────────────────────────────────────────────┤
│ ✚ Chưa có mã? Gửi yêu cầu cấp mã vật tư       │
└───────────────────────────────────────────────┘
```
- Gõ ≥2 ký tự → gọi `GET /api/v1/vat-tu/tim?q=`, trả tối đa 20 kết quả.
- Tìm **không dấu**, khớp một phần, sắp theo mức khớp.
- Chọn xong tự điền: tên hàng, ĐVT, chủng loại, phân loại.
- Nút cuối mở hộp thoại `YEU_CAU_CAP_MA` (F02).

**Cảnh báo bất khả thi** hiện **ngay dưới dòng** khi người dùng chọn kỳ hạn, không đợi tới lúc gửi:
```
⚠ Hàng dự kiến về 07/09/2026, TRỄ 2 ngày làm việc so với kỳ hạn cần hàng
   05/09/2026. Tính từ ngày đề nghị 28/08/2026 cộng 5 ngày làm việc xử lý của
   mức ưu tiên 2. Vẫn lập được phiếu, nhưng dòng này vào danh sách bất khả thi.

(ĐỔI CHIỀU theo phản hồi lần 1: kỳ hạn đặt XA hơn ngày dự kiến về thì KHÔNG
 cảnh báo gì. Xem docs/04 §2 · DN-10.)
```

### 4.3 Màn hình TẠO ĐỀ NGHỊ trên ĐIỆN THOẠI

> Đây là màn hình quan trọng nhất của cả hệ thống. Mục tiêu: **3 dòng dưới 45 giây**.

```
┌─────────────────────────┐
│ ←  Đề nghị vật tư       │
├─────────────────────────┤
│  [📷 Quét mã vạch LSX ] │  ← nút to nhất màn hình
│  hoặc gõ mã             │
│  ┌───────────────────┐  │
│  │ MBC0326-018-CKCT  │  │
│  │ TOP PANEL · Ưu tiên 2│ │
│  └───────────────────┘  │
│                         │
│  Kỳ hạn cần             │
│  [ 03/09/2026        📅]│  ← điền sẵn hôm nay + 5 ngày làm việc
├─────────────────────────┤
│  Dòng 1              ✕  │
│  [🔍 tìm tên hàng     ] │  ← tự focus
│  ┌────────┬───────────┐ │
│  │ SL  1  │ ĐVT  PCS  │ │
│  └────────┴───────────┘ │
│  [ghi chú (không bắt buộc)]│
│                         │
│  ┌─────────────────────┐│
│  │   +  Thêm dòng      ││
│  └─────────────────────┘│
├─────────────────────────┤
│  📎 Ảnh / bản vẽ    (0) │
├─────────────────────────┤
│ ┃    GỬI DUYỆT       ┃  │  ← dính đáy, cao 52px
└─────────────────────────┘
```

**Bảy quyết định để đạt 45 giây** — bắt buộc thực hiện đủ:
1. Quét mã vạch LSX là hành động đầu tiên, điền được 4 trường cùng lúc.
2. Kỳ hạn điền sẵn `cong_ngay_lam_viec(hôm nay, 5)`.
3. Ô tìm tên hàng tự focus khi thêm dòng, bàn phím bật ngay.
4. Số lượng mặc định `1`.
5. ĐVT tự điền theo vật tư, chỉ đổi khi cần.
6. **Không** hỏi bộ phận, người yêu cầu, ngày lập, loại phiếu (suy từ tài khoản + ngữ cảnh).
7. Nút gửi dính đáy, luôn nhìn thấy.

**Vùng bấm ≥ 44 px, chữ ≥ 16 px** — người dùng đang ở xưởng, có thể đeo găng.

### 4.4 Màn hình HÀNG ĐỢI DUYỆT

```
┌ Chờ tôi duyệt (5) ────────────────────────────────────────┐
│ ☐│DN-2026-000123│CX │Mr. Sáng │3 dòng│27/08│ [Xem][✓][✕] │
│ ☐│DN-2026-000119│KC3│Mr. Lương│8 dòng│26/08│ ⚠ không LSX  │
│ ☑│DN-2026-000117│TD │Mr. Nghĩa│1 dòng│26/08│              │
├────────────────────────────────────────────────────────────┤
│ [☑ Chọn tất cả]     [✓ Duyệt đã chọn]  [✕ Từ chối đã chọn] │
│                     ☐ Tôi đang vắng mặt — duyệt online     │
└────────────────────────────────────────────────────────────┘
```
- Ô "duyệt online" bật cờ `DUYET_ONLINE` → trạng thái `CHO_KY_BU` + nhắc ký bù hôm sau.
- Từ chối mở hộp thoại **bắt buộc nhập lý do**.
- `⚠ không LSX` là nhãn cảnh báo `DN-04`.

### 4.5 In PDF

Mẫu theo `QT-MH-01-BM01` (vật tư) và `BM02` (gia công ngoài):
- Đầu trang: logo Huỳnh Đức · tên biểu mẫu · mã tài liệu · phiên bản · ngày hiệu lực · số trang
- Thân: thông tin chung + bảng chi tiết
- Cuối: ô ký của Người đề nghị · Trưởng bộ phận · Bộ phận Mua hàng
- **Mã QR** chứa `ID` chứng từ ở góc phải trên, để bản in luôn tra ngược được về bản điện tử
- Dòng trống **không** in `#N/A` (lỗi của file Excel hiện tại)

---

## 5. Bảng ánh xạ Excel → hệ thống mới

| Cột Excel (`THEO DOI MUA HANG`) | Trường mới |
|---|---|
| `ID SP` | `DE_NGHI_DONG.ID_SP_CU` |
| `SỐ PHIẾU ĐNVT` | `DE_NGHI.SO_PHIEU_CU` |
| `SỐ PHIẾU ĐNSX` | `DE_NGHI_DONG.LENH_SAN_XUAT` |
| `NGÀY PHÁT LSX` | đọc từ `LENH_SAN_XUAT` |
| `NGƯỜI YÊU CẦU` | `DE_NGHI.NGUOI_YEU_CAU` (mã nhân viên, không phải tên) |
| `Ngày ĐNVT` | `DE_NGHI.NGAY_HIEU_LUC` |
| `CHỦNG LOẠI` | `DE_NGHI_DONG.MA_CHUNG_LOAI` |
| `TÊN HÀNG` | `DE_NGHI_DONG.TEN_HANG_CHUP` |
| `TÊN QUY ĐỔI` | bỏ — thay bằng `VAT_TU.TEN_HANG` chuẩn |
| `ĐVT` | `DE_NGHI_DONG.DVT_CHUP` |
| `SỐ LƯỢNG ĐẶT` | `DE_NGHI_DONG.SO_LUONG` |
| `KỲ HẠN YC` | `DE_NGHI_DONG.KY_HAN_YC` |
| `TRẢ LỜI KỲ HẠN` | `DE_NGHI_DONG.TRA_LOI_KY_HAN` |
| `MÃ VẠCH` | `DE_NGHI_DONG.MA_VACH` |
| `MỤC ĐÍCH SỬ DỤNG` | `DE_NGHI_DONG.MUC_DICH_SU_DUNG` |
| `MÃ VẬT TƯ` | `DE_NGHI_DONG.ID_VT_DUYET_MUA` → `VAT_TU.MA_VAT_TU` |
| `TÌNH TRẠNG YC` | `DE_NGHI.TINH_TRANG_YC` |
| `GHI CHÚ` | `DE_NGHI_DONG.GHI_CHU` + tách phần trao đổi sang `TRAO_DOI` |
| `TUẦN`, `TÌNH TRẠNG ĐỀ NGHỊ` | bỏ — cột chết (0% và 0,2%) |

---

## 6. Kiểm thử bắt buộc

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Gửi ĐNVT lúc 13:29 | `NGAY_HIEU_LUC` = hôm nay, `TRE_GIO_CHOT` = false |
| 2 | Gửi ĐNVT lúc 13:31 | `NGAY_HIEU_LUC` = ngày làm việc kế tiếp, cờ = true |
| 3 | Gửi ĐNVT thứ Bảy 14:00 | `NGAY_HIEU_LUC` = thứ Hai (bỏ Chủ nhật) |
| 4 | Gửi GCN lúc 15:01 | Áp `GIO_CHOT_GCN`, không phải `GIO_CHOT_DNVT` |
| 5 | GCN không chọn công đoạn | `422`, `THIEU_CONG_DOAN` |
| 6 | LSX đã có ĐNVT, gửi lần hai | Cảnh báo `DN-03`, vẫn lưu (chế độ `CANH_BAO`) |
| 7 | Đổi `CHE_DO_QT_LSX_DUY_NHAT` = `CHAN`, gửi lại | `422` |
| 8 | Kỳ hạn = hôm nay + 2 ngày | `BAT_KHA_THI` = true, vẫn lưu |
| 9 | Sửa số lượng sau khi `DA_DUYET` | `422`, `DA_DUYET_KHOA_SUA` |
| 10 | Thêm ghi chú sau khi `DA_DUYET` | Thành công |
| 11 | Trả lại không nhập lý do | `400`, `THIEU_LY_DO` |
| 12 | Duyệt online | `CHO_KY_BU`, `NGAY_KY_BU` = ngày làm việc kế tiếp |
| 13 | Tài khoản BP khác gọi `GET /de-nghi/{id}` | `403`, không trả dữ liệu |
| 14 | Hai người cùng duyệt một phiếu | Người thứ hai nhận `409` |
| 15 | Bấm "Gửi duyệt" ba lần liên tiếp | Chỉ một lần đổi trạng thái |
| 16 | Phiếu không có dòng nào, bấm gửi | `422`, `PHIEU_RONG` |
| 17 | Vai trò không có quyền xem giá | API không trả trường `DON_GIA` |
| 18 | Tạo phiếu 3 dòng trên điện thoại 375 px | Hoàn tất **< 45 giây**, không cuộn ngang |
