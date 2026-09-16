# F10 — Dữ liệu gốc · Danh mục vật tư · Nhập lô · Gộp mã

> Đây là **chức năng phải làm đầu tiên**. Nếu danh mục chưa sạch thì mọi màn hình phía sau đều xây trên cát.
> Thay thế: sheet `Danh Muc`, cột `MÃ VẬT TƯ` / `TÊN HÀNG` / `ĐVT` / `CHỦNG LOẠI` của `THEO DOI MUA HANG`, và toàn bộ việc gõ tay tự do.

---

## 1. Bài toán phải giải

| Chỉ số | Hiện trạng | Mục tiêu |
|---|---|---|
| Mã vật tư đúng quy tắc | **4,1%** số dòng (494/12.028) | 100% cho dòng mới |
| Tên hàng khác nhau | **9.575** cho 12.028 dòng | ~2.500–3.000 tên chuẩn |
| Giá trị `ĐVT` | **115** | ~15 |
| Giá trị `CHỦNG LOẠI` | **183** | ~30 |
| Ràng buộc nhập liệu | **6** trên 18.000 dòng | Mọi trường danh mục |

---

## 2. Chiến lược hai giai đoạn (đã chốt)

| | **Giai đoạn 1 — V1** | **Giai đoạn 2 — sau khi MH & KV thống nhất** |
|---|---|---|
| Chủ thể quản lý | **`TEN_HANG`** | **`MA_VAT_TU`** (chính) + `TEN_HANG` |
| `MA_VAT_TU` | `UNIQUE`, cho phép `NULL` | `UNIQUE`, `NOT NULL` |
| `TEN_HANG` | `UNIQUE`, `NOT NULL` | `UNIQUE`, `NOT NULL` |
| Dữ liệu cũ | `MA_VAT_TU = NULL`, giữ `TEN_HANG_CU` | Chuẩn hoá dần qua màn hình gộp |
| Dòng chứng từ mới | Bắt buộc **chọn từ danh mục**, không gõ tự do | Bắt buộc có mã |

**Điểm mấu chốt kỹ thuật:** mọi bảng giao dịch trỏ về `VAT_TU.ID` (bất biến), **không** trỏ về `MA_VAT_TU` hay `TEN_HANG`. Nhờ vậy khi Giai đoạn 2 gán mã và sửa tên, toàn bộ chứng từ lịch sử không đứt.

> Lý do anh Long nêu: *"ưu tiên mã vật tư vì các tên hàng giống nhau đôi khi nói về 1 mã hàng duy nhất. Hiện tại sẽ quản lý dựa trên tên hàng. Tuy nhiên, sau khi thống nhất mã vật tư sẽ thực hiện chuẩn hoá và cập nhật lại sau."*

---

## 3. Không dùng bảng bí danh — ba cơ chế thay thế

Đã chốt: **một mã vật tư → một tên hàng, quản lý độc nhất.** Không có bảng bí danh.

| Cơ chế | Giải quyết vấn đề gì |
|---|---|
| **Tìm kiếm mờ không dấu** | Người dùng gõ "bac dan hk" vẫn tìm ra "Bạc đạn đũa kim HK1210" |
| **Cảnh báo trùng gần >85%** | Ngăn tạo tên mới gần giống tên đã có — đây là cơ chế duy nhất ngăn danh mục phình lại lên 9.575 tên |
| **`TEN_NCC_GHI_TREN_CHUNG_TU`** | Lưu **trên dòng chứng từ**, không phải trong danh mục — để đối chiếu hoá đơn khi NCC gọi tên khác. Danh mục vẫn độc nhất |

---

## 4. Logic backend

### 4.1 Endpoint

```
GET  /api/v1/danh-muc                        danh sách các danh mục hệ thống có
GET  /api/v1/danh-muc/{ma}                   dữ liệu một danh mục
POST /api/v1/danh-muc/{ma}/them
POST /api/v1/danh-muc/{ma}/sua
POST /api/v1/danh-muc/{ma}/xoa               soft delete → TRANG_THAI = NGUNG
GET  /api/v1/danh-muc/{ma}/tai-xuong

GET  /api/v1/vat-tu/tim?q=&gioi_han=20       tìm mờ — dùng ở mọi combobox
GET  /api/v1/vat-tu/{id}
POST /api/v1/vat-tu                          tạo mới (chỉ vai trò Kho vận)
PUT  /api/v1/vat-tu/{id}
GET  /api/v1/vat-tu/goi-y-trung?ten=         gợi ý tên gần giống
POST /api/v1/vat-tu/gop                      { id_nguon[], id_dich }
GET  /api/v1/vat-tu/chua-co-ma               danh sách cần gán mã (Giai đoạn 2)

GET  /api/v1/nhap-lo/{ma}/mau                tải file mẫu
POST /api/v1/nhap-lo/{ma}/kiem-tra           kiểm tra, chưa ghi
POST /api/v1/nhap-lo/{ma}/ghi                ghi thật
```

### 4.2 Tìm mờ vật tư

```python
def tim_vat_tu(tu_khoa: str, gioi_han=20) -> list[VatTu]:
    kd = khong_dau(tu_khoa).strip().lower()
    return db.query("""
        SELECT ID, MA_VAT_TU, TEN_HANG, DVT, MA_CHUNG_LOAI, PHAN_LOAI,
               similarity(TEN_KHONG_DAU, %(kd)s) AS diem
        FROM VAT_TU
        WHERE TRANG_THAI = 'HOAT_DONG'
          AND (TEN_KHONG_DAU %% %(kd)s OR MA_VAT_TU ILIKE %(like)s)
        ORDER BY diem DESC, TEN_HANG
        LIMIT %(gh)s
    """, kd=kd, like=f'%{tu_khoa}%', gh=gioi_han)

def khong_dau(s: str) -> str:
    """Chuẩn hoá NFD, bỏ dấu, đ→d, gộp khoảng trắng, viết thường."""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s.replace('đ','d').replace('Đ','D')).strip().lower()
```
Cần `CREATE EXTENSION pg_trgm;` và chỉ mục GIN trên `TEN_KHONG_DAU`.

### 4.3 Tạo vật tư — kiểm trùng bắt buộc

```python
def tao_vat_tu(du_lieu, ho_so, da_kiem_tra_trung: bool):
    # chỉ vai trò Kho vận và Quản trị
    if ho_so.VAI_TRO not in ('TBP_KHO_VAN', 'QUAN_TRI_NGHIEP_VU', 'QUAN_TRI_KY_THUAT'):
        raise KhongCoQuyen('Chỉ Bộ phận Kho vận được cấp mã vật tư.')

    # XN-02: phải xem gợi ý trùng và xác nhận
    trung = goi_y_trung(du_lieu.ten_hang)
    if trung and not da_kiem_tra_trung:
        raise LoiNghiepVu(
            f'Có {len(trung)} mặt hàng tên gần giống. Kiểm tra trước khi cấp mã mới.',
            'CAN_KIEM_TRA_TRUNG')

    if du_lieu.ma_vat_tu:
        kiem_dinh_dang_ma(du_lieu.ma_vat_tu)          # regex ở 02_CHUAN_HOA §1.1
        if repo.ma_da_ton_tai(du_lieu.ma_vat_tu):
            raise LoiNghiepVu('Mã vật tư đã tồn tại.', 'MA_DA_TON_TAI')
    if repo.ten_da_ton_tai(du_lieu.ten_hang):
        raise LoiNghiepVu('Tên hàng đã tồn tại. Tên hàng phải độc nhất.', 'TEN_DA_TON_TAI')

    id_vt = sinh_ma_danh_muc('VT')
    repo.tao_vat_tu(id_vt, **du_lieu, ten_khong_dau=khong_dau(du_lieu.ten_hang),
                    nguon_so_huu='KHO_VAN', trang_thai='HOAT_DONG')
    return id_vt


def kiem_dinh_dang_ma(ma: str):
    if not re.fullmatch(r'[A-Z0-9\-]+', ma):
        raise LoiNghiepVu(
            'Mã vật tư chỉ được dùng A–Z, 0–9 và dấu gạch nối. '
            'Không dấu tiếng Việt, không khoảng trắng.', 'MA_SAI_KY_TU')
    for r in (RE_TH, RE_VT, RE_SX, RE_TL):
        if re.fullmatch(r, ma): return
    raise LoiNghiepVu(
        'Mã vật tư sai cấu trúc. Đúng dạng: TH-SX-203 · VT-NC-SUS201-HO-014 · '
        'VT-SX-0421 · TL-MK-HSS-007', 'MA_SAI_CAU_TRUC')
```

### 4.4 Gợi ý trùng

```python
def goi_y_trung(ten: str, nguong=None) -> list[dict]:
    nguong = (nguong or tham_so('NGUONG_TRUNG_TEN')) / 100      # 0.85
    return db.query("""
        SELECT ID, MA_VAT_TU, TEN_HANG,
               round(similarity(TEN_KHONG_DAU, %(kd)s)::numeric * 100, 0) AS phan_tram
        FROM VAT_TU
        WHERE TRANG_THAI = 'HOAT_DONG'
          AND similarity(TEN_KHONG_DAU, %(kd)s) >= %(ng)s
        ORDER BY phan_tram DESC LIMIT 10
    """, kd=khong_dau(ten), ng=nguong)
```

### 4.5 Gộp mã hàng (Giai đoạn 2)

```python
def gop_vat_tu(ids_nguon: list[str], id_dich: str, ly_do, ho_so):
    """Chuyển mọi tham chiếu từ các bản ghi nguồn sang bản ghi đích."""
    with giao_dich() as conn:
        sao_luu_truoc_thao_tac_hang_loat(conn)          # Hiến chương 1.5
        tong = 0
        for id_nguon in ids_nguon:
            if id_nguon == id_dich: continue
            for bang, cot in THAM_CHIEU_VAT_TU:
                tong += repo.chuyen_tham_chieu(conn, bang, cot, id_nguon, id_dich)
            repo.cap_nhat_vat_tu(conn, id_nguon,
                                 TRANG_THAI='DA_GOP', ID_GOP_VE=id_dich)
            repo.ghi_lich_su_gop(conn, id_nguon, id_dich, tong, ho_so.MA_NHAN_VIEN, ly_do)
        return tong

THAM_CHIEU_VAT_TU = [
    ('DE_NGHI_DONG', 'ID_VT_DE_NGHI'), ('DE_NGHI_DONG', 'ID_VT_DUYET_MUA'),
    ('DON_HANG_DONG', 'ID_VAT_TU'),    ('NHAN_HANG_DONG', 'ID_VAT_TU'),
    ('BAO_GIA_DONG', 'ID_VAT_TU'),     ('DOI_VAT_LIEU', 'ID_VT_TU'),
    ('DOI_VAT_LIEU', 'ID_VT_SANG'),    ('VAT_TU', 'ID_VT_GOC'),
]
```

Bản ghi nguồn **không xoá** — chuyển `TRANG_THAI = 'DA_GOP'` và giữ `ID_GOP_VE` để tra ngược (lỗi kinh điển số 7: cấm xoá cứng).

### 4.6 Nhập lô từ Excel — ba bước

```python
def kiem_tra_nhap_lo(ma_danh_muc, file, ho_so) -> dict:
    """Bước 2: kiểm tra, CHƯA ghi gì."""
    dong = doc_file(file)
    ket_qua = {'tong': len(dong), 'hop_le': [], 'loi': [], 'canh_bao': []}
    for i, d in enumerate(dong, 2):        # dòng 1 là tiêu đề
        loi = kiem_tra_mot_dong(ma_danh_muc, d)
        if loi:  ket_qua['loi'].append({'dong': i, 'loi': loi, 'du_lieu': d})
        else:
            trung = goi_y_trung(d.get('TEN_HANG', ''))
            if trung:
                ket_qua['canh_bao'].append({'dong': i, 'trung': trung, 'du_lieu': d})
            ket_qua['hop_le'].append(d)
    return ket_qua

def ghi_nhap_lo(ma_danh_muc, file, ho_so, bo_qua_canh_bao=False):
    """Bước 3: ghi thật, trong MỘT giao dịch."""
    sao_luu_truoc_thao_tac_hang_loat()
    kq = kiem_tra_nhap_lo(ma_danh_muc, file, ho_so)
    if kq['loi']:
        raise LoiNghiepVu(f"Còn {len(kq['loi'])} dòng lỗi. Sửa file rồi nhập lại.", 'CON_DONG_LOI')
    if kq['canh_bao'] and not bo_qua_canh_bao:
        raise LoiNghiepVu(f"Có {len(kq['canh_bao'])} dòng nghi trùng. Xem lại hoặc xác nhận bỏ qua.",
                          'CO_CANH_BAO')
    with giao_dich() as conn:
        for d in kq['hop_le']:
            repo.them_hoac_cap_nhat(conn, ma_danh_muc, d)
    return {'da_ghi': len(kq['hop_le'])}
```

> **Nguyên tắc nạp (Hiến chương 9.1):** không bao giờ im lặng bỏ dòng. Mọi dòng không nạp được phải vào **báo cáo đối soát** với lý do cụ thể.

---

## 5. Thiết kế giao diện

### 5.1 Màn hình Dữ liệu gốc

```
┌ Dữ liệu gốc ────────────────────────────────────────────────┐
│ Danh mục                     Bản ghi  Sở hữu      Quyền     │
│ ▸ Vật tư / hàng hoá            2.847  Kho vận     Sửa       │
│ ▸ Đơn vị tính                     15  Kho vận     Sửa       │
│ ▸ Chủng loại                      31  Mua hàng    Sửa       │
│ ▸ Mục đích sử dụng                13  Mua hàng    Sửa       │
│ ▸ Nhà cung cấp                   890  Mua hàng    Sửa       │
│ ▸ Khách hàng                      42  Kinh doanh  Chỉ đọc   │
│ ▸ Loại gia công                   14  Mua hàng    Sửa       │
│ ▸ Xe & tài xế                  8 / 9  Kho vận     Sửa       │
│ ▸ Lịch nghỉ                      112  Hành chính  Sửa       │
│ ▸ Vật liệu (khối lượng riêng)      8  Kỹ thuật    Sửa       │
│ ▸ Nhân viên                      175  Nhân sự     Chỉ đọc   │
│ ▸ Bộ phận                         14  Nhân sự     Chỉ đọc   │
│ ▸ Lệnh sản xuất                1.804  Kế hoạch SX Chỉ đọc   │
│ ▸ Công đoạn                       40  Kế hoạch SX Chỉ đọc   │
└──────────────────────────────────────────────────────────────┘
```

Cột "Sở hữu" hiện rõ hệ thống nào sở hữu danh mục — đúng Hiến chương 1.1: *mỗi danh mục dùng chung do một nơi sở hữu, hệ thống khác chỉ đọc*.

### 5.2 Màn hình danh mục vật tư

```
┌ Vật tư / hàng hoá (2.847) ────────── [+ Thêm] [⭱ Nhập lô] ┐
│ [🔍 tìm tên / mã…] [Kho ▾] [Nhóm ▾] [Chủng loại ▾]         │
│ ☐ Chỉ chưa có mã (2.353)   ☐ Chỉ đã gộp   [⭳ Tải xuống]    │
├─────────────────────────────────────────────────────────────┤
│ Đã cấp mã 494/2.847 (17%)  ███░░░░░░░░░░░░░░░░              │
├─────────────────────────────────────────────────────────────┤
│ │Mã vật tư   │Tên hàng                    │ĐVT│Chủng loại│  │
│ │TH-SX-203   │Đá mài từ Ø500 lỗ Ø127 T=80 │PCS│DAO CỤ    │  │
│ │TH-SX-210   │Đá mài từ Ø500 lỗ Ø203 T=80 │PCS│DAO CỤ    │  │
│ │—           │Bạc đạn đũa kim HK1210      │PCS│BẠC ĐẠN   │⚠ │
│ │VT-NC-SUS201-HO-014│Inox 201 hộp 20x20x1.5│CÂY│INOX 201 │  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Hộp thoại thêm vật tư — chống trùng

```
┌ Thêm vật tư ────────────────────────────────────────────┐
│ Tên hàng *  [Bạc đạn 6204ZZ 20x47x14                  ] │
│                                                          │
│ ⚠ CÓ 3 MẶT HÀNG TÊN GẦN GIỐNG                           │
│   ○ TH-SX-014  Bạc đạn đũa kim HK1210        91% giống  │
│   ○ TH-SX-088  Bạc đạn 6204-2RS              86% giống  │
│   ○ —          Bạc đạn 6204 ZZ               94% giống  │
│                                    [Dùng mặt hàng đã chọn]│
│ ─────────────────────────────────────────────────────── │
│ ☐ Tôi đã kiểm tra, đây là mặt hàng mới                  │
│                                                          │
│ Mã vật tư   [TH ▾]-[SX ▾]-[211]   → TH-SX-211           │
│              ⓘ số kế tiếp còn trống của nhóm TH-SX       │
│ ĐVT         [PCS ▾]    Chủng loại [BẠC ĐẠN ▾]           │
│ Phân loại   [Thông dụng SX ▾]                            │
│ Quy cách    [20x47x14mm                               ] │
│ Khối lượng riêng [ 7,85 ] g/cm³  (cho máy tính khối lượng)│
│                                                          │
│                              [Huỷ]  [Thêm vật tư]        │
└──────────────────────────────────────────────────────────┘
```

Nút "Thêm vật tư" **bị vô hiệu hoá** cho tới khi tick ô xác nhận. Ô nhập mã tách thành 3 phần với dropdown → không thể gõ sai cấu trúc.

### 5.4 Màn hình gộp mã hàng (Giai đoạn 2)

```
┌ Gộp mã hàng ─────────────────────────────────────────────┐
│ Nhóm tự động các tên gần giống nhau      Ngưỡng [85 ▾]%  │
├───────────────────────────────────────────────────────────┤
│ NHÓM 1 — 4 bản ghi, 22 chứng từ liên quan                │
│ ⦿ SS400P T22*205*205          TH-SX-041   12 chứng từ ← đích│
│ ○ SS400P T22x205x205          —            6 chứng từ    │
│ ○ SS400P T22*205*205mm        —            3 chứng từ    │
│ ○ ss400p t22*205*205          —            1 chứng từ    │
│ Lý do gộp [Cùng một loại phôi, khác cách viết          ] │
│                                        [Gộp 3 vào đích]  │
├───────────────────────────────────────────────────────────┤
│ NHÓM 2 — 3 bản ghi, 8 chứng từ                           │
│ …                                                         │
└───────────────────────────────────────────────────────────┘
```

Mặc định chọn bản ghi **đã có mã** hoặc **nhiều chứng từ nhất** làm đích.
Trước khi gộp: hiện số chứng từ sẽ bị ảnh hưởng và tự sao lưu.

### 5.5 Nhập lô — ba bước

```
┌ Nhập lô — Vật tư ────────────────────────────────────────┐
│  ①  Tải file mẫu        ②  Kiểm tra       ③  Ghi         │
├───────────────────────────────────────────────────────────┤
│ ② KẾT QUẢ KIỂM TRA — 340 dòng                            │
│                                                           │
│ ✅ Hợp lệ            312 dòng                             │
│ ⚠  Nghi trùng tên     19 dòng   [Xem chi tiết ▾]         │
│ ❌ Lỗi                 9 dòng   [Xem chi tiết ▾]          │
│                                                           │
│ ❌ Chi tiết lỗi                                           │
│   Dòng 14 · Mã "TH-TĐH-005" chứa dấu tiếng Việt → TDH    │
│   Dòng 27 · ĐVT "cái " không có trong danh mục            │
│   Dòng 88 · Tên hàng trùng với TH-SX-041                  │
│                                            [⭳ Tải file lỗi]│
│                                                           │
│ ☐ Bỏ qua 19 dòng nghi trùng và ghi 312 dòng hợp lệ       │
│                          [Quay lại sửa file]  [Ghi dữ liệu]│
└───────────────────────────────────────────────────────────┘
```

Nút "Ghi dữ liệu" chỉ bật khi **0 dòng lỗi**. File lỗi tải xuống có thêm cột `LY_DO_LOI` để người dùng sửa ngay trên file cũ.

---

## 6. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `XN-02` | Cấp mã mới phải xem gợi ý trùng và tick xác nhận | `CHAN` |
| Mới `DM-01` | `MA_VAT_TU` chỉ dùng `A–Z`, `0–9`, `-`. Đúng regex cấu trúc | `CHAN` |
| Mới `DM-02` | `TEN_HANG` **độc nhất** trên toàn danh mục | `CHAN` |
| Mới `DM-03` | `MA_VAT_TU` độc nhất, cho phép `NULL` ở V1 | `CHAN` |
| Mới `DM-04` | Chỉ vai trò **Kho vận** được tạo/sửa vật tư | `CHAN` |
| Mới `DM-05` | Xoá danh mục là soft delete (`TRANG_THAI = NGUNG`) | `CHAN` |
| Mới `DM-06` | Nhập lô còn dòng lỗi → không ghi dòng nào | `CHAN` |
| Mới `DM-07` | Thao tác hàng loạt (nhập lô, gộp mã) tự sao lưu trước | `CHAN` |
| Mới `DM-08` | Gộp mã: bản ghi nguồn chuyển `DA_GOP`, **không xoá** | `CHAN` |

---

## 7. Thứ tự nạp dữ liệu ban đầu

```
1. BO_PHAN            (14)      ← từ hệ Kế hoạch Sản xuất
2. NHAN_VIEN          (175)     ← từ hệ Kế hoạch Sản xuất
3. DON_VI_TINH        (~15)     ← chuẩn hoá từ 115 giá trị Excel
4. CHUNG_LOAI         (~31)     ← gom từ 183 giá trị Excel
5. MUC_DICH_SU_DUNG   (13)      ← chờ bảng chuẩn của anh Long
6. LOAI_GIA_CONG      (14)      ← từ sheet THỜI GIAN GC-1
7. NHA_CUNG_CAP       (~890)    ← gộp 799 + 103
8. KHACH_HANG         (~42)     ← tách từ danh mục 103
9. XE, TAI_XE         (8 / 9)   ← SAU KHI chốt mâu thuẫn biển số
10. LICH_NGHI                   ← file riêng, cấu trúc như 04_downtime.csv
11. VAT_LIEU_TINH_TOAN (8)      ← từ sheet CONG THUC và LAZER
12. THAM_SO_HE_THONG            ← giá trị mặc định ở 03_MO_HINH §A9
13. VAT_TU                      ← chuẩn hoá từ 9.575 tên (việc nặng nhất)
14. LENH_SAN_XUAT, LSX_DONG, CONG_DOAN  ← từ hệ Kế hoạch Sản xuất
```

Bước 13 là việc nặng nhất và **phụ thuộc Kho vận**, không phụ thuộc lập trình viên. Nên tách thành luồng công việc riêng chạy song song với code.

**Ưu tiên chuẩn hoá:** 3 nhóm chiếm 44% khối lượng mua hàng — `SẮT THÉP` (4.244 dòng) · `HHK` (3.670) · `INOX 304` (846). Làm xong 3 nhóm này là đã phủ gần một nửa.

---

## 8. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tìm "bac dan hk" (không dấu) | Ra "Bạc đạn đũa kim HK1210" |
| 2 | Tìm "DA MAI" (viết hoa) | Ra "Đá mài từ Ø500…" |
| 3 | Tạo vật tư mã `TH-TĐH-005` | `422`, `MA_SAI_KY_TU` |
| 4 | Tạo vật tư mã `TH SX 203` (dấu cách) | `422`, `MA_SAI_KY_TU` |
| 5 | Tạo vật tư mã `TH-SX-3` (1 chữ số) | `422`, `MA_SAI_CAU_TRUC` |
| 6 | Tạo vật tư mã `TH-SX-203` khi đã có | `422`, `MA_DA_TON_TAI` |
| 7 | Tạo tên hàng đã tồn tại | `422`, `TEN_DA_TON_TAI` |
| 8 | Tạo tên gần giống 91%, chưa tick | `422`, `CAN_KIEM_TRA_TRUNG` |
| 9 | Tick xác nhận rồi tạo | Thành công |
| 10 | Vai trò `NV_MUA_HANG` tạo vật tư | `403` — chỉ Kho vận |
| 11 | Gộp 3 bản ghi vào 1 | Mọi chứng từ trỏ sang đích, 3 bản ghi → `DA_GOP` |
| 12 | Sau khi gộp, mở chứng từ cũ | Hiện tên hàng của bản ghi đích |
| 13 | Nhập lô 340 dòng, 9 lỗi | Không ghi dòng nào, tải được file lỗi có cột lý do |
| 14 | Nhập lô 0 lỗi, 19 nghi trùng, chưa tick | `422`, `CO_CANH_BAO` |
| 15 | Tick bỏ qua rồi ghi | Ghi 312 dòng, bỏ 19 dòng nghi trùng |
| 16 | Nhập lô thành công | Có bản sao lưu được tạo trước đó |
| 17 | Xoá một ĐVT đang dùng | Soft delete, chứng từ cũ vẫn hiển thị đúng |
| 18 | `VAT_TU` với `MA_VAT_TU = NULL` | Lưu được ở V1 |
| 19 | Hai `VAT_TU` cùng `MA_VAT_TU = NULL` | Lưu được (UNIQUE cho phép nhiều NULL) |
