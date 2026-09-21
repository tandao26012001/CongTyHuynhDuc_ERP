# F06 — Đặt ngoài

> **Chức năng hoàn toàn mới.** Không có trong QT-MH-01, không có trong checklist, không có sheet Excel nào.
> Hiện tại công ty **chưa quản lý** hoạt động này.

---

## 1. Định nghĩa — phân biệt với gia công ngoài

| | Gia công ngoài (GCN) | **Đặt ngoài** |
|---|---|---|
| Phạm vi | **Một công đoạn** của lệnh sản xuất | **Toàn bộ** lệnh sản xuất |
| Vật tư | HĐ xuất vật tư của mình đi | NCC dùng **vật tư của họ** |
| Ai lập | Bộ phận sản xuất | **Kinh doanh** |
| Điều xe | Đưa hàng đi **và** lấy hàng về | **Chỉ lấy hàng về** |
| Duyệt | Trưởng BP Mua hàng | **Trưởng BP Kinh doanh**, không theo ngưỡng tiền |
| Hàng về | Bán thành phẩm về đúng công đoạn tiếp theo | **Bán thành phẩm** để kiểm QC |
| Khoá chủ thể | `LENH_SAN_XUAT` + `MA_VACH` + `MA_CONG_DOAN` | `LENH_SAN_XUAT` |

Trong hệ Kế hoạch Sản xuất, gia công ngoài đã là công đoạn `CD-GCN` trong `01_cong_doan.csv`, và `03b_chi_tiet_cong_doan.csv` có cột `SO_LUONG_GIA_CONG_NGOAI`. **Đặt ngoài không nằm ở cấp công đoạn** — nó nằm ở cấp lệnh sản xuất.

---

## 2. Mục đích trong hệ Mua hàng

Yêu cầu đã chốt:

> *Cần quản lý để biết tình trạng của các LSX/Mã hàng dự kiến đặt ngoài và tình trạng như thế nào (mã nào đang báo giá / xác nhận kỹ thuật / đã đặt và tiến độ với NCC ra sao).*

Nghĩa là F06 là một **bảng theo dõi trạng thái**, không phải một quy trình duyệt nhiều tầng.

---

## 3. Luồng nghiệp vụ

```
Kinh doanh nhận đơn khách, quyết định đặt ngoài toàn bộ LSX
        ▼
   Lập phiếu ĐẶT NGOÀI  (chọn LSX → tự kéo về danh sách mã vạch, mã hàng, SL)
        ▼
   NHAP → [Gửi duyệt] → CHO_DUYET
        ▼
   Trưởng BP Kinh doanh duyệt          ← MỘT cấp, KHÔNG theo ngưỡng tiền
        ▼
   DA_DUYET
        ├─ DANG_BAO_GIA        lấy báo giá NCC
        ├─ CHO_XAC_NHAN_KT     NCC hỏi lại thông số, chờ Kỹ thuật xác nhận
        ├─ DA_DAT              đã chốt NCC và giá
        ├─ DANG_LAM            NCC đang sản xuất, theo dõi tiến độ
        ├─ DA_NHAN             hàng về → nhập kho BÁN THÀNH PHẨM → QC kiểm
        └─ HOAN_THANH | HUY
```

**Điều xe:** chỉ có chiều **lấy hàng về** (`CHIEU = LAY_HANG_VE`), không có chiều đưa hàng đi.

---

## 4. Logic backend

### 4.1 Endpoint

```
GET  /api/v1/dat-ngoai                     danh sách
GET  /api/v1/dat-ngoai/{id}
POST /api/v1/dat-ngoai                     { lenh_san_xuat, id_ncc?, ky_han }
PUT  /api/v1/dat-ngoai/{id}
POST /api/v1/dat-ngoai/{id}/gui            NHAP → CHO_DUYET
POST /api/v1/dat-ngoai/{id}/duyet          CHO_DUYET → DA_DUYET   (TBP Kinh doanh)
POST /api/v1/dat-ngoai/{id}/doi-trang-thai { trang_thai, ghi_chu }
POST /api/v1/dat-ngoai/{id}/huy            { ly_do }
GET  /api/v1/dat-ngoai/tien-do             bảng theo dõi theo LSX / mã hàng
GET  /api/v1/dat-ngoai/{id}/in             PDF
```

### 4.1b Nhà cung cấp cho đặt ngoài — phản hồi lần 1 §3.7

```
GET  /api/v1/dat-ngoai/ncc                 bảng chọn NCC: nhóm hàng chính,
                                           nhóm hàng chi tiết, số đơn N tháng
                                           gần đây, cờ quá tải, đã phê duyệt.
                                           Lọc: tu_khoa · chi_da_phe_duyet ·
                                           chi_gia_cong · chi_qua_tai ·
                                           nhom_hang_chinh
POST /api/v1/dat-ngoai/ncc                 Kinh doanh ĐỀ XUẤT một NCC mới —
                                           vào danh mục chung ở trạng thái
                                           CHƯA phê duyệt
POST /api/v1/dat-ngoai/ncc/{id_ncc}/qua-tai  { qua_tai, ly_do } — ô tick
                                           "đang quá tải"; bật thì BẮT BUỘC
                                           có lý do
```

**Vì sao ba đường này treo dưới `/dat-ngoai` chứ không dưới `/nha-cung-cap`:**
cửa quyền của chúng là trang `dat_ngoai`, nơi hai vai trò Kinh doanh có quyền
sửa. Trên trang `ncc` họ chỉ có `X:TB` (xem), nên treo dưới `/nha-cung-cap` là
đóng cửa đúng người mà yêu cầu này mở cửa cho.

**Phê duyệt KHÔNG chuyển đi đâu.** Nó ở nguyên `POST /nha-cung-cap/{id}/
phe-duyet` với quyền `ncc/duyet` — thứ mà chỉ Mua hàng, Ban lãnh đạo và Quản
trị nghiệp vụ có. Đó chính là vế *"chỉ có Mua hàng mới được phép duyệt"* của
phản hồi, và nó đúng mà không cần thêm một dòng mã nào để canh.

Cột dữ liệu: `NHA_CUNG_CAP.QUA_TAI` · `LY_DO_QUA_TAI` · `THOI_DIEM_QUA_TAI` ·
`NGUOI_DANH_DAU_QUA_TAI` (migration `070_dat_ngoai_ncc_qua_tai.sql`). Cửa sổ
tháng đếm đơn nằm ở tham số `SO_THANG_TAI_NCC_DAT_NGOAI` (mặc định 3) — CỐ Ý
tách khỏi `SO_THANG_TINH_TRANG_GIAO_DICH` (6 tháng, đo mức độ thân thiết ở
mục 3.10): hai câu hỏi khác nhau thì hai cửa sổ khác nhau.

**Quá tải là cờ NGƯỜI tick, không phải số máy suy.** Máy đếm được số đơn ba
tháng gần đây và hiện nó ngay cạnh ô tick, nhưng "quá tải" thì không suy ra
được từ con số: một xưởng ba đơn có thể đang kẹt vì cả ba đều là hàng lớn.
Nhà cung cấp bị tick **không bị ẩn**, chỉ xếp xuống cuối và mang viên đỏ — có
lúc cả ba nơi làm được việc ấy đều đang kẹt và vẫn phải hỏi một trong ba.

### 4.2 Tạo phiếu — kéo toàn bộ dòng của LSX

```python
def tao_dat_ngoai(lenh_san_xuat, id_ncc, ky_han, ho_so):
    with giao_dich() as conn:
        # DNG-01: chỉ vai trò Kinh doanh
        if ho_so.VAI_TRO not in ('NV_KINH_DOANH', 'TBP_KINH_DOANH',
                                  'QUAN_TRI_NGHIEP_VU', 'QUAN_TRI_KY_THUAT'):
            raise KhongCoQuyen('Chỉ bộ phận Kinh doanh được lập phiếu đặt ngoài.')

        lsx = catalog.lay_lenh_san_xuat(lenh_san_xuat)
        if not lsx:
            raise KhongTimThay(f'Không tìm thấy lệnh sản xuất {lenh_san_xuat}.')

        # một LSX chỉ có một phiếu đặt ngoài đang hoạt động
        if repo.lsx_da_co_dat_ngoai(conn, lenh_san_xuat):
            raise LoiNghiepVu(
                f'Lệnh sản xuất {lenh_san_xuat} đã có phiếu đặt ngoài.', 'LSX_DA_DAT_NGOAI')

        id_dng = sinh_ma(conn, 'DNG', now_vn().year)
        repo.tao_dat_ngoai(conn, id_dng, lenh_san_xuat, id_ncc, ky_han,
                           nguoi_lap=ho_so.MA_NHAN_VIEN, trang_thai='NHAP')

        # DNG-02: TOÀN BỘ lệnh sản xuất — kéo hết các dòng
        for i, d in enumerate(catalog.lay_lsx_dong(lenh_san_xuat), 1):
            repo.tao_dat_ngoai_dong(conn, id_dng, i,
                ma_vach = d.MA_VACH, ma_hang = d.MA_HANG,
                ten_hang_chup = d.TEN_HANG, dvt_chup = d.DVT,
                so_luong = d.SO_LUONG_PO, ky_han = ky_han,
                trang_thai_dong = 'NHAP')
        return id_dng
```

### 4.3 Duyệt — một cấp, không ngưỡng

```python
def duyet_dat_ngoai(id_dng, ho_so, phien_ban):
    with giao_dich() as conn:
        dng = repo.lay_dat_ngoai(conn, id_dng, khoa=True); kiem_phien_ban(dng, phien_ban)
        # DNG-03: chỉ Trưởng BP Kinh doanh. KHÔNG áp ngưỡng tiền.
        if ho_so.VAI_TRO not in ('TBP_KINH_DOANH', 'QUAN_TRI_NGHIEP_VU'):
            raise KhongCoQuyen('Chỉ Trưởng BP Kinh doanh được duyệt phiếu đặt ngoài.')
        if dng.TRANG_THAI != 'CHO_DUYET':
            raise LoiNghiepVu('Phiếu không ở trạng thái chờ duyệt.', 'SAI_TRANG_THAI')

        repo.cap_nhat(conn, id_dng, NGUOI_DUYET=ho_so.MA_NHAN_VIEN, NGAY_DUYET=now_vn())
        doi_trang_thai(conn, 'DAT_NGOAI', id_dng, 'DA_DUYET', ho_so)
        nhat_ky.ghi(conn, 'DAT_NGOAI', id_dng, 'DUYET', nguoi=ho_so.MA_NHAN_VIEN)
```

### 4.4 Bảng theo dõi tiến độ

```sql
SELECT dng.ID, dng.LENH_SAN_XUAT, kh.MA_KHACH_HANG, ncc.MA_NCC,
       dngd.MA_VACH, dngd.MA_HANG, dngd.TEN_HANG_CHUP,
       dngd.SO_LUONG, dngd.KY_HAN, dngd.NGAY_NHAN,
       dng.TRANG_THAI,
       CASE WHEN dngd.NGAY_NHAN IS NOT NULL THEN NULL
            ELSE so_ngay_lam_viec_giua(dngd.KY_HAN, CURRENT_DATE) END AS so_ngay_som_tre
FROM DAT_NGOAI dng
JOIN DAT_NGOAI_DONG dngd ON dngd.ID_DAT_NGOAI = dng.ID
LEFT JOIN NHA_CUNG_CAP ncc ON ncc.ID = dng.ID_NCC
LEFT JOIN LENH_SAN_XUAT lsx ON lsx.LENH_SAN_XUAT = dng.LENH_SAN_XUAT
LEFT JOIN KHACH_HANG kh ON kh.MA_KHACH_HANG = lsx.MA_KHACH_HANG
WHERE dng.TRANG_THAI <> 'HUY'
ORDER BY so_ngay_som_tre NULLS LAST;
```

---

## 5. Thiết kế giao diện

### 5.1 Màn hình theo dõi đặt ngoài — màn hình chính của F06

```
┌ Đặt ngoài ─────────────────────────────── [+ Lập phiếu đặt ngoài] ┐
│ [01/08/26][31/12/26] [Khách hàng ▾] [NCC ▾] [Trạng thái ▾]        │
│ [🔍 LSX / mã hàng / mã vạch…]                    [⭳ Tải xuống]    │
├────────────────────────────────────────────────────────────────────┤
│ [Tổng 24] [Đang báo giá 6] [Chờ XN kỹ thuật 3] [Đã đặt 11] [🔴3]  │
├────────────────────────────────────────────────────────────────────┤
│  │LSX              │KH  │Mã hàng        │SL│Kỳ hạn│NCC     │TT     │
│ 🔴│C&D0726-001-GCKC2│C&D │2021-70-5318-01│ 1│10/08│MINH ANH│Đang làm│
│   │                 │    │2021-60-0042-05│ 1│10/08│        │        │
│ 🟠│MBC0826-045-CKCT │MBC │V5125Z1358     │ 5│05/09│—       │Đang báo giá│
│ 🟢│NOK0826-012-KC3  │NOK │FPT-500x400    │ 8│20/09│PHÚC LỘC│Đã đặt  │
└────────────────────────────────────────────────────────────────────┘
```

Nhóm theo **LSX**, mở rộng ra từng mã hàng — đúng yêu cầu *"biết mã nào đang báo giá / xác nhận kỹ thuật / đã đặt"*.

### 5.2 Màn hình lập phiếu

```
┌ Lập phiếu đặt ngoài ────────────────────────────────────────────┐
│ Lệnh sản xuất *  [🔍 C&D0726-001-GCKC2                        ] │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Khách hàng   C&D            Số PO khách   020764           │ │
│  │ Kỳ hạn khách 30/07/2026     Ưu tiên       1                │ │
│  │ ⓘ Toàn bộ 12 mã hàng của lệnh này sẽ được đưa vào phiếu.  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Nhà cung cấp    [🔍 chọn NCC… (có thể để trống, chọn sau)     ] │
│ Kỳ hạn cần      [ 20/07/2026                                📅] │
│ Ghi chú         [                                             ] │
├──────────────────────────────────────────────────────────────────┤
│ MÃ HÀNG TRONG LỆNH (12)                          [Bỏ chọn dòng] │
│ ☑ 26073265907WO │2021-70-5318-01│TOP PANEL          │1│PCS      │
│ ☑ 26073253606WO │2021-60-0042-05│2X 5GAL-CARBOY TRAY│1│PCS      │
│ ☑ 26073241505WO │2021-70-4002-13│PUMP TRAY          │3│PCS      │
│ …                                                                │
├──────────────────────────────────────────────────────────────────┤
│ [Lưu nháp]                                        [Gửi duyệt]    │
└──────────────────────────────────────────────────────────────────┘
```

Chọn LSX → tự kéo toàn bộ mã hàng. Người dùng chỉ bỏ chọn dòng nếu cần, không phải gõ lại.

### 5.3 Màn hình chi tiết — dải trạng thái

```
┌ DNG-2026-000045 ──────────────────── ●ĐANG LÀM  [In] [⋯]        │
│ LSX C&D0726-001-GCKC2 · Khách C&D · 12 mã hàng                  │
│ NCC MINH ANH TRIỆU · duyệt bởi Trưởng BP Kinh doanh 05/08       │
├──────────────────────────────────────────────────────────────────┤
│  ●────●────●────●────●────○────○                                │
│  Lập Duyệt Báo Đặt  Đang Nhận Hoàn                              │
│  01/08 05/08 giá  hàng làm  hàng thành                          │
│              08/08 12/08                                         │
│                                                                  │
│  🔴 Trễ 8 ngày làm việc so với kỳ hạn 10/08                     │
│  [Cập nhật trạng thái ▾]                                        │
├──────────────────────────────────────────────────────────────────┤
│ ⓘ Hàng về nhập kho BÁN THÀNH PHẨM để QC kiểm trước              │
├──────────────────────────────────────────────────────────────────┤
│ 💬 Trao đổi (2)   📎 Đính kèm (1)                                │
└──────────────────────────────────────────────────────────────────┘
```

Nút "Cập nhật trạng thái" là dropdown đơn giản — Kinh doanh tự cập nhật khi có tin từ NCC. Không có quy trình duyệt phức tạp.

---

## 6. Quy tắc áp dụng

| Mã | Nội dung | Chế độ |
|---|---|---|
| `DNG-01` | Chỉ vai trò Kinh doanh lập phiếu | `CHAN` |
| `DNG-02` | Phạm vi là **toàn bộ** lệnh sản xuất | `CHAN` |
| `DNG-03` | Duyệt bởi Trưởng BP Kinh doanh, **không áp ngưỡng tiền**, một cấp | `CHAN` |
| `DNG-04` | Hàng về nhập kho **bán thành phẩm** để QC kiểm | — |
| `DNG-05` | Theo dõi và hiển thị trạng thái theo LSX và theo mã hàng | — |
| Mới `DNG-06` | Một LSX chỉ có một phiếu đặt ngoài đang hoạt động | `CHAN` |
| Mới `DNG-07` | Điều xe cho đặt ngoài chỉ có chiều `LAY_HANG_VE` | `CHAN` |

---

## 7. Điểm còn cần làm rõ khi triển khai

Đây là chức năng mới hoàn toàn, chưa có dữ liệu lịch sử để đối chiếu. Ba điểm nên xác nhận với Kinh doanh **trước khi code**:

1. **Giá và chi phí** — có ghi đơn giá đặt ngoài vào hệ thống không? Nếu có thì ai được xem (mức Tối mật hay Hạn chế)?
2. **Thanh toán** — đặt ngoài có phát sinh yêu cầu thanh toán (F08) không, hay Kế toán xử lý riêng?
3. **QC** — hàng đặt ngoài về có đi qua đúng luồng IQC của F05 không, hay có mẫu kiểm khác vì là bán thành phẩm?

Mặc định thiết kế hiện tại: **có** ghi đơn giá (mức Tối mật), **có** phát sinh yêu cầu thanh toán, **dùng chung** luồng IQC. Sửa lại khi có xác nhận.

---

## 8. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Vai trò `NV_MUA_HANG` lập phiếu đặt ngoài | `403` |
| 2 | Vai trò `NV_KINH_DOANH` lập phiếu | Thành công |
| 3 | Chọn LSX có 12 dòng | Phiếu tự có 12 dòng, không phải gõ tay |
| 4 | Lập phiếu thứ hai cho cùng LSX | `422`, `LSX_DA_DAT_NGOAI` |
| 5 | Vai trò `TBP_MUA_HANG` duyệt phiếu đặt ngoài | `403` |
| 6 | `TBP_KINH_DOANH` duyệt phiếu 5 tỷ đồng | Thành công — không áp ngưỡng |
| 7 | Chọn LSX không tồn tại | `404` |
| 8 | Bảng theo dõi | Nhóm theo LSX, mở ra từng mã hàng, có `SO_NGAY_SOM_TRE` |
| 9 | Tạo điều xe cho đặt ngoài với `CHIEU = DUA_HANG_DI` | `422`, `DNG-07` |
| 10 | Hai người cùng duyệt một phiếu | Người thứ hai nhận `409` |
