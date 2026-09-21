# F04 — Đơn đặt hàng · Lệnh mua hàng · Theo dõi tiến độ

> Thay thế: sheet `QT-MH-01-BM06 ĐƠN ĐẶT HÀNG`, `LỆNH MUA HÀNG NEW` (5.537 dòng), `LMH THIEN`, và cột G–K, V, AC của `THEO DOI MUA HANG`.
> Đây là **màn hình dùng nhiều nhất** (checklist F3) và là chức năng người dùng chọn nếu chỉ được chọn một (checklist B19: *"tự động hoá theo dõi tiến độ đơn hàng và cảnh báo hàng trễ"*).

---

## 1. Ba đối tượng, đừng nhầm lẫn

| Đối tượng | Là gì | Gửi cho ai | Bảng |
|---|---|---|---|
| **Đơn đặt hàng (PO)** | Chứng từ đặt hàng gửi **nhà cung cấp** | NCC | `DON_HANG` |
| **Lệnh mua hàng (LMH)** | **Phân công nội bộ** cho nhân viên mua hàng | NV Mua hàng | `CONG_VIEC` |
| **Theo dõi tiến độ** | Bảng theo dõi xuyên suốt từ đề nghị tới nhận hàng | Mọi bộ phận | view tổng hợp |

> Trong Excel, `LMH THIEN` là một sheet toàn `VLOOKUP(ID SP, TDDH, n, 0)` — người dùng chỉ dán danh sách `ID SP` vào cột M. Đó không phải biểu mẫu, đó là **hàng đợi công việc**. Hệ mới dựng nó đúng bản chất.

---

## 2. Luồng nghiệp vụ

```
Báo giá được chọn (F03)
        ▼
   Tạo ĐƠN HÀNG  ← có thể tạo tự động từ báo giá đã chọn
        │  ├─ chụp đơn giá, tên hàng, ĐVT, phân loại
        │  ├─ tính GIA_TRI_TRUOC_VAT
        │  └─ suy CAP_DUYET_YEU_CAU theo ngưỡng §7.7
        ▼
   CHO_DUYET → Trưởng BP Mua hàng hoặc Ban lãnh đạo duyệt
        ▼
   DA_DUYET → in PDF gửi NCC → DANG_GIAO
        │  ├─ cập nhật TRA_LOI_KY_HAN khi NCC xác nhận lại kỳ hạn
        │  ├─ cảnh báo sắp trễ (≤2 ngày) và trễ hạn
        │  └─ điều xe đi lấy hàng nếu cần (F07)
        ▼
   Nhận hàng (F05) → GIAO_MOT_PHAN hoặc HOAN_THANH
```

---

## 3. Logic backend

### 3.1 Endpoint

```
GET  /api/v1/don-hang                    danh sách, lọc, phân trang
GET  /api/v1/don-hang/{id}
POST /api/v1/don-hang                    tạo thủ công
POST /api/v1/don-hang/tu-bao-gia         { id_bao_gia }  tạo tự động
PUT  /api/v1/don-hang/{id}
POST /api/v1/don-hang/{id}/gui           NHAP → CHO_DUYET
POST /api/v1/don-hang/{id}/duyet
POST /api/v1/don-hang/{id}/huy           { ly_do }
POST /api/v1/don-hang/{id}/cap-nhat-ky-han  { id_dong, tra_loi_ky_han, ghi_chu }
GET  /api/v1/don-hang/{id}/in            PDF mẫu BM05
GET  /api/v1/don-hang/tien-do            bảng theo dõi tiến độ
GET  /api/v1/don-hang/tre-han            danh sách trễ hạn + sắp trễ
GET  /api/v1/don-hang/ton-dong           báo cáo tồn đọng (thay BCMH TĐ)

GET  /api/v1/cong-viec                   danh sách lệnh mua hàng
GET  /api/v1/cong-viec/cua-toi           việc của tôi
POST /api/v1/cong-viec/giao              { nguoi_nhan, ids_dong[], han_xu_ly, noi_dung }
POST /api/v1/cong-viec/{id}/nhan
POST /api/v1/cong-viec/{id}/xong         { phan_hoi }
GET  /api/v1/cong-viec/{id}/in           PDF lệnh mua hàng
```

### 3.2 Tạo đơn hàng từ báo giá — đường nhanh nhất (checklist F5: 3 bước)

```python
def tao_tu_bao_gia(id_bao_gia, ho_so):
    """Chọn ĐNVT đã duyệt → chọn NCC/báo giá → bấm tạo PO. Đúng 3 bước."""
    with giao_dich() as conn:
        bg = repo.lay_bao_gia(conn, id_bao_gia)
        if not bg.DUOC_CHON:
            raise LoiNghiepVu('Báo giá chưa được chọn.', 'BAO_GIA_CHUA_CHON')

        id_po = sinh_ma(conn, 'PO', now_vn().year)
        repo.tao_don_hang(conn, id_po,
            id_ncc = bg.ID_NCC, id_bao_gia = id_bao_gia,
            loai = suy_loai(bg), ngay_dat = today(), trang_thai = 'NHAP')

        for i, bgd in enumerate(repo.lay_bao_gia_dong(conn, id_bao_gia), 1):
            dong_dn = repo.lay_dong(conn, bgd.ID_DE_NGHI_DONG)
            repo.tao_don_hang_dong(conn, id_po, i,
                id_de_nghi_dong = bgd.ID_DE_NGHI_DONG,
                id_vat_tu       = dong_dn.ID_VT_DUYET_MUA,      # vật tư THỰC MUA
                ten_hang_chup   = dong_dn.TEN_HANG_CHUP,        # CHỤP — BG-05
                dvt_chup        = dong_dn.DVT_CHUP,
                phan_loai_chup  = dong_dn.PHAN_LOAI_CHUP,       # quyết định ngưỡng duyệt
                so_luong        = bgd.SO_LUONG,
                don_gia_co_so   = bgd.DON_GIA_CO_SO,            # CHỤP
                don_vi_gia      = bgd.DON_VI_GIA,
                trong_luong     = bgd.TRONG_LUONG,
                ky_han_giao     = tinh_ky_han_giao(bgd))
            repo.cap_nhat_dong(conn, bgd.ID_DE_NGHI_DONG, TRANG_THAI_DONG='DA_DAT_HANG')

        cap_nhat_cap_duyet(conn, id_po)
        return id_po
```

### 3.3 Tính tiền và cấp duyệt

```python
def thanh_tien(dong) -> int:
    """DH-01. Công thức thật, khác với checklist E9."""
    if dong.DON_VI_GIA in ('KG', 'MET', 'LIT'):
        if not dong.TRONG_LUONG:
            raise LoiNghiepVu(
                f'Đơn giá tính theo {dong.DON_VI_GIA} nên phải nhập trọng lượng.',
                'THIEU_TRONG_LUONG')
        return round(dong.DON_GIA_CO_SO * dong.TRONG_LUONG)
    return round(dong.DON_GIA_CO_SO * dong.SO_LUONG)

def tong_tien(don_hang) -> int:
    """DH-02: KHÔNG lưu ở bảng đầu. Tính lại mỗi lần đọc."""
    return sum(thanh_tien(d) for d in don_hang.dong)

def gia_tri_truoc_vat(don_hang) -> int:
    return round(tong_tien(don_hang) / (1 + tham_so('VAT_SUAT') / 100))

def cap_duyet_yeu_cau(don_hang) -> str:
    """DH-04: PO trộn nhiều phân loại → lấy mức NGHIÊM NGẶT NHẤT."""
    phan_loai = {d.PHAN_LOAI_CHUP for d in don_hang.dong}
    if 'CHUYEN_DUNG' in phan_loai:
        return 'BAN_LANH_DAO'          # GĐ Điều hành — mọi giá trị
    gia_tri = gia_tri_truoc_vat(don_hang)
    nguong = (tham_so('NGUONG_THONG_DUNG_BTBD')       # 50tr
              if 'THONG_DUNG_BTBD' in phan_loai
              else tham_so('NGUONG_THONG_DUNG_SX'))   # 500tr
    return 'BAN_LANH_DAO' if gia_tri > nguong else 'TBP_MUA_HANG'
```

> **Ghi chú Q13:** đã chốt GĐ Vận hành · GĐ Điều hành · Ban Quản trị dùng chung vai trò `BAN_LANH_DAO`, ai cũng duyệt được mọi mức. Hệ thống vẫn **tính và hiển thị** `CAP_DUYET_YEU_CAU` như một nhãn trên phiếu và trong hàng đợi duyệt. Muốn định tuyến chặt về sau, bật bảng `CAU_HINH_NGUOI_DUYET(PHAN_LOAI, NGUONG_TU, NGUONG_DEN, MA_NHAN_VIEN)` — không phải sửa code.

### 3.4 Theo dõi tiến độ và cảnh báo trễ

```python
def so_ngay_som_tre(dong) -> int:
    """SLA-03. > 0 sớm hạn · = 0 đúng hạn · < 0 trễ hạn.
    KHÔNG dùng cột trạng thái để đo — đó là lỗi của Excel cũ."""
    moc = dong.KY_HAN_YC
    den = dong.ngay_nhan_gan_nhat or today()
    return so_ngay_lam_viec_giua(moc, den)

def quet_canh_bao_tre_han(conn):
    """Chạy mỗi sáng (cron) và mỗi lần mở màn hình theo dõi."""
    for dong in repo.lay_dong_chua_nhan_du(conn):
        n = so_ngay_som_tre(dong)
        if n < 0:
            thong_bao.gui(conn, dong.nguoi_mua_hang, 'TRE_HAN', ...)   # SLA-04
            thong_bao.gui(conn, dong.nguoi_yeu_cau,  'TRE_HAN', ...)
        elif 0 <= n <= 2 and not dong.da_dat_hang:
            thong_bao.gui(conn, dong.nguoi_mua_hang, 'SAP_TRE', ...)   # SLA-05
```

### 3.5 Giao việc (Lệnh mua hàng)

```python
def giao_viec(nguoi_nhan, ids_dong, han_xu_ly, noi_dung, ho_so):
    with giao_dich() as conn:
        id_cv = sinh_ma(conn, 'LMH', now_vn().year)
        repo.tao_cong_viec(conn, id_cv, loai='XU_LY_DE_NGHI',
            nguoi_giao=ho_so.MA_NHAN_VIEN, nguoi_nhan=nguoi_nhan,
            ngay_giao=today(), han_xu_ly=han_xu_ly, noi_dung=noi_dung, trang_thai='MOI')
        for i, id_dong in enumerate(ids_dong, 1):
            repo.tao_cong_viec_dong(conn, id_cv, i, id_dong)
            repo.cap_nhat_dong(conn, id_dong, NGUOI_MUA_HANG=nguoi_nhan)
        thong_bao.gui(conn, nguoi_nhan, 'VIEC_MOI',
            f'Bạn được giao {len(ids_dong)} dòng cần xử lý', 'CONG_VIEC', id_cv)
        return id_cv
```

---

## 4. Thiết kế giao diện

### 4.1 Màn hình THEO DÕI TIẾN ĐỘ — màn hình dùng nhiều nhất

```
┌ Theo dõi mua hàng ────────────────────────────────────────────────────┐
│ [01/08/26][31/08/26] [Bộ phận ▾][NCC ▾][NV mua hàng ▾][Trạng thái ▾]  │
│ [🔍 mã hàng / mã vạch / LSX / số PO…]                                  │
│ ☐ Chỉ trễ hạn  ☐ Chỉ sắp trễ  ☐ Chưa đặt hàng   [Lọc] [⭳ Tải xuống]   │
├────────────────────────────────────────────────────────────────────────┤
│ [Tổng 1.243] [Chưa ĐH 217] [Đang giao 486] [🔴Trễ 47] [🟠Sắp trễ 18]  │
├────────────────────────────────────────────────────────────────────────┤
│  │Tên hàng         │BP │SL│Kỳ hạn│NCC     │Trạng thái  │SN │NV      │  │
│ 🔴│Đá mài Ø500      │CX │ 5│12/08│TUYÊN HƯNG│Đang giao │-15│Như     │  │
│ 🟠│S45C-Phi 35x200  │CX │ 1│29/08│NIPPON   │Đã đặt hàng│ +2│Ms.Ngọc │  │
│ 🟢│Tán inox 304 M8  │KC3│50│05/09│MECSU    │Đã giao    │ +8│Ms.Trâm │  │
│ ⚪│Bạc đạn HK1210   │VH │ 2│10/09│—        │Chưa đặt   │+12│Như     │  │
└────────────────────────────────────────────────────────────────────────┘
```

| Chi tiết | Quy định |
|---|---|
| Đơn vị hiển thị | **Dòng (mã hàng)**, không phải phiếu — đúng mục tiêu "theo từng mã hàng" |
| Cột `SN` | `SO_NGAY_SOM_TRE`, âm là trễ. Canh phải, `tabular-nums`, tô màu |
| Chấm màu | 🔴 trễ · 🟠 sắp trễ (≤2 ngày) · 🟢 đã giao đúng hạn · ⚪ chưa đặt hàng |
| Sắp xếp mặc định | Trễ nhiều nhất lên đầu |
| Bấm dòng | Mở **dải tiến độ** của dòng đó (xem 4.2) |
| Cột giá | Chỉ hiện với vai trò có quyền xem giá |

### 4.2 Dải tiến độ của một dòng — trả lời "hàng của tôi tới đâu rồi"

```
┌ Đá mài từ Ø500 lỗ Ø127 T=80mm ─────────────────────────────────┐
│ DN-2026-000098 · dòng 3 · CX · Mr. Mạnh · LSX MBC0326-017-CKCT │
├─────────────────────────────────────────────────────────────────┤
│  ●───────●───────●───────●───────○───────○                      │
│  Đề nghị Duyệt  Báo giá Đặt hàng Giao   Nhận                    │
│  17/07   18/07  22/07   25/07    dự kiến 10/08                  │
│                                                                  │
│  🔴 Trễ 15 ngày làm việc so với kỳ hạn 12/08                    │
│  NCC TUYÊN HƯNG · PO-2026-000112 · trả lời kỳ hạn mới 28/08     │
├─────────────────────────────────────────────────────────────────┤
│ 💬 Trao đổi (4)                                       [Mở ▾]    │
│    Ms. Như 20/08: NCC báo hàng về cuối tháng, đã giục            │
└─────────────────────────────────────────────────────────────────┘
```

Đây là màn hình thay cho việc trưởng bộ phận nhắn Zalo hỏi *"hàng của tôi tới đâu rồi"*.

### 4.3 Màn hình ĐƠN ĐẶT HÀNG

```
┌ PO-2026-000156 ────────────────── ●CHỜ DUYỆT   [In] [⋯]        │
│ Nhà cung cấp  NIPPON — CTY CP NIPPON SANSO VIỆT NAM            │
│ Địa chỉ       KCN II, TP Đồng Nai      Người nhận  Mr Công      │
│ Ngày đặt      27/08/2026               Kỳ hạn giao 05/09/2026   │
│ Điều kiện TT  Thanh toán 100% theo hoá đơn                      │
├─────────────────────────────────────────────────────────────────┤
│ # │Tên hàng        │ĐVT│ SL│Đơn giá │Theo│T.lượng│  Thành tiền │
│ 1 │S45C-Phi 35x200 │PCS│  1│  28.000│ KG │ 81,00 │   2.268.000 │
│ 2 │Khí Nitơ        │BÌNH│ 4│ 187.000│PCS │   —   │     748.000 │
│                                          Tổng     │   3.016.000 │
│                                          Trước VAT│   2.741.818 │
├─────────────────────────────────────────────────────────────────┤
│ ⓘ Phân loại cao nhất: Thông dụng SX · 2.741.818đ ≤ 500tr        │
│   → Cấp duyệt yêu cầu: Trưởng BP Mua hàng                       │
├─────────────────────────────────────────────────────────────────┤
│ [Lưu nháp]                    [Gửi duyệt]  [Huỷ]                │
└─────────────────────────────────────────────────────────────────┘
```

Nhãn cấp duyệt hiện **rõ ràng ngay trên phiếu**, kể cả khi hệ thống không chặn theo người.

Khi vượt ngưỡng:
```
│ ⚠ Phân loại cao nhất: CHUYÊN DỤNG                               │
│   → Cấp duyệt yêu cầu: BAN LÃNH ĐẠO (GĐ Điều hành)              │
```

### 4.4 Màn hình GIAO VIỆC

```
┌ Giao việc ─────────────────────────────────────────────────────┐
│ Nhân viên          Đang làm   Trễ   Hoàn thành tháng này        │
│ ────────────────────────────────────────────────────────────    │
│ Như                    48       7          182                  │
│ Ms. Ngọc               41       3          164                  │
│ Ms. Trâm               22       1           88                  │
│ Thiên                  15       0           61                  │
├─────────────────────────────────────────────────────────────────┤
│ Dòng chưa phân công (34)                                        │
│ ☑ DN…123-2│S45C-Phi 35x200│CX │12/09│ SẮT THÉP                  │
│ ☑ DN…125-1│SS400P T22*205 │CX │14/09│ SẮT THÉP                  │
│ ☐ DN…131-3│Dao phay D16   │CX │10/09│ DAO CỤ                    │
├─────────────────────────────────────────────────────────────────┤
│ Giao 2 dòng cho [Ms. Ngọc ▾]  hạn [30/08]  [Giao việc]          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Màn hình VIỆC CỦA TÔI

```
┌ Việc của tôi (48) ──────────────────────────────────────────────┐
│ [Cần xử lý (12)] [Đang làm (29)] [Trễ (7)] [Đã xong]            │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 LMH-2026-000089 · 5 dòng · hạn 25/08 · trễ 2 ngày            │
│    Mua vật tư cho lệnh MBC0326-017                              │
│    [Xem chi tiết]  [Đánh dấu xong]                              │
│ 🟢 LMH-2026-000091 · 3 dòng · hạn 30/08                         │
└─────────────────────────────────────────────────────────────────┘
```

Đây là màn hình đầu tiên nhân viên mua hàng mở mỗi sáng. Phải chạy tốt trên điện thoại.

### 4.6 In đơn đặt hàng (mẫu BM05)

- Đầu trang: logo · "ĐƠN ĐẶT HÀNG" · mã tài liệu `QT-MH-01-BM05` · phiên bản · ngày hiệu lực · số trang.
- `Số đơn hàng` · ngày · thông tin NCC (tên đầy đủ, địa chỉ, người nhận, điện thoại).
- Bảng: `STT | TÊN HÀNG VÀ QUY CÁCH | ĐVT | SỐ LƯỢNG | ĐƠN GIÁ | THÀNH TIỀN | KỲ HẠN | GHI CHÚ`.
- Tổng tiền bằng số và **bằng chữ**.
- Ô ký: Người lập · Người kiểm tra · Người phê duyệt.
- **Mã QR** chứa `ID` ở góc phải trên.
- Không in dòng trống, không in `#N/A`.

> Lưu ý: sheet Excel hiện đặt tên `BM06 ĐƠN ĐẶT HÀNG` nhưng mã tài liệu bên trong ghi `QT-MH-01-BM05`. Theo QT-MH-01 thì **BM05 = Đơn đặt hàng**, BM06 = Đánh giá NCC. Dùng **BM05**.

---

## 5. Báo cáo tồn đọng (thay sheet `BCMH TĐ`)

Sheet hiện có **910 dòng**, có dòng trễ **−120 ngày**.

```
GET /api/v1/don-hang/ton-dong?tu_ngay=&den_ngay=&bo_phan=
```
Cột: `Người YC · Ngày YC đặt hàng · LSX · Số phiếu ĐNVT · Tên hàng · ĐVT · SL · Kỳ hạn YC · Số ngày GN · Trả lời kỳ hạn · Mã vạch · Ghi chú · NV mua hàng`

Sắp xếp: trễ nhiều nhất lên đầu. Có nút xuất PDF (thay macro `XuatPDFBCN` của VBA).

---

## 6. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `DH-01` | `DON_VI_GIA ≠ PCS` → bắt buộc `TRONG_LUONG` | `CHAN` |
| `DH-02` | `TONG_TIEN` không lưu, tính lại khi đọc | — |
| `DH-03` | Tiền là số nguyên đồng, làm tròn ở bước cuối | `CHAN` |
| `DH-04` | PO trộn phân loại → lấy mức nghiêm ngặt nhất | — |
| `DH-05` | Hiển thị `CAP_DUYET_YEU_CAU` trên phiếu | — |
| `DH-06` | `DA_DUYET` → khoá sửa trường ảnh hưởng tiền và cam kết | `CHAN` |
| `DH-07` | Cập nhật tiến độ → ghi lịch sử + thông báo BP yêu cầu | — |
| `DH-08` | NCC chưa được phê duyệt | `CANH_BAO` |
| `SLA-04` | Trễ hạn → thông báo NV mua hàng + người yêu cầu | — |
| `SLA-05` | Còn ≤2 ngày mà chưa đặt hàng → cảnh báo sắp trễ | — |
| `SLA-06` | Cấm dùng cột trạng thái để đo đúng hạn | `CHAN` |

---

## 7. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | `28.000 đ/kg × 81 kg` | `THANH_TIEN = 2.268.000` |
| 2 | `46.000 đ/kg × 72 kg` | `3.312.000` |
| 3 | `874.000 đ/kg × 0,64 kg` | `559.360` |
| 4 | `187.000 đ/PCS × 4` | `748.000` |
| 5 | `DON_VI_GIA=KG`, `TRONG_LUONG=NULL` | `422`, `THIEU_TRONG_LUONG` |
| 6 | PO có 1 dòng `CHUYEN_DUNG` + 3 dòng `THONG_DUNG_SX`, tổng 10tr | `CAP_DUYET_YEU_CAU = BAN_LANH_DAO` |
| 7 | PO toàn `THONG_DUNG_SX`, trước VAT 499tr | `TBP_MUA_HANG` |
| 8 | PO toàn `THONG_DUNG_SX`, trước VAT 501tr | `BAN_LANH_DAO` |
| 9 | PO có `THONG_DUNG_BTBD`, trước VAT 51tr | `BAN_LANH_DAO` |
| 10 | Tổng 3.016.000, VAT 10% | `GIA_TRI_TRUOC_VAT = 2.741.818` |
| 11 | Sửa đơn giá sau khi `DA_DUYET` | `422`, `DA_DUYET_KHOA_SUA` |
| 12 | Kỳ hạn 12/08, chưa nhận, hôm nay 02/09 | `SO_NGAY_SOM_TRE` âm, tính theo **ngày làm việc** |
| 13 | Kỳ hạn rơi vào Chủ nhật | Bỏ qua Chủ nhật khi đếm |
| 14 | Dòng trễ hạn | NV mua hàng và người yêu cầu đều nhận thông báo |
| 15 | Bấm "Tạo PO từ báo giá" ba lần | Chỉ tạo một PO |
| 16 | Vai trò `NV_YEU_CAU` gọi `GET /don-hang/{id}` của BP khác | `403` |
| 17 | Vai trò không có quyền xem giá | API không trả `DON_GIA_CO_SO`, `THANH_TIEN` |
| 18 | Giao việc 5 dòng cho Ms. Ngọc | Ms. Ngọc nhận thông báo, 5 dòng gán `NGUOI_MUA_HANG` |
| 19 | In PO có 2 dòng | Chỉ in 2 dòng, có tổng tiền bằng chữ, không `#N/A` |
| 20 | Báo cáo tồn đọng | Sắp xếp trễ nhiều nhất lên đầu |
