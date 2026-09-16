# AI_RULES — Hệ thống Mua hàng & Gia công ngoài

> **Nạp file này vào đầu MỖI phiên làm việc với Claude Code.**
> Bắt buộc theo Hiến chương HD-STD-01 Mục 12.2 [B].

---

## 1. Hệ thống này là gì

| | |
|---|---|
| **Tên** | Hệ thống Quản lý Mua hàng & Gia công ngoài |
| **Mã quy trình** | QT-MH-01 / COP-03 |
| **Công ty** | Công ty TNHH Sản xuất Thương mại & Dịch vụ Huỳnh Đức |
| **Bộ phận chủ hệ thống** | Bộ phận Mua hàng (MH) |
| **Chủ hệ thống** | Trưởng bộ phận Mua hàng |
| **Thay thế** | 2 file Excel + VBA (`MUA HANG MẪU GỬI LONG.xlsx`, `Quản lý GCN+ĐX 2026.xlsm`) và 2 nhóm Zalo |

**Mục đích tối thượng:** nắm bắt chặt chẽ hoạt động **mua hàng**, **gia công ngoài** và **đặt ngoài** của toàn công ty **theo từng mã hàng**.

**Ba mục tiêu vận hành:**
1. App trở thành nơi trao đổi thông tin chính thay cho Zalo — thông tin tập trung, không sót, phản hồi nhanh.
2. Ghi nhận / kiểm tra / xét duyệt trên app để loại bỏ biểu mẫu cứng và thời gian chờ ký.
3. Giao việc và phản hồi trực tiếp trên app.

**Hai vấn đề phải giải:**
- Dữ liệu nặng → chậm (đã đo: nguyên nhân thật là rác tích tụ, không phải khối lượng — xem `01_HIEN_TRANG.md`).
- Thông tin không đồng bộ → quản lý cục bộ. **Đây mới là vấn đề chính.**

---

## 2. Công nghệ và cấu trúc thư mục

```
he-thong-mua-hang/
  run.py                  # điểm khởi chạy
  requirements.txt        # fastapi>=0.110 · uvicorn[standard]>=0.27 · psycopg[binary] (Supabase/PostgreSQL) · bcrypt
  README.md               # người mới chạy được trong 30 phút
  backend/
    api/                  # route: nhận yêu cầu · kiểm quyền · gọi service · trả kết quả
    services/             # LOGIC NGHIỆP VỤ nằm ở đây
    data/                 # NƠI DUY NHẤT chạm cơ sở dữ liệu (nối Postgres qua connection string)
    config/               # hằng số, đường dẫn, tham số nghiệp vụ
  frontend/               # React + Vite (function component + hooks)
    index.html
    vite.config.js
    src/
      main.jsx            # nạp hd.css toàn cục
      App.jsx
      assets/             # hd.css · img/logo.png
      api/                # client.js — fetch wrapper + header X-Phien
      pages/              # mỗi màn hình 1 component
      components/         # component tái sử dụng
  data/                   # dữ liệu vận hành — KHÔNG đưa lên Git
  output/                 # file xuất ra cho người dùng
  backup/                 # bản sao lưu
  docs/                   # bộ tài liệu này
```

| Hạng mục | Quyết định |
|---|---|
| Ngôn ngữ backend | Python |
| Framework | FastAPI + uvicorn · **RESTful API** · tài liệu tự sinh **Swagger (OpenAPI)** tại `/docs` |
| Cơ sở dữ liệu | **Supabase (nền PostgreSQL)** giai đoạn hiện tại → **PostgreSQL thuần** khi public production. Ứng dụng chỉ dùng driver `psycopg` qua connection string nên đổi môi trường không đổi code tầng `data/` |
| Frontend | **React** (Vite · function component + hooks · React Router) |
| Bộ giao diện | Tái sử dụng `hd.css` từ hệ Kế hoạch Sản xuất (113 class, đúng chuẩn Hiến chương Ch.3) — nạp toàn cục trong React |
| Băm mật khẩu | **bcrypt** |
| Phiên đăng nhập | Token trong header `X-Phien`, lưu ở `sessionStorage` |

---

## 3. Quy định [B] bắt buộc trích từ Hiến chương HD-STD-01

### 3.1 Database (Ch.1)

- **Tên trường dùng chung, không được đặt tên khác:**
  `MA_BO_PHAN` · `MA_NHAN_VIEN` · `MA_HANG` · `MA_VACH` · `MA_LENH` · `MA_KHACH_HANG` · `MA_NCC` · `MA_KHO` · `MA_CONG_DOAN` · `DVT`
- **Nối bảng và nối hệ thống luôn bằng MÃ, không bao giờ bằng TÊN.**
- **Sáu cột hệ thống trên mọi bảng giao dịch:** `ID` · `NGAY_TAO` · `NGUOI_TAO` · `NGAY_SUA` · `NGUOI_SUA` · `PHIEN_BAN`
- **`ID` là chuỗi có tiền tố. CẤM dùng số tự tăng 1, 2, 3.**
- Định dạng: ngày `YYYY-MM-DD` · ngày giờ `YYYY-MM-DD HH:MM:SS` múi giờ `Asia/Ho_Chi_Minh` · tiền VND số nguyên không thập phân · trạng thái là chuỗi mã không dấu · true/false · UTF-8, CSV xuất ra dùng UTF-8 có BOM.
- Tên bảng và tên cột: **không dấu, viết hoa, nối bằng gạch dưới**.
- Phân biệt rõ `NULL` (chưa nhập) và `0` (bằng không).
- Báo cáo phải tính trực tiếp từ dữ liệu giao dịch gốc. **Cấm lấy file kết quả đã xuất làm đầu vào tính tiếp.**

### 3.2 Backend (Ch.2)

- **Ba tầng:** `api/` → `services/` → `data/`. Tầng trên gọi tầng dưới, không gọi ngược.
- Tiền tố API: **`/api/v1/...`** — tuân **RESTful** (danh từ số nhiều, đúng động từ HTTP: GET/POST/PUT/PATCH/DELETE).
- **Tài liệu API tự sinh bằng Swagger (OpenAPI)** do FastAPI sinh tại `/docs` (Swagger UI) và `/openapi.json`. Mọi endpoint phải có `summary`, `tags` và schema `response_model` để Swagger hiển thị đúng.
- Phản hồi thành công: `{"ok": true, "data": {...}, "error": null, "ma_loi": null}`
- Phản hồi lỗi: `{"ok": false, "data": null, "error": "<mô tả tiếng Việt>", "ma_loi": "<mã kỹ thuật>"}`
- Mã trạng thái: `200` · `400` gửi sai cách · `401` chưa đăng nhập · `403` không có quyền · `404` không thấy · `409` người khác đã sửa · `422` vi phạm quy tắc nghiệp vụ · `500` lỗi hệ thống.
- **Endpoint thay đổi dữ liệu phải chống trùng** — bấm nút ba lần không tạo ba chứng từ.
- Kiểm tra dữ liệu **bắt buộc ở backend**. Kiểm ở giao diện chỉ để thuận tiện.
- Mọi lỗi có mã lỗi để tra log. Chi tiết kỹ thuật ghi log, không trả ra giao diện.

### 3.3 Frontend (Ch.3) — React

- Stack **React + Vite** · function component + hooks · định tuyến bằng **React Router** · gọi API qua một wrapper `api/client.js` gắn header `X-Phien`.
- `hd.css` được nạp toàn cục (import trong `main.jsx`), mọi component tái sử dụng 113 class sẵn có.
- Font **Roboto**, dự phòng `"Helvetica Neue", Arial, sans-serif`.
- `HD-BLUE #283A97` là màu hành động chính. `HD-RED #EE202E` **chỉ** dùng cho logo, nhấn thương hiệu, và trạng thái nguy hiểm. **Không dùng đỏ cho nút Lưu / Tìm kiếm / Xác nhận.**
- **Ba trạng thái giao diện ở MỌI màn hình:** Đang tải · Lỗi · Không có dữ liệu.
- **Chín chức năng tối thiểu** (xem `07_FRONTEND_CHUAN.md` §2).
- Màn hình dùng ở xưởng: vùng bấm ≥ 44×44 px, chữ ≥ 16 px, ưu tiên quét mã vạch, tối đa 3 bước cho nghiệp vụ thường xuyên.

### 3.4 Phân quyền (Ch.4)

- Mọi tài khoản phải được ADMIN cấp quyền và gán vai trò. **Không tài khoản nào tự có quyền sau khi tạo.**
- Định danh người dùng gắn với `MA_NHAN_VIEN` do Phòng Nhân sự cấp.
- Mật khẩu băm bằng **bcrypt**. Cấm lưu chữ thường đọc được.
- Nghỉ việc: thu hồi quyền trong 24 giờ. **Vô hiệu hoá, không xoá.**
- **Ẩn nút trên giao diện không phải là phân quyền.** Mọi endpoint tự kiểm quyền ở backend.

### 3.5 Bảo mật (Ch.8 + Ch.12)

- **Cấm tuyệt đối đưa vào công cụ AI công cộng:** giá vốn · giá bán · giá nhà cung cấp · điều khoản hợp đồng · danh sách khách hàng · **thông tin liên hệ đối tác** · bảng lương · bản vẽ kỹ thuật · mật khẩu · khoá API · chuỗi kết nối CSDL.
- Cách thay thế: **tạo dữ liệu giả cùng cấu trúc**. Giữ nguyên tên trường, kiểu dữ liệu, quan hệ; thay giá trị bằng số và tên bịa.
- Mức Hạn chế và Tối mật: ghi nhật ký mọi lượt xem và xuất file.

---

## 4. Quy ước đặt tên trong dự án này

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Bảng, cột | KHÔNG DẤU, HOA, gạch dưới | `DE_NGHI_DONG`, `MA_VAT_TU` |
| Khoá chính | Chuỗi có tiền tố | `DN-2026-000123` |
| Endpoint | tiếng Việt không dấu, kebab-case | `/api/v1/de-nghi/{id}/duyet` |
| Hàm Python | snake_case tiếng Việt không dấu | `tinh_ngay_hieu_luc()` |
| Biến JS | camelCase tiếng Việt không dấu | `danhSachDeNghi` |
| File Python | snake_case, **tối đa 500 dòng** | `de_nghi_service.py` |
| Trạng thái | chuỗi mã không dấu, HOA | `CHO_DUYET` |
| Class CSS | dùng lại của `hd.css`, không tự đặt mới trừ khi thật cần | `btn btn-r` |

**Tiền tố mã chứng từ đã đăng ký** (Nhóm B — không tự đổi):

```
DN    Đề nghị (mua hàng / gia công ngoài)   DN-2026-000123
DNG   Đặt ngoài                              DNG-2026-000045
YCBG  Yêu cầu báo giá                        YCBG-2026-000078
BG    Báo giá nhà cung cấp                   BG-2026-000210
PO    Đơn đặt hàng                           PO-2026-000156
LMH   Lệnh mua hàng (giao việc)              LMH-2026-000089
NH    Phiếu nhận hàng                        NH-2026-000341
IQC   Kết quả kiểm tra đầu vào               IQC-2026-000122
YCTT  Yêu cầu thanh toán                     YCTT-2026-000067
BGCT  Bàn giao chứng từ                      BGCT-2026-000031
DX    Phiếu điều xe                          DX-2026-000512
DGN   Đánh giá nhà cung cấp                  DGN-2026-000019
DVL   Đổi vật liệu                           DVL-2026-000024
SC    Báo cáo sự cố                          SC-2026-000008
VT    Vật tư (danh mục)                      VT-000001
NCC   Nhà cung cấp (danh mục)                NCC-00001
KH    Khách hàng (danh mục)                  KH-00001
```

---

## 5. Danh sách điều CẤM

1. **Không** viết logic nghiệp vụ trong `api/`. Route chỉ nhận yêu cầu, kiểm quyền, gọi service, trả kết quả.
2. **Không** truy vấn cơ sở dữ liệu ngoài tầng `data/`.
3. **Không** hardcode đường dẫn, giờ chốt, ngưỡng tiền, số ngày SLA — tất cả nằm trong `config/` hoặc bảng `THAM_SO_HE_THONG`.
4. **Không** dùng số tự tăng làm khoá chính.
5. **Không** bỏ kiểm tra quyền trên endpoint nhận mã định danh.
6. **Không** dùng `HD-RED #EE202E` cho nút hành động bình thường.
7. **Không** lưu sẵn `TONG_TIEN` ở bảng đầu — tính lại khi đọc.
8. **Không** nối bảng bằng tên. Luôn bằng mã.
9. **Không** xoá cứng bản ghi. Chuyển trạng thái `HUY` kèm lý do.
10. **Không** nhồi nhiều giá trị vào một ô (lỗi kinh điển của file Excel cũ: `SỐ PGH NỘI BỘ = "12-539/01-022"`).
11. **Không** đưa dữ liệu thật của công ty vào AI. Dùng dữ liệu giả cùng cấu trúc.
12. **Không** viết file Python quá 500 dòng. Tách theo nghiệp vụ, không tách theo tầng kỹ thuật.
13. **Không** sửa ngoài phạm vi yêu cầu. Mỗi phiên một chủ đề.

---

## 6. Ba nguyên tắc thiết kế riêng của hệ thống này

**(1) Đối thủ thật của app là Zalo, không phải Excel.**
Người gửi đề nghị vật tư là trưởng bộ phận sản xuất đang đứng ở xưởng. Nếu tạo phiếu trên app chậm hơn gõ Zalo thì họ sẽ gõ Zalo. Mục tiêu đo được: **tạo xong một ĐNVT 3 dòng trên điện thoại dưới 45 giây.**

**(2) Mọi quy tắc có hai chế độ: CẢNH BÁO và CHẶN.**
Dữ liệu nền chưa sạch (mã vật tư mới có 4,1%, danh mục NCC được phê duyệt đang trống). Nếu bật CHẶN ngay ngày đầu thì 96% số dòng không lập được phiếu. Khởi động ở CẢNH BÁO, chuyển sang CHẶN theo từng quy tắc khi dữ liệu đã sạch. Cấu hình trong bảng `THAM_SO_HE_THONG`.

**(3) Chỉ làm Mua hàng. Phần liên quan chỉ GHI NHẬN, không XỬ LÝ.**
Hệ Kho vận chưa tồn tại. Hệ thống này **không** tính tồn kho, **không** ghi sổ kho, **không** hạch toán công nợ. Nó phát hành phiếu, ghi nhận kết quả, và lưu đủ khoá ngoại (`MA_VAT_TU`, `MA_KHO`, `MA_LENH`, `MA_NHAN_VIEN`, `MA_BO_PHAN`) để sau này nối API mà không phải viết lại nghiệp vụ. Mọi truy cập danh mục dùng chung đi qua một lớp `services/catalog_service.py`.

---

## 7. Bộ tài liệu — nạp file nào khi nào

| File | Nạp khi |
|---|---|
| `00_AI_RULES.md` | **Luôn luôn**, đầu mỗi phiên |
| `01_HIEN_TRANG.md` | Khi cần hiểu Excel cũ đang làm gì, hoặc khi thiết kế logic phải "sát hệ thống hiện tại" |
| `02_CHUAN_HOA.md` | Khi đụng tới mã vật tư, đánh số chứng từ, danh mục |
| `03_MO_HINH_DU_LIEU.md` | **Gần như luôn** khi viết backend |
| `04_QUY_TAC_NGHIEP_VU.md` | Khi viết service hoặc viết kiểm thử |
| `05_KIEN_TRUC.md` | Khi dựng khung dự án, viết route, xử lý lỗi |
| `06_PHAN_QUYEN.md` | Khi làm đăng nhập, tài khoản, ma trận quyền |
| `07_FRONTEND_CHUAN.md` | Khi viết bất kỳ màn hình nào |
| `08_LO_TRINH_VA_KIEM_THU.md` | Đầu và cuối mỗi giai đoạn |
| `F01`…`F11` | Chỉ nạp file của chức năng đang làm |

---

## 8. Trạng thái hiện tại

> Chi tiết đầy đủ ở `docs/TRANG_THAI_PHIEN.md` — nạp file đó cùng file này
> ở đầu mỗi phiên. Mục này chỉ giữ bản tóm tắt.

| | |
|---|---|
| **Giai đoạn** | **GIAI ĐOẠN 0 XONG** (0.1 hạ tầng · 0.2 tài khoản & phân quyền · 0.3 khung frontend). Đã qua một vòng rà soát đối kháng 33 agent, sửa 10 lỗi xác nhận. |
| **Đo được** | 205 test PASS · không file nào quá 500 dòng · đăng nhập chạy thật trên trình duyệt · 375 px không cuộn ngang |
| **Môi trường** | DB: **Supabase (PostgreSQL)** — nối qua connection string `psycopg` · sau này public production chuyển sang **PostgreSQL thuần** chỉ đổi connection string, không đổi code tầng `data/` · ứng dụng cổng **8010** (8000 đã bị hệ khác chiếm) |
| **Chưa có** | Bảng "Mục đích sử dụng" chuẩn · thông tin Bravo đang giữ gì · ba điểm của Đặt ngoài · quy định công nhận duyệt điện tử |
| **CHẶN VẬN HÀNH** | `02_nhan_vien.csv` chỉ có 7 bộ phận sản xuất. **Không ai của MH · KV · QC · KD · DH · VH · SO đăng ký tài khoản được.** Cần Phòng Nhân sự cấp bổ sung. Xem `TRANG_THAI_PHIEN.md` §7.1 |
| **Việc kế tiếp** | GĐ1 — Danh mục (F10): schema danh mục, `catalog_service.py`, tìm mờ vật tư, nhập lô, gộp mã NCC |

**Quyết định kỹ thuật mới phát sinh:** xem `TRANG_THAI_PHIEN.md` §4 (7 quyết định)
và §7.2 (3 quyết định cần anh Long xác nhận).

**Khi kết phiên:** ghi lại vào `TRANG_THAI_PHIEN.md` — đã làm xong gì, đang dở gì,
quyết định nào mới phát sinh.
