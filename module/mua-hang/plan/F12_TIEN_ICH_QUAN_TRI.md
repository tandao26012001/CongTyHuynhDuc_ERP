# F12 — Tiện ích & Quản trị

> Gồm: máy tính khối lượng vật liệu · thông báo · trao đổi · đính kèm · báo cáo sự cố · quản trị hệ thống · lưu trữ · nhật ký.

---

## 1. Máy tính khối lượng & giá vật liệu

> Thay sheet `CONG THUC` và `LAZER`. **22% số dòng mua hàng tính tiền theo trọng lượng** — không có công cụ này trong app thì nhân viên sẽ mở Excel song song, và mất luôn tính "thông tin tập trung".

### 1.1 Công thức

```python
def khoi_luong_kg(dai_mm, rong_mm, day_mm, klr_g_cm3, so_luong=1) -> float:
    """KLR đơn vị g/cm³ → trả về kg."""
    return dai_mm * rong_mm * day_mm * klr_g_cm3 * so_luong / 1_000_000

def khoi_luong_tron_dac(duong_kinh_mm, dai_mm, klr, so_luong=1) -> float:
    return math.pi * (duong_kinh_mm/2)**2 * dai_mm * klr * so_luong / 1_000_000

def khoi_luong_ong(dk_ngoai, dk_trong, dai_mm, klr, so_luong=1) -> float:
    return math.pi * ((dk_ngoai/2)**2 - (dk_trong/2)**2) * dai_mm * klr * so_luong / 1_000_000
```

Kiểm chứng trên dữ liệu Excel thật: `14 × 150 × 330 × 7,85 × 1 / 1.000.000 = 5,44 kg`

```
THÀNH TIỀN   = ĐƠN GIÁ × KHỐI LƯỢNG
GIÁ CHƯA VAT = GIÁ / 1,1                    (VAT 10%, tham số THAM_SO['VAT_SUAT'])
```

### 1.2 Bảng khối lượng riêng (bảng `VAT_LIEU_TINH_TOAN`)

| Vật liệu | KLR (g/cm³) | Đơn giá tham khảo (đ/kg) |
|---|---|---|
| Thép · SS400 · S45C | 7,85 | 25.000 |
| Inox 304 · 201 | 7,95 | 85.000 |
| Nhôm 6061 | 2,70 | 140.000 |
| Đồng C3604 | 8,80 | — |
| Mica · nhựa POM | 1,41 | 100.000 |
| CAM | 6,40 | — |

Đơn giá tham khảo Admin cập nhật được, **không hardcode**.

### 1.3 Giao diện

```
┌ Máy tính khối lượng & giá ──────────────────────────────┐
│ Hình dạng  ⦿ Tấm  ○ Tròn đặc  ○ Ống                     │
│ Vật liệu   [Inox 304  ▾]   KLR 7,95 g/cm³               │
├──────────────────────────────────────────────────────────┤
│ Dài  [ 2750 ] mm    Rộng [ 1230 ] mm   Dày [ 2 ] mm     │
│ Số lượng [ 6 ]                                           │
├──────────────────────────────────────────────────────────┤
│ Khối lượng      322,71 kg                                │
│ Đơn giá         [    78.000 ] đ/kg                       │
│ ─────────────────────────────────────────────            │
│ Thành tiền      25.171.380 đ                             │
│ Chưa VAT (10%)  22.883.073 đ                             │
├──────────────────────────────────────────────────────────┤
│                    [Chép kết quả vào dòng chứng từ]      │
└──────────────────────────────────────────────────────────┘
```

**Đặt ở hai chỗ:** trang Tiện ích (dùng độc lập), và **nút nhỏ ngay cạnh ô đơn giá** trên form báo giá — bấm mở popup, tính xong chép thẳng vào dòng. Hàm dùng chung là `TIENICH.moMayTinh({ khiChep })`.

Nút "Chép kết quả" điền `SO_LUONG_DON_VI_GIA`, `DON_GIA_CO_SO`, `DON_VI_GIA` (và `QUY_CACH` khi máy sinh được) vào dòng đang mở. Ba trường đầu đi liền nhau: thiếu một là DH-01 chặn lúc lưu.

*Màn hình Đơn hàng hiện không có ô nhập đơn giá* — đơn lập từ báo giá đã chốt và giá kéo sang, nên không có chỗ đặt nút. Khi nào có form lập đơn thủ công thì gắn nút y như ở báo giá.

### 1.4 Lối "tính tay" — phản hồi lần 1 §3.13

> *"Cho phép tính tay ... Hãy cho Nhân viên Mua hàng chọn đơn vị tính
> (PCS/KG/MET/LIT/M2 hoặc khác), đơn giá/đơn vị tính, khối lượng của đơn vị
> tính, thành tiền (đơn giá/đơn vị tính × khối lượng)."*

Ô **Hình dạng** có thêm lựa chọn rỗng *"— Tính tay (không theo hình dạng) —"*. Chọn nó thì khối kích thước và khối lượng riêng ẩn đi, còn lại ba ô: **đơn vị tính** · **số lượng theo đơn vị tính** · **đơn giá**.

- Đơn vị tính lấy từ **danh mục `DON_VI_TINH`**, không phải danh sách gõ cứng — chữ *"hoặc khác"* nghĩa là đơn vị nào Kho vận đã khai đều dùng được. Máy chủ xác thực bằng `catalog_service.kiem_dvt`.
- Đang tính theo hình dạng mà vẫn gõ số lượng theo đơn vị tính thì **số gõ tay thắng**; khối lượng vẫn hiện bên cạnh để đối chiếu.
- Chọn đơn vị khác `KG` nhưng chỉ nhập kích thước thì **báo lỗi**, không tự quy kg sang cái — sai gấp hàng nghìn lần mà vẫn ra một con số trông hợp lý.

---

## 2. Thông báo

### 2.1 Danh sách sự kiện

| Loại | Gửi cho | Ưu tiên |
|---|---|---|
| `CHO_DUYET` | Người duyệt của bộ phận | Cao |
| `DA_DUYET` | Người tạo phiếu | TB |
| `TRA_LAI` | Người tạo phiếu | Cao |
| `DE_NGHI_MOI` | Nhân viên Mua hàng | TB |
| `VIEC_MOI` | Người nhận việc | Cao |
| `TRE_HAN` | NV mua hàng + người yêu cầu | Cao |
| `SAP_TRE` | NV mua hàng | TB |
| `TRAO_DOI_MOI` | Mọi người liên quan phiếu | TB |
| `DOI_VAT_LIEU` | Kỹ thuật + người yêu cầu | Cao |
| `YEU_CAU_CAP_MA` | Kho vận | TB |
| `IQC_KHONG_DAT` | Mua hàng + người yêu cầu | Cao |
| `NHAC_KY_BU` | Người duyệt online hôm trước | Cao |
| `DIEU_XE_MOI` | Kho vận | TB |
| `TT_QUA_HAN` | Mua hàng + Kế toán | Cao |
| `DANH_GIA_DEN_HAN` | Mua hàng | Thấp |

### 2.2 Logic

```python
def gui(conn, nguoi_nhan, loai, tieu_de, bang=None, id_ban_ghi=None, noi_dung=None):
    if nguoi_nhan == nguoi_gay_ra_su_kien:
        return                                   # không tự thông báo cho chính mình
    repo.tao_thong_bao(conn, sinh_ma('TB'), nguoi_nhan, loai, tieu_de,
                       noi_dung, bang, id_ban_ghi, da_doc=False)

def gui_cho_vai_tro(conn, vai_tro, loai, tieu_de, **kw):
    for tk in repo.tai_khoan_theo_vai_tro(conn, vai_tro, trang_thai='HOAT_DONG'):
        gui(conn, tk.MA_NHAN_VIEN, loai, tieu_de, **kw)
```

Endpoint:
```
GET  /api/v1/thong-bao?chua_doc=true&gioi_han=50
POST /api/v1/thong-bao/da-doc     { ids[] }  hoặc  { tat_ca: true }
GET  /api/v1/thong-bao/dem        số chưa đọc, gọi khi đồng bộ
```

### 2.3 Giao diện

Chuông trên thanh trên với số chưa đọc. Bấm chuông → danh sách gom theo ngày. Bấm một thông báo → **mở thẳng đúng phiếu** và đánh dấu đã đọc.

```
┌ Thông báo ────────────────────── [Đánh dấu tất cả đã đọc] ┐
│ HÔM NAY                                                     │
│ ● 🔴 Đơn hàng PO-2026-000112 đã trễ 15 ngày          09:00  │
│ ● 🟠 Bạn được giao 5 dòng cần xử lý                  08:32  │
│ ○    Đề nghị DN-2026-000123 đã được duyệt            08:15  │
│ HÔM QUA                                                     │
│ ○ 💬 Ms. Như trao đổi trên DN-2026-000119            16:40  │
└─────────────────────────────────────────────────────────────┘
```

> **V2:** cân nhắc Zalo OA hoặc email cho thông báo ưu tiên Cao. Zalo thắng nhờ chuông báo — nếu app chỉ thông báo trong app thì người ở xưởng sẽ không thấy.

---

## 3. Trao đổi trên chứng từ

> Thay chỗ hai nhóm Zalo đang gánh. Trong Excel, nội dung này bị chôn trong cột `GHI CHÚ`: *"29/12 BP XN lấy 6 li trễ do gom xe SG"*, *"hết hàng chưa tìm được chờ chỉ đạo anh Huỳnh"*, *"11-12 chờ ckct xn 15-12 xn tiếp, chờ phản hồi"*.

```
GET  /api/v1/trao-doi?bang=DE_NGHI&id=DN-2026-000123
POST /api/v1/trao-doi   { bang, id_ban_ghi, noi_dung, id_tra_loi_cho? }
```

| Quy tắc | Nội dung |
|---|---|
| Gắn theo | Cả **phiếu** và **từng dòng** (`bang` = `DE_NGHI` hoặc `DE_NGHI_DONG`) |
| Đính kèm | Có — ảnh, PDF, bản vẽ |
| Sửa / xoá | **Không cho** — đây là bằng chứng trao đổi thay Zalo |
| Thông báo | Gửi cho mọi người liên quan phiếu: người tạo · người duyệt · NV mua hàng · người đã trao đổi trước đó |
| Nhắc tên | `@ma_nhan_vien` gửi thông báo riêng cho người đó |

---

## 4. Tệp đính kèm

```
POST   /api/v1/tep-dinh-kem      multipart: bang, id_ban_ghi, file
GET    /api/v1/tep-dinh-kem?bang=&id=
GET    /api/v1/tep-dinh-kem/{id}/tai-ve
DELETE /api/v1/tep-dinh-kem/{id}     chỉ người tải lên hoặc Quản trị
```

| Quy tắc | Nội dung |
|---|---|
| Loại cho phép | `jpg` `png` `pdf` `xlsx` `docx` `dwg` `step` |
| Kích thước | ≤ 20 MB/tệp |
| Ảnh từ điện thoại | Nén xuống ≤ 1600 px trước khi tải lên |
| Nơi lưu | `data/dinh-kem/{nam}/{thang}/{id}` — **không** lưu vào cơ sở dữ liệu |
| Bản vẽ kỹ thuật | Mức **Tối mật** (Hiến chương 8.1) — ghi nhật ký mọi lượt tải về |
| Quét virus | V2 |

---

## 5. Báo cáo sự cố

Chức năng có trong tài liệu Menu (*"Báo cáo sự cố & phản hồi"*).

```
POST /api/v1/su-co              { loai, muc_do, bang?, id_ban_ghi?, mo_ta }
GET  /api/v1/su-co              danh sách, lọc — THU THEO PHẠM VI người xem
POST /api/v1/su-co/{id}/xu-ly   { trang_thai?, huong_xu_ly?, nguoi_xu_ly?,
                                  giao_viec?, han_xu_ly?, phien_ban? }
```

Loại sự cố: `LOI_HE_THONG` · `SAI_DU_LIEU` · `HANG_LOI` · `NCC_KHONG_DAP_UNG` · `TRE_TIEN_DO` · `THIEU_THONG_TIN` · `KHAC`
Mức độ: `THAP` · `TRUNG_BINH` · `CAO` · `KHAN_CAP`

**Một endpoint cho cả ba việc, không tách `/dong` riêng.** Bản đặc tả đầu
liệt kê `/xu-ly` và `/dong` thành hai đường. Khi thi công thì gộp: đứng ở màn
hình, "nhận xử lý — giao cho ai — đã xong chưa" là MỘT quyết định của trưởng
bộ phận, và tách đôi buộc màn hình phải đoán xem lần bấm này gọi đường nào.
`trang_thai='DA_DONG'` là lối đóng phiếu, bắt buộc kèm `huong_xu_ly`.

### 5.1 Ai nhận thông báo (phản hồi lần 1 §3.13)

> *"Báo cáo sự cố gửi thông tin về cho TBP để TBP xử lý hoặc giao việc cho
> nhân viên xử lý."*

| Người nhận | Khi nào |
|---|---|
| **Trưởng bộ phận của người báo** | **luôn luôn** — họ là người phân việc |
| `QUAN_TRI_KY_THUAT` | khi loại là `LOI_HE_THONG` (phần mềm hỏng thì người sửa phần mềm phải biết) |
| `QUAN_TRI_NGHIEP_VU` | chỉ khi bộ phận đó **chưa có trưởng nào** trong hệ thống — nhánh đỡ để phiếu không rơi vào hư không |
| Người báo | khi phiếu **đóng**, kèm hướng xử lý |

### 5.2 Vòng xử lý

```
   báo  ──►  MO  ──nhận/giao──►  DANG_XU_LY  ──đóng──►  DA_DONG
                                     │
                                     └─ giao_viec=true → lập phiếu CONG_VIEC
                                        (loại KHAC) nên sự cố hiện luôn ở
                                        "Việc của tôi" của nhân viên
```

Chốt quyền: chỉ **Trưởng bộ phận**, **Quản trị**, hoặc **chính người đang
được giao xử lý** gọi được `/xu-ly` — xem `services/su_co.la_nguoi_dieu_phoi`.
Cố ý KHÔNG gác bằng một ô trong ma trận quyền: sự cố đến từ mọi màn hình, và
trưởng kho phải xử lý được phiếu "hàng lỗi" dù trang Tiện ích không phải chỗ
họ làm việc hằng ngày.

Danh sách sự cố **thu theo phạm vi**: Quản trị thấy toàn công ty, Trưởng bộ
phận thấy bộ phận mình cộng phiếu dính tới mình, người khác chỉ thấy phiếu
mình báo hoặc mình được giao. Mô tả sự cố hay chép nguyên văn dữ liệu đang
hỏng (số phiếu, tên hàng, có khi cả giá), nên "ai đăng nhập cũng đọc được
tất" là một lỗ rò, không phải một tiện ích.

Bảng `SU_CO` có thêm `MA_BO_PHAN` (chụp lúc báo, để hàng đợi của trưởng bộ
phận không đổi khi người báo chuyển bộ phận) và `ID_CONG_VIEC` — migration
`075_su_co_tbp_xu_ly.sql`, migration này cũng sửa ràng buộc mức độ từ
`NGHIEM_TRONG` sang `KHAN_CAP` cho khớp giao diện.

---

## 6. Quản trị hệ thống

### 6.1 Bốn tab

| Tab | Nội dung |
|---|---|
| **Người dùng & phân quyền** | Duyệt tài khoản chờ · gán vai trò · khoá · đặt lại mật khẩu · ma trận quyền |
| **Tham số hệ thống** | Giờ chốt · ngưỡng tiền · số ngày SLA · **chế độ từng quy tắc** |
| **Nhật ký thay đổi** | Tra cứu ai sửa gì, lúc nào, giá trị cũ → mới |
| **Lưu trữ** | Chuyển dữ liệu cũ · phục hồi · tra cứu kho lưu trữ |

### 6.2 Màn hình tham số — bảng bật/tắt chế độ quy tắc

Đây là màn hình quan trọng nhất của tab Quản trị, vì nó điều khiển nguyên tắc *"mọi quy tắc có hai chế độ"*.

```
┌ Tham số hệ thống › Chế độ quy tắc ──────────────────────────┐
│ Mã     │Quy tắc                              │Chế độ        │
│ DN-03  │Một LSX chỉ đề nghị vật tư một lần   │[Cảnh báo ▾]  │
│ DN-04  │ĐNVT không gắn LSX cần Ban lãnh đạo  │[Cảnh báo ▾]  │
│ BG-01  │Tối thiểu 2 báo giá                  │[Cảnh báo ▾]  │
│ BG-04  │Chưa xác nhận kỹ thuật               │[Cảnh báo ▾]  │
│ DH-08  │NCC chưa được phê duyệt              │[Cảnh báo ▾]  │
│        │  ⓘ Đã phê duyệt 128/370 NCC (35%). Nên chuyển sang │
│        │    "Chặn" khi đạt ~95%.                            │
│ DM-01  │Mã vật tư đúng cấu trúc              │[Chặn ▾]      │
│ NH-04  │Cảnh báo giao thừa                   │[Cảnh báo ▾]  │
└──────────────────────────────────────────────────────────────┘
```

Mỗi dòng có chỉ báo tiến độ dữ liệu nền để Admin biết **khi nào** chuyển sang `CHAN` là an toàn.

### 6.3 Nhật ký thay đổi

```
┌ Nhật ký thay đổi ────────────────────────────────────────────┐
│ [01/08/26][31/08/26] [Người dùng ▾] [Bảng ▾] [Hành động ▾]   │
├───────────────────────────────────────────────────────────────┤
│ Thời điểm      │Người    │Hành động│Bảng      │Chi tiết       │
│ 27/08 14:05:22 │Mr. Vỹ   │DUYỆT    │DE_NGHI   │DN-2026-000123 │
│                │         │         │          │IP 10.0.1.42   │
│ 27/08 13:58:10 │Ms. Như  │SỬA      │DON_HANG_DONG│DON_GIA     │
│                │         │         │          │28.000→27.500  │
│ 27/08 11:20:03 │Mr. Sáng │XUẤT     │BAO_CAO   │BC01 · 1.243 dòng│
└───────────────────────────────────────────────────────────────┘
```

**Nhật ký chỉ ghi thêm, không sửa, không xoá.** Kể cả `QUAN_TRI_KY_THUAT` cũng **không có endpoint** sửa nhật ký — vì đây là thứ thay chữ ký giấy.

**Hai thao tác của chính màn Quản trị cũng phải để lại vết** (mô tả chức năng §3.14 + §4.4 "mọi thao tác ghi"):

| Bảng ghi vào nhật ký | Khi nào | Nội dung |
|---|---|---|
| `THAM_SO_HE_THONG` | sửa một tham số | `GIA_TRI` cũ → mới, kèm IP và thiết bị |
| `PHAN_QUYEN` | sửa một ô ma trận | `XSDU:phạm_vi` cũ → mới, id bản ghi là `VAI_TRO/TRANG` |

Trước 02/09/2026 cả hai thao tác này **không để lại dòng nào** — tab Tham số, thứ mô tả gọi là *"màn hình quan trọng nhất của cả hệ thống"*, là màn hình duy nhất thay đổi mà không truy được ai làm. Giá trị cũ phải đọc **trước** câu `UPDATE` và **trong cùng giao dịch**; đọc qua cache tham số có thể lấy phải số đã cũ 60 giây.

### 6.4 Lưu trữ — lời giải cho "dữ liệu nặng"

Thay cho việc chuyển thủ công sang sheet `TONG HOP`.

```
┌ Lưu trữ dữ liệu ─────────────────────────────────────────────┐
│ Chuyển dữ liệu cũ hơn  [18 ▾] tháng                          │
│                                            [Xem trước]        │
├───────────────────────────────────────────────────────────────┤
│ SẼ CHUYỂN                                                     │
│ DE_NGHI              1.842 phiếu                              │
│ DE_NGHI_DONG         6.104 dòng                               │
│ DON_HANG             1.204 phiếu                              │
│ NHAN_HANG            1.388 phiếu                              │
│ ─────────────────────────────────────────                     │
│ Tổng                12.847 bản ghi                            │
│                                                               │
│ ⓘ Điều kiện: đã HOÀN THÀNH hoặc HUỶ, đã bàn giao chứng từ.   │
│   Dữ liệu vẫn tra cứu được ở tab "Kho lưu trữ".              │
│   Hệ thống tự sao lưu trước khi chuyển.                      │
│                                    [Chuyển sang kho lưu trữ] │
└───────────────────────────────────────────────────────────────┘
```

```python
def chuyen_luu_tru(den_ngay, ho_so):
    sao_luu_truoc_thao_tac_hang_loat()
    with giao_dich() as conn:
        for bang in THU_TU_LUU_TRU:          # theo thứ tự khoá ngoại
            repo.chuyen_sang_schema(conn, bang, 'luu_tru', dieu_kien(den_ngay))
    return thong_ke
```

Dùng schema `luu_tru` trong cùng database — giữ nguyên `ID`, vẫn `JOIN` được khi cần tra cứu.

---

## 7. Sao lưu

| Việc | Yêu cầu | Thực hiện |
|---|---|---|
| Sao lưu tự động | Hàng ngày, giữ **30 bản** | `pg_dump` qua cron |
| Nơi lưu | Ít nhất **2 nơi** | Ổ dữ liệu + ổ mạng nội bộ |
| Thử phục hồi | **Mỗi quý một lần**, có biên bản | Quy trình thủ công, ghi vào docs |
| Trước thao tác hàng loạt | Bắt buộc | Nhập lô · gộp mã · lưu trữ tự gọi |

> Bản sao lưu chưa từng phục hồi thử coi như không tồn tại.

---

## 8. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tính khối lượng `2750×1230×2×7,95×6/1.000.000` | `322,71 kg` |
| 2 | Tính khối lượng `14×150×330×7,85×1/1.000.000` | `5,44 kg` |
| 3 | Đơn giá 78.000, KL 322,71 | `THANH_TIEN = 25.171.380` |
| 4 | Giá chưa VAT của 25.171.380 | `22.883.073` |
| 5 | Chép kết quả vào dòng chứng từ | Điền `TRONG_LUONG`, `DON_GIA_CO_SO`, `DON_VI_GIA = KG` |
| 6 | Duyệt một đề nghị | Người tạo nhận thông báo, **người duyệt không** tự nhận |
| 7 | Bấm thông báo | Mở đúng phiếu, thông báo chuyển đã đọc |
| 8 | Gửi trao đổi | Mọi người liên quan phiếu nhận thông báo |
| 9 | Sửa trao đổi đã gửi | Không có endpoint — `404` hoặc `405` |
| 10 | Tải lên tệp 25 MB | `422`, nêu rõ giới hạn 20 MB |
| 11 | Tải về bản vẽ kỹ thuật | Có bản ghi nhật ký `HANH_DONG = XEM` |
| 12 | Đổi `CHE_DO_QT_MA_VAT_TU` sang `CHAN` | Quy tắc chuyển sang chặn ngay, không cần khởi động lại |
| 13 | Tìm nhật ký một chứng từ | Ra đủ chuỗi TẠO → SỬA → DUYỆT với giá trị cũ/mới |
| 14 | Gọi endpoint sửa nhật ký | Không tồn tại |
| 15 | Xem trước lưu trữ | Đúng số bản ghi đủ điều kiện |
| 16 | Chuyển lưu trữ | Có bản sao lưu trước đó; dữ liệu vẫn tra cứu được ở kho lưu trữ |
| 17 | Phục hồi từ kho lưu trữ | Bản ghi quay lại bảng chính, giữ nguyên `ID` |
| 18 | Vai trò `QUAN_TRI_NGHIEP_VU` mở tab Người dùng | `403` — chỉ `QUAN_TRI_KY_THUAT` |
