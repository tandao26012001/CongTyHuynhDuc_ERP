# F08 — Yêu cầu thanh toán & Bàn giao chứng từ

> Thay thế: sheet `YEU CAU THANH TOAN IN`, `THEO DOI YC THANH TOAN` (**979 bản ghi**), `PHIẾU BÀN GIAO CHỨNG TỪ` (179 dòng).
> **Cả hai đối tượng này không có trong checklist HD-CHK-01 lẫn trong tài liệu Menu** — nhưng đang chạy thật và là điểm nghẽn khiến hàng không về được.

---

## 1. Vì sao phải đưa vào V1

Checklist mục A4 nói quy trình *kết thúc* ở bàn giao cho Kế toán — nhưng không mô hình hoá bước đó. Thực tế:

- **979 bản ghi** yêu cầu thanh toán trong ~8 tháng
- Có cọc 30% / 50% / 70%, thanh toán hai đợt
- Lý do phổ biến: *"Nhà cc lẻ không cho công nợ"*, *"Thanh toán để lấy hàng về"*, *"Hàng cọc do gia công theo yêu cầu"*, *"Hàng cọc do đặt hàng lớn"*
- Cột `TÌNH TRẠNG` = `CHƯA TT` / `ĐÃ TT`, cột ghi chú = `HÀNG CHƯA VỀ` / `HÀNG ĐÃ VỀ`

→ **Tiền cọc là thứ chặn hàng về.** Bỏ nó ra khỏi V1 là bỏ mất một trong những điểm nghẽn lớn nhất.

**Ranh giới:** hệ thống **ghi nhận và theo dõi**, **không hạch toán**, **không tính công nợ**. Kế toán vẫn làm trên Bravo.

---

## 2. Sửa lỗi mô hình của Excel: N đợt thay vì 2 cột

Excel có hai cột cứng `THANH TOÁN LẦN 1` và `THANH TOÁN LẦN 2`. Đây là **lỗi kinh điển số 2** trong giáo trình GĐ1: *cột lặp — số thứ 3 xuất hiện là phải sửa cấu trúc*.

```
YEU_CAU_THANH_TOAN  (1)
   ├─ DOT_THANH_TOAN  đợt 1: 30% · dự kiến 12/01 · thực tế 12/01 · ĐÃ TT
   ├─ DOT_THANH_TOAN  đợt 2: 40% · dự kiến 20/01 · thực tế —     · CHƯA TT
   └─ DOT_THANH_TOAN  đợt 3: 30% · dự kiến khi giao hàng          · CHƯA TT
```

---

## 3. Logic backend

### 3.1 Endpoint

```
GET  /api/v1/yeu-cau-thanh-toan            danh sách, lọc
GET  /api/v1/yeu-cau-thanh-toan/{id}
POST /api/v1/yeu-cau-thanh-toan            tạo
POST /api/v1/yeu-cau-thanh-toan/{id}/duyet
POST /api/v1/dot-thanh-toan                { id_yctt, dot_so, so_tien, ngay_du_kien }
POST /api/v1/dot-thanh-toan/{id}/da-tra    { ngay_thuc_te }
GET  /api/v1/yeu-cau-thanh-toan/{id}/in    PDF phiếu yêu cầu thanh toán

GET  /api/v1/ban-giao-chung-tu
POST /api/v1/ban-giao-chung-tu             { ngay_ban_giao, ids_nhan_hang[] }
GET  /api/v1/ban-giao-chung-tu/{id}/in     PDF
GET  /api/v1/nhan-hang/chua-ban-giao       phiếu nhận hàng chưa bàn giao chứng từ
```

### 3.2 Tạo yêu cầu thanh toán

```python
def tao_yctt(du_lieu, ho_so):
    with giao_dich() as conn:
        po = repo.lay_don_hang(conn, du_lieu.id_don_hang) if du_lieu.id_don_hang else None
        gia_tri = tong_tien(po) if po else du_lieu.gia_tri_don_hang

        id_yctt = sinh_ma(conn, 'YCTT', now_vn().year)
        repo.tao_yctt(conn, id_yctt,
            id_don_hang = du_lieu.id_don_hang, id_ncc = du_lieu.id_ncc,
            nguoi_de_nghi = ho_so.MA_NHAN_VIEN, ngay_yeu_cau = today(),
            ly_do_thanh_toan     = du_lieu.ly_do_thanh_toan,      # danh mục
            hinh_thuc_thanh_toan = du_lieu.hinh_thuc_thanh_toan,  # danh mục
            ly_do_yeu_cau        = du_lieu.ly_do_yeu_cau,         # danh mục
            gia_tri_don_hang = gia_tri, ky_han_thanh_toan = du_lieu.ky_han,
            tinh_trang_hang = du_lieu.tinh_trang_hang,            # HANG_CHUA_VE | HANG_DA_VE
            trang_thai = 'CHUA_TT')

        tong_dot = 0
        for i, d in enumerate(du_lieu.dot, 1):
            tong_dot += d.so_tien
            repo.tao_dot(conn, id_yctt, i, d.so_tien, d.ngay_du_kien)
        # TT-03
        if tong_dot > gia_tri:
            raise LoiNghiepVu(
                f'Tổng các đợt ({tong_dot:,}đ) vượt giá trị đơn hàng ({gia_tri:,}đ).',
                'TONG_DOT_VUOT')
        return id_yctt
```

### 3.3 Trạng thái suy ra từ các đợt (TT-02)

```python
def trang_thai_yctt(id_yctt, conn) -> str:
    """KHÔNG lưu cứng — suy ra khi đọc."""
    dot = repo.lay_cac_dot(conn, id_yctt)
    da_tra = [d for d in dot if d.NGAY_THUC_TE]
    if not da_tra:            return 'CHUA_TT'
    if len(da_tra) == len(dot): return 'DA_TT'
    return 'TT_MOT_PHAN'
```

### 3.4 Bàn giao chứng từ

```python
def tao_ban_giao(ngay, ids_nhan_hang, ho_so):
    with giao_dich() as conn:
        id_bgct = sinh_ma(conn, 'BGCT', now_vn().year)
        repo.tao_bgct(conn, id_bgct, ngay, ho_so.MA_NHAN_VIEN)
        for i, id_nh in enumerate(ids_nhan_hang, 1):
            nh = repo.lay_nhan_hang(conn, id_nh)
            if nh.NGAY_BAN_GIAO_CHUNG_TU:
                raise LoiNghiepVu(
                    f'Phiếu {id_nh} đã bàn giao ngày {nh.NGAY_BAN_GIAO_CHUNG_TU}.',
                    'DA_BAN_GIAO')
            repo.tao_bgct_dong(conn, id_bgct, i, id_nh, nh.ID_NCC,
                               nh.SO_PHIEU_CU, nh.NGAY_NHAN)
            # TT-05: cập nhật ngược về phiếu nhận hàng
            repo.cap_nhat_nhan_hang(conn, id_nh, NGAY_BAN_GIAO_CHUNG_TU=ngay)
        return id_bgct
```

---

## 4. Danh mục dùng cho F08 (nạp từ sheet `Danh Muc` của Excel)

**`LY_DO_THANH_TOAN`**
`Nhà cc lẻ không cho công nợ` · `Hàng cọc do gia công theo yêu cầu` · `Hàng cọc do đặt hàng lớn` · `Thanh toán đặt cọc nhà máy`

**`HINH_THUC_THANH_TOAN`**
`Thanh toán 100% giá trị đơn hàng` · `Thanh toán 100% theo hoá đơn` · `Thanh toán 30% giá trị đơn hàng` · `40%` · `50%` · `60%` · `70%` · `Thanh toán 50% theo hoá đơn` · `THANH TOÁN HỢP THỨC HOÁ CHỨNG TỪ`

**`LY_DO_YEU_CAU`**
`Thanh toán để lấy hàng về` · `Thanh toán công nợ cho ncc lẻ` · `Thanh toán đặt cọc nhà máy`

> Ba danh mục này quản lý ở màn hình Dữ liệu gốc (F10), Admin sửa được. Không hardcode.

---

## 5. Thiết kế giao diện

### 5.1 Màn hình theo dõi yêu cầu thanh toán

```
┌ Yêu cầu thanh toán ──────────────────── [+ Tạo yêu cầu] ┐
│ [Chưa TT (34)] [TT một phần (12)] [Đã TT] [Quá hạn (5)] │
├──────────────────────────────────────────────────────────┤
│ [01/08/26][31/08/26] [NCC ▾] [Hình thức ▾]  [⭳ Tải xuống]│
├──────────────────────────────────────────────────────────┤
│ [Tổng YC 46] [Giá trị 1.284.000.000] [Đã trả 412.000.000]│
├──────────────────────────────────────────────────────────┤
│  │NCC        │Nội dung          │Giá trị    │Đã trả│Hạn  │
│ 🔴│VẠN SỰ LỢI │MÁY CƯA CHENLONG  │293.130.000│ 30% │12/08│
│   │           │  ⚠ Quá hạn 5 ngày · HÀNG CHƯA VỀ         │
│ 🟠│QUỐC TOÀN  │Module Transistor │ 14.688.000│  0% │30/08│
│ 🟢│TSM        │Dụng cụ vệ sinh   │  3.317.760│100% │ —   │
└──────────────────────────────────────────────────────────┘
```

Cột "Đã trả" hiện **phần trăm**, bấm vào mở chi tiết các đợt.

### 5.2 Chi tiết yêu cầu thanh toán

```
┌ YCTT-2026-000067 ──────────────────── ●TT MỘT PHẦN  [In]  ┐
│ Nhà cung cấp  VẠN SỰ LỢI                                   │
│ Đơn hàng      PO-2026-000203 · MÁY CƯA CHENLONG 330B       │
│ Giá trị       293.130.000 đ       Tình trạng hàng: CHƯA VỀ │
│ Lý do TT      Nhà cc lẻ không cho công nợ                  │
│ Hình thức     Thanh toán 30% giá trị đơn hàng              │
│ Lý do YC      Thanh toán đặt cọc nhà máy                   │
├─────────────────────────────────────────────────────────────┤
│ CÁC ĐỢT THANH TOÁN                          [+ Thêm đợt]   │
│ Đợt│Số tiền      │Dự kiến │Thực tế │Trạng thái              │
│  1 │ 87.939.000  │12/01   │12/01   │✓ Đã trả                │
│  2 │117.252.000  │20/02   │  —     │⏳ Chưa trả  [Đánh dấu] │
│  3 │ 87.939.000  │khi giao│  —     │⏳ Chưa trả             │
│    │─────────────│        │        │                        │
│    │293.130.000  │        │87.939.000 (30%)                 │
├─────────────────────────────────────────────────────────────┤
│ 👤 Người lập: Đào Khánh Trâm   Người duyệt: Phạm Huyền Như │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Màn hình bàn giao chứng từ

```
┌ Bàn giao chứng từ sang Kế toán ─────────────────────────────┐
│ Ngày bàn giao [26/06/2026 📅]                                │
├──────────────────────────────────────────────────────────────┤
│ PHIẾU NHẬN HÀNG CHƯA BÀN GIAO (23)     [Chọn tất cả]        │
│ ☑ 06-178 │KHẢI ĐÌNH │nhận 11/06 │ 2 dòng │  4.320.000       │
│ ☑ 06-216 │MECSU     │nhận 12/06 │ 5 dòng │  1.284.000       │
│ ☑ 06-247 │MISUMI    │nhận 15/06 │ 1 dòng │    630.744       │
│ ☐ 06-264 │MECSU     │nhận 16/06 │ 3 dòng │    892.000       │
├──────────────────────────────────────────────────────────────┤
│ Đã chọn 3 phiếu · tổng 6.234.744đ                            │
│                        [Tạo phiếu bàn giao]  [🖨 In]         │
└──────────────────────────────────────────────────────────────┘
```

Cột đúng như sheet Excel hiện tại: `STT | NHÀ CC | SỐ PGH NỘI BỘ | NGÀY NHẬP HÀNG | GHI CHÚ`.

### 5.4 In phiếu yêu cầu thanh toán

Theo mẫu sheet `YEU CAU THANH TOAN IN`:
```
              PHIẾU YÊU CẦU THANH TOÁN TRẢ TRƯỚC
                                              Ngày: 22/08/2026
STT│NGƯỜI YÊU CẦU│NGÀY YC ĐẶT HÀNG│NỘI DUNG│ĐVT│SL│SỐ TIỀN│KỲ HẠN YC│GHI CHÚ
 1 │Mr. Sáng     │30/06/2026      │SS400-U…│PCS│ 1│24.976.470│02/07│HÀNG CHƯA VỀ

NHÀ CUNG CẤP:          ĐỨC HUY
LÝ DO THANH TOÁN:      Nhà cc lẻ không cho công nợ
HÌNH THỨC THANH TOÁN:  Thanh toán 100% theo hoá đơn
SỐ TIỀN CỌC:           24.976.470
KỲ HẠN THANH TOÁN:     03/07/2026
LÝ DO YÊU CẦU:         Thanh toán để lấy hàng về

        NGƯỜI LẬP PHIẾU              NGƯỜI DUYỆT
```

---

## 6. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `TT-01` | N đợt thanh toán, không giới hạn 2 | `CHAN` |
| `TT-02` | Trạng thái suy ra từ các đợt, không lưu cứng | — |
| `TT-03` | Tổng các đợt không được vượt giá trị đơn hàng | `CHAN` |
| `TT-04` | Chỉ ghi nhận và theo dõi, **không hạch toán, không tính công nợ** | `CHAN` |
| `TT-05` | Bàn giao chứng từ cập nhật ngược `NGAY_BAN_GIAO_CHUNG_TU` về phiếu nhận hàng | — |
| Mới `TT-06` | Một phiếu nhận hàng chỉ bàn giao chứng từ **một lần** | `CHAN` |
| Mới `TT-07` | Yêu cầu thanh toán quá hạn mà chưa trả → cảnh báo và thông báo | `CANH_BAO` |

---

## 7. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tạo YCTT 3 đợt, tổng đúng bằng giá trị đơn | Thành công |
| 2 | Tạo YCTT tổng đợt vượt giá trị | `422`, `TONG_DOT_VUOT` |
| 3 | Đánh dấu đợt 1 đã trả | Trạng thái YCTT → `TT_MOT_PHAN` |
| 4 | Đánh dấu tất cả đợt đã trả | Trạng thái → `DA_TT` |
| 5 | Thêm đợt thứ 4 | Thành công (không giới hạn 2 như Excel) |
| 6 | Bàn giao chứng từ phiếu đã bàn giao | `422`, `DA_BAN_GIAO` |
| 7 | Bàn giao 3 phiếu | 3 phiếu nhận hàng đều có `NGAY_BAN_GIAO_CHUNG_TU` |
| 8 | Vai trò `NV_YEU_CAU` xem YCTT | `403` — dữ liệu tiền, mức Hạn chế |
| 9 | Vai trò `KE_TOAN` xem và sửa YCTT | Thành công |
| 10 | YCTT quá hạn 5 ngày chưa trả | Vào tab "Quá hạn", có thông báo |
| 11 | In phiếu YCTT | Đủ 6 dòng thông tin dưới bảng, có ô ký |
| 12 | Bấm "Tạo phiếu bàn giao" ba lần | Chỉ một phiếu được tạo |
