# 08 — Lộ trình, dữ liệu mẫu và kiểm thử

---

## 1. Tổng hợp 35 quyết định đã chốt

### Nền tảng kỹ thuật
| # | Quyết định |
|---|---|
| 1 | Cơ sở dữ liệu: **PostgreSQL** ngay từ demo (nhiều người ghi đồng thời) |
| 2 | Làm **đúng Hiến chương** (`/api/v1`, vỏ `{ok,data,error,ma_loi}`, bcrypt, SQL) — không sao chép các điểm lệch chuẩn của demo Kế hoạch Sản xuất |
| 3 | Backend Python + FastAPI, 3 tầng `api/services/data`. Frontend HTML/CSS/JS thuần, dùng lại `hd.css` |
| 4 | Đăng nhập bằng tên tự đặt; **`MA_NHAN_VIEN` bắt buộc khi đăng ký** và là khoá trong mọi bảng giao dịch |
| 5 | Trần **500 dòng** mỗi file, chia theo nghiệp vụ |

### Danh mục và mã
| # | Quyết định |
|---|---|
| 6 | Mã vật tư: STT **3 chữ số** đệm 0 |
| 7 | Mã vật tư chỉ `A–Z`, `0–9`, `-`. Không dấu tiếng Việt, không khoảng trắng |
| 8 | Nhóm `TĐH` → **`TDH`** |
| 9 | Phôi gốc và phôi lẻ là **2 mã riêng**, mã lẻ giữ `ID_VT_GOC` |
| 10 | Mã vật tư **bất biến**, do **Kho vận** sở hữu; Mua hàng chỉ đọc |
| 11 | V1 quản lý theo **`TEN_HANG`**; V2 chuyển sang **`MA_VAT_TU`** làm chủ thể chính. Cả hai đều `UNIQUE` |
| 12 | **Không** dùng bảng bí danh — thay bằng tìm mờ + cảnh báo trùng >85% + `TEN_NCC_GHI_TREN_CHUNG_TU` trên dòng chứng từ |
| 13 | Dữ liệu cũ **không** ép gán mã ngược |
| 14 | `MA_HANG` sản xuất **đã có sẵn** trong hệ Kế hoạch Sản xuất — chỉ đọc, không tạo mới. 1 mã hàng → N lệnh sản xuất |
| 15 | Chủng loại giữ làm trường riêng, gom 183 → ~30 |
| 16 | **Hai bảng**: `NHA_CUNG_CAP` (gộp 799 + 103, có cờ vai trò) và `KHACH_HANG` riêng |
| 17 | Tiền tố số phiếu cũ giữ nguyên trên chứng từ; danh mục dùng mã mới; có bảng `ANH_XA_TIEN_TO` |
| 18 | Lịch nghỉ: **file riêng**, dùng lại cấu trúc `04_downtime.csv`, chuẩn hoá ngày `YYYY-MM-DD` |

### Nghiệp vụ
| # | Quyết định |
|---|---|
| 19 | App thay Zalo — thông tin tập trung, phản hồi nhanh, bỏ biểu mẫu cứng |
| 20 | Phân loại vật tư `THONG_DUNG_SX` / `THONG_DUNG_BTBD` / `CHUYEN_DUNG` nằm trên vật tư, ghi đè được trên ĐNVT, **chụp** vào dòng PO |
| 21 | PO trộn phân loại: **không tách PO**, lấy mức nghiêm ngặt nhất; báo cáo bổ theo dòng |
| 22 | Ngưỡng duyệt so trên giá trị **trước VAT** |
| 23 | GĐ Vận hành ≠ GĐ Điều hành, nhưng dùng **chung vai trò `BAN_LANH_DAO`**, ai cũng duyệt được mọi mức. Hệ thống vẫn hiển thị cấp duyệt yêu cầu như nhãn |
| 24 | Đổi vật liệu ghi trên **chứng từ**, không đụng danh mục: `ID_VT_DE_NGHI` + `ID_VT_DUYET_MUA` + bảng `DOI_VAT_LIEU` |
| 25 | GCN **bắt buộc** chọn `MA_CONG_DOAN` |
| 26 | **Đặt ngoài**: Kinh doanh lập · toàn bộ LSX · nhập kho bán thành phẩm để QC · **Trưởng BP Kinh doanh duyệt, không theo ngưỡng tiền** |
| 27 | `MUC_DO_UU_TIEN` (1/2/3 từ LSX) quyết định SLA; `TINH_TRANG_YC` là quản lý nội bộ Mua hàng — **hai trường riêng** |
| 28 | Giờ chốt điều xe **15:45** |
| 29 | Thời gian GCN: mặc định theo **loại gia công**, ghi đè theo NCC khi có thoả thuận riêng |
| 30 | Đưa vào V1: yêu cầu thanh toán · bàn giao chứng từ · xác nhận đổi vật liệu · yêu cầu huỷ · máy tính khối lượng · một luồng điều xe chung |
| 31 | Thêm chỉ số **% đề nghị bất khả thi** theo tháng, bổ theo bộ phận |
| 32 | Kho vận có tài khoản riêng theo bộ phận (TBP + nhân viên) |

### Vận hành
| # | Quyết định |
|---|---|
| 33 | Admin = chủ hệ thống (Trưởng BP Mua hàng) + team dev — **tách hai vai trò**: quản trị nghiệp vụ và quản trị kỹ thuật |
| 34 | Dữ liệu demo: **sinh dữ liệu giả** theo cấu trúc file thật, nhưng **chức năng nhập lô phải hoạt động thật** để Admin nạp dữ liệu thật sau |
| 35 | Quy mô demo: **~10.000 dòng mua hàng + ~5.000 dòng GCN** |

---

## 2. Lộ trình triển khai

### Giai đoạn 0 — Dựng khung (trước khi làm chức năng nào)
```
□ Khởi tạo repo Git, cấu trúc thư mục theo 05_KIEN_TRUC §1
□ Kết nối PostgreSQL, viết migration 001_khoi_tao.sql
□ Tầng api/envelope.py — vỏ {ok, data, error, ma_loi}
□ Tầng api/middleware.py — chặn quyền một chỗ
□ services/lich_lam_viec.py — la_ngay_lam_viec, cong_ngay_lam_viec
□ services/sinh_ma.py + bảng BO_DEM_CHUNG_TU
□ services/quy_tac.py — đọc chế độ CANH_BAO/CHAN
□ services/catalog_service.py — lớp đọc danh mục dùng chung
□ frontend: index.html + hd.css + api.js (sửa /api/v1 và bóc vỏ)
□ Đăng nhập / đăng ký / phân quyền  (F06 + phần auth)
□ docs/AI_RULES.md cập nhật trạng thái
```

### Giai đoạn 1 — Danh mục (F10)
> Nếu danh mục chưa sạch thì mọi màn hình phía sau đều xây trên cát.
```
□ Nạp BO_PHAN (14), NHAN_VIEN (175) từ hệ Kế hoạch Sản xuất
□ Danh mục: DON_VI_TINH, CHUNG_LOAI, MUC_DICH_SU_DUNG, LOAI_GIA_CONG
□ NHA_CUNG_CAP (gộp 799+103) + KHACH_HANG
□ VAT_TU + tìm mờ + cảnh báo trùng + nhập lô
□ THAM_SO_HE_THONG + màn hình chế độ quy tắc
□ LICH_NGHI
```

### Giai đoạn 2 — Đề nghị (F01 + F02)
> Nếu ĐNVT không thắng được Zalo thì phần còn lại không có dữ liệu để chạy.
```
□ Tạo / sửa / gửi / duyệt / trả lại đề nghị
□ Giờ chốt + ngày làm việc + cảnh báo bất khả thi
□ MÀN HÌNH ĐIỆN THOẠI — mục tiêu 3 dòng < 45 giây
□ Thông báo + trao đổi + đính kèm  (F12 phần này)
□ Yêu cầu cấp mã · đổi vật liệu · yêu cầu huỷ
□ In PDF BM01 / BM02
```

### Giai đoạn 3 — Mua hàng (F03 + F04)
```
□ Yêu cầu báo giá + nhập báo giá + màn hình so sánh
□ Đơn hàng + ngưỡng duyệt + in PDF BM05
□ Giao việc (lệnh mua hàng) + việc của tôi
□ Theo dõi tiến độ + cảnh báo trễ hạn
```

### Giai đoạn 4 — Giao nhận & thanh toán (F05 + F08)
```
□ Nhận hàng nhiều lần + IQC + hàng không phù hợp
□ In phiếu yêu cầu nhập kho QT-KV-01-BM03
□ Yêu cầu thanh toán N đợt + bàn giao chứng từ
```

### Giai đoạn 5 — Phần còn lại (F06 + F07 + F09 + F11)
```
□ Đặt ngoài
□ Điều xe một luồng + lịch điều xe
□ Đánh giá nhà cung cấp + BM03/BM06/BM07/BM08
□ Tổng quan + 9 báo cáo + KPI COP-03
□ Máy tính khối lượng · sự cố · nhật ký · lưu trữ
```

**Điều xe và đánh giá NCC đi sau** — không phải vì ít quan trọng, mà vì chúng không chặn dòng chảy dữ liệu chính.

---

## 3. Sinh dữ liệu mẫu

### 3.1 Nguyên tắc (Hiến chương 12.1 [B])

> Tạo dữ liệu giả **có cùng cấu trúc**. Giữ nguyên tên trường, kiểu dữ liệu và quan hệ; thay giá trị bằng số và tên bịa.

**Cấm tuyệt đối** đưa vào AI công cộng: giá NCC · điều khoản hợp đồng · danh sách khách hàng · **thông tin liên hệ đối tác** · bản vẽ kỹ thuật.

| Loại dữ liệu | Cách xử lý trong bộ mẫu |
|---|---|
| Tên nhà cung cấp | **Bịa** — `NCC ALPHA`, `NCC BETA`, `THÉP MINH KHÔI`… |
| Địa chỉ, điện thoại, email NCC | **Bịa hoàn toàn** |
| Đơn giá | **Sinh ngẫu nhiên** theo phân bố hợp lý cho từng chủng loại |
| Tên hàng | Giữ **cấu trúc** thật (`S45C-Phi 35x200`) nhưng đảo số ngẫu nhiên |
| Mã vạch, LSX | Giữ **khuôn dạng** thật, sinh ngẫu nhiên |
| Tên nhân viên | Dùng danh sách nhân viên thật (nội bộ, không phải đối tác) |
| Bộ phận, công đoạn, ĐVT, chủng loại | **Giữ nguyên** — đây là cấu trúc, không phải bí mật |

### 3.2 Quy mô

| Bảng | Số bản ghi |
|---|---|
| `VAT_TU` | 2.500 |
| `NHA_CUNG_CAP` | 400 |
| `KHACH_HANG` | 20 |
| `LENH_SAN_XUAT` / `LSX_DONG` | 800 / 4.000 |
| `DE_NGHI` / `DE_NGHI_DONG` | 2.000 / **10.000** |
| `DE_NGHI` GCN / dòng | 600 / **5.000** |
| `BAO_GIA` / dòng | 3.000 / 12.000 |
| `DON_HANG` / dòng | 1.800 / 8.000 |
| `NHAN_HANG` / dòng | 1.700 / 7.500 |
| `KET_QUA_IQC` | 7.000 |
| `YEU_CAU_THANH_TOAN` | 800 |
| `DIEU_XE` | 1.200 |
| `DANH_GIA_NCC` | 200 |

### 3.3 Phân bố phải khớp thực tế

Bộ dữ liệu mẫu phải tái hiện đúng các đặc điểm đã đo, để phát hiện được lỗi logic thật:

| Đặc điểm | Giá trị |
|---|---|
| Giao trễ | **33%** dòng, trễ trung vị 3 ngày, p90 = 14, max = 90 |
| Lead time ĐNVT → nhận | trung vị **5** ngày làm việc, p90 = 20 |
| Giao nhiều lần | **2,4%** dòng |
| Giá theo trọng lượng | **22%** dòng dùng `DON_VI_GIA ≠ PCS` |
| Đề nghị không gắn LSX | **43%** dòng |
| Mã vật tư có giá trị | **~17%** (mô phỏng V1 chưa chuẩn hoá xong) |
| Phân bố người yêu cầu | Một người chiếm **50%** khối lượng |
| Nhân viên mua hàng | **4 người**, tỷ lệ 41% / 37% / 15% / 6% |
| Tình trạng YC | `BINH_THUONG` 79,5% · `HANG_KHAN_CAP` 10,4% · còn lại |
| PO vượt ngưỡng | ~3% cần Ban lãnh đạo duyệt |
| Đề nghị bất khả thi | ~5% |

Viết script `backend/testing/sinh_du_lieu_mau.py`, tham số hoá quy mô, chạy lại được nhiều lần.

### 3.4 Nhập lô phải hoạt động thật

> Yêu cầu đã chốt: *"vẫn tạo chức năng nhập liệu hàng loạt khả dụng để sau này Admin (TBP Mua hàng) nhập vào dễ dàng."*

Nghĩa là F10 phần nhập lô **không phải chức năng phụ** — nó là đường để dữ liệu thật vào hệ thống. Phải có file mẫu cho mọi danh mục, kiểm tra đầy đủ, và báo cáo dòng lỗi tải xuống được.

---

## 4. Bảng kiểm thử chức năng cốt lõi (Hiến chương 6.1 [B])

Chạy **đầu–cuối bằng dữ liệu thật và bằng đúng vai trò người dùng thật**, không dùng tài khoản quản trị. Chạy lại toàn bộ bảng này **trước mỗi lần triển khai**.

| # | Chức năng cốt lõi | Vai trò thực hiện | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 1 | Tạo đề nghị vật tư 3 dòng trên điện thoại | `NV_YEU_CAU` | Hoàn tất **< 45 giây**, phiếu ở `CHO_DUYET` | ☐ |
| 2 | Duyệt đề nghị | `TBP_YEU_CAU` | `DA_DUYET`, người tạo nhận thông báo | ☐ |
| 3 | Trả lại đề nghị kèm lý do | `NV_MUA_HANG` | `TRA_LAI`, người tạo nhận thông báo | ☐ |
| 4 | Yêu cầu cấp mã vật tư → Kho vận cấp | `NV_MUA_HANG` → `TBP_KHO_VAN` | Mã tự gắn ngược vào dòng | ☐ |
| 5 | Đổi vật liệu → Kỹ thuật duyệt | `NV_MUA_HANG` → `KY_THUAT` | `ID_VT_DUYET_MUA` đổi, `ID_VT_DE_NGHI` giữ nguyên, danh mục không đụng | ☐ |
| 6 | Tạo YCBG → nhập 2 báo giá → so sánh → chọn | `NV_MUA_HANG` | Chọn được, có lý do nếu không rẻ nhất | ☐ |
| 7 | Tạo PO từ báo giá → duyệt → in | `NV_MUA_HANG` → `TBP_MUA_HANG` | PDF đúng mẫu BM05, có tổng tiền bằng chữ | ☐ |
| 8 | PO vượt ngưỡng | `NV_MUA_HANG` | Hiện nhãn "Cần Ban lãnh đạo duyệt" | ☐ |
| 9 | Nhận hàng 2 lần (64 + 36 / 100) | `NV_KHO_VAN` | 2 bản ghi, `HOAN_THANH` sau lần 2 | ☐ |
| 10 | Ghi IQC không đạt → lập biên bản | `QC` | Dòng `IQC_KHONG_DAT`, Mua hàng nhận thông báo | ☐ |
| 11 | Tạo yêu cầu thanh toán 3 đợt | `NV_MUA_HANG` | Trạng thái suy đúng theo các đợt | ☐ |
| 12 | Tạo và duyệt phiếu đặt ngoài | `NV_KINH_DOANH` → `TBP_KINH_DOANH` | Duyệt được mọi giá trị, không áp ngưỡng | ☐ |
| 13 | Yêu cầu điều xe → xếp lịch → in | `NV_YEU_CAU` → `NV_KHO_VAN` | Lịch gom theo xe và tài xế | ☐ |
| 14 | Đánh giá định kỳ NCC | `TBP_MUA_HANG` | 4 tiêu chí tự động khoá, xếp loại đúng | ☐ |
| 15 | Xem Tổng quan và mở một ô số | `TBP_MUA_HANG` | Mở danh sách đã lọc sẵn, số khớp | ☐ |
| 16 | Xuất báo cáo tồn đọng ra PDF | `TBP_MUA_HANG` | Đúng cột, có bản ghi nhật ký `XUAT` | ☐ |
| 17 | Nhập lô 340 dòng vật tư có 9 lỗi | `TBP_KHO_VAN` | Không ghi dòng nào, tải được file lỗi | ☐ |
| 18 | Giao việc 5 dòng → NV xử lý xong | `TBP_MUA_HANG` → `NV_MUA_HANG` | Thông báo và trạng thái đúng | ☐ |

---

## 5. Sáu kịch bản bắt buộc trước thử nghiệm (Hiến chương 6.2 [B])

| # | Kịch bản | Đạt khi | Cách chạy |
|---|---|---|---|
| 1 | **Hai người cùng sửa một bản ghi** | Trả `409`, không mất dữ liệu của ai | Hai phiên cùng mở một PO, cùng bấm lưu |
| 2 | **Dữ liệu gấp 10 lần dự kiến năm đầu** | Vẫn dùng được, không treo | Sinh 280.000 dòng, đo thời gian danh sách và báo cáo |
| 3 | **Bấm nút gửi liên tục nhiều lần** | Chỉ tạo một chứng từ | Bấm "Gửi duyệt" 5 lần trong 1 giây |
| 4 | **Mất kết nối giữa chừng** | Dữ liệu không dở dang | Ngắt mạng giữa lúc lưu phiếu nhiều dòng |
| 5 | **Dữ liệu biên** | Báo lỗi rõ, không sập, không ghi dữ liệu xấu | Rỗng · ký tự đặc biệt `⌀ * /` · số âm · ngày `31/02` · chuỗi 5.000 ký tự |
| 6 | **Truy cập chéo quyền** | Trả `403` ở **mọi** endpoint | Đăng nhập A, đổi id trên URL thành bản ghi của B — chạy tự động qua toàn bộ danh sách endpoint |

---

## 6. Kiểm thử quy tắc nghiệp vụ

72 quy tắc trong `04_QUY_TAC_NGHIEP_VU.md` §14, mỗi mã có **ít nhất một** hàm kiểm thử.

```
tests/
  test_lich_lam_viec.py       # TG-01..03, ngày làm việc, giờ chốt
  test_de_nghi.py             # DN-01..11
  test_sla.py                 # SLA-01..06
  test_gia_cong_ngoai.py      # GCN-01..07
  test_dat_ngoai.py           # DNG-01..07
  test_bao_gia.py             # BG-01..05
  test_don_hang.py            # DH-01..08 + ngưỡng duyệt
  test_giao_nhan.py           # NH-01..05, IQC-01..03
  test_thanh_toan.py          # TT-01..07
  test_dieu_xe.py             # DX-01..05
  test_nha_cung_cap.py        # NCC-01..06
  test_bao_mat.py             # BM-01..03 + truy cập chéo quyền
  test_danh_muc.py            # DM-01..08, XN-01..03
  test_tinh_tien.py           # công thức thành tiền, VAT, khối lượng
```

Chạy đạt **trước mỗi lần triển khai** (Hiến chương 2.4 [B]).

---

## 7. Điều kiện được vào thử nghiệm (Hiến chương 9.1 [B])

```
□ Sáu kịch bản Chương 6 đã đạt
□ Bài kiểm tra phân quyền chéo đã đạt trên MỌI endpoint
□ Đã triển khai trên môi trường thử nghiệm, truy cập được từ máy người dùng
□ Đã có sao lưu tự động và ĐÃ PHỤC HỒI THỬ THÀNH CÔNG
□ Đã chuyển đổi dữ liệu cũ và có BÁO CÁO ĐỐI SOÁT
```

**Nguyên tắc vận hành thử nghiệm:**
- Phạm vi: một nhóm nhỏ, một loại nghiệp vụ
- **Chạy song song** cách làm cũ trong suốt thời gian thử nghiệm
- Đối chiếu số liệu hàng tuần, có báo cáo chênh lệch
- **Thời hạn tối đa 8 tuần** — hết hạn phải quyết: triển khai toàn diện hoặc quay lại phát triển. Cấm kéo dài vô thời hạn

**Tiêu chí thoát:** không còn lỗi nghiêm trọng 2 tuần liên tiếp · chênh lệch đối soát bằng 0 hoặc có giải trình được chấp nhận · người dùng thao tác được không cần hỗ trợ · **thời gian thao tác không dài hơn cách làm cũ**

**Tiêu chí dừng:** sai lệch dữ liệu có hệ thống · lỗi phân quyền lộ dữ liệu · người dùng không dùng được sau 2 tuần đào tạo

---

## 8. Bốn việc ngoài phạm vi code nhưng chặn go-live

| # | Việc | Ai làm | Vì sao chặn |
|---|---|---|---|
| 1 | **Ban Quản trị ban hành quy định công nhận duyệt điện tử** | Ban Quản trị | Bỏ giấy mà không có văn bản thì kiểm toán ISO sẽ hỏi, và bộ phận sẽ tự in giấy trở lại |
| 2 | **Chuẩn hoá 9.575 tên hàng → mã vật tư** | Kho vận + Mua hàng | Không có mã thì mục tiêu "theo từng mã hàng" không đạt được |
| 3 | **Bảng "Mục đích sử dụng" chuẩn** | Anh Long | Hiện `6.AMTGĐ2` và `13.AMTGĐ2` trùng tên khác số |
| 4 | **Chốt mâu thuẫn biển số xe** giữa hai file | Kho vận | Nạp sai thì lịch điều xe sai từ đầu |

Bốn việc này **không phụ thuộc lập trình viên** — nên bắt đầu ngay, song song với code.

---

## 9. Ba rủi ro cao nhất và cách giảm

### R1 · Chuẩn hoá mã vật tư không xong kịp
**Xác suất: cao.** Việc thủ công, phụ thuộc bộ phận khác, không có deadline.
**Giảm thiểu:** (a) tách thành luồng công việc riêng có người chịu trách nhiệm bên Kho vận; (b) V1 chỉ bắt buộc mã cho dòng mới, dữ liệu cũ để trống; (c) làm trước 3 nhóm chiếm 44% khối lượng — sắt thép, HHK, inox 304.

### R2 · Người dùng vẫn dùng Zalo song song
**Xác suất: cao** nếu app không có thông báo và không tạo phiếu được trên điện thoại.
**Giảm thiểu:** (a) ưu tiên form ĐNVT mobile + thông báo đẩy **ngay ở V1**, trước cả báo cáo; (b) mục tiêu đo được — tạo ĐNVT < 45 giây; (c) sau khi chạy ổn định, Ban Quản trị tuyên bố phiếu gửi qua Zalo không còn giá trị. Không có mốc dứt điểm này thì hai kênh sẽ song song vĩnh viễn.

### R3 · Bật quy tắc chặt quá sớm làm nghẽn mua hàng
**Xác suất: trung bình.** Danh mục NCC được phê duyệt đang trống, mã vật tư mới có 4,1%.
**Giảm thiểu:** mọi quy tắc có hai chế độ, khởi động ở `CANH_BAO`, chuyển sang `CHAN` theo từng quy tắc khi dữ liệu nền đã sạch. Màn hình Quản trị có chỉ báo tiến độ để Admin biết khi nào an toàn.

---

## 10. Sau triển khai (Hiến chương 10.2)

| Việc | Thời hạn |
|---|---|
| Hỗ trợ tăng cường tại chỗ | Tuần đầu tiên |
| Theo dõi nhật ký lỗi hằng ngày | 30 ngày |
| Báo cáo hiệu quả có số liệu **trước và sau** | Sau 30 ngày |

**Chỉ số đánh giá:**
- Thời gian xử lý một nghiệp vụ trước và sau — dùng số nền đã đo: ĐNVT → đặt hàng trung vị **1 ngày**, ĐNVT → nhận hàng trung vị **5 ngày**
- Số lỗi dữ liệu phát hiện
- **Tỷ lệ người dùng thực sự dùng sau 30 ngày — mục tiêu ≥ 80%**
- Tỷ lệ giao hàng đúng hạn — số nền hiện tại **66,7%**
- Tỷ lệ dòng có mã vật tư — số nền hiện tại **4,1%**

---

## 11. Bộ tài liệu bàn giao (Hiến chương 11.2 [B])

```
□ Tài liệu đặc tả, cập nhật theo thực tế đã triển khai   ← bộ docs/ này
□ Sơ đồ ERD và mô tả từng bảng                            ← 03_MO_HINH_DU_LIEU.md
□ Tài liệu API — endpoint, tham số, ĐƠN VỊ, THANG ĐO      ← 05_KIEN_TRUC.md §3
□ Sơ đồ kiến trúc và cấu trúc thư mục                     ← 05_KIEN_TRUC.md §1
□ Ghi chép quyết định kiến trúc dạng ngắn                  ← file này §1
□ README chạy được trong 30 phút
□ Hướng dẫn vận hành cho người dùng cuối, có ảnh chụp màn hình
□ Quy trình sao lưu, phục hồi và xử lý sự cố
□ Biên bản nghiệm thu có chữ ký trưởng bộ phận sử dụng
```
