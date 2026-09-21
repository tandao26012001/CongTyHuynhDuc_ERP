# 02 — Chuẩn hoá trước khi dev

> Mọi quy ước ở đây thuộc **Nhóm B** của Hiến chương (phải hỏi Trưởng R&D trước khi đổi).
> Đây là phần phải chốt xong trước khi tạo bảng đầu tiên.

---

## 1. Mã vật tư

### 1.1 Cấu trúc

Ký tự cho phép: **`A–Z`, `0–9`, dấu `-`**. Không dấu tiếng Việt, không khoảng trắng, không ký tự đặc biệt (`⌀ * / ,`). Hệ thống tự viết hoa và chặn ký tự lạ ngay khi gõ.

```
TH-[NHOM]-[STT]                          kho vật tư tiêu hao
VT-[TT]-[MVL]-[LOAIHINH?]-[STT]          kho nguyên vật liệu
VT-SX-[STT]                              linh kiện theo PO / lệnh sản xuất
TL-[LOAITOOL]-[VLM]-[STT]                kho tools
[MA_VACH]                                kho thành phẩm
```

| Thành phần | Giá trị hợp lệ |
|---|---|
| `NHOM` | `TP` trang phục · `VP` văn phòng phẩm · `CT` căn tin & vệ sinh · `HC` hoá chất · `BH` bảo hộ · `SX` dụng cụ & vật tư tiêu hao SX · **`TDH`** linh kiện tự động hoá · `NK` ngũ kim · `VI` vít · `LD` lông đền · `TA` tán · `BL` bulong · `LGT` lục giác đầu trụ · `LGC` lục giác đầu côn · `LGA` lục giác âm · `LGD` lục giác đầu dù |
| `TT` (tình trạng phôi) | `NC` nguyên cây · `LC` lẻ cây · `TN` tấm nguyên · `TL` tấm lẻ · `PT` phôi tấm · `PL` phôi lẻ |
| `MVL` | 2–10 ký tự viết tắt mã vật liệu: `SUS201` `SUS304` `S45C` `NAK55` `A6061` `POM`… |
| `LOAIHINH` | `ON` ống · `VU` vuông · `CU` chữ U · `CV` chữ V · `HO` hộp — **tuỳ chọn** |
| `LOAITOOL` | `MK` mũi khoan · `MP` mũi phay · `MR` mũi reamer · `DT` dao tiện · `MC` mâm cặp |
| `VLM` | 2–4 ký tự vật liệu làm tool: `HSS` `CARB`… |
| `STT` | **3 chữ số, đệm 0**: `001`…`999` |

**Biểu thức chính quy để kiểm tra:**
```python
RE_TH = r'^TH-(TP|VP|CT|HC|BH|SX|TDH|NK|VI|LD|TA|BL|LGT|LGC|LGA|LGD)-\d{3}$'
RE_VT = r'^VT-(NC|LC|TN|TL|PT|PL)-[A-Z0-9]{2,10}(-(ON|VU|CU|CV|HO))?-\d{3}$'
RE_SX = r'^VT-SX-\d{3,}$'
RE_TL = r'^TL-(MK|MP|MR|DT|MC)-[A-Z0-9]{2,4}-\d{3}$'
```

Ví dụ hợp lệ: `TH-SX-203` · `TH-TDH-014` · `VT-NC-SUS201-HO-014` · `VT-SX-0421` · `TL-MK-HSS-007`

### 1.2 Ba thay đổi so với QT-KV-01-PL02

| Nội dung | PL02 viết | Chốt lại |
|---|---|---|
| Nhóm tự động hoá | `TĐH` (có dấu) | **`TDH`** |
| Số thứ tự | "bắt đầu từ 01" (ngầm 2 chữ số) | **3 chữ số**, vì dữ liệu thật đã có `TH-SX-210` |
| Dấu phân cách | Cấu trúc dùng `-`, nhưng ví dụ viết `VT NC SUS201 HO 01` bằng dấu cách | **Luôn dùng `-`**, không khoảng trắng. Cần sửa lại văn bản PL02 |

### 1.3 Phôi gốc và phôi lẻ

Là **hai mã vật tư riêng biệt**. Nghiệp vụ: xuất mã phôi nguyên cây (mặc định coi như dùng hết cây) → nhập lại phôi lẻ như một mã mới, có tham chiếu về mã gốc.

- Bảng `VAT_TU` có cột `ID_VT_GOC` (khoá ngoại tự trỏ), `NULL` nếu là phôi gốc.
- **Mã vật tư là BẤT BIẾN.** Không bao giờ đổi mã theo vòng đời. Đây là điều kiện để mã dùng làm khoá nối với hệ Kho vận.
- Nghiệp vụ xuất/nhập phôi lẻ **thuộc hệ Kho vận**. Hệ Mua hàng chỉ **lưu quan hệ** mã gốc → mã lẻ trong danh mục, không sinh mã lẻ, không tính tồn.

### 1.4 Ai sở hữu

| | |
|---|---|
| **Sở hữu** | Bộ phận Kho vận — quy định cả **mã vật tư** lẫn **tên hàng** cho toàn công ty |
| Hàng mới nhập chưa có mã | Kho vận cấp mã |
| Hệ Mua hàng | **Chỉ đọc.** Màn hình quản trị danh mục vật tư phân quyền cho vai trò **Kho vận**, không phải Mua hàng |
| Cột đánh dấu | `NGUON_SO_HUU = 'KHO_VAN'` trên bảng `VAT_TU` |
| Lớp truy cập | Mọi truy cập đi qua `services/catalog_service.py` để sau này đổi sang gọi API mà không sửa nghiệp vụ |

### 1.5 Chức năng bắt buộc phải có: **Yêu cầu cấp mã vật tư**

Không có luồng này thì tỷ lệ 4,1% sẽ không nhúc nhích, vì người dùng không có đường nào để xin mã ngoài việc bỏ trống.

```
Mua hàng / BP yêu cầu gặp mặt hàng chưa có mã
   → tạo Yêu cầu cấp mã (tên hàng đề xuất, quy cách, ĐVT, ảnh/bản vẽ)
   → dòng đề nghị chuyển trạng thái CHO_CAP_MA
   → Kho vận cấp MA_VAT_TU + TEN_HANG chuẩn
   → mã tự gắn ngược vào dòng đề nghị, trạng thái trở lại luồng bình thường
```

---

## 2. Định danh mặt hàng — chiến lược hai giai đoạn

Đây là điểm quan trọng nhất của toàn bộ thiết kế.

### 2.1 Hiện trạng

- Mã vật tư đúng quy tắc: **4,1%** số dòng.
- Mã vạch **không phải** mã hàng — 19,2% mã vạch mang nhiều tên hàng khác nhau.
- 9.575 tên hàng khác nhau cho 12.028 dòng.

→ Mục tiêu "nắm bắt theo từng mã hàng" **hiện không thực hiện được**.

### 2.2 Chiến lược đã chốt

| | Giai đoạn 1 (V1, ngay) | Giai đoạn 2 (sau khi MH và KV thống nhất) |
|---|---|---|
| Chủ thể quản lý | **`TEN_HANG`** | **`MA_VAT_TU`** (chủ thể chính) + `TEN_HANG` |
| `MA_VAT_TU` | `UNIQUE`, **cho phép `NULL`** | `UNIQUE`, `NOT NULL` |
| `TEN_HANG` | `UNIQUE`, `NOT NULL` | `UNIQUE`, `NOT NULL` |
| Dữ liệu cũ | Cho phép `MA_VAT_TU = NULL`, giữ nguyên `TEN_HANG_CU` | Chuẩn hoá dần qua màn hình gộp |
| Dòng mới | Bắt buộc chọn từ danh mục (không gõ tự do) | Bắt buộc có mã |

**Thiết kế bảng phải chịu được cả hai giai đoạn ngay từ đầu:**

```sql
CREATE TABLE VAT_TU (
  ID           VARCHAR(20) PRIMARY KEY,          -- VT-000001, bất biến
  MA_VAT_TU    VARCHAR(40) UNIQUE,               -- NULL được ở V1
  TEN_HANG     VARCHAR(300) UNIQUE NOT NULL,     -- chủ thể quản lý ở V1
  ...
);
```

`ID` nội bộ là khoá chính bất biến. Mọi bảng giao dịch trỏ về `ID`, **không** trỏ về `MA_VAT_TU` hay `TEN_HANG` — nhờ vậy khi Giai đoạn 2 gán mã và sửa tên, toàn bộ chứng từ lịch sử không bị đứt.

### 2.3 Không dùng bảng bí danh — thay bằng ba cơ chế

Đã chốt: **một mã vật tư → một tên hàng, quản lý độc nhất.** Không có bảng bí danh. Thay vào đó:

1. **Tìm kiếm mờ** trên `TEN_HANG` (không dấu, bỏ khoảng trắng thừa, khớp một phần).
2. **Cảnh báo trùng gần** khi tạo tên mới giống >85% một tên đã có → hiện danh sách tên gần giống để người dùng chọn thay vì tạo mới.
3. **`TEN_NCC_GHI_TREN_CHUNG_TU`** lưu **trên dòng chứng từ**, không phải trong danh mục — để đối chiếu hoá đơn khi NCC gọi tên khác. Danh mục vẫn độc nhất.

### 2.4 Công cụ gộp mã hàng (bắt buộc cho Giai đoạn 2)

Màn hình cho vai trò Kho vận:
- Nhóm các tên hàng gần giống nhau theo thuật toán so khớp chuỗi.
- Chọn tên chuẩn → gán `MA_VAT_TU` → các bản ghi còn lại chuyển thành *đã gộp*, mọi chứng từ lịch sử trỏ về `ID` mới.
- Ghi vào `LICH_SU_GOP_VAT_TU` để truy ngược.

---

## 3. Mã hàng sản xuất (khác mã vật tư)

| Trường | Nguồn | Ý nghĩa | Hệ Mua hàng |
|---|---|---|---|
| `MA_HANG` | Hệ Kế hoạch Sản xuất | Mã chi tiết theo bản vẽ, ví dụ `2021-70-5318-01`. **Ổn định khi khởi tạo.** Một mã có thể đặt lại nhiều lần | **Chỉ đọc**, không bao giờ tạo mới |
| `MA_VACH` | Hệ Kế hoạch Sản xuất | Mã lô / dòng lệnh sản xuất, ví dụ `26073265907WO` (11 số + `WO`) | Chỉ đọc |
| `MA_LENH` / `LENH_SAN_XUAT` | Hệ Kế hoạch Sản xuất | `MBC0326-018-CKCT` = [khách][MMYY]-[STT]-[bộ phận][-P/T] | Chỉ đọc |
| `MA_CONG_DOAN` | Hệ Kế hoạch Sản xuất | `CD01`…`CD39` + `GCN` | Chỉ đọc |

Quan hệ: **1 `MA_HANG` → N `LENH_SAN_XUAT` → N `MA_VACH`**

---

## 4. Đánh số chứng từ

### 4.1 Quy tắc mới

```
[TIỀN TỐ]-[YYYY]-[STT 6 chữ số]        ví dụ:  DN-2026-000123
```

Số thứ tự chạy lại từ `000001` mỗi năm, theo từng tiền tố. Sinh số **ở tầng data/** trong cùng giao dịch với việc ghi bản ghi, để không trùng khi hai người bấm cùng lúc.

Danh sách tiền tố đã đăng ký: xem `00_AI_RULES.md` §4.

### 4.2 Giữ số cũ

Hiện có **12 hệ đánh số khác nhau**, trong đó `06-510` (PGH nội bộ) và `06-510` (phiếu GCN) **trùng khuôn dạng và sẽ đụng nhau**.

Mọi bảng chứng từ có cột **`SO_PHIEU_CU`** giữ nguyên số cũ (`CKCT-2301-01`, `06-510`, `HDBH2607001`…), phục vụ tra cứu ngược. Cột này **không** unique và **không** dùng làm khoá.

### 4.3 Ánh xạ tiền tố bộ phận

Số phiếu ĐNVT hiện dùng nhiều tiền tố hơn số bộ phận trong danh mục.

**Quyết định:** Mua hàng tiếp tục dùng tên cũ trên chứng từ; **danh mục dùng mã mới**; giữ nội dung cũ nhưng chuẩn hoá theo nội dung mới; cập nhật lại mã bộ phận sau.

Bảng `ANH_XA_TIEN_TO`:

| `TIEN_TO_CU` | `MA_BO_PHAN` | Ghi chú |
|---|---|---|
| `CKCT`, `GCCX` | `CX` | Gia Công Chính Xác |
| `KC`, `KC3`, `GCKC3`, `QCKC` | `KC1` / `KC2` / `KC3` | cần Mua hàng xác nhận từng tiền tố |
| `TDH`, `TĐH` | `TD` | Tự Động Hoá |
| `KKD` | `KD` | Kinh Doanh |
| `PKT` | `KT` | Kỹ Thuật |
| `KV` | `KV` | Kho Vận |
| `QC` | `QC` | |
| `BT` | *(chưa có)* | Bảo trì — nhóm trong bộ phận nào? |
| `IT`, `RD`, `BV` | *(chưa có)* | IT · R&D · Bảo vệ |
| `KHSXB` | *(chưa có)* | Kế hoạch sản xuất |

→ Khi nhập tiền tố chưa có ánh xạ, hệ thống **cảnh báo** và cho Admin bổ sung ngay tại chỗ.

---

## 5. Danh mục dùng chung — trạng thái và việc phải làm

| Danh mục | Hiện có | Cần làm | Ai chịu trách nhiệm |
|---|---|---|---|
| **Vật tư** | 494 mã hợp lệ / 9.575 tên | Chuẩn hoá tên → gán mã. Ưu tiên 3 nhóm chiếm 44% khối lượng: sắt thép, inox, dao cụ | Kho vận |
| **Đơn vị tính** | 115 giá trị cho ~15 đơn vị | Gom về danh mục cố định, bắt chọn từ danh sách | Kho vận |
| **Chủng loại** | 183 giá trị | Gom về ~30, giữ làm trường riêng phục vụ báo cáo mua hàng | Mua hàng |
| **Mục đích sử dụng** | 13 mã, có `6.AMTGĐ2` và `13.AMTGĐ2` trùng tên | **Anh Long sẽ cấp bảng chuẩn** | Mua hàng |
| **Nhà cung cấp** | 799 (mua hàng) + 103 (gia công) | **Gộp thành một bảng** `NHA_CUNG_CAP` có cờ vai trò | Mua hàng |
| **Khách hàng** | nằm lẫn trong danh mục 103 | **Tách ra bảng riêng** `KHACH_HANG` | Kinh doanh |
| **NCC được phê duyệt** | **0 dòng** (BM03 trống) | Lập danh sách. Đến khi có, quy tắc chỉ ở chế độ CẢNH BÁO | Mua hàng |
| **Nhân viên** | 175 người trong `02_nhan_vien.csv` | Nạp vào, đối chiếu với 44 tên tự do trong Excel | Nhân sự / R&D |
| **Bộ phận** | 14 mã | Bổ sung nhóm còn thiếu (BT, IT, RD, BV, KHSXB) | R&D |
| **Loại gia công** | 14 loại | Chốt số ngày chuẩn — xem §6 | Mua hàng |
| **Xe & tài xế** | 8 loại xe, 9 tài xế | **Sửa mâu thuẫn biển số** giữa hai file | Kho vận |
| **Lịch nghỉ** | có mẫu ở `04_downtime.csv` | **Xây file riêng**, dùng lại cấu trúc, chuẩn hoá ngày về `YYYY-MM-DD` | Hành chính |

---

## 6. Thời gian gia công ngoài — ba nguồn phải hợp nhất

| Loại gia công | QT-MH-01 | Sheet `THỜI GIAN GC-1` | Chốt |
|---|---|---|---|
| Ăn mòn | 5–7 | 7 | 7 |
| **Bọc su** | **7–10** | **7** | ❓ cần chốt |
| Làm nhông bánh răng | 5–7 | 7 | 7 |
| **Đột lỗ lưới** | **7–10** | **7** | ❓ cần chốt |
| Cấy cước | 7 | 7 | 7 |
| Phủ teflon | 7 | 7 | 7 |
| Sơn tĩnh điện | 5–7 | 5 | 5 |
| Mài tròn | 5 | 5 | 5 |
| EDM · cắt dây · bắn tia | 4 | 4 | 4 |
| Xử lý nhiệt | 4–7 | 4 | 4 |
| Uốn ống · lốc ống | 2–7 | 3 | 3 |
| Xi mạ | 3–5 | 3 | 3 |
| Nắn thẳng | 3–5 | 3 | 3 |
| **Mạ kẽm** | *(không có)* | 3 | 3 |

**Nguồn thứ ba:** cột `KH QUY ĐỊNH` trong danh mục KH&NCC — số ngày theo **từng nhà cung cấp** (AT COATING xi mạ = 4, TECH COAT xi mạ = 3), và đó chính là nguồn công thức Excel đang dùng.

**Quy tắc áp dụng đã chốt:**
```
SO_NGAY_CHUAN = COALESCE( NHA_CUNG_CAP.KY_HAN_QUY_DINH ,   -- ghi đè theo NCC nếu có thoả thuận riêng
                          LOAI_GIA_CONG.SO_NGAY_CHUAN )      -- mặc định theo loại gia công
```
Trên phiếu phải **hiển thị rõ đang áp nguồn nào**.

---

## 7. Đơn vị và thang đo (Hiến chương 1.3 + 2.2)

| Trường | Kiểu | Đơn vị | Số lẻ |
|---|---|---|---|
| Tiền (`DON_GIA`, `THANH_TIEN`, `TONG_TIEN`) | `BIGINT` | **VND** | **0** — số nguyên |
| Đơn giá cơ sở theo trọng lượng | `BIGINT` | VND / kg hoặc VND / m | 0 |
| `SO_LUONG` | `NUMERIC(14,4)` | theo `DVT` | theo `DON_VI_TINH.SO_LE` |
| `TRONG_LUONG` | `NUMERIC(14,4)` | **kg** | 4 |
| `SO_KM` | `NUMERIC(8,1)` | km | 1 |
| Tỷ lệ (`TY_LE_DUNG_HAN`) | `NUMERIC(5,2)` | **phần trăm 0–100** | 2 |
| `SO_NGAY_*` | `INTEGER` | **ngày làm việc** | — |
| Ngày | `DATE` | `YYYY-MM-DD` | — |
| Ngày giờ | `TIMESTAMPTZ` | `Asia/Ho_Chi_Minh` | — |
| VAT | hằng số cấu hình | 10% → `GIA_TRUOC_VAT = GIA / 1,1` | — |

**Quy tắc làm tròn tiền:** làm tròn ở **bước cuối cùng** khi hiển thị và khi lưu `THANH_TIEN`, dùng `ROUND(x)` về số nguyên đồng. Không để `86666.66666666667` như file Excel cũ.

---

## 8. Lịch làm việc

**Đã chốt:** xây file/bảng riêng, **không** dùng chung `04_downtime.csv` của hệ Kế hoạch Sản xuất, nhưng **dùng lại cấu trúc** đó.

```
LICH_NGHI
  ID · NGAY_BAT_DAU (DATE) · NGAY_KET_THUC (DATE)
  MA (VARCHAR)        -- 'ALL' = toàn công ty, hoặc MA_NHAN_VIEN
  TEN (VARCHAR)
  LOAI_NGHI (VARCHAR) -- CHU_NHAT | NGHI_LE | NGHI_TET | NGHI_PHEP | KHAC
  GHI_CHU
```

**Quy tắc ngày làm việc:**
```python
def la_ngay_lam_viec(d: date) -> bool:
    # Công ty làm THỨ HAI – THỨ BẢY, 08:00–16:40
    if d.weekday() == 6:                      # Chủ nhật
        return False
    return not co_trong_lich_nghi(d, ma='ALL')

def cong_ngay_lam_viec(d: date, n: int) -> date:
    ...  # cộng n ngày làm việc, bỏ qua ngày nghỉ
```

Mọi tính toán SLA, cảnh báo trễ hạn, và KPI COP-03 **bắt buộc** đi qua hai hàm này. Đặt ở `services/lich_lam_viec.py`.

Ngày trong `04_downtime.csv` mẫu đang ghi `1/6/26` và `24/05/26` — khi nạp phải chuẩn hoá về `YYYY-MM-DD`.

---

## 9. Giờ chốt trong ngày

| Mốc | Giờ | Sau giờ đó |
|---|---|---|
| Gửi đề nghị vật tư | **13:30** | Tính vào ngày làm việc kế tiếp |
| Gửi đề nghị gia công ngoài | **15:00** | Tính vào ngày làm việc kế tiếp |
| Phiếu điều xe (đi và về) | **15:45** | — |

Cả ba nằm trong bảng `THAM_SO_HE_THONG`, Admin sửa được, **không hardcode**.

Hệ thống tự đóng dấu `NGAY_HIEU_LUC` và hiển thị nhãn *"tính vào ngày làm việc kế tiếp"* ngay trên phiếu — đây là chỗ tranh cãi thường xuyên nhất và cũng là chỗ dễ tự động nhất.

> **Lưu ý mâu thuẫn tài liệu:** sheet `MENU` của file GCN ghi "chuyển thông tin trước 16h00". Đã chốt lấy **15:45** theo QT-MH-01; cần sửa lại nội dung sheet MENU.

---

## 10. Chuẩn hoá trạng thái

Mọi trạng thái là **chuỗi mã không dấu, viết hoa**.

```
Chứng từ đề nghị / đơn hàng:
  NHAP · CHO_XAC_NHAN_KT · CHO_CAP_MA · CHO_DUYET · CHO_KY_BU · DA_DUYET
  DANG_BAO_GIA · DA_DAT_HANG · DANG_GIAO · GIAO_MOT_PHAN · HOAN_THANH
  TRA_LAI · TAM_NGUNG · IQC_KHONG_DAT · HUY

Tài khoản:      CHO_DUYET · HOAT_DONG · KHOA
Yêu cầu TT:     CHUA_TT · TT_MOT_PHAN · DA_TT
Điều xe:        CHUA_XU_LY · DANG_XU_LY · HOAN_THANH
Đánh giá NCC:   DAT · KHONG_DAT · CANH_BAO · TAM_NGUNG · LOAI_BO
```

**Bốn trạng thái mà file Excel có nhưng checklist bỏ sót:**
- `TRA_LAI` — Mua hàng có quyền trả phiếu khi thiếu thông tin (QT-MH-01 §7.2)
- `CHO_KY_BU` — duyệt online khi người duyệt vắng, ký bổ sung ngày làm việc kế tiếp
- `CHO_CAP_MA` — chờ Kho vận cấp mã vật tư
- `TAM_NGUNG` — trong Excel ghi bằng text "TẠM NGƯNG CHỜ KH"

**Quan trọng:** các trạng thái mà Menu liệt kê — *đang báo giá · đã đặt hàng · đang giao · đã giao đúng hạn / trễ* — **không phải trạng thái của một chứng từ**. Đó là **trạng thái tổng hợp ở cấp mã hàng**, chạy xuyên nhiều chứng từ, và phải **suy ra khi đọc**, không lưu thành cột enum. Đây chính là thứ khớp với mục tiêu "nắm bắt theo từng mã hàng".

---

## 11. Chuẩn hoá dữ liệu cũ khi nạp

| Trường | Hiện trạng | Xử lý khi nạp |
|---|---|---|
| `ĐVT` | 115 giá trị | Chuẩn hoá hoa/thường + bỏ khoảng trắng thừa → gom về danh mục. `PCS`/`pcs`/`Pcs` → `PCS` |
| `NGƯỜI YÊU CẦU` | 44 tên tự do | Đối chiếu với 175 nhân viên → gán `MA_NHAN_VIEN`. Không khớp thì để `NULL` + giữ `TEN_CU` |
| `NHÀ CUNG CẤP` | 370 tên viết tắt | Khớp với `MA_NCC` (99,1% khớp được). 26 tên còn lại tạo mới hoặc gắn cờ cần rà |
| `MÃ VẬT TƯ` | 15,3% điền, phần lớn là chủng loại | Chỉ nhận giá trị khớp regex ở §1.1. Còn lại chuyển sang cột `CHUNG_LOAI_CU` |
| `SỐ PGH NỘI BỘ` | nhồi `12-539/01-022` | **Tách thành nhiều dòng** trong bảng `NHAN_HANG` |
| `GHI CHÚ` | chứa nghiệp vụ ẩn | Giữ nguyên vào `GHI_CHU`; thêm bước rà tay để trích trạng thái `HUY` / `TAM_NGUNG` |
| Ô rác | `=>⌀63`, `=5*3` | Bỏ, ghi vào log nạp liệu |
| Đơn giá | đã bị che (187.000 / 51.800) | Nạp dữ liệu giả theo phân bố hợp lý |
| Ngày | lẫn serial Excel và text | Chuẩn hoá về `DATE`; không parse được thì `NULL` + ghi log |

**Nguyên tắc nạp:** không bao giờ im lặng bỏ dòng. Mọi dòng không nạp được phải vào **báo cáo đối soát** với lý do cụ thể (Hiến chương 9.1 yêu cầu có báo cáo đối soát trước khi vào thử nghiệm).
