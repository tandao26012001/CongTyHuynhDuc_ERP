# He thong Mua hang & Gia cong ngoai

## Chay nhanh (30 phut)

### Backend (Python + FastAPI + Swagger)

Điền `DATABASE_URL` **một lần** trong `.env` ở gốc repo (hai cấp trên
`module/mua-hang/`). File này được bỏ qua bởi Git; không đưa mật khẩu vào tài liệu
hay commit. Backend tự đọc file này bất kể chạy lệnh từ thư mục nào.
`DB_SCHEMA` mặc định là `mua_hang` cho module này.

```bash
# Dùng môi trường Python chung ../CongTyHuynhDuc_ERP_env (xem README gốc).
python run.py  # -> http://127.0.0.1:8010  Swagger: /docs
```

Trên Windows PowerShell, từ gốc repo kích hoạt môi trường chung:
`& (Join-Path (Split-Path (Get-Location).Path -Parent) 'CongTyHuynhDuc_ERP_env/Scripts/Activate.ps1')`,
sau đó `cd module/mua-hang` và `python run.py`. Các module tạo sau cần được
cấu hình đọc cùng `.env` gốc; `.env` không tự động áp dụng cho mọi công cụ.

Sau khi nạp schema và danh mục, tạo duy nhất tài khoản quản trị gốc. Mật khẩu được nhập ẩn:

```bash
python3 scripts/tao_quan_tri_goc.py TEN_DANG_NHAP MA_NHAN_VIEN
```

Script tự khóa sau khi hệ thống đã có tài khoản đầu tiên. Các tài khoản còn lại phải đi qua
luồng đăng ký và được quản trị gán vai trò.

## API xác thực

Các endpoint tại `/api/v1`:

```text
POST /dang-ky
POST /dang-nhap
POST /dang-xuat          X-Phien: <token>
GET  /toi                X-Phien: <token>
POST /doi-mat-khau       X-Phien: <token>
GET  /tai-khoan          X-Phien: <token>  (quản trị)
POST /tai-khoan/{ma}/duyet
POST /tai-khoan/{ma}/khoa
```

`/dang-nhap` trả token 64 ký tự. Các endpoint bảo vệ nhận token qua header `X-Phien`.
Đổi mật khẩu hoặc khóa tài khoản sẽ thu hồi toàn bộ phiên của tài khoản đó.
Frontend luôn mở ở cổng đăng nhập nếu chưa có phiên hợp lệ. Có thể đăng nhập bằng
tên tài khoản; với mô hình DB chuẩn, backend cũng chấp nhận mã nhân viên. Màn hình
chọn phân hệ hiện chỉ mở Mua hàng; các module sau phải dùng lại cùng phiên và API
xác minh `/api/v1/toi`.

## API danh mục và tìm kiếm

Các endpoint chỉ đọc dưới đây đều yêu cầu header `X-Phien`:

```text
GET /api/v1/danh-muc
GET /api/v1/danh-muc/{ma}?trang=1&kich_thuoc=20
GET /api/v1/vat-tu/tim?q=<tu-khoa>&gioi_han=20
GET /api/v1/vat-tu/{id_vat_tu}
GET /api/v1/nha-cung-cap/tim?q=<tu-khoa>&gioi_han=20
```

Các mã danh mục hiện có: `don-vi-tinh`, `chung-loai`, `bo-phan`, `nhan-vien`,
`nha-cung-cap`. Tìm kiếm vật tư và nhà cung cấp không phân biệt dấu/hoa thường,
yêu cầu ít nhất 2 ký tự và trả tối đa 50 kết quả. Quyền cần có là `danh_muc.xem`;
riêng tìm nhà cung cấp dùng `ncc.xem`.

### Ghi danh mục

```text
POST  /api/v1/danh-muc/{ma}
PATCH /api/v1/danh-muc/{ma}/{id_ban_ghi}

POST  /api/v1/vat-tu/kiem-tra-trung
POST  /api/v1/vat-tu
PATCH /api/v1/vat-tu/{id_vat_tu}

POST  /api/v1/nha-cung-cap/kiem-tra-trung
POST  /api/v1/nha-cung-cap
GET   /api/v1/nha-cung-cap/{id_ncc}
PATCH /api/v1/nha-cung-cap/{id_ncc}

POST  /api/v1/danh-muc/nhap-hang-loat/xem-truoc
POST  /api/v1/danh-muc/nhap-hang-loat/xac-nhan
```

- Các lệnh `POST` có ghi dữ liệu bắt buộc gửi `X-Idempotency-Key` là UUID.
- Lệnh sửa bắt buộc gửi `phien_ban`; dữ liệu đã bị người khác sửa sẽ trả HTTP 409.
- Mã vật tư đã được cấp là bất biến. Tên giống từ ngưỡng `NGUONG_TRUNG_TEN`
  trở lên chỉ cảnh báo; mã/tên vật tư chính xác hoặc mã/MST NCC chính xác sẽ chặn.
- Tạo vật tư/NCC có cảnh báo trả `da_luu=false`. Gửi lại cùng dữ liệu với
  `xac_nhan_trung=true` để xác nhận lưu.
- Nhập hàng loạt hỗ trợ `don-vi-tinh`, `chung-loai`, `bo-phan`, `nhan-vien`,
  `vat-tu`, `nha-cung-cap`, tối đa 500 dòng. Gọi `xem-truoc`, sửa hết dòng lỗi,
  rồi gửi nguyên danh sách cùng `ma_xac_nhan` sang `xac-nhan`. Toàn bộ đợt nhập
  nằm trong một giao dịch: một dòng lỗi thì không dòng nào được ghi.

### Frontend (React + Vite)

```bash
cd frontend && npm run dev
```

Thư viện frontend được cài bên ngoài repo và dùng qua junction `node_modules`
ở gốc; không cần cài riêng trong module. Xem `README.md` ở gốc repo để khôi phục
môi trường chung khi chuyển máy.

## Cau truc

```
backend/api/       -> route (nhan request, kiem quyen, goi service)
backend/services/  -> logic nghiep vu
backend/data/      -> noi duy nhat cham DB (psycopg qua DATABASE_URL)
backend/config/    -> settings
frontend/src/      -> React (main.jsx nap hd.css, api/client.js gan X-Phien)
```

## Quy tac chinh

- API prefix `/api/v1`, envelope `{ok, data, error, ma_loi}`, Swagger tai `/docs`.
- 3 tang `api -> services -> data`, khong goi nguoc.
- DB hien tai Supabase (nen Postgres), production doi sang Postgres thuan chi doi `DATABASE_URL`.
