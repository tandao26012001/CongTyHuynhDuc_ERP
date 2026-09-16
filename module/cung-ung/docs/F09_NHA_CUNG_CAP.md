# F09 — Nhà cung cấp & Đánh giá nhà cung cấp

> Thay thế: sheet `NCC` (**799 NCC**), `Danh mục thông tin KH&NCC` (103 đối tượng), `QT-MH-01-BM03` (**đang trống**), `QT-MH-01-BM06/07` đánh giá, `QT-MH-01-BM08` sổ theo dõi (**đang trống**).

---

## 1. Hợp nhất hai danh mục — quyết định đã chốt

**Hai bảng:** `NHA_CUNG_CAP` (gộp 799 + 103) và `KHACH_HANG` (tách riêng).

Một đơn vị vừa bán vật tư vừa nhận gia công chỉ có **một** bản ghi, bật cả hai cờ:

```
NHA_CUNG_CAP
  LA_NCC_MUA_HANG = true   → có CO_HOA_DON, CONG_NO, TIEN_MAT
  LA_NCC_GIA_CONG = true   → có NGANH_NGHE, VUNG, SO_KM, KY_HAN_QUY_DINH
```

### Ánh xạ khi nạp dữ liệu

| Sheet `NCC` (799) | Trường mới |
|---|---|
| `MÃ NHÀ NCC` | `MA_NCC` (FUJI, COLSON, VIỆT NHẬT…) |
| `TÊN NHÀ CUNG CẤP` | `TEN` |
| `ĐỊA CHỈ` `NGƯỜI LIÊN HỆ` `SỐ ĐIỆN THOẠI` `SỐ FAX` `sdt 2` `MAIL` | tương ứng |
| `MẶT HÀNG` | `MAT_HANG` |
| `GHI CHÚ` = "CÓ HÓA ĐƠN" | `CO_HOA_DON = true` |
| `CÔNG NỢ` `TIỀN MẶT` | tương ứng |
| — | `LA_NCC_MUA_HANG = true` |

| Sheet `Danh mục thông tin KH&NCC` (103) | Trường mới |
|---|---|
| `Đối tượng` = "Nhà cung cấp" | → bảng `NHA_CUNG_CAP`, `LA_NCC_GIA_CONG = true` |
| `Đối tượng` = "Khách hàng" | → bảng `KHACH_HANG` |
| `Tên viết tắt` | `MA_NCC` — **khớp với `MA_NCC` của sheet NCC nếu trùng** |
| `CÔNG VIỆC` | `MA_LOAI_GIA_CONG` |
| `Khu vực` `Vùng` `Số km` | `VUNG`, `SO_KM` |
| `NGÀNH NGHỀ` | `NGANH_NGHE` (SƠN TĨNH ĐIỆN · XI MẠ · NHIỆT LUYỆN · GIA CÔNG KHÁC) |
| `KH QUY ĐỊNH` | `KY_HAN_QUY_DINH` (số ngày làm việc) |

**Quy tắc gộp:** khớp theo `MA_NCC` sau khi chuẩn hoá (bỏ dấu, viết hoa, bỏ khoảng trắng thừa). Trùng → gộp thành một bản ghi, bật cả hai cờ. Không trùng → tạo mới.

Chú ý các cặp gần trùng cần rà tay: `THUẬN HÒA` vs `THUẬN HÒA 2` · `ĐỨC THỊNH` vs `ĐỨC THỊNH LT` · `VIỆT NHẬT` vs `NIPPON` (cùng là Nippon Sanso Việt Nam).

---

## 2. Danh mục NCC được phê duyệt — BM03 đang trống

Đây là điểm phải xử lý cẩn thận: **799 NCC đang giao dịch thật, nhưng danh mục được phê duyệt có 0 dòng.**

Nếu bật quy tắc "cấm chọn NCC chưa được phê duyệt" ở chế độ `CHAN` ngay ngày đầu, mua hàng sẽ đứng.

**Chiến lược:**
1. V1: `DA_PHE_DUYET = false` cho toàn bộ. Quy tắc `DH-08` chạy ở chế độ `CANH_BAO`.
2. Mua hàng phê duyệt dần, ưu tiên **NCC có giao dịch nhiều nhất** — 370 NCC đang dùng thật, trong đó top 50 chiếm phần lớn khối lượng.
3. Khi tỷ lệ NCC được phê duyệt trên giao dịch đạt ~95%, chuyển `DH-08` sang `CHAN`.

Màn hình có chỉ báo tiến độ: *"Đã phê duyệt 128/370 NCC đang giao dịch (35%)"*.

---

## 3. Đánh giá nhà cung cấp

### 3.1 Tám tiêu chí (QT-MH-01 §7.5)

| Tiêu chí | Nguồn điểm |
|---|---|
| Chất lượng sản phẩm | **Tự động** từ `TY_LE_IQC_DAT` |
| Thời gian giao hàng | **Tự động** từ `TY_LE_DUNG_HAN` |
| Giá cả — tính cạnh tranh | Nhập tay, tham chiếu lịch sử báo giá |
| Thanh toán — phương thức, thời gian nợ, định mức công nợ | Nhập tay |
| Dịch vụ khách hàng — bảo hành, hỗ trợ kỹ thuật, xử lý sự cố | Nhập tay |
| Tầm vóc — quy mô, năng lực cung cấp, giấy tờ | Nhập tay |
| Thời gian đã hợp tác | **Tự động** từ ngày giao dịch đầu tiên |
| Giá trị giao dịch | **Tự động** từ tổng giá trị PO |

### 3.2 Hai loại đánh giá

| Loại | Khi nào | Quy tắc |
|---|---|---|
| **Ban đầu** | NCC mới, trước khi vào danh mục được phê duyệt | Qua hồ sơ + sản phẩm mẫu (`NCC-01`) |
| **Định kỳ** | NCC trong danh mục | **Tối thiểu 1 năm/lần** (`NCC-02`) |

### 3.3 Số liệu tự động (NCC-04) — không nhập tay

```sql
-- Tính trực tiếp từ giao dịch gốc (Hiến chương 1.6)
WITH gd AS (
  SELECT nh.ID_NCC,
         count(*)                                                       AS so_lan_nhan,
         count(*) FILTER (WHERE nhd.SO_NGAY_SOM_TRE >= 0)               AS dung_han,
         SUM(iqc.SO_LUONG_DAT)                                          AS sl_dat,
         SUM(iqc.SO_LUONG_KIEM)                                         AS sl_kiem,
         count(DISTINCT hkph.ID)                                        AS so_khong_phu_hop
  FROM NHAN_HANG nh
  JOIN NHAN_HANG_DONG nhd  ON nhd.ID_NHAN_HANG = nh.ID
  LEFT JOIN KET_QUA_IQC iqc ON iqc.ID_NHAN_HANG_DONG = nhd.ID
  LEFT JOIN HANG_KHONG_PHU_HOP hkph ON hkph.ID_KET_QUA_IQC = iqc.ID
  WHERE nh.NGAY_NHAN BETWEEN %(tu)s AND %(den)s
  GROUP BY nh.ID_NCC
)
SELECT ID_NCC,
       100.0 * dung_han / NULLIF(so_lan_nhan, 0) AS TY_LE_DUNG_HAN,
       100.0 * sl_dat   / NULLIF(sl_kiem, 0)     AS TY_LE_IQC_DAT,
       so_khong_phu_hop                          AS SO_LAN_KHONG_PHU_HOP
FROM gd;
```

### 3.4 Xếp loại

```python
def xep_loai(diem_tong: float) -> str:
    if diem_tong >= 85: return 'A'
    if diem_tong >= 70: return 'B'
    return 'C'

def ket_luan(diem_tong, so_khong_phu_hop) -> str:
    """NCC-05: xử lý NCC không đạt theo mức tăng dần."""
    if diem_tong < 50 or so_khong_phu_hop >= 5: return 'LOAI_BO'
    if diem_tong < 60 or so_khong_phu_hop >= 3: return 'TAM_NGUNG'
    if diem_tong < 70 or so_khong_phu_hop >= 1: return 'CANH_BAO'
    return 'DAT'
```
Kết luận cập nhật ngược vào `NHA_CUNG_CAP.TRANG_THAI` và `PHAN_LOAI_NCC`.

---

## 4. Logic backend

```
GET  /api/v1/nha-cung-cap                     danh sách, lọc, tìm mờ
GET  /api/v1/nha-cung-cap/{id}                chi tiết + lịch sử giao dịch + KPI
POST /api/v1/nha-cung-cap                     tạo mới
PUT  /api/v1/nha-cung-cap/{id}
POST /api/v1/nha-cung-cap/{id}/phe-duyet      { ngay_phe_duyet, ghi_chu }
POST /api/v1/nha-cung-cap/{id}/doi-trang-thai { trang_thai, ly_do }
POST /api/v1/nha-cung-cap/gop                 { id_nguon, id_dich }  gộp trùng
GET  /api/v1/nha-cung-cap/{id}/kpi?tu=&den=   số liệu tự động
GET  /api/v1/nha-cung-cap/tai-xuong           xuất danh mục (BM03)

GET  /api/v1/danh-gia-ncc                     danh sách đánh giá
POST /api/v1/danh-gia-ncc                     tạo đánh giá
GET  /api/v1/danh-gia-ncc/den-han             NCC quá 12 tháng chưa đánh giá
GET  /api/v1/danh-gia-ncc/tong-hop?ky=        bảng tổng hợp (BM07)
GET  /api/v1/danh-gia-ncc/{id}/in             PDF mẫu BM06
```

```python
def tao_danh_gia(du_lieu, ho_so):
    with giao_dich() as conn:
        # NCC-04: điểm tự động, KHÔNG cho nhập tay
        kpi = tinh_kpi(conn, du_lieu.id_ncc, du_lieu.tu_ngay, du_lieu.den_ngay)
        diem_chat_luong = kpi.TY_LE_IQC_DAT
        diem_giao_hang  = kpi.TY_LE_DUNG_HAN
        diem_thoi_gian  = diem_tu_so_thang_hop_tac(kpi.thang_hop_tac)
        diem_gia_tri    = diem_tu_gia_tri_giao_dich(kpi.tong_gia_tri)

        diem_tong = trung_binh_co_trong_so({
            'chat_luong': (diem_chat_luong, 0.25), 'giao_hang': (diem_giao_hang, 0.25),
            'gia_ca': (du_lieu.diem_gia_ca, 0.15), 'thanh_toan': (du_lieu.diem_thanh_toan, 0.10),
            'dich_vu': (du_lieu.diem_dich_vu, 0.10), 'tam_voc': (du_lieu.diem_tam_voc, 0.05),
            'thoi_gian': (diem_thoi_gian, 0.05), 'gia_tri': (diem_gia_tri, 0.05)})

        kl = ket_luan(diem_tong, kpi.SO_LAN_KHONG_PHU_HOP)
        id_dgn = sinh_ma(conn, 'DGN', now_vn().year)
        repo.tao_danh_gia(conn, id_dgn, ..., diem_tong=diem_tong,
                          xep_loai=xep_loai(diem_tong), ket_luan=kl)
        # NCC-05: cập nhật trạng thái NCC
        repo.cap_nhat_ncc(conn, du_lieu.id_ncc,
                          PHAN_LOAI_NCC=xep_loai(diem_tong),
                          TRANG_THAI={'DAT':'HOAT_DONG'}.get(kl, kl))
        return id_dgn
```

---

## 5. Thiết kế giao diện

### 5.1 Danh mục nhà cung cấp

```
┌ Nhà cung cấp ──────────────────────────────── [+ Thêm NCC] ┐
│ [🔍 tên / mã / mặt hàng…] [Vai trò ▾] [Ngành nghề ▾]        │
│ [Trạng thái ▾]  ☐ Chỉ NCC được phê duyệt   [⭳ Tải xuống]   │
├─────────────────────────────────────────────────────────────┤
│ Đã phê duyệt 128/370 NCC đang giao dịch (35%)  ████░░░░░░   │
├─────────────────────────────────────────────────────────────┤
│  │Mã NCC     │Tên đầy đủ            │Vai trò │Loại│ĐH% │TT  │
│ ✓│NIPPON     │CTY CP Nippon Sanso VN│Mua·GC  │ A  │94% │🟢  │
│ ✓│STD THIỆN TÂN│STD Thiện Tân       │Gia công│ A  │97% │🟢  │
│  │TUYÊN HƯNG │Tuyên Hưng            │Mua hàng│ C  │61% │🟠  │
│  │MECSU      │Mecsu                 │Mua hàng│ B  │88% │🟢  │
└─────────────────────────────────────────────────────────────┘
  ✓ đã phê duyệt (BM03)   ĐH% tỷ lệ đúng hạn thật   🟠 cảnh báo
```

### 5.2 Chi tiết nhà cung cấp

```
┌ NIPPON ─ CTY CP NIPPON SANSO VIỆT NAM ──── ✓Đã phê duyệt ┐
│ [Thông tin] [Lịch sử giao dịch] [Đánh giá] [Hàng không PH]│
├───────────────────────────────────────────────────────────┤
│ Vai trò   ☑ NCC mua hàng   ☑ NCC gia công                 │
│ MST       3600xxxxxx      Địa chỉ  KCN II, TP Đồng Nai    │
│ Liên hệ   Mr Công · 0903121458 · thanhcong@vijagas.vn     │
│ Mặt hàng  Khí trộn, khí O2, N2                            │
│ ── riêng vai trò mua hàng ──                              │
│ Có hoá đơn ☑    Công nợ 30 ngày    Tiền mặt —             │
│ ── riêng vai trò gia công ──                              │
│ Ngành nghề XI MẠ  Vùng BD  23km  Kỳ hạn quy định 4 ngày   │
├───────────────────────────────────────────────────────────┤
│ 12 THÁNG QUA                                              │
│ Đơn hàng 47 · Giá trị 284.000.000đ                        │
│ Đúng hạn 94,2%  ·  IQC đạt 99,1%  ·  Không phù hợp 1 lần  │
│ Xếp loại A · Đánh giá gần nhất 15/01/2026                 │
└───────────────────────────────────────────────────────────┘
```

### 5.3 Màn hình đánh giá

```
┌ Đánh giá nhà cung cấp — NIPPON ─────────────────────────────┐
│ Loại  ⦿ Định kỳ  ○ Ban đầu       Kỳ  [2026 ▾]               │
├──────────────────────────────────────────────────────────────┤
│ TỰ ĐỘNG TỪ HỆ THỐNG — không sửa được                        │
│ Chất lượng sản phẩm   99,1  (IQC đạt 99,1% · 340/343)       │
│ Thời gian giao hàng   94,2  (đúng hạn 44/47 lần)            │
│ Thời gian hợp tác     85,0  (hợp tác 38 tháng)              │
│ Giá trị giao dịch     72,0  (284.000.000đ trong 12 tháng)   │
├──────────────────────────────────────────────────────────────┤
│ NHẬP TAY                                                     │
│ Giá cả                [ 80 ]  ⓘ xem lịch sử báo giá          │
│ Thanh toán            [ 90 ]  công nợ 30 ngày                │
│ Dịch vụ khách hàng    [ 85 ]                                 │
│ Tầm vóc               [ 90 ]                                 │
├──────────────────────────────────────────────────────────────┤
│ ĐIỂM TỔNG  91,4        XẾP LOẠI  A        KẾT LUẬN  ĐẠT     │
│ Hành động xử lý  [                                        ] │
│                                        [Lưu đánh giá]  [🖨]  │
└──────────────────────────────────────────────────────────────┘
```

Bốn tiêu chí đầu **khoá không cho sửa** — đây là điểm khác biệt lớn nhất so với Excel, nơi mọi thứ đều nhập tay và không ai kiểm chứng được.

### 5.4 Nhắc đánh giá đến hạn

```
┌ Đến hạn đánh giá (14) ─────────────────────────────────────┐
│ ⚠ 8 NCC quá 12 tháng chưa đánh giá định kỳ                 │
│  │TUYÊN HƯNG  │đánh giá gần nhất 03/2025 │17 tháng│[Đánh giá]│
│  │THÀNH LỢI   │chưa từng đánh giá        │  —     │[Đánh giá]│
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Bảng tổng hợp đánh giá (mẫu BM07)

Xuất theo kỳ: `Mã NCC · Tên · Ngành nghề · Điểm từng tiêu chí · Điểm tổng · Xếp loại · Kết luận · Hành động xử lý`

---

## 6. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `NCC-01` | NCC mới phải đánh giá ban đầu trước khi vào danh mục được phê duyệt | `CANH_BAO` |
| `NCC-02` | Đánh giá định kỳ tối thiểu 1 năm/lần | `CANH_BAO` |
| `NCC-03` | Đủ 8 tiêu chí QT-MH-01 §7.5 | `CHAN` |
| `NCC-04` | 4 tiêu chí tự động, **cấm nhập tay** | `CHAN` |
| `NCC-05` | Không đạt → `CANH_BAO` → `TAM_NGUNG` → `LOAI_BO` | — |
| `NCC-06` | Chọn NCC `TAM_NGUNG` / `LOAI_BO` → cảnh báo | `CANH_BAO` |
| `DH-08` | NCC chưa được phê duyệt | `CANH_BAO` → `CHAN` khi đạt 95% |
| `BM-03` | Bảng giá NCC, chiết khấu, điều khoản là mức **Tối mật** | `CHAN` |

---

## 7. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Nạp 799 + 103, có 12 mã trùng | 890 bản ghi, 12 bản ghi bật cả hai cờ |
| 2 | Tạo NCC trùng `MA_NCC` | `422`, `MA_DA_TON_TAI` |
| 3 | Tìm mờ "thien tan" (không dấu) | Ra `STD THIỆN TÂN` |
| 4 | Đánh giá NCC có 44/47 lần đúng hạn | `TY_LE_DUNG_HAN = 93,62` |
| 5 | Sửa tay điểm "Chất lượng sản phẩm" | `422` — trường tự động |
| 6 | Điểm tổng 91,4 | `XEP_LOAI = A`, `KET_LUAN = DAT` |
| 7 | Điểm tổng 58 | `KET_LUAN = TAM_NGUNG`, `NHA_CUNG_CAP.TRANG_THAI` cập nhật |
| 8 | NCC có 3 lần hàng không phù hợp | `KET_LUAN = TAM_NGUNG` bất kể điểm |
| 9 | Chọn NCC `TAM_NGUNG` khi lập báo giá | Cảnh báo `NCC-06` |
| 10 | Xuất BM03 | Đúng cột của biểu mẫu, chỉ NCC `DA_PHE_DUYET` |
| 11 | NCC 13 tháng chưa đánh giá | Vào danh sách "đến hạn" |
| 12 | Vai trò `NV_YEU_CAU` xem chi tiết NCC | Không thấy bảng giá, công nợ (mức Tối mật) |
| 13 | Gộp hai NCC trùng | Mọi chứng từ của NCC nguồn trỏ sang NCC đích, ghi `LICH_SU_GOP` |
