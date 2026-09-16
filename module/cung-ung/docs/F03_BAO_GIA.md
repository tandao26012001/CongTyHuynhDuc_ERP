# F03 — Yêu cầu báo giá & So sánh báo giá

> Thay thế: sheet `QT-MH-01-BM04.` và việc lấy/so báo giá thủ công qua Zalo, email, điện thoại.
> Đây là **điểm nghẽn thời gian số 2** theo checklist B13: *"liên hệ nhiều NCC để lấy/so sánh báo giá thủ công"*.

---

## 1. Mục đích và phạm vi

| | |
|---|---|
| Ai dùng | Nhân viên Mua hàng (4 người) · Trưởng BP Mua hàng duyệt chọn |
| Bảng | `YEU_CAU_BAO_GIA` · `YCBG_DONG` · `BAO_GIA` · `BAO_GIA_DONG` |
| Quy tắc | `BG-01` … `BG-05` |
| Đầu vào | Dòng đề nghị đã `DA_DUYET` |
| Đầu ra | Một báo giá được chọn → chuyển sang F04 lập đơn hàng |

---

## 2. Luồng nghiệp vụ

```
Dòng đề nghị DA_DUYET (nhiều phiếu, nhiều bộ phận)
        │
        ▼  Mua hàng gom dòng theo nhà cung cấp dự kiến
   Tạo YÊU CẦU BÁO GIÁ  (mỗi NCC một phiếu)
        │  ├─ in PDF / xuất file gửi NCC
        │  └─ đặt HAN_TRA_LOI
        ▼
   NCC trả lời → Mua hàng NHẬP BÁO GIÁ vào hệ thống
        │  (hoặc nhập lô từ file Excel NCC gửi)
        ▼
   MÀN HÌNH SO SÁNH  — đặt các báo giá cạnh nhau theo từng dòng
        │  ├─ BG-01: cảnh báo nếu <2 báo giá và không có miễn trừ
        │  └─ BG-03: chọn báo giá không rẻ nhất → bắt buộc nhập lý do
        ▼
   [Chọn báo giá] → Trưởng BP duyệt → sang F04 tạo đơn hàng
```

---

## 3. Logic backend

### 3.1 Endpoint

```
GET  /api/v1/de-nghi-dong/cho-bao-gia       dòng đã duyệt, chưa có báo giá
POST /api/v1/yeu-cau-bao-gia                { id_ncc, ids_dong[], han_tra_loi }
GET  /api/v1/yeu-cau-bao-gia                danh sách
GET  /api/v1/yeu-cau-bao-gia/{id}/in        PDF theo mẫu BM04
POST /api/v1/bao-gia                        nhập báo giá NCC trả về
POST /api/v1/bao-gia/nhap-lo                nhập lô từ Excel NCC gửi
GET  /api/v1/bao-gia/so-sanh?ids_dong=      ma trận so sánh
POST /api/v1/bao-gia/{id}/chon              { ly_do_chon, phien_ban }
POST /api/v1/bao-gia/{id}/mien-tru          { ly_do }   bật cờ miễn trừ 2 báo giá
GET  /api/v1/bao-gia/lich-su-gia?id_vat_tu= lịch sử giá của một vật tư
```

### 3.2 Tạo yêu cầu báo giá

```python
def tao_yeu_cau_bao_gia(id_ncc, ids_dong, han_tra_loi, ho_so):
    with giao_dich() as conn:
        ncc = repo.lay_ncc(conn, id_ncc)
        # NCC-06: cảnh báo nếu NCC tạm ngưng hoặc loại bỏ
        if ncc.TRANG_THAI in ('TAM_NGUNG', 'LOAI_BO'):
            quy_tac.ap_dung('NCC-06',
                f'Nhà cung cấp {ncc.MA_NCC} đang ở trạng thái {ncc.TRANG_THAI}.')
        # DH-08: cảnh báo nếu chưa được phê duyệt (BM03 hiện đang trống)
        if not ncc.DA_PHE_DUYET:
            quy_tac.ap_dung('DH-08',
                f'{ncc.MA_NCC} chưa có trong danh mục nhà cung cấp được phê duyệt.')

        id_ycbg = sinh_ma(conn, 'YCBG', now_vn().year)
        repo.tao_ycbg(conn, id_ycbg, id_ncc, han_tra_loi, ho_so.MA_NHAN_VIEN)
        for i, id_dong in enumerate(ids_dong, 1):
            dong = repo.lay_dong(conn, id_dong)
            if dong.TRANG_THAI_DONG != 'DA_DUYET':
                raise LoiNghiepVu(f'Dòng {id_dong} chưa được duyệt.', 'DONG_CHUA_DUYET')
            # BG-04: chưa xác nhận kỹ thuật
            if dong.CAN_XAC_NHAN_KT and not dong.DA_XAC_NHAN_KT:
                quy_tac.ap_dung('BG-04', f'Dòng {i} chưa được Kỹ thuật xác nhận thông số.')
            repo.tao_ycbg_dong(conn, id_ycbg, i, id_dong, chup_tu(dong))
            repo.cap_nhat_dong(conn, id_dong, TRANG_THAI_DONG='DANG_BAO_GIA')
        return id_ycbg
```

### 3.3 Nhập báo giá

```python
def nhap_bao_gia(du_lieu, ho_so):
    with giao_dich() as conn:
        id_bg = sinh_ma(conn, 'BG', now_vn().year)
        repo.tao_bao_gia(conn, id_bg, du_lieu.id_ycbg, du_lieu.id_ncc,
                         du_lieu.ngay_bao_gia, du_lieu.hieu_luc_den,
                         du_lieu.dieu_kien_thanh_toan, du_lieu.thoi_gian_giao)
        for i, d in enumerate(du_lieu.dong, 1):
            # DH-01: giá theo trọng lượng phải có trọng lượng
            if d.don_vi_gia in ('KG', 'MET', 'LIT') and not d.trong_luong:
                raise LoiNghiepVu(
                    f'Dòng {i}: đơn giá tính theo {d.don_vi_gia} nên phải nhập trọng lượng.',
                    'THIEU_TRONG_LUONG')
            repo.tao_bao_gia_dong(conn, id_bg, i, d)
        return id_bg
```

### 3.4 Ma trận so sánh

```python
def so_sanh(ids_dong) -> dict:
    """Trả về ma trận: mỗi dòng đề nghị × mỗi nhà cung cấp."""
    bao_gia = repo.lay_bao_gia_cua_cac_dong(ids_dong)
    ma_tran = {}
    for id_dong in ids_dong:
        cot = []
        for bg in bao_gia:
            bgd = bg.dong_cua(id_dong)
            if not bgd: cot.append(None); continue
            cot.append({
                'id_bao_gia': bg.ID, 'ncc': bg.ID_NCC, 'ma_ncc': bg.ma_ncc,
                'don_gia_co_so': bgd.DON_GIA_CO_SO, 'don_vi_gia': bgd.DON_VI_GIA,
                'trong_luong': bgd.TRONG_LUONG,
                'thanh_tien': tinh_tien.thanh_tien(bgd),          # công thức chuẩn
                'thoi_gian_giao': bgd.THOI_GIAN_GIAO,
                'dieu_kien_thanh_toan': bg.DIEU_KIEN_THANH_TOAN,
                'xep_loai_ncc': bg.xep_loai_ncc,                  # từ DANH_GIA_NCC
                'ty_le_dung_han': bg.ty_le_dung_han,              # lịch sử thật
            })
        # đánh dấu rẻ nhất và nhanh nhất
        hop_le = [c for c in cot if c]
        if hop_le:
            re_nhat   = min(hop_le, key=lambda c: c['thanh_tien'])
            nhanh_nhat = min(hop_le, key=lambda c: c['thoi_gian_giao'] or 999)
            re_nhat['la_re_nhat'] = True
            nhanh_nhat['la_nhanh_nhat'] = True
        ma_tran[id_dong] = cot
    return ma_tran
```

### 3.5 Chọn báo giá

```python
def chon_bao_gia(id_bg, ly_do_chon, ho_so, phien_ban):
    with giao_dich() as conn:
        bg = repo.lay_bao_gia(conn, id_bg, khoa=True); kiem_phien_ban(bg, phien_ban)
        ids_dong = repo.lay_ids_dong_cua_bao_gia(conn, id_bg)

        # BG-01: tối thiểu 2 báo giá cho cùng mặt hàng
        for id_dong in ids_dong:
            so_bg = repo.dem_bao_gia_cua_dong(conn, id_dong)
            if so_bg < tham_so('SO_BAO_GIA_TOI_THIEU') and not bg.MIEN_TRU_2_BAO_GIA:
                quy_tac.ap_dung('BG-01',
                    f'Chỉ có {so_bg} báo giá cho dòng này. Cần tối thiểu 2, '
                    'hoặc bật miễn trừ kèm lý do (độc quyền / đã có hợp đồng / được chỉ định).')

        # BG-03: không chọn rẻ nhất thì bắt buộc lý do
        if not la_re_nhat(conn, id_bg) and not (ly_do_chon or '').strip():
            raise ThieuDuLieu(
                'Báo giá này không phải rẻ nhất. Phải nhập lý do chọn.', 'THIEU_LY_DO_CHON')

        repo.bo_chon_cac_bao_gia_khac(conn, ids_dong)
        repo.cap_nhat(conn, id_bg, DUOC_CHON=True, LY_DO_CHON=ly_do_chon)
        nhat_ky.ghi(conn, 'BAO_GIA', id_bg, 'DUYET', nguoi=ho_so.MA_NHAN_VIEN)
```

### 3.6 Lịch sử giá (checklist D13)

```sql
-- "Có cần tra cứu được giá của một ngày bất kỳ trong quá khứ không?" → Có
SELECT bg.NGAY_BAO_GIA, ncc.MA_NCC, bgd.DON_GIA_CO_SO, bgd.DON_VI_GIA, bg.DUOC_CHON
FROM BAO_GIA_DONG bgd
JOIN BAO_GIA bg   ON bg.ID = bgd.ID_BAO_GIA
JOIN NHA_CUNG_CAP ncc ON ncc.ID = bg.ID_NCC
WHERE bgd.ID_VAT_TU = %s
ORDER BY bg.NGAY_BAO_GIA DESC;
```
Đây là thứ Excel hiện **không có** — mỗi lần mua là một dòng độc lập, không tra được giá lịch sử.

---

## 4. Thiết kế giao diện

### 4.1 Màn hình "Dòng chờ báo giá" — gom việc

```
┌ Chờ báo giá (127 dòng) ─────────────────────────────────────────┐
│ [Bộ phận ▾] [Chủng loại ▾] [Ưu tiên ▾] [🔍 tên hàng…]           │
│ Nhóm theo: ⦿ Chủng loại  ○ Nhà cung cấp gần nhất  ○ Bộ phận      │
├──────────────────────────────────────────────────────────────────┤
│ ▾ SẮT THÉP (34 dòng)                        [Tạo YC báo giá ▾]   │
│   ☑ DN…123-2 │S45C-Phi 35x200 │PCS│ 1│12/09│ NCC gần nhất: NIPPON│
│   ☑ DN…125-1 │SS400P T22*205  │PCS│ 4│14/09│ NCC gần nhất: FUJI  │
│   ☐ DN…131-3 │Ống sắt đúc SGP65│PCS│ 4│10/09│ ⚠ trễ 3 ngày       │
│ ▾ DAO CỤ (18 dòng)                                               │
│   …                                                              │
├──────────────────────────────────────────────────────────────────┤
│ Đã chọn 12 dòng          [Tạo yêu cầu báo giá cho NCC… ▾]        │
└──────────────────────────────────────────────────────────────────┘
```

- Nhóm theo chủng loại giúp gom dòng gửi cùng một NCC — đây là cách nhân viên đang làm thủ công.
- Cột "NCC gần nhất" lấy từ lịch sử đơn hàng của chính vật tư đó → giảm thời gian tìm NCC.
- Chọn nhiều dòng → tạo một yêu cầu báo giá cho một NCC; lặp lại cho NCC thứ hai.

### 4.2 Màn hình SO SÁNH BÁO GIÁ — màn hình quan trọng nhất của F03

```
┌ So sánh báo giá — 3 dòng, 3 nhà cung cấp ───────────────────────────────┐
│                    │ NIPPON       │ FUJI         │ ĐÀI NAM              │
│                    │ ★A · 94% ĐH  │ ★B · 78% ĐH  │ ★B · 81% ĐH          │
│                    │ TT 100% HĐ   │ Công nợ 30N  │ Công nợ 15N          │
├────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ S45C-Phi 35x200    │  2.268.000 🟢│  2.410.000   │  2.380.000           │
│ 1 PCS · KH 12/09   │  giao 5 ngày │  giao 3 ngày⚡│  giao 7 ngày        │
├────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ SS400P T22*205*205 │  4.120.000   │  3.980.000 🟢│      —               │
│ 4 PCS · KH 14/09   │  giao 6 ngày │  giao 4 ngày⚡│                      │
├────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ Ống sắt SGP65      │      —       │  1.240.000 🟢│  1.310.000           │
│ 4 PCS · KH 10/09   │              │  giao 5 ngày │  giao 4 ngày ⚡      │
├────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ TỔNG               │  6.388.000   │  7.630.000   │  3.690.000           │
│                    │ [Chọn]       │ [Chọn]       │ [Chọn]               │
└──────────────────────────────────────────────────────────────────────────┘
  🟢 rẻ nhất   ⚡ giao nhanh nhất   ★ xếp loại NCC   %ĐH tỷ lệ đúng hạn thật
```

**Bốn quyết định thiết kế:**
1. **So sánh không chỉ giá** — bốn thông tin cùng lúc: giá · thời gian giao · điều kiện thanh toán · lịch sử đúng hạn thật (`BG-02`).
2. Xếp loại NCC và % đúng hạn **lấy tự động** từ dữ liệu giao dịch, không nhập tay.
3. Chọn được **theo từng dòng**, không bắt chọn cả bảng một NCC.
4. Ô trống (`—`) là NCC không báo giá cho dòng đó — hiện rõ để biết còn thiếu.

**Hộp thoại khi chọn báo giá không rẻ nhất:**
```
┌ Chọn FUJI cho dòng "S45C-Phi 35x200" ─────────────┐
│ ⚠ Báo giá này cao hơn NIPPON 142.000đ (+6,3%)      │
│                                                     │
│ Lý do chọn *                                        │
│ [ Giao 3 ngày, kịp lệnh MBC0326-018 ưu tiên 2    ] │
│                                                     │
│                          [Huỷ]  [Xác nhận chọn]    │
└─────────────────────────────────────────────────────┘
```

**Cảnh báo dưới 2 báo giá:**
```
⚠ Dòng "Ống sắt SGP65" mới có 2 báo giá — đủ. 
⚠ Dòng "Khí Nitơ" chỉ có 1 báo giá.  [Bật miễn trừ ▾]
     ○ Nhà cung cấp độc quyền
     ○ Đã có hợp đồng khung
     ○ Được chỉ định bởi khách hàng / Ban lãnh đạo
     Lý do chi tiết [                                     ]
```

### 4.3 Màn hình nhập báo giá

```
┌ Nhập báo giá — NIPPON ─────────────────────────────────────────┐
│ Theo yêu cầu  YCBG-2026-000078                                  │
│ Ngày báo giá [22/08/2026]   Hiệu lực đến [22/09/2026]           │
│ Điều kiện TT [Thanh toán 100% theo hoá đơn ▾]                   │
│ Thời gian giao chung [5] ngày làm việc                          │
├─────────────────────────────────────────────────────────────────┤
│ # │Tên hàng        │ SL │Đơn giá   │Theo  │Trọng lượng│Thành tiền│
│ 1 │S45C-Phi 35x200 │  1 │  28.000  │KG  ▾ │   81,00   │2.268.000 │
│ 2 │SS400P T22*205  │  4 │ 130.000  │PCS ▾ │     —     │  520.000 │
│                                              Tổng: 2.788.000đ   │
├─────────────────────────────────────────────────────────────────┤
│ 📎 bao-gia-nippon-2208.pdf                        [⭱ Nhập từ Excel]│
│                                        [Lưu nháp]  [Lưu báo giá] │
└─────────────────────────────────────────────────────────────────┘
```

- Ô "Theo" (`DON_VI_GIA`) đổi thì cột "Trọng lượng" bật/tắt tương ứng. Chọn `KG` mà bỏ trống trọng lượng → chặn.
- Thành tiền tính ngay khi gõ, dùng đúng công thức `DH-01`.
- Nút "Nhập từ Excel" cho file NCC gửi — dùng chung cơ chế nhập lô của F10.
- Đính kèm file báo giá gốc để đối chiếu về sau.

### 4.4 In yêu cầu báo giá (mẫu BM04)

Đầu trang: logo · "YÊU CẦU BÁO GIÁ" · mã tài liệu `QT-MH-01-BM04` · phiên bản · ngày hiệu lực.
Thân: `SỐ YC BG` · ngày · thông tin NCC · bảng `STT | TÊN HÀNG & QUY CÁCH | ĐVT | SỐ LƯỢNG | KỲ HẠN YÊU CẦU | GHI CHÚ`.
**Không in dòng trống, không in `#N/A`** — lỗi hiện tại của sheet Excel.

---

## 5. Quy tắc áp dụng

| Mã | Nội dung | Chế độ mặc định |
|---|---|---|
| `BG-01` | Tối thiểu 2 báo giá, trừ khi bật miễn trừ kèm lý do | `CANH_BAO` |
| `BG-02` | So sánh trên 4 chiều: giá · chất lượng/chứng chỉ · thời gian giao · điều kiện thanh toán | — |
| `BG-03` | Chọn báo giá không rẻ nhất → bắt buộc `LY_DO_CHON` | `CHAN` |
| `BG-04` | Chưa xác nhận kỹ thuật → không cho sang bước báo giá | `CANH_BAO` |
| `BG-05` | Đơn giá **chụp** vào dòng chứng từ tại thời điểm lập | `CHAN` |
| `DH-01` | `DON_VI_GIA ≠ PCS` → bắt buộc `TRONG_LUONG` | `CHAN` |
| `DH-08` | NCC chưa được phê duyệt | `CANH_BAO` |
| `NCC-06` | NCC `TAM_NGUNG` / `LOAI_BO` | `CANH_BAO` |

---

## 6. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tạo YCBG cho dòng chưa duyệt | `422`, `DONG_CHUA_DUYET` |
| 2 | Nhập báo giá `DON_VI_GIA=KG`, bỏ trống trọng lượng | `422`, `THIEU_TRONG_LUONG` |
| 3 | Nhập `28.000 đ/kg × 81 kg` | `THANH_TIEN = 2.268.000` |
| 4 | Nhập `130.000 đ/PCS × 4` | `THANH_TIEN = 520.000` |
| 5 | Chọn báo giá khi chỉ có 1 báo giá, chế độ `CANH_BAO` | Lưu được, có cờ cảnh báo `BG-01` |
| 6 | Đổi chế độ sang `CHAN`, chọn lại | `422` |
| 7 | Bật miễn trừ kèm lý do, chọn lại | Lưu được, không cảnh báo |
| 8 | Chọn báo giá không rẻ nhất, không nhập lý do | `400`, `THIEU_LY_DO_CHON` |
| 9 | Chọn báo giá B sau khi đã chọn A | A tự bỏ chọn, chỉ một báo giá `DUOC_CHON` |
| 10 | Tra lịch sử giá một vật tư | Trả về danh sách theo thời gian, có đánh dấu báo giá đã chọn |
| 11 | Vai trò `NV_YEU_CAU` gọi `GET /bao-gia` | `403` |
| 12 | Tạo YCBG cho NCC `LOAI_BO` | Cảnh báo `NCC-06`, vẫn tạo được |
| 13 | Hai người cùng chọn hai báo giá khác nhau | Người thứ hai nhận `409` |
| 14 | In YCBG có 3 dòng, mẫu 10 dòng | Chỉ in 3 dòng, không có `#N/A` |
