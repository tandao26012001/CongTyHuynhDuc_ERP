# Môi trường phát triển của ERP

Các module nằm trong `module/`. Cấu hình kết nối dùng chung ở `.env` tại gốc repo
(file này không được đưa vào Git). Môi trường Python nằm trong `.venv/` ngay tại
gốc repo và không được đưa vào Git:

- `.venv/Scripts/python.exe`: Python 3.14 và các thư viện backend hiện có.
- `../CongTyHuynhDuc_ERP_env/node_modules/`: thư viện frontend hiện có. `node_modules` ở gốc repo là
  junction trỏ tới thư mục này; mã nguồn không chứa bản sao thư viện.
- Node.js, npm và uv đã cài trên máy; npm dùng bộ nhớ đệm chung của người dùng.

VS Code được cấu hình chọn sẵn Python trong project qua `.vscode/settings.json`.

Khởi tạo môi trường Python lần đầu từ PowerShell ở gốc repo:

```powershell
uv venv .venv --python 3.14
uv pip install --python .venv/Scripts/python.exe -r module/mua-hang/requirements.txt
```

Chạy backend:

```powershell
& .\.venv\Scripts\Activate.ps1
cd module/mua-hang
python run.py
```

Ở terminal khác, cũng từ gốc repo:

```powershell
cd module/mua-hang/frontend
npm run dev
```

Chạy kiểm thử backend từ thư mục gốc repo:

```powershell
cd module/mua-hang
& ..\..\.venv\Scripts\python.exe -X utf8 -m pytest tests -q
```

`npm run lint` và `npm run build` gọi các script ở `package.json` gốc và dùng
thư viện chung; không chạy `npm install` riêng trong `frontend/`. Khi tạo module
mới, khai báo script tương ứng ở gốc để tiếp tục dùng chung môi trường Node.
Khi module cần thư viện/phiên bản mới, cập nhật môi trường chung theo
`requirements.txt` hoặc `package.json` của module đó. Không dùng chung một phiên
bản thư viện nếu các module có yêu cầu xung đột; lúc đó cần tách môi trường.

Nếu chuyển hoặc clone repo sang máy khác, cài lại thư viện ở thư mục ngoài repo
và tạo lại junction `node_modules` (junction và các gói cài đặt không nằm trong Git).

## Cổng đăng nhập dùng chung

Ứng dụng Mua hàng hiện dùng màn hình đăng nhập làm trang gốc. Frontend kiểm tra
`GET /api/v1/toi` trước khi hiển thị bất kỳ màn hình nghiệp vụ nào; token được giữ
trong `sessionStorage` và gửi bằng header `X-Phien`. Backend lưu hash của token,
không lưu token thô trong DB.

Các module thêm sau phải đi qua cùng hợp đồng này: chưa có phiên hoặc nhận HTTP
401 thì trở về cổng đăng nhập; mọi API nghiệp vụ phải tự xác minh `X-Phien` ở
backend. Việc ẩn màn hình phía frontend không thay thế kiểm tra quyền. Khi triển
khai nhiều module trên web, cần phục vụ chúng dưới cùng origin hoặc bổ sung cơ chế
chuyển phiên an toàn; `sessionStorage` không tự chia sẻ giữa các origin khác nhau.
