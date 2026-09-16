# F02 — Xác nhận kỹ thuật · Đổi vật liệu · Yêu cầu huỷ · Yêu cầu cấp mã

> Thay thế: 2 sheet `XÁC NHẬN THÔNG TIN` và `XÁC NHẬN THÔNG TIN NHƯ` của file Excel.
> Đây là mắt xích đang làm đơn hàng **đứng lâu nhất** — trong Excel nó chỉ là một cột `YÊU CẦU XÁC NHẬN` với hai loại giá trị lẫn nhau.

---

## 1. Bốn luồng riêng biệt

Excel gộp chung; hệ mới **tách bốn**:

| Luồng | Bảng | Ai yêu cầu | Ai duyệt |
|---|---|---|---|
| **Xác nhận kỹ thuật** | cờ `CAN_XAC_NHAN_KT` trên `DE_NGHI_DONG` | Mua hàng | Kỹ thuật |
| **Đổi vật liệu** | `DOI_VAT_LIEU` | Mua hàng / BP yêu cầu | Kỹ thuật (+ BP yêu cầu xác nhận) |
| **Yêu cầu huỷ dòng** | `YEU_CAU_HUY` | BP yêu cầu / Mua hàng | Trưởng BP Mua hàng |
| **Yêu cầu cấp mã vật tư** | `YEU_CAU_CAP_MA` | Mua hàng / BP yêu cầu | **Kho vận** |

---

## 2. Đổi vật liệu — thiết kế theo đúng yêu cầu đã chốt

### 2.1 Vì sao không sửa thẳng lên mã vật tư gốc

Yêu cầu của anh Long:

> *Khi thay đổi đảm bảo cập nhật theo đúng tên hàng mới và keep track về tên hàng mặc định. BP Mua hàng cần thông tin để biết đề nghị gốc là gì, đổi qua cái gì, phê duyệt mua cái gì. Kho vận không quan tâm đề nghị gốc, chỉ muốn biết mua về cái gì và nhập kho cái gì. Nếu thể hiện nội dung điều chỉnh lên mã vật tư gốc — sẽ sinh ra mã khác vì tên quản lý độc nhất. Không đồng bộ với tài sản trong kho.*

**Giải pháp:** việc đổi vật liệu là **sự kiện trên chứng từ**, không phải thay đổi trong danh mục.

```
DE_NGHI_DONG
  ID_VT_DE_NGHI    ──►  vật tư BP yêu cầu ban đầu   (Mua hàng nhìn)
  ID_VT_DUYET_MUA  ──►  vật tư thực mua sau khi đổi  (Kho vận CHỈ nhìn cột này)
  TEN_HANG_CHUP    ──►  cập nhật theo vật tư thực mua

DOI_VAT_LIEU  (bảng riêng, mỗi lần đổi một bản ghi)
  ID_VT_TU · TEN_TU · ID_VT_SANG · TEN_SANG
  NOI_DUNG_YEU_CAU  "SK5 -> SKS3"
  LY_DO · NGUOI_YEU_CAU · NGUOI_DUYET · THOI_DIEM_DUYET · TRANG_THAI
```

Danh mục `VAT_TU` **không bị đụng tới** → không sinh mã mới → tài sản trong kho vẫn đồng bộ.

### 2.2 Ai nhìn thấy gì

| Vai trò | Nhìn thấy |
|---|---|
| **Mua hàng** | Cả ba: đề nghị gốc `SK5-Phi 55x30` → đổi sang `SKS3-Phi 55x30` → duyệt mua `SKS3-Phi 55x30`, kèm lý do và người duyệt |
| **Kho vận** | Chỉ `ID_VT_DUYET_MUA` — mua về cái gì, nhập kho cái gì |
| **BP yêu cầu** | Đề nghị gốc + nội dung đã đổi + trạng thái duyệt |

### 2.3 Logic backend

```python
def tao_doi_vat_lieu(id_dong, id_vt_sang, ten_sang, ly_do, ho_so):
    with giao_dich() as conn:
        dong = repo.lay_dong(conn, id_dong, khoa=True)
        if dong.TRANG_THAI_DONG in ('HOAN_THANH', 'HUY'):
            raise LoiNghiepVu('Dòng đã kết thúc, không đổi vật liệu được.', 'DONG_DA_KET_THUC')

        vt_sang = catalog.lay_vat_tu(id_vt_sang) if id_vt_sang else None
        id_dvl = sinh_ma(conn, 'DVL', now_vn().year)
        repo.tao_doi_vat_lieu(conn, id_dvl,
            id_dong        = id_dong,
            id_vt_tu       = dong.ID_VT_DUYET_MUA,
            ten_tu         = dong.TEN_HANG_CHUP,                 # CHỤP tên hiện tại
            id_vt_sang     = id_vt_sang,
            ten_sang       = vt_sang.TEN_HANG if vt_sang else ten_sang,
            noi_dung       = f'{dong.TEN_HANG_CHUP} -> {ten_sang}',
            ly_do = ly_do, nguoi_yeu_cau = ho_so.MA_NHAN_VIEN, trang_thai = 'CHO_DUYET')

        repo.cap_nhat_dong(conn, id_dong, TRANG_THAI_DONG='CHO_XAC_NHAN_KT')
        for kt in phanquyen.nguoi_co_vai_tro('KY_THUAT'):
            thong_bao.gui(conn, kt, 'DOI_VAT_LIEU', f'Yêu cầu đổi vật liệu {id_dvl}', 'DOI_VAT_LIEU', id_dvl)
        return id_dvl


def duyet_doi_vat_lieu(id_dvl, ho_so, dong_y: bool, ghi_chu, phien_ban):
    with giao_dich() as conn:
        dvl = repo.lay_dvl(conn, id_dvl, khoa=True); kiem_phien_ban(dvl, phien_ban)
        kiem_quyen(ho_so, 'xac_nhan_kt', 'duyet')

        if dong_y:
            vt = catalog.lay_vat_tu(dvl.ID_VT_SANG) if dvl.ID_VT_SANG else None
            # ĐÂY là chỗ duy nhất cập nhật vật tư thực mua
            repo.cap_nhat_dong(conn, dvl.ID_DE_NGHI_DONG,
                ID_VT_DUYET_MUA = dvl.ID_VT_SANG,
                TEN_HANG_CHUP   = dvl.TEN_SANG,                  # tên hàng mới
                DVT_CHUP        = vt.DVT if vt else None,
                PHAN_LOAI_CHUP  = vt.PHAN_LOAI if vt else None,
                TRANG_THAI_DONG = 'DA_DUYET')
            trang_thai = 'DONG_Y'
        else:
            repo.cap_nhat_dong(conn, dvl.ID_DE_NGHI_DONG, TRANG_THAI_DONG='DA_DUYET')
            trang_thai = 'TU_CHOI'

        repo.cap_nhat_dvl(conn, id_dvl, TRANG_THAI=trang_thai,
                          NGUOI_DUYET=ho_so.MA_NHAN_VIEN, THOI_DIEM_DUYET=now_vn())
        nhat_ky.ghi(conn, 'DOI_VAT_LIEU', id_dvl, 'DUYET', nguoi=ho_so.MA_NHAN_VIEN)
        thong_bao.gui(conn, dvl.NGUOI_YEU_CAU, 'DVL_KET_QUA', ...)
```

### 2.4 Endpoint

```
GET  /api/v1/xac-nhan-kt                    hàng đợi của Kỹ thuật
POST /api/v1/doi-vat-lieu                   { id_dong, id_vt_sang | ten_sang, ly_do }
POST /api/v1/doi-vat-lieu/{id}/duyet        { ghi_chu, phien_ban }
POST /api/v1/doi-vat-lieu/{id}/tu-choi      { ly_do, phien_ban }
GET  /api/v1/de-nghi-dong/{id}/lich-su-doi  lịch sử đổi của một dòng
```

---

## 3. Xác nhận kỹ thuật (không đổi vật liệu)

Trường hợp Mua hàng cần Kỹ thuật xác nhận thông số/quy cách trước khi đi báo giá — quy tắc `BG-04`.

```python
def yeu_cau_xac_nhan_kt(id_dong, noi_dung, ho_so):
    repo.cap_nhat_dong(id_dong, CAN_XAC_NHAN_KT=True, TRANG_THAI_DONG='CHO_XAC_NHAN_KT')
    trao_doi.them('DE_NGHI_DONG', id_dong, noi_dung, ho_so)     # dùng chung luồng trao đổi
    thong_bao.gui_cho_vai_tro('KY_THUAT', ...)

def xac_nhan_kt(id_dong, ket_qua, ghi_chu, ho_so):
    # ket_qua: DAT | CAN_DOI_VAT_LIEU | KHONG_DAT
    ...
```

`BG-04`: **KHI** dòng có `CAN_XAC_NHAN_KT = true` và chưa được Kỹ thuật xác nhận **THÌ** cảnh báo (hoặc chặn, tuỳ chế độ) khi chuyển sang bước báo giá.

---

## 4. Yêu cầu huỷ dòng

Trong Excel là giá trị `HỦY` ở cột `YÊU CẦU XÁC NHẬN`, kèm ghi chú kiểu *"hết hàng chưa tìm được chờ chỉ đạo anh Huỳnh"*, *"HỦY KO MUA"*, *"TẠM NGƯNG CHỜ KH"*.

```python
def yeu_cau_huy(id_dong, ly_do, ho_so):
    if not ly_do.strip():
        raise ThieuDuLieu('Phải nhập lý do huỷ.', 'THIEU_LY_DO')
    # DN-09: KHÔNG xoá cứng
    id_yc = sinh_ma('YCH', year)
    repo.tao_yeu_cau_huy(id_yc, id_dong, ly_do, ho_so.MA_NHAN_VIEN, 'CHO_DUYET')
    thong_bao.gui_cho_vai_tro('TBP_MUA_HANG', ...)

def duyet_huy(id_yc, dong_y, ho_so):
    if dong_y:
        repo.cap_nhat_dong(yc.ID_DE_NGHI_DONG, TRANG_THAI_DONG='HUY')
        # nếu MỌI dòng của phiếu đều HUY thì phiếu cũng HUY
        if repo.tat_ca_dong_da_huy(yc.ID_DE_NGHI):
            doi_trang_thai('DE_NGHI', yc.ID_DE_NGHI, 'HUY', ho_so)
```

Trạng thái **`TAM_NGUNG`** là một luồng nhẹ hơn: không huỷ, chỉ dừng theo dõi trễ hạn cho tới khi bật lại. Dùng cho *"TẠM NGƯNG CHỜ KH"*.

---

## 5. Yêu cầu cấp mã vật tư

> **Không có luồng này thì tỷ lệ mã vật tư 4,1% sẽ không nhúc nhích**, vì người dùng không có đường nào để xin mã ngoài việc bỏ trống.

### 5.1 Luồng

```
Người lập ĐNVT tìm không thấy mặt hàng trong danh mục
        │
        ▼  bấm "Chưa có mã? Gửi yêu cầu cấp mã"
   YEU_CAU_CAP_MA (tên đề xuất, quy cách, ĐVT, chủng loại, ảnh/bản vẽ)
        │  dòng đề nghị → CHO_CAP_MA
        ▼
   Kho vận nhận thông báo → màn hình "Yêu cầu cấp mã"
        │  ├─ tìm trùng: hệ thống tự gợi ý các tên gần giống >85%
        │  ├─ nếu đã có → gán mã cũ, đóng yêu cầu
        │  └─ nếu chưa → cấp MA_VAT_TU + TEN_HANG chuẩn
        ▼
   Mã tự gắn ngược vào dòng đề nghị → trạng thái trở lại luồng bình thường
   Thông báo cho người yêu cầu
```

### 5.2 Chống sinh mã trùng — bắt buộc

```python
def goi_y_trung(ten_de_xuat: str, nguong=85) -> list[VatTu]:
    """Trả về vật tư có tên giống >nguong%, dùng pg_trgm similarity."""
    return repo.tim_tuong_tu(khong_dau(ten_de_xuat), nguong/100)
```
Màn hình cấp mã của Kho vận **luôn hiện danh sách gợi ý trùng trước**, buộc người cấp phải xác nhận "đã kiểm tra, đây là mặt hàng mới" mới cho tạo.

Đây là cơ chế duy nhất ngăn danh mục lại phình lên 9.575 tên như Excel — vì đã chốt **không dùng bảng bí danh**.

### 5.3 Endpoint

```
POST /api/v1/yeu-cau-cap-ma            { id_dong?, ten_de_xuat, quy_cach, dvt, ma_chung_loai }
GET  /api/v1/yeu-cau-cap-ma            hàng đợi của Kho vận
GET  /api/v1/yeu-cau-cap-ma/{id}/goi-y-trung
POST /api/v1/yeu-cau-cap-ma/{id}/cap   { ma_vat_tu, ten_hang, dvt, ... }  → tạo VAT_TU
POST /api/v1/yeu-cau-cap-ma/{id}/gan   { id_vat_tu }   → gán mã đã có sẵn
POST /api/v1/yeu-cau-cap-ma/{id}/tu-choi { ly_do }
```

---

## 6. Thiết kế giao diện

### 6.1 Màn hình hàng đợi Kỹ thuật

```
┌ Xác nhận kỹ thuật ─────────────────────────────────────────────┐
│ [Đổi vật liệu (4)] [Xác nhận thông số (7)] [Đã xử lý]           │
├─────────────────────────────────────────────────────────────────┤
│ DVL-2026-000024                              27/08 09:12        │
│ Phiếu DN-2026-000123 · dòng 2 · Mr. Sáng (CX)                   │
│ ┌────────────────────┬──────┬────────────────────┐              │
│ │ Đề nghị gốc        │  →   │ Đề xuất đổi sang   │              │
│ │ SK5-Phi 55x30      │      │ SKS3-Phi 55x30     │              │
│ │ (chưa có mã)       │      │ TH-SX-118          │              │
│ └────────────────────┴──────┴────────────────────┘              │
│ Lý do: NCC báo hết SK5, SKS3 tương đương về độ cứng             │
│ 📎 ban-ve-A123.pdf                                              │
│ LSX MBC0626-298-CKCT-T · Mã vạch 26060872101WO                  │
│                                                                  │
│ [Ghi chú của Kỹ thuật…                                        ] │
│                              [✓ Đồng ý]  [✕ Từ chối]            │
└─────────────────────────────────────────────────────────────────┘
```

- Hai cột **gốc → đổi** đặt cạnh nhau, đây là thứ Kỹ thuật cần nhìn để quyết.
- Có sẵn LSX và mã vạch để tra bản vẽ.
- Từ chối bắt buộc nhập lý do.

### 6.2 Hộp thoại đổi vật liệu (từ màn hình chi tiết đề nghị)

```
┌ Đổi vật liệu — dòng 2 ─────────────────────────────┐
│ Đang đề nghị:  SK5-Phi 55x30                       │
│                                                     │
│ Đổi sang       [🔍 tìm vật tư…                    ]│
│                                                     │
│ Lý do  *       [                                  ]│
│                                                     │
│ ⓘ Đề nghị gốc vẫn được giữ nguyên trên phiếu.      │
│   Kho vận sẽ chỉ thấy vật tư sau khi đổi.          │
│                                                     │
│                        [Huỷ]  [Gửi Kỹ thuật duyệt] │
└─────────────────────────────────────────────────────┘
```

### 6.3 Hiển thị trên dòng đã đổi

```
│ 2 │TH-SX-118 │SKS3-Phi 55x30  ⇄ │PCS│ 1│05/09/26│...│
│   │          │  ↳ gốc: SK5-Phi 55x30 · đổi 27/08 · Mr. Vỹ duyệt │
```
Biểu tượng `⇄` bấm vào mở lịch sử đổi đầy đủ.

### 6.4 Màn hình cấp mã của Kho vận

```
┌ Yêu cầu cấp mã vật tư (12) ────────────────────────────────────┐
│ Tên đề xuất:  Bạc đạn 6204ZZ                                    │
│ Quy cách:     20x47x14mm  ·  ĐVT: PCS  ·  Chủng loại: BẠC ĐẠN   │
│ Người yêu cầu: Mr. Quang BT (VH) · 27/08 08:40                  │
│ 📎 anh-mau.jpg                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ⚠ CÓ 3 MẶT HÀNG TÊN GẦN GIỐNG — kiểm tra trước khi cấp mã mới   │
│   ○ TH-SX-014  Bạc đạn đũa kim HK1210            (91% giống)    │
│   ○ TH-SX-015  Bạc đạn đũa kim HK0810            (89% giống)    │
│   ○ TH-SX-088  Bạc đạn 6204-2RS                  (86% giống)    │
│                                             [Gán mã đã chọn]    │
├─────────────────────────────────────────────────────────────────┤
│ ☐ Tôi đã kiểm tra, đây là mặt hàng mới                          │
│ Mã vật tư   [TH-SX-  ][211]     ← gợi ý số kế tiếp của nhóm     │
│ Tên chuẩn   [Bạc đạn 6204ZZ 20x47x14                          ] │
│ ĐVT [PCS ▾]  Phân loại [Thông dụng SX ▾]  Kho [TH ▾]            │
│                                        [Cấp mã và đóng yêu cầu] │
└─────────────────────────────────────────────────────────────────┘
```

Nút "Cấp mã" **bị vô hiệu hoá** cho tới khi tick ô "đã kiểm tra".

---

## 7. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `DN-05` | Dòng không có mã vật tư → tạo yêu cầu cấp mã, dòng sang `CHO_CAP_MA` | `CANH_BAO` |
| `DN-09` | Huỷ dòng: chuyển trạng thái + lý do, **cấm xoá cứng** | `CHAN` |
| `BG-04` | Chưa xác nhận kỹ thuật → không cho sang bước báo giá | `CANH_BAO` |
| Mới `XN-01` | Đổi vật liệu chỉ ghi lên chứng từ, **cấm** sửa danh mục `VAT_TU` | `CHAN` |
| Mới `XN-02` | Cấp mã mới phải xem gợi ý trùng và tick xác nhận | `CHAN` |
| Mới `XN-03` | Từ chối (đổi vật liệu / huỷ / cấp mã) bắt buộc nhập lý do | `CHAN` |

---

## 8. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tạo yêu cầu đổi vật liệu | Dòng sang `CHO_XAC_NHAN_KT`, Kỹ thuật nhận thông báo |
| 2 | Kỹ thuật đồng ý đổi | `ID_VT_DUYET_MUA` và `TEN_HANG_CHUP` đổi; `ID_VT_DE_NGHI` **giữ nguyên** |
| 3 | Kiểm tra bảng `VAT_TU` sau khi đổi | **Không** có bản ghi nào bị sửa hay tạo mới |
| 4 | Kho vận đọc dòng đã đổi | Chỉ thấy `ID_VT_DUYET_MUA` |
| 5 | Mua hàng đọc dòng đã đổi | Thấy cả gốc, đích, lý do, người duyệt |
| 6 | Kỹ thuật từ chối, không nhập lý do | `400`, `THIEU_LY_DO` |
| 7 | Đổi vật liệu trên dòng đã `HOAN_THANH` | `422`, `DONG_DA_KET_THUC` |
| 8 | Yêu cầu cấp mã tên "Bạc đạn 6204ZZ" | Gợi ý ≥1 tên giống >85% |
| 9 | Cấp mã mà chưa tick "đã kiểm tra" | `422` |
| 10 | Cấp mã sai định dạng `TH-SX-9` | `422`, nêu rõ regex đúng |
| 11 | Cấp mã trùng `MA_VAT_TU` đã có | `422`, `MA_DA_TON_TAI` |
| 12 | Cấp mã trùng `TEN_HANG` đã có | `422`, `TEN_DA_TON_TAI` |
| 13 | Sau khi cấp mã | Dòng đề nghị tự gắn mã, rời `CHO_CAP_MA`, người yêu cầu nhận thông báo |
| 14 | Huỷ tất cả dòng của một phiếu | Phiếu tự chuyển `HUY` |
| 15 | Hai người cùng duyệt một yêu cầu đổi | Người thứ hai nhận `409` |
