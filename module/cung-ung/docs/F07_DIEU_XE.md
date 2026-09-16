# F07 — Điều xe

> Hợp nhất **4 sheet rời rạc** của hai file Excel thành một luồng: `Quản lý điều xe` (685 chuyến, GCN) · `LIST DIEU XE DI SG` · `LIST DIEU XE DI BH` · `ĐIỀU XE (QT-KV-01-BM01)` · cộng hai pivot `Lịch điều xe` và `Lịch làm việc tài xế`.

---

## 1. Ba mâu thuẫn phải sửa trước khi nạp dữ liệu

| Vấn đề | Hiện trạng | Xử lý |
|---|---|---|
| **Biển số xe** | File MH: `60C-13810` = xe tải **nhỏ**, `60C-38413` = xe tải **trung**. File GCN: ngược lại | **Phải chốt với Kho vận** trước khi nạp danh mục `XE` |
| **Ai sở hữu điều xe** | QT-MH-01 nói *Bộ phận Kho vận*; sheet `Quy trình` nói *PKD*; sheet `MENU` nói *BP. Điều vận* | Đã chốt: **Kho vận** sở hữu, có tài khoản riêng theo bộ phận |
| **Giờ chốt** | QT-MH-01 ghi **15:45**; sheet MENU ghi *"trước 16h00"* | Đã chốt **15:45**. Cần sửa lại nội dung sheet MENU |

Ba luồng điều xe hiện có ba người phụ trách: **GCN — Mr. Lộc · Giao hàng — Mr. Huy · Mua hàng — Ms. Như**. Hệ mới gộp một luồng, phân biệt bằng trường `HANG_MUC`.

---

## 2. Mô hình một luồng

```
DIEU_XE
  HANG_MUC   DI_GCN | DI_LAY_HANG_GCN | MUA_HANG | GIAO_HANG | GIAO_CHUNG_TU | KHAC
  CHIEU      DUA_HANG_DI | LAY_HANG_VE | DUA_DI_VA_LAY_VE
  KHAN       BINH_THUONG | GAP
```

> Excel hiện dùng text tự do ở cột `Ghi chú`, tạo ra `ĐƯA HÀNG ĐI + LẤY HÀNG VỀ` (64 lần) và `ĐƯA HÀNG ĐI+LẤY HÀNG VỀ` (33 lần) là **hai giá trị khác nhau**. Hệ mới dùng danh sách cố định (`DX-02`).

Số phiếu cũ giữ ở `SO_PHIEU_CU`: `GCN-0201-01` (GCN), `MH-KYB-010726` (mua hàng), `01-001` (phiếu GCN).

---

## 3. Logic backend

### 3.1 Endpoint

```
GET  /api/v1/dieu-xe                    danh sách, lọc
GET  /api/v1/dieu-xe/{id}
POST /api/v1/dieu-xe                    tạo yêu cầu
PUT  /api/v1/dieu-xe/{id}
POST /api/v1/dieu-xe/{id}/xep-lich      { ngay_dieu_xe, ma_xe, tai_xe, phu_xe }
POST /api/v1/dieu-xe/{id}/xac-nhan      { trang_thai }  Hoàn thành / Đang xử lý
POST /api/v1/dieu-xe/{id}/huy           { ly_do }
GET  /api/v1/dieu-xe/lich?ngay=         lịch điều xe theo ngày
GET  /api/v1/dieu-xe/lich-tai-xe?ngay=  lịch làm việc từng tài xế
GET  /api/v1/dieu-xe/{id}/in            PDF mẫu QT-KV-01-BM01
GET  /api/v1/dieu-xe/lich/in?ngay=      in lịch điều xe cả ngày
GET  /api/v1/dieu-xe/thong-ke           km theo vùng, theo hạng mục (thay sheet Thống kê)
```

### 3.2 Tạo yêu cầu điều xe

```python
def tao_dieu_xe(du_lieu, ho_so):
    with giao_dich() as conn:
        thoi_diem = now_vn()
        gio_chot = tham_so('GIO_CHOT_DIEU_XE')            # 15:45
        ngay_de_xuat, tre = tinh_ngay_hieu_luc(thoi_diem, gio_chot)   # TG-03 / DX-03

        # DNG-07: đặt ngoài chỉ có chiều lấy hàng về
        if du_lieu.hang_muc == 'DAT_NGOAI' and du_lieu.chieu != 'LAY_HANG_VE':
            raise LoiNghiepVu(
                'Đặt ngoài chỉ có chiều lấy hàng về (không xuất vật tư đi).', 'SAI_CHIEU')

        # tự điền vùng, km từ danh mục đối tác
        vung = km = None
        if du_lieu.id_doi_tac and du_lieu.loai_doi_tac == 'NCC':
            ncc = repo.lay_ncc(conn, du_lieu.id_doi_tac)
            vung, km, dia_chi = ncc.VUNG, ncc.SO_KM, ncc.DIA_CHI

        id_dx = sinh_ma(conn, 'DX', thoi_diem.year)
        repo.tao_dieu_xe(conn, id_dx, **du_lieu,
            ngay_lap_phieu=thoi_diem.date(), thoi_diem_gui=thoi_diem,
            tre_gio_chot=tre, ngay_dieu_xe=du_lieu.ngay_dieu_xe or ngay_de_xuat,
            vung=vung, so_km=km, trang_thai='CHUA_XU_LY',
            nguoi_de_nghi=ho_so.MA_NHAN_VIEN, ma_bo_phan=ho_so.MA_BO_PHAN)

        thong_bao.gui_cho_vai_tro(conn, 'NV_KHO_VAN', 'DIEU_XE_MOI', ...)
        if tre:
            canh_bao_nguoi_dung('Gửi sau 15:45 — sẽ xếp vào lịch ngày làm việc kế tiếp.')
        return id_dx
```

### 3.3 Xếp lịch và phát hiện trùng

```python
def xep_lich(id_dx, ngay, ma_xe, tai_xe, phu_xe, ho_so):
    with giao_dich() as conn:
        # cảnh báo trùng lịch — Excel hiện không phát hiện được
        trung_xe = repo.dem_chuyen(conn, ngay=ngay, ma_xe=ma_xe, tru_id=id_dx)
        trung_tx = repo.dem_chuyen(conn, ngay=ngay, tai_xe=tai_xe, tru_id=id_dx)
        if trung_xe:
            quy_tac.canh_bao('DX-05', f'Xe {ma_xe} đã có {trung_xe} chuyến ngày {ngay}.')
        if trung_tx and tai_xe not in ('KHONG', 'THUE_NGOAI'):
            quy_tac.canh_bao('DX-05', f'Tài xế {tai_xe} đã có {trung_tx} chuyến ngày {ngay}.')

        # DX-04: thuê xe ngoài bắt buộc nhập chi phí
        xe = repo.lay_xe(conn, ma_xe)
        if xe.LOAI_XE == 'XE_NGOAI' and not du_lieu.chi_phi_thue:
            raise ThieuDuLieu('Thuê xe ngoài phải nhập chi phí.', 'THIEU_CHI_PHI')

        repo.cap_nhat(conn, id_dx, NGAY_DIEU_XE=ngay, MA_XE=ma_xe,
                      TAI_XE=tai_xe, PHU_XE=phu_xe, TRANG_THAI='DANG_XU_LY')
        thong_bao.gui(conn, tai_xe, 'LICH_DIEU_XE', ...)
```

### 3.4 Tự động tạo yêu cầu điều xe từ GCN (GCN-04)

> **Nơi gọi thật (đã nối 02/09/2026):** `services/bao_gia.py::chon_dong_bao_gia`
> → `_tu_tao_dieu_xe_gcn`. Thời điểm "chọn xong đơn vị gia công" chính là lúc
> **chốt báo giá cho dòng**, không phải lúc lập đơn hàng — chờ tới lúc lập đơn
> là Kho vận biết muộn và không kịp xếp xe trong giờ chốt 15:45 cùng ngày.
> Hàm bọc trong `conn.transaction()` (SAVEPOINT) và nuốt lỗi nghiệp vụ: điều
> xe là việc đi kèm, hỏng dữ liệu nền của nó không được phép chặn việc chốt
> giá. Không sinh trùng: dòng đã có chuyến chiều ĐI còn hiệu lực thì trả về
> chính phiếu cũ (`repo_dieu_xe.co_chuyen_di_cua_dong`). Dòng phiếu chép sẵn
> tên hàng · nội dung gia công · số lượng · ĐVT · quy cách từ dòng đề nghị,
> đúng yêu cầu "địa chỉ, khối lượng, vật tư cần giao" của docs/04 §GCN-04 —
> bỏ trống thì bản in QT-KV-01-BM01 ra tờ giấy trắng cột nội dung.


```python
def khi_chon_ncc_gia_cong(id_dong, id_ncc, conn):
    """GCN-04: gửi thông báo điều xe NGAY sau khi chọn đơn vị gia công."""
    ncc = repo.lay_ncc(conn, id_ncc)
    tao_dieu_xe(dict(
        hang_muc='DI_GCN', chieu='DUA_HANG_DI',
        id_doi_tac=id_ncc, loai_doi_tac='NCC',
        dia_chi=ncc.DIA_CHI, ghi_chu=f'Đưa hàng đi gia công — {ncc.MA_NCC}',
        dong=[{'id_de_nghi_dong': id_dong}]), ho_so_he_thong)
```

---

## 4. Thiết kế giao diện

### 4.1 Màn hình yêu cầu điều xe

```
┌ Yêu cầu điều xe ──────────────────────────── [+ Tạo yêu cầu] ┐
│ [Chưa xử lý (7)] [Đang xử lý (12)] [Hoàn thành] [Lịch ngày]  │
├───────────────────────────────────────────────────────────────┤
│ [27/08/26] [Hạng mục ▾] [Loại xe ▾] [Tài xế ▾]  [⭳ Tải xuống]│
├───────────────────────────────────────────────────────────────┤
│ │Ngày ĐX│Hạng mục      │Chiều       │Đối tác     │Xe      │TT │
│ │28/08  │Đi GCN        │Đưa hàng đi │STD THIỆN TÂN│Xe tải nhỏ│⏳│
│ │28/08  │Đi lấy hàng GCN│Lấy hàng về│TRÍ DŨNG    │Xe máy  │✓  │
│ │28/08  │Mua hàng      │Lấy hàng về │KIM YẾN BÌNH│Xe tải nhỏ│⏳│
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Form tạo yêu cầu

```
┌ Yêu cầu điều xe ────────────────────────────────────────────┐
│ Hạng mục *   ⦿ Đi GCN  ○ Đi lấy hàng GCN  ○ Mua hàng        │
│              ○ Giao hàng  ○ Giao chứng từ  ○ Khác            │
│ Chiều *      ⦿ Đưa hàng đi  ○ Lấy hàng về  ○ Đưa đi & lấy về│
│ Mức độ       ⦿ Bình thường  ○ Gấp                            │
├──────────────────────────────────────────────────────────────┤
│ Đối tác *    [🔍 STD THIỆN TÂN                             ] │
│              Thiện Tân · Vùng BH3 · 23 km                    │
│              Mr.Hồng · 0903077520                            │
├──────────────────────────────────────────────────────────────┤
│ Ngày điều xe [ 28/08/2026                               📅]  │
│ ⓘ Gửi lúc 16:02, sau giờ chốt 15:45                          │
│   → sẽ xếp vào lịch ngày làm việc kế tiếp                    │
├──────────────────────────────────────────────────────────────┤
│ NỘI DUNG (2)                                                 │
│ 1 │Cửa cuốn ngăn 3 · 26049735933WO │ 6│Pcs│ 120 kg          │
│ 2 │Frame · 26065477703WO           │ 5│Pcs│  80 kg          │
│                                            [+ Thêm dòng]     │
│ Số tiền thanh toán tại chỗ  [           0 ] đ                │
├──────────────────────────────────────────────────────────────┤
│                                        [Gửi yêu cầu]         │
└──────────────────────────────────────────────────────────────┘
```

Vùng, km, người liên hệ, địa chỉ **tự điền** từ danh mục đối tác — người dùng không gõ lại.

### 4.3 Màn hình lịch điều xe theo ngày (thay pivot `Lịch điều xe`)

```
┌ Lịch điều xe — Thứ Năm, 28/08/2026 ────────────── [🖨 In lịch] ┐
├─────────────────────────────────────────────────────────────────┤
│ XE TẢI NHỎ · 60C-38413 · Tài xế Phạm Ngọc Đăng      3 chuyến    │
│   ▸ STD THIỆN TÂN   Thiện Tân · BH3 · 23km · Đưa hàng đi        │
│   ▸ QC ANH VŨ       Tam Hiệp · BH1 · 8km  · Đưa đi & lấy về     │
│   ▸ KIM YẾN BÌNH    Tam Hiệp · BH1 · 6km  · Lấy hàng về · 💵    │
├─────────────────────────────────────────────────────────────────┤
│ XE MÁY · 60V5-6140 · Tài xế Bùi Văn Thịnh           2 chuyến    │
│   ▸ AT COATING      Thuận An, BD · Đưa hàng đi · ⚡GẤP           │
│   ▸ LÂM ĐỆ 2        Q5, HCM · Lấy hàng về · 💵 7.210.000đ       │
├─────────────────────────────────────────────────────────────────┤
│ ⚠ CHƯA XẾP XE (2)                                               │
│   ▸ TRÍ DŨNG        Dĩ An, BD · Lấy hàng về    [Xếp xe ▾]       │
└─────────────────────────────────────────────────────────────────┘
```

Gom theo **xe và tài xế** — đây là cách người điều vận nhìn công việc. Biểu tượng 💵 là chuyến có trả tiền mặt tại chỗ (lấy từ `LIST DIEU XE DI SG` hiện tại).

### 4.4 Lịch làm việc tài xế

Cùng dữ liệu, gom theo **tài xế** thay vì theo xe. Dùng để in giao cho tài xế đầu ngày.

### 4.5 In phiếu điều xe (mẫu QT-KV-01-BM01)

Đầu phiếu: `HỌ VÀ TÊN` · `BỘ PHẬN` · `SỐ PHIẾU` · `NGÀY` · `Người liên hệ` · `SĐT`.
Bảng: `STT | NỘI DUNG ĐIỀU XE | LOẠI XE | SỐ LƯỢNG | KÍCH THƯỚC | NCC/KH | ĐỊA ĐIỂM | THỜI GIAN | GHI CHÚ`.
Không in dòng trống, **không in `#N/A`** — lỗi hiện tại của sheet Excel.

### 4.6 Thống kê quãng đường (thay sheet `Thống kê`)

```
┌ Thống kê điều xe ─────────────────────────────────────────────┐
│ [01/08/26][31/08/26]                                           │
│ Tổng chuyến 142 · Tổng km 2.847 · Chi phí thuê ngoài 4.200.000 │
├────────────────────────────────────────────────────────────────┤
│ Theo vùng            Chuyến   Km      │ Theo hạng mục  Chuyến  │
│ BH1 (Biên Hoà 1)        48    412     │ Đi GCN            88   │
│ BD (Bình Dương)         31    806     │ Lấy hàng GCN      41   │
│ C11 (Cổng 11)           26    468     │ Mua hàng          11   │
│ SÀI GÒN                 18    720     │ Giao hàng          2   │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `DX-01` | Một luồng duy nhất, phân biệt bằng `HANG_MUC` | `CHAN` |
| `DX-02` | `CHIEU` là danh sách cố định, không text tự do | `CHAN` |
| `DX-03` | Gửi sau 15:45 → cảnh báo xếp lịch ngày kế tiếp | `CANH_BAO` |
| `DX-04` | Thuê xe ngoài → bắt buộc nhập chi phí | `CHAN` |
| `DX-05` | Cảnh báo trùng lịch xe và tài xế trong cùng ngày | `CANH_BAO` |
| `GCN-04` | Chọn xong NCC gia công → tạo yêu cầu điều xe ngay | — |
| `GCN-05` | Ưu tiên xe công ty, thuê ngoài phải báo chi phí | `CANH_BAO` |
| `DNG-07` | Đặt ngoài chỉ có chiều `LAY_HANG_VE` | `CHAN` |

---

## 6. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Gửi yêu cầu lúc 15:44 | Xếp vào ngày hôm nay |
| 2 | Gửi lúc 15:46 | Cảnh báo, đề xuất ngày làm việc kế tiếp |
| 3 | Chọn NCC `STD THIỆN TÂN` | Tự điền vùng BH3, 23 km, người liên hệ, địa chỉ |
| 4 | Xếp xe `60C-38413` cho 2 chuyến cùng ngày | Cảnh báo trùng, vẫn xếp được |
| 5 | Chọn loại xe `XE_NGOAI`, bỏ trống chi phí | `422`, `THIEU_CHI_PHI` |
| 6 | Đặt ngoài + `CHIEU = DUA_HANG_DI` | `422`, `SAI_CHIEU` |
| 7 | Chọn NCC gia công trên phiếu GCN | Tự tạo yêu cầu điều xe chiều `DUA_HANG_DI` |
| 8 | Lịch ngày | Gom theo xe và tài xế, hiện phần chưa xếp xe |
| 9 | In phiếu có 2 dòng | Chỉ 2 dòng, không `#N/A` |
| 10 | Thống kê km theo vùng | Khớp tổng với danh sách chuyến |
| 11 | Vai trò `NV_YEU_CAU` xếp xe | `403` — chỉ Kho vận xếp lịch |
| 12 | Hai người cùng xếp xe một phiếu | Người thứ hai nhận `409` |
