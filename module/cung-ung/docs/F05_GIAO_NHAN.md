# F05 — Nhận hàng · Kiểm tra chất lượng đầu vào (IQC) · Hàng không phù hợp

> Thay thế: sheet `QT-KV-01-BM03 PGH NB A4/A5`, cột `SỐ PGH NỘI BỘ`, `NGÀY NHẬP HÀNG`, `SỐ LƯỢNG GIAO` của `THEO DOI MUA HANG`, và sổ `QT-MH-01-BM08` (hiện đang trống).
> **Ranh giới:** hệ Mua hàng **ghi nhận**, **không** ghi sổ kho, **không** tính tồn — hệ Kho vận chưa tồn tại.

---

## 1. Vấn đề lớn nhất phải sửa: giao nhiều lần

Trong Excel, một ô `SỐ PGH NỘI BỘ` đang chứa `12-539/01-022` — hai lần giao nhồi vào một ô. Ghi chú thì chứa `"13/12 về 64 pcs, 10/01 về 36 pcs, đủ"`.

Đây là **lỗi thiết kế kinh điển số 3** trong giáo trình GĐ1: *trường đa giá trị — không lọc được, không nối bảng được*.

**Giải pháp:** một lần giao = **một bản ghi** `NHAN_HANG` với `LAN_GIAO` tăng dần.

```
DON_HANG_DONG (SO_LUONG = 100)
   ├─ NHAN_HANG #1 (13/12) → NHAN_HANG_DONG (SO_LUONG_NHAN = 64)
   └─ NHAN_HANG #2 (10/01) → NHAN_HANG_DONG (SO_LUONG_NHAN = 36)
         SO_LUONG_DA_NHAN = 100 → HOAN_THANH
```

Thực đo: 1,6% ô PGH có dấu `/`, 2,4% dòng có `SL giao < SL đặt`. Không nhiều nhưng **phải mô hình đúng** vì đó là dữ liệu mà báo cáo đúng hạn phụ thuộc vào.

---

## 2. Luồng nghiệp vụ

```
NCC giao hàng tới công ty
        ▼
   Kho vận lập PHIẾU NHẬN HÀNG  ← quét mã vạch hoặc chọn PO
        │  ├─ nhập số lượng thực nhận từng dòng
        │  └─ NH-02: cộng dồn vào SO_LUONG_DA_NHAN
        ▼
   QC kiểm tra đầu vào (IQC)
        │  ├─ ĐẠT               → dòng HOAN_THANH (hoặc GIAO_MOT_PHAN)
        │  ├─ ĐẠT CÓ ĐIỀU KIỆN  → HOAN_THANH kèm ghi chú
        │  └─ KHÔNG ĐẠT         → IQC_KHONG_DAT + lập HÀNG KHÔNG PHÙ HỢP
        ▼
   In PHIẾU YÊU CẦU NHẬP KHO (QT-KV-01-BM03) gửi Kho vận
        ▼
   Bàn giao chứng từ sang Kế toán (F08)
```

---

## 3. Logic backend

### 3.1 Endpoint

```
GET  /api/v1/nhan-hang                     danh sách
GET  /api/v1/nhan-hang/{id}
POST /api/v1/nhan-hang                     { id_don_hang, ngay_nhan, dong[] }
POST /api/v1/nhan-hang/tu-ma-vach          { ma_vach }  → gợi ý PO và dòng
GET  /api/v1/nhan-hang/{id}/in             PDF mẫu QT-KV-01-BM03
GET  /api/v1/don-hang/cho-nhan             PO đang chờ giao

POST /api/v1/iqc                           { id_nhan_hang_dong, ket_luan, so_luong_dat, ... }
GET  /api/v1/iqc                           danh sách kết quả IQC
POST /api/v1/hang-khong-phu-hop            { id_iqc, mo_ta, huong_xu_ly }
GET  /api/v1/hang-khong-phu-hop            sổ theo dõi (thay BM08)
POST /api/v1/hang-khong-phu-hop/{id}/dong  { ket_qua }
```

### 3.2 Ghi nhận nhận hàng

```python
def tao_nhan_hang(du_lieu, ho_so):
    with giao_dich() as conn:
        po = repo.lay_don_hang(conn, du_lieu.id_don_hang)
        if po.TRANG_THAI not in ('DA_DUYET', 'DANG_GIAO', 'GIAO_MOT_PHAN'):
            raise LoiNghiepVu('Đơn hàng chưa được duyệt.', 'PO_CHUA_DUYET')

        lan_giao = repo.dem_lan_giao(conn, du_lieu.id_don_hang) + 1
        id_nh = sinh_ma(conn, 'NH', now_vn().year)
        repo.tao_nhan_hang(conn, id_nh, du_lieu.id_don_hang, po.ID_NCC,
                           du_lieu.ngay_nhan, lan_giao, ho_so.MA_NHAN_VIEN)

        for i, d in enumerate(du_lieu.dong, 1):
            dong_po = repo.lay_don_hang_dong(conn, d.id_don_hang_dong, khoa=True)
            da_nhan = (dong_po.SO_LUONG_DA_NHAN or 0) + d.so_luong_nhan

            # NH-04: cảnh báo giao thừa
            if da_nhan > dong_po.SO_LUONG:
                quy_tac.ap_dung('NH-04',
                    f'Dòng {i}: nhận {da_nhan} vượt số đặt {dong_po.SO_LUONG}. '
                    'Phải ghi rõ lý do trong ghi chú.')
                if not d.ghi_chu:
                    raise ThieuDuLieu('Giao thừa phải có ghi chú.', 'THIEU_GHI_CHU')

            # SLA-03: tính sớm/trễ theo NGÀY LÀM VIỆC
            dong_dn = repo.lay_dong(conn, dong_po.ID_DE_NGHI_DONG)
            som_tre = so_ngay_lam_viec_giua(dong_dn.KY_HAN_YC, du_lieu.ngay_nhan)

            repo.tao_nhan_hang_dong(conn, id_nh, i,
                id_don_hang_dong = d.id_don_hang_dong,
                id_vat_tu        = dong_po.ID_VAT_TU,
                ten_hang_chup    = dong_po.TEN_HANG_CHUP,
                dvt_chup         = dong_po.DVT_CHUP,
                so_luong_nhan    = d.so_luong_nhan,
                so_ngay_som_tre  = som_tre,
                ghi_chu          = d.ghi_chu)

            repo.cap_nhat_don_hang_dong(conn, d.id_don_hang_dong,
                SO_LUONG_DA_NHAN = da_nhan,
                TRANG_THAI_DONG  = 'HOAN_THANH' if da_nhan >= dong_po.SO_LUONG
                                   else 'GIAO_MOT_PHAN')          # NH-03
            repo.cap_nhat_dong(conn, dong_po.ID_DE_NGHI_DONG,
                TRANG_THAI_DONG  = 'HOAN_THANH' if da_nhan >= dong_po.SO_LUONG
                                   else 'GIAO_MOT_PHAN')
            thong_bao.gui(conn, dong_dn.nguoi_yeu_cau, 'DA_NHAN_HANG', ...)

        cap_nhat_trang_thai_po(conn, du_lieu.id_don_hang)
        return id_nh
```

### 3.3 Ghi kết quả IQC

```python
def ghi_iqc(du_lieu, ho_so):
    with giao_dich() as conn:
        kiem_quyen(ho_so, 'giao_nhan', 'duyet')          # chỉ vai trò QC
        nhd = repo.lay_nhan_hang_dong(conn, du_lieu.id_nhan_hang_dong, khoa=True)

        if du_lieu.so_luong_dat + du_lieu.so_luong_khong_dat != du_lieu.so_luong_kiem:
            raise LoiNghiepVu('Số đạt + số không đạt phải bằng số kiểm.', 'SO_LIEU_KHONG_KHOP')

        id_iqc = sinh_ma(conn, 'IQC', now_vn().year)
        repo.tao_iqc(conn, id_iqc, **du_lieu, nguoi_kiem=ho_so.MA_NHAN_VIEN)

        if du_lieu.ket_luan == 'KHONG_DAT':               # IQC-01
            repo.cap_nhat_nhan_hang_dong(conn, nhd.ID, TRANG_THAI='IQC_KHONG_DAT')
            quy_tac.ap_dung('IQC-01',
                'Hàng không đạt IQC — không nên nhập kho chính thức. '
                'Lập biên bản xử lý hàng không phù hợp.')
            thong_bao.gui_cho_vai_tro(conn, 'NV_MUA_HANG', 'IQC_KHONG_DAT', ...)
            thong_bao.gui(conn, nguoi_yeu_cau_cua(nhd), 'IQC_KHONG_DAT', ...)
        return id_iqc
```

> **IQC-03:** hệ Mua hàng **ghi nhận** kết quả, **không** ghi sổ kho, **không** tính tồn. Việc "chặn nhập kho" là cảnh báo nghiệp vụ, việc chặn thật thuộc hệ Kho vận sau này.

### 3.4 Số liệu tự động cho đánh giá NCC (IQC-02)

```sql
-- KHÔNG nhập tay. Tính trực tiếp từ giao dịch gốc (Hiến chương 1.6)
SELECT
  100.0 * SUM(iqc.SO_LUONG_DAT) / NULLIF(SUM(iqc.SO_LUONG_KIEM), 0)  AS ty_le_iqc_dat,
  100.0 * count(*) FILTER (WHERE nhd.SO_NGAY_SOM_TRE >= 0)
        / NULLIF(count(*), 0)                                        AS ty_le_dung_han,
  count(DISTINCT hkph.ID)                                            AS so_lan_khong_phu_hop
FROM NHAN_HANG nh
JOIN NHAN_HANG_DONG nhd ON nhd.ID_NHAN_HANG = nh.ID
LEFT JOIN KET_QUA_IQC iqc ON iqc.ID_NHAN_HANG_DONG = nhd.ID
LEFT JOIN HANG_KHONG_PHU_HOP hkph ON hkph.ID_KET_QUA_IQC = iqc.ID
WHERE nh.ID_NCC = %s AND nh.NGAY_NHAN BETWEEN %s AND %s;
```

---

## 4. Thiết kế giao diện

### 4.1 Màn hình NHẬN HÀNG — dùng ở khu vực giao nhận, tối ưu cho tablet

```
┌─────────────────────────────────────────────┐
│ ←  Nhận hàng                                │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │  📷  QUÉT MÃ VẠCH                     │  │  ← nút 64px
│  └───────────────────────────────────────┘  │
│  hoặc [🔍 tìm số PO / tên NCC…           ]  │
├─────────────────────────────────────────────┤
│  PO-2026-000156 · NIPPON · đặt 27/08        │
│  Kỳ hạn giao 05/09    Lần giao thứ 2        │
├─────────────────────────────────────────────┤
│  S45C-Phi 35x200                            │
│  Đặt 100  ·  đã nhận 64  ·  còn 36          │
│  Nhận lần này  ┌──────┐                     │
│                │  36  │  PCS                │
│                └──────┘                     │
│  [ghi chú…                               ]  │
│  ─────────────────────────────────────────  │
│  Khí Nitơ                                   │
│  Đặt 4 · đã nhận 0 · còn 4                  │
│  Nhận lần này  [   4  ] BÌNH                │
├─────────────────────────────────────────────┤
│  Ngày nhận  [ 10/09/2026            📅]     │
│  📎 Ảnh hàng / phiếu giao          (0)      │
├─────────────────────────────────────────────┤
│ ┃      LƯU PHIẾU NHẬN HÀNG           ┃      │
└─────────────────────────────────────────────┘
```

| Yêu cầu môi trường xưởng | Áp dụng |
|---|---|
| Vùng bấm ≥ 44 px | Nút quét 64 px, ô nhập số cao 48 px |
| Chữ ≥ 16 px | Toàn màn hình 16–18 px |
| Ưu tiên quét mã vạch | Nút quét là hành động đầu tiên, to nhất |
| Tối đa 3 bước | Quét → nhập số → lưu |
| Tay bẩn / đeo găng | Không kéo-thả, khoảng cách nút ≥ 8 px |

Số "còn lại" điền sẵn vào ô nhận — trường hợp phổ biến nhất là nhận đủ phần còn lại.

### 4.2 Màn hình IQC

```
┌ Kiểm tra chất lượng đầu vào ────────────────────────────────┐
│ [Chờ kiểm (14)] [Đã kiểm hôm nay (8)] [Không đạt (2)]        │
├──────────────────────────────────────────────────────────────┤
│ NH-2026-000341 · NIPPON · nhận 10/09                          │
│ S45C-Phi 35x200 · 36 PCS · LSX MBC0326-017                    │
│                                                               │
│ Số lượng kiểm  [ 36 ]                                         │
│ ┌───────────────┬───────────────┐                            │
│ │ Đạt    [ 34 ] │ Không đạt [2] │                            │
│ └───────────────┴───────────────┘                            │
│ Kết luận  ⦿ Đạt  ○ Đạt có điều kiện  ○ Không đạt             │
│ Lỗi phát hiện  [                                          ]   │
│ 📎 Ảnh lỗi (0)                                                │
│                                        [Lưu kết quả IQC]      │
└──────────────────────────────────────────────────────────────┘
```

Khi chọn "Không đạt", màn hình **mở rộng thêm** phần lập biên bản hàng không phù hợp ngay tại chỗ — không bắt người dùng đi sang màn hình khác:

```
│ ⚠ Lập biên bản hàng không phù hợp                            │
│ Mô tả *   [Bề mặt có vết xước sâu, không đạt Ra 1.6        ] │
│ Hướng xử lý  ⦿ Đổi trả  ○ Khiếu nại NCC  ○ Chấp nhận có ĐK   │
│ Người giám sát [Mr. Vỹ ▾]                                    │
```

### 4.3 Sổ theo dõi tình trạng NCC (thay `QT-MH-01-BM08` đang trống)

```
┌ Hàng không phù hợp ──────────────────────────────────────────┐
│ [01/01/26][31/12/26] [NCC ▾] [Trạng thái ▾]   [⭳ Tải xuống]  │
├──────────────────────────────────────────────────────────────┤
│ Ngày nhận│NCC       │Tên SP        │Vấn đề      │Xử lý│KQ    │
│ 10/09    │NIPPON    │S45C-Phi 35   │Xước sâu    │Đổi  │Đạt   │
│ 08/09    │TUYÊN HƯNG│Đá mài Ø500   │Sai kích thước│Trả│Chưa  │
└──────────────────────────────────────────────────────────────┘
```
Đúng cột của BM08: `Ngày nhận hàng · Nhà cung cấp · Tên sản phẩm · Mã sản phẩm · Vấn đề phát sinh · Hướng xử lý · Kết quả Đạt/Không đạt · Người giám sát · Ghi chú`.

### 4.4 In phiếu yêu cầu nhập kho (mẫu QT-KV-01-BM03)

Có hai khổ trong Excel: **A4** (nhiều dòng) và **A5** (ít dòng). Hệ mới in A4, tự co theo số dòng.

Cột: `STT | NGƯỜI YÊU CẦU | SỐ PHIẾU ĐỀ NGHỊ VẬT TƯ | MÃ VẬT TƯ | TÊN HÀNG | ĐƠN VỊ TÍNH | SỐ LƯỢNG ĐẶT HÀNG | SL YC NHẬP KHO | MÃ LỆNH SẢN XUẤT | MÃ VẠCH | GHI CHÚ`

Đầu phiếu: `NHÀ CUNG CẤP` · `NGÀY` · `SỐ PHIẾU` · `BỘ PHẬN: THU MUA`.

> Cột `MÃ VẬT TƯ` trong file Excel hiện **để trống**. Trong hệ mới cột này lấy từ `ID_VT_DUYET_MUA` → `VAT_TU.MA_VAT_TU`. Ở V1 nếu chưa có mã thì in tên hàng chuẩn kèm nhãn *"chưa cấp mã"*.

---

## 5. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `NH-01` | Một lần giao = một bản ghi. Cấm nhồi nhiều số phiếu vào một ô | `CHAN` |
| `NH-02` | `SO_LUONG_DA_NHAN` = tổng các lần giao | — |
| `NH-03` | `SO_LUONG_DA_NHAN < SO_LUONG` → `GIAO_MOT_PHAN` | — |
| `NH-04` | Giao thừa → cảnh báo, bắt buộc ghi chú | `CANH_BAO` |
| `NH-05` | Số thực nhập khớp tuyệt đối giữa PO và phiếu nhập kho | `CANH_BAO` |
| `IQC-01` | Không đạt → `IQC_KHONG_DAT` + lập biên bản + cảnh báo | `CANH_BAO` |
| `IQC-02` | Số liệu IQC tự cấp cho đánh giá NCC, không nhập tay | — |
| `IQC-03` | Chỉ ghi nhận, không ghi sổ kho, không tính tồn | `CHAN` |
| `SLA-03` | `SO_NGAY_SOM_TRE` tính theo **ngày làm việc** | `CHAN` |

---

## 6. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Đặt 100, nhận lần 1 = 64 | `GIAO_MOT_PHAN`, `SO_LUONG_DA_NHAN = 64` |
| 2 | Nhận tiếp 36 | `HOAN_THANH`, `SO_LUONG_DA_NHAN = 100`, **2 bản ghi** `NHAN_HANG` |
| 3 | Nhận 110/100, không ghi chú | `400`, `THIEU_GHI_CHU` |
| 4 | Nhận 110/100, có ghi chú | Lưu được, có cờ cảnh báo `NH-04` |
| 5 | Kỳ hạn 05/09, nhận 10/09 (có 1 Chủ nhật) | `SO_NGAY_SOM_TRE = -4` (không phải −5) |
| 6 | Kỳ hạn 12/09, nhận 05/09 | `SO_NGAY_SOM_TRE > 0` |
| 7 | IQC: kiểm 36, đạt 34, không đạt 3 | `422`, `SO_LIEU_KHONG_KHOP` |
| 8 | IQC kết luận `KHONG_DAT` | Dòng sang `IQC_KHONG_DAT`, Mua hàng và người YC nhận thông báo |
| 9 | Vai trò `NV_MUA_HANG` gọi `POST /iqc` | `403` — chỉ QC được ghi IQC |
| 10 | Tính `TY_LE_IQC_DAT` cho NCC | Đúng bằng `SUM(đạt)/SUM(kiểm)` từ giao dịch gốc |
| 11 | Nhận hàng cho PO chưa duyệt | `422`, `PO_CHUA_DUYET` |
| 12 | Bấm lưu phiếu nhận hàng ba lần | Chỉ một phiếu được tạo |
| 13 | Quét mã vạch không có trong PO nào | Báo lỗi rõ ràng, không sập |
| 14 | Màn hình nhận hàng ở 768 px (tablet) | Không cuộn ngang, nút ≥ 44 px |
