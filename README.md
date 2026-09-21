# Môi trường dùng chung của ERP

Các module nằm trong `module/`. Cấu hình kết nối dùng chung ở `.env` tại gốc repo
(file này không được đưa vào Git). Công cụ và thư viện đã cài ở thư mục
`../CongTyHuynhDuc_ERP_env/`, **bên ngoài repo**:

- `Scripts/python.exe`: Python 3.14 và các thư viện backend hiện có.
- `node_modules/`: thư viện frontend hiện có. `node_modules` ở gốc repo là
  junction trỏ tới thư mục này; mã nguồn không chứa bản sao thư viện.
- Node.js, npm và uv đã cài trên máy; npm dùng bộ nhớ đệm chung của người dùng.

VS Code được cấu hình chọn sẵn Python chung qua `.vscode/settings.json`.

Trong PowerShell, chạy từ gốc repo:

```powershell
$sharedEnv = Join-Path (Split-Path (Get-Location).Path -Parent) 'CongTyHuynhDuc_ERP_env'
& (Join-Path $sharedEnv 'Scripts/Activate.ps1')
cd module/mua-hang
python run.py
```

Ở terminal khác, cũng từ gốc repo:

```powershell
cd module/mua-hang/frontend
npm run dev
```

`npm run lint` và `npm run build` cũng dùng thư viện chung, không cần chạy
`npm install` riêng trong `frontend/`. Khi tạo module mới, Python dùng lại môi
trường trên nếu các phiên bản tương thích; Node tìm thư viện qua junction gốc.
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
