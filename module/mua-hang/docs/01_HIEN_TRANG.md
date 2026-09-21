# 01 — Hiện trạng hệ thống Excel

> Mục đích: để người viết code hiểu **hệ thống mới phải làm được đúng những gì hệ thống cũ đang làm**.
> Ưu tiên cao nhất của dự án: logic hoạt động đúng và **sát nhất với hai file Excel hiện tại**.

---

## 1. Hai file Excel đang vận hành

| | File Mua hàng | File GCN & Điều xe |
|---|---|---|
| Tên | `MUA HANG MẪU GỬI LONG.xlsx` | `Quản lý GCN+ĐX 2026.xlsm` |
| Kích thước | 6,51 MB · 25 sheet | 8,28 MB · 23 sheet · 5 macro VBA |
| Đường dẫn thật | `\\SRV\01. Kinh Doanh\PKD_MH_GCN\QUẢN LÝ MUA HÀNG + GIA CÔNG NGOÀI\` | cùng thư mục |
| Dòng nghiệp vụ thật | **12.028** (12/2025 – 07/2026) | **6.059** dòng · **753** phiếu |
| Công thức | 37.938 | 72.729 |

**VBA chỉ có 5 macro nhỏ** — không có logic ứng dụng nào đáng kể:
`Refreshpivots` (×2, làm mới pivot) · `XuatPDFBCN` (xuất báo cáo tồn đọng ra PDF) · `xuatfile_gcnloc` (chép vùng A4:B100 sang workbook mới rồi định dạng in) · `xuatpdfncr` (xuất NCR ra PDF theo khoảng trang).
→ **Không có gì phải "port" từ VBA.** Toàn bộ trí tuệ nằm ở cấu trúc bảng, công thức và kỷ luật thủ công.

---

## 2. Bảng xương sống: `THEO DOI MUA HANG` (Excel Table = `TDDH`)

13.626 hàng × 37 cột. Đây là bảng quan trọng nhất — mô hình dữ liệu mới phải phủ hết 37 cột này.

| Cột | Tên | Ý nghĩa & ghi chú |
|---|---|---|
| A | ID SP | Định danh dòng. 3 biến thể: `11344-25`, `1267-1`, `9247`. Gần như độc nhất (12.026/12.027) |
| B | SỐ PHIẾU ĐNSX | **Lệnh sản xuất**. `MBC0326-018-CKCT` = [KH][MMYY]-[STT]-[BP][-P/T]. 1.804 LSX / 8.966 dòng |
| C | NGÀY PHÁT LSX | |
| D | NGƯỜI YÊU CẦU | Văn bản tự do: `Mr. Sáng`, `Mr. Quang TM`, `Mr.Bảo kho`. 44 giá trị. **Không có mã nhân viên** |
| E | Ngày ĐNVT | |
| F | SỐ PHIẾU ĐNVT | `CKCT-2301-01`. **25 khuôn dạng khác nhau** |
| G | NHÀ CUNG CẤP | Tên viết tắt tự do. 370 giá trị dùng thật |
| H | SỐ ĐƠN ĐẶT HÀNG | Chỉ điền **37,7%**. Trộn PO của HĐ (`HDBH2607001`, `KNHD-2601-019`) với mã đơn của NCC (`WQ6777DCC400`) và cả mã hàng |
| I | NGÀY ĐẶT HÀNG | |
| J | TT ĐẶT HÀNG | Công thức. **SAI** — xem §5 |
| K | LỆNH MUA HÀNG | Kiểu lẫn lộn: ngày, số serial Excel (`45957`), và text (`19/01`) |
| L | CHỦNG LOẠI | `SẮT THÉP`, `HHK`, `DAO CỤ`… **183 giá trị** so với ~30 trong danh mục |
| M | TÊN HÀNG | Văn bản tự do. **9.575 tên khác nhau cho 12.028 dòng** |
| N | TÊN QUY ĐỔI | Chỉ điền 4,7%. Ý định chuẩn hoá tên — chưa dùng |
| O | ĐVT | **115 giá trị** cho ~15 đơn vị thật (`PCS`/`pcs`/`Pcs` là 3 giá trị khác nhau) |
| P | SỐ LƯỢNG ĐẶT | |
| Q | SỐ LƯỢNG GIAO | Thiếu so với đặt ở 2,4% số dòng |
| R | ĐƠN GIÁ (KG/M/L) | Điền 22,5%. **Giá theo trọng lượng/chiều dài** |
| S | ĐƠN VỊ TÍNH | `kg` / `mét` — đơn vị của cột R |
| T | ĐƠN GIÁ (PCS) | **Đã bị che trong file gửi** (mọi dòng = 187.000 hoặc 51.800) |
| U | THÀNH TIỀN | Công thức bị dán đè giá trị. Công thức thật ở §4 |
| V | KỲ HẠN YC | Ngày người yêu cầu cần hàng |
| W | TRỌNG LƯỢNG | Dùng cùng cột R để tính tiền. Có ô rác `=5*3` |
| X | NGƯỜI MUA HÀNG | 4 người thật: `Như` (4.951) · `Ms. Ngọc` (4.401) · `Ms. Trâm` (1.849) · `Thiên` (722) · `CT` (96) |
| Y | NGÀY NHẬP HÀNG | |
| Z | TT GIAO HÀNG | Công thức. Gộp lẫn "đã giao" với "đúng hạn" — xem §5 |
| AA | SNGH | Số ngày sớm/trễ = `IF(Y="", V-TODAY(), V-Y)`. **Volatile** |
| AB | GHI CHÚ | Chứa thông tin nghiệp vụ quan trọng bị chôn trong text: `"13/12 về 64 pcs, 10/01 về 36 pcs, đủ"` (giao nhiều lần), `"hủy"`, `"TẠM NGƯNG CHỜ KH"`, `"hết hàng chưa tìm được chờ chỉ đạo anh Huỳnh"`. Có ô rác `=>⌀63` |
| AC | TRẢ LỜI KỲ HẠN | Kỳ hạn Mua hàng **cam kết lại** — khác cột V |
| AD | MÃ VẠCH | `26034894407WO`. **Là mã lô/dòng LSX, KHÔNG phải mã hàng** |
| AE | MỤC ĐÍCH SỬ DỤNG | `1.NVL`, `2.VTTH`, `3.CCDC`, `4.CPX`… 16 giá trị / 13 mã chuẩn |
| AF | NGÀY BÀN GIAO CHỨNG TỪ | Sang Kế toán |
| AG | SỐ PGH NỘI BỘ | Phiếu nhập kho `06-510`. **Nhồi nhiều giá trị**: `12-539/01-022` |
| AH | MÃ VẬT TƯ | Chỉ điền 15,3%, và phần lớn chứa nhầm **chủng loại** |
| AI | TUẦN | Chết (0%) |
| AJ | TÌNH TRẠNG ĐỀ NGHỊ | Chết (0,2%) |
| AK | TÌNH TRẠNG YC | `BÌNH THƯỜNG` 79,5% · `HÀNG KHẨN CẤP` 10,4% · `KHẨN CẤP/NG` · `HÀNG NG` |

**`TONG HOP`** (6.824 × 38) có **cùng 37 cột**, chỉ khác là dòng đã hoàn tất được chuyển sang, công thức bị thay bằng giá trị.
→ Đây chính là cơ chế **lưu trữ (archive)** làm thủ công. Hệ thống mới thay bằng chức năng `luu-tru`.

---

## 3. Toàn bộ 23 đối tượng đang chạy thật

| Đối tượng | Nơi lưu | Quy mô |
|---|---|---|
| Đề nghị vật tư (ĐNVT) | TDDH cột A–F | 12.028 dòng |
| Theo dõi đặt hàng | `THEO DOI MUA HANG` | 13.626 × 37 |
| Lưu trữ dòng hoàn tất | `TONG HOP` | 6.824 × 38 |
| **Lệnh mua hàng (LMH)** | `LỆNH MUA HÀNG NEW`, `LMH THIEN` | 5.537 dòng |
| Yêu cầu báo giá | `QT-MH-01-BM04.` | biểu mẫu in |
| Đơn đặt hàng (PO) | `QT-MH-01-BM06 ĐƠN ĐẶT HÀNG` | 37,7% dòng có số |
| **Xác nhận thông tin / đổi vật liệu** | 2 sheet `XÁC NHẬN THÔNG TIN` | theo NV mua hàng |
| **Yêu cầu hủy dòng** | cột `YÊU CẦU XÁC NHẬN` = `HỦY` | |
| Phiếu yêu cầu nhập kho | `QT-KV-01-BM03 PGH NB A4/A5` | 69% dòng có số |
| **Yêu cầu thanh toán** | `YEU CAU THANH TOAN IN` + `THEO DOI YC THANH TOAN` | **979 bản ghi** |
| **Phiếu bàn giao chứng từ** | `PHIẾU BÀN GIAO CHỨNG TỪ` | 179 dòng |
| Điều xe mua hàng | `LIST DIEU XE DI SG`, `LIST DIEU XE DI BH`, `ĐIỀU XE (QT-KV-01-BM01)` | theo ngày |
| Điều xe GCN | `Quản lý điều xe` | 685 chuyến |
| **Lịch điều xe · lịch tài xế** | `Lịch điều xe`, `Lịch làm việc tài xế-1` | pivot theo ngày |
| Đề nghị & đơn GCN | `Quản lý GCN` | 6.059 dòng · 753 phiếu |
| **Theo dõi PGH làm đen** | `Theo dõi PGH làm đen` | 373 dòng, tính theo **Kg** |
| **Chi phí sơn tĩnh điện hàng xuất** | `CHI PHÍ STĐ XK` | 232 dòng |
| **Bảng màu sơn theo khách hàng** | `Thông tin màu sơn`, `ghi chú màu sơn stđ` | MBC · NOK · FKSK · TAKAKO · MABUCHI |
| **Máy tính khối lượng & giá vật liệu** | `CONG THUC`, `LAZER` | công cụ |
| Danh mục NCC mua hàng | `NCC` | **799 NCC** |
| Danh mục KH&NCC gia công | `Danh mục thông tin KH&NCC` | **103 đối tượng**, schema khác hẳn |
| Danh mục tài xế · xe · vùng · km | `Danh mục tài xế & Xe` | 9 TX · 8 loại xe |
| Báo cáo tồn đọng · đã giao · hàng khẩn cấp | `BCMH TĐ`, `BAO CAO DA GIAO`, `BÁO CÁO HÀNG KHẨN CẤP` | 910 / 304 dòng |

**Hai biểu mẫu ISO bắt buộc đang TRỐNG:**
- `QT-MH-01-BM03` Danh mục nhà cung cấp được phê duyệt — **0 dòng**
- `QT-MH-01-BM08` Sổ theo dõi tình trạng NCC — **0 dòng**

→ Quy tắc "cấm chọn NCC chưa được phê duyệt" hiện **không có căn cứ thực thi**. Trong hệ mới quy tắc này phải khởi động ở chế độ **CẢNH BÁO**.

---

## 4. Công thức nghiệp vụ trích được (phải giữ nguyên logic)

### 4.1 Thành tiền — checklist ghi SAI, đây là công thức thật

```
nếu ĐƠN VỊ TÍNH ∈ (kg, mét, lít):
    THÀNH TIỀN = ĐƠN GIÁ (KG/M/L) × TRỌNG LƯỢNG
ngược lại:
    THÀNH TIỀN = ĐƠN GIÁ (PCS) × SỐ LƯỢNG ĐẶT
```
Kiểm chứng trên dữ liệu thật: `28.000 × 1,85 = 51.800` ✓ · `46.000 × 72 = 3.312.000` ✓ · `98.000 × 15 = 1.470.000` ✓ · `22.500 × 570 = 12.825.000` ✓ · `874.000 × 0,64 = 559.360` ✓

### 4.2 Khối lượng vật liệu tấm/thanh — sheet `CONG THUC`

```
KHỐI LƯỢNG (kg) = DÀI × RỘNG × DÀY × KLR × SỐ LƯỢNG / 1.000.000     (mm, g/cm³)
THÀNH TIỀN      = ĐƠN GIÁ × KHỐI LƯỢNG
GIÁ CHƯA VAT    = GIÁ / 1,1                                          (VAT 10%)
```
Khối lượng riêng có sẵn: thép **7,85** · inox 304 **7,95** · nhôm 6061 **2,7** · mica **1,41** · đồng C3604 **8,8** · CAM **6,4**
Sheet `LAZER` bổ sung đơn giá tham khảo: Inox 304 85.000 · Sắt 25.000 · Nhôm A6061 140.000 · Nhựa POM 100.000 (đ/kg), và 3 hình dạng: Tròn đặc · Tấm · Ống.

### 4.3 Kỳ hạn gia công ngoài — sheet `Quản lý GCN`

```
KỲ HẠN QUY ĐỊNH = NGÀY GỬI HÀNG ĐI + KH QUY ĐỊNH(nhà cung cấp)
SN GIAO HÀNG    = IF(NGÀY NHẬP HÀNG = "", KỲ HẠN - TODAY(), KỲ HẠN - NGÀY NHẬP)
CÔNG VIỆC       = VLOOKUP(NCC → cột 3)      NGÀNH NGHỀ = VLOOKUP(NCC → cột 10)
```

### 4.4 Lệnh mua hàng — sheet `LMH THIEN`

Toàn bộ cột đều là `VLOOKUP(ID SP, TDDH, n, 0)`. Người dùng chỉ dán danh sách `ID SP` vào cột M, mọi thứ khác tự kéo về.
→ **Đây chính là chức năng "giao việc"**: một hàng đợi công việc của từng nhân viên mua hàng, không phải một biểu mẫu.

---

## 5. Công thức SAI — hệ thống mới phải sửa

| Cột | Công thức hiện tại | Sai ở đâu |
|---|---|---|
| `TT ĐẶT HÀNG` | `IF(I<>"","ĐÃ ĐH",IF(AND(I="",A<0),"TRỄ","CHƯA ĐH"))` | Cột `A` là **ID SP** (chuỗi văn bản). Trong Excel văn bản luôn > mọi số nên `A<0` vĩnh viễn sai → **nhánh "TRỄ" chưa từng chạy**. Thực đo: 11.811 `ĐÃ ĐH` + 217 `CHƯA ĐH` + **0** `TRỄ` |
| `TÌNH TRẠNG` (GCN) | `IF(AB<T,"Sai QT",IF(AND(AB=T,AB>T),"Đúng QT","Đúng QT"))` | `AND(x=y, x>y)` **không bao giờ đúng**, và hai nhánh trả cùng giá trị. Kết quả: **83,6% dòng bị gắn "Sai QT"** |
| `TT GIAO HÀNG` | `IF(Y<>"","ĐÃ GIAO",…)` | Gộp "đã giao" với "đúng hạn". Hàng giao trễ vẫn hiện `ĐÃ GIAO` → không đo được tỷ lệ đúng hạn từ cột này, phải dùng `SNGH` |
| `TÌNH TRẠNG NCC` (GCN) | `IF(SN>0,"sớm hạn",…)` | Chạy cả trên dòng **chưa giao**. Đơn chưa giao mà còn hạn bị đếm là "sớm hạn" → báo cáo tuần GCN cho ra **97,9% sớm hạn**, không đáng tin |
| Ô rác | `=>⌀63` · `=>48*28` · `=5*3` | Người dùng gõ `>` sau `=` nên Excel hiểu là công thức |
| Biểu mẫu in | `BM04`, `BM05`, `QT-KV-01-BM01` | VLOOKUP không bọc `IFERROR` → in ra giấy có `#N/A` |
| Đơn giá PGH | `86666.66666666667` | Tiền không làm tròn |
| Name bị hỏng | `BANGGIA` `DANHMUC` `DVT` = `#REF!` · `KHNCC` `KHNCCTM` = `OFFSET(#REF!…)` | Vừa hỏng vừa volatile |

---

## 6. Số liệu vận hành thật (dùng làm cơ sở thiết kế và kiểm thử)

### Khối lượng
| | |
|---|---|
| Dòng mua hàng | ~**2.000/tháng** · cao điểm 2.343 (06/2026) · ~**95/ngày làm việc** |
| Nhân viên mua hàng | **4 người** → ~25 dòng/người/ngày |
| Người yêu cầu | 44 người · **Mr. Sáng chiếm 50%** (6.070 dòng) |
| GCN | 465–1.321 dòng/tháng · 753 phiếu · **8 dòng/phiếu** |
| Điều xe GCN | 685 chuyến · xe máy 43% · xe tải nhỏ 41% |
| Dự phóng | ~28.000 dòng/năm → sau 5 năm ~140.000 dòng |

### Hiệu suất
| | |
|---|---|
| Giao hàng đúng hạn (mua hàng) | **66,7% đúng/sớm · 32,9% trễ** |
| Mức trễ | trung bình 5,8 ngày · trung vị 3 · p90 = 14 · max = 90 |
| Lead time ĐNVT → nhập hàng | trung vị **5 ngày** · trung bình 9,1 · p90 = 20 |
| ĐNVT → đặt hàng | trung vị **1 ngày** · trung bình 2,6 · p90 = 6 |
| GCN đúng hạn | 96,6% — **nhưng đo theo mốc tự đặt**, không so được với mua hàng |
| Giao nhiều lần | 1,6% ô PGH có dấu `/` · 2,4% dòng SL giao < SL đặt |
| Tồn đọng | **910 dòng** trong `BCMH TĐ`, có dòng trễ **−120 ngày** |

### Chất lượng dữ liệu
| | |
|---|---|
| Mã vật tư đúng quy tắc | **4,1%** (494/12.028) |
| Tên hàng khác nhau | **9.575** cho 12.028 dòng |
| 1 tên hàng → nhiều mã vạch | 16,8% (cá biệt `SS400P T22*205*205` có **22 mã vạch**) |
| 1 mã vạch → nhiều tên hàng | 19,2% |
| NCC không khớp danh mục | chỉ 0,9% số dòng (26 tên) — phần này **tốt** |
| Ràng buộc nhập liệu | **6** trên toàn bộ 18.000 dòng, 1 trong số đó đã `#REF!` |

---

## 7. Nguyên nhân chậm — đã đo

| Chỉ số | Mua hàng | GCN | Nhận định |
|---|---|---|---|
| Dòng dữ liệu thật | 12.028 | 6.059 | **Không lớn.** Không phải nguyên nhân |
| Công thức | 37.938 | 72.729 | GCN nặng gấp đôi trên nửa số dòng |
| `TODAY()` volatile | 200 | 125 | Ép tính lại toàn chuỗi mỗi thao tác |
| Ô rỗng nhưng có định dạng | **412.598** (48,6% tổng ô) | 49.225 | |
| **Shape mồ côi** | 0 | **48.033** — `drawing2.xml` = **80,4 MB** | **Nguyên nhân chính của file GCN** |
| dxf (định dạng có điều kiện) | 392 | 1.750 | Quy tắc bị nhân bản khi copy dòng |
| Vùng VLOOKUP | — | `C3:M9904` trên danh mục thật 103 dòng | ×3 cột ×6.111 dòng |

**Kết luận:** dọn 48.033 shape rác và định dạng thừa là việc **một ngày**, và gần như chắc chắn trả lại tốc độ cho hệ thống hiện tại. Khối lượng dữ liệu không phải vấn đề — với PostgreSQL, 140.000 dòng sau 5 năm là chuyện nhỏ.

**Hệ luận cho hệ thống mới:** vấn đề gốc là **kỷ luật dữ liệu**, không phải công cụ. Vì vậy hệ mới phải có: ràng buộc nhập liệu ở mọi trường danh mục · chức năng lưu trữ dòng cũ · và không cho phép nhồi nhiều giá trị vào một ô.

---

## 8. Pain points — từ quy trình và từ dữ liệu

### 8.1 Từ quy trình QT-MH-01

| Pain point | Bằng chứng |
|---|---|
| **Đề nghị đi qua Zalo** | Quy trình ghi rõ: gửi vào nhóm Zalo `ĐỀ NGHỊ VẬT TƯ` trước 13h30, nhóm `HD - GCN` trước 15h00 |
| **Bản cứng có chữ ký là bản ghi pháp lý** | Kho ký xác nhận trực tiếp lên phiếu giấy; hàng tồn thì "gạch ngang" |
| **Chờ xác nhận tồn kho** | Mua hàng phải chờ Kho ký trước khi làm gì |
| **Lấy và so báo giá thủ công** | Tối thiểu 2 NCC, làm bằng tay |
| **Tổng hợp đánh giá NCC cuối kỳ** | BM06/07/08 làm thủ công, và BM03/BM08 hiện đang trống |
| **Nhập lặp** | Đơn hàng và mã vật tư nhập lại trên cả Excel lẫn Bravo |
| **Duyệt vắng mặt** | Chấp nhận duyệt online nhưng phải ký bù ngày làm việc kế tiếp |

### 8.2 Từ dữ liệu

| Pain point | Số đo |
|---|---|
| Không có định danh mặt hàng | 4,1% dòng có mã vật tư dùng được |
| Một mặt hàng nhiều tên | 9.575 tên / 12.028 dòng |
| Trễ hàng nhiều và trễ sâu | 32,9% trễ, có dòng trễ 120 ngày |
| Tồn đọng không ai thấy tổng thể | 910 dòng trong báo cáo tồn đọng |
| Thông tin nghiệp vụ chôn trong ghi chú | "13/12 về 64 pcs, 10/01 về 36 pcs, đủ" |
| Hai nguồn sự thật cho cùng danh mục | 799 NCC (mua hàng) vs 103 KH&NCC (gia công), không khoá chung |
| Cùng biển số xe, hai cách phân loại | `60C-13810` là "xe tải nhỏ" ở file MH và "xe tải trung" ở file GCN |
| KPI không đáng tin | GCN 97,9% "sớm hạn" do lỗi công thức |

---

## 9. Mong muốn của người dùng (checklist mục B17–B19)

| Mã | Câu hỏi | Trả lời từ bộ phận |
|---|---|---|
| B17 | Muốn phần mềm làm được gì? | Tự động cảnh báo đơn trễ hạn · so sánh giá NCC nhanh · tự lấy số liệu IQC để đánh giá NCC |
| B18 | Nên làm thế nào cho tiện? | Tìm mã vật tư / NCC nhanh theo từ khoá gợi ý · nhập lô từ Excel · tự tính tổng tiền |
| B19 | Nếu chỉ chọn một việc? | **Tự động hoá theo dõi tiến độ đơn hàng và cảnh báo hàng trễ / hàng lỗi** |

---

## 10. Ranh giới hệ thống (checklist A5, H9, H10)

| Chức năng | Hệ thống sở hữu | Hệ Mua hàng làm gì |
|---|---|---|
| Tồn kho | Kho vận (**chưa tồn tại**) | Ghi nhận xác nhận tồn thủ công của vai trò Kho vận. Không tra DB, không tính tồn |
| Nhập kho thực tế | Kho vận | Phát hành phiếu yêu cầu nhập kho + ghi nhận số lượng thực nhập. **Không ghi sổ kho** |
| Lệnh sản xuất | Kế hoạch / Sản xuất | Chỉ đọc `LENH_SAN_XUAT`, `MA_VACH`, `MA_HANG`, `MUC_DO_UU_TIEN` |
| Mã vật tư & tên hàng | **Kho vận** | Chỉ đọc. Có luồng "yêu cầu cấp mã" gửi sang Kho vận |
| Hồ sơ nhân viên | Nhân sự | Chỉ đọc `MA_NHAN_VIEN`, `HO_VA_TEN`, `MA_BO_PHAN` |
| Hạch toán, công nợ | Kế toán / Bravo | Ghi nhận yêu cầu thanh toán và bàn giao chứng từ. **Không hạch toán** |

---

## 11. Cầu nối đã tồn tại với hệ Kế hoạch Sản xuất

Hệ Kế hoạch Sản xuất (thư mục `demo (production planning)`) đã có sẵn dữ liệu khớp định dạng với file Excel mua hàng:

```
data/03_don_hang.csv
  CONG_TY · SO_PO · LENH_SAN_XUAT · MA_VACH · MA_HANG · TEN_HANG
  SO_LUONG_PO · DON_VI_TINH · KI_HAN_KHACH_HANG · MUC_DO_UU_TIEN
  NGAY_NHAN_LENH · TRANG_THAI_DON · GHI_CHU

  ví dụ:  C&D | 020764 | C&D0726-001-GCKC2 | 26073265907WO | 2021-70-5318-01 | TOP PANEL | 1 | PCS | 30/07/2026 | 1 | ...
```

**Khớp chính xác** với file Excel mua hàng:
- LSX `C&D0726-001-GCKC2` cùng khuôn với `MBC0326-018-CKCT`
- Mã vạch `26073265907WO` cùng khuôn với `26034894407WO`
- `MUC_DO_UU_TIEN` = 1/2/3 **chính là** "Ưu tiên 1/2/3" trong QT-MH-01 §7.2

```
data/01_cong_doan.csv   40 công đoạn, CD01…CD39 + dòng cuối:  GCN | Gia công ngoài
data/03b_chi_tiet_cong_doan.csv   có sẵn cột SO_LUONG_SAN_XUAT và SO_LUONG_GIA_CONG_NGOAI
data/02_nhan_vien.csv   175 nhân viên, MA_NHAN_VIEN dạng 202302003
data/10_bo_phan.csv     14 bộ phận: DH KD KT VH MH CX QC TD VT SO KV KC1 KC2 KC3
data/04_downtime.csv    lịch nghỉ: chỉ Chủ nhật + ngày lễ → công ty làm T2–T7
```

→ **`MA_HANG` cho chi tiết sản xuất đã có sẵn và ổn định.** Hệ Mua hàng **chỉ đọc**, không bao giờ tạo mới. Một `MA_HANG` có thể được đặt lại nhiều lần (1 mã hàng → N lệnh sản xuất → N mã vạch).

---

## 12. Ba loại hoạt động — định nghĩa chốt

| Loại | Định nghĩa | Khoá chủ thể | Ai lập |
|---|---|---|---|
| **Mua hàng** | Mua vật tư, hàng hoá, dịch vụ | `MA_VAT_TU` (V1: `TEN_HANG`) | Bộ phận có nhu cầu |
| **Gia công ngoài** | **Một công đoạn** của LSX đưa ra ngoài. Xuất vật tư của HĐ đi, nhận lại sau gia công | `LENH_SAN_XUAT` + `MA_VACH` + `MA_CONG_DOAN` | Bộ phận sản xuất |
| **Đặt ngoài** | **Toàn bộ LSX** đặt cho bên thứ ba làm, bằng vật tư của họ | `LENH_SAN_XUAT` | **Kinh doanh** |

**Đặt ngoài — chi tiết đã chốt:**
- Người lập: Kinh doanh
- Phạm vi: **toàn bộ** công đoạn của LSX đó
- Hàng về: nhập kho **bán thành phẩm** để kiểm QC
- Duyệt: **Trưởng BP Kinh doanh duyệt, không theo ngưỡng tiền**
- Mục đích trong hệ Mua hàng: theo dõi LSX/mã hàng nào đang **báo giá / xác nhận kỹ thuật / đã đặt**, và tiến độ với NCC
