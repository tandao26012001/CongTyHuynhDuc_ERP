# Trạng thái phiên

## Cập nhật 21/09/2026 — Danh mục vật tư và đơn vị tính

- Đã đặt màn hình quản lý tại **Quản trị → Dữ liệu gốc → Dữ liệu công ty**; không đặt thành mục nghiệp vụ riêng của Mua hàng.
- Sidebar đã đổi sang mẫu nền xanh và chia nhóm: **Quản trị → Điều hành → Mua hàng → Gia công ngoài**; mục đang chọn có nền xanh đậm và vạch đỏ bên trái. Menu tiếp tục lọc theo quyền `xem` của tài khoản.
- Đã chuyển **Giao việc** vào nhóm **Điều hành**. Chốt quy ước: **Quản trị** và **Điều hành** là hai nhóm sidebar cố định dùng chung cho mọi module sau này.
- Màn hình **Dữ liệu gốc** đã chia hai tầng: **Dữ liệu công ty** (Bộ phận, Nhân viên, Kho, Đơn vị tính, Vật tư & tồn kho) và **Dữ liệu hệ thống** (Tài khoản, Vai trò & phân quyền, Tham số hệ thống, Nhật ký thay đổi). Đơn vị tính và vật tư đã kết nối chức năng; các tab còn lại đang là khung chờ API.
- Tab **Đơn vị tính** đã có nhập hàng loạt từ Excel: dán 3 cột, xem trước, sửa/xóa dòng và kiểm tra trường bắt buộc. Khi submit, hệ thống thêm từng dòng hợp lệ, bỏ qua dòng trùng/sai, nêu rõ mã và lý do, đồng thời giữ các dòng lỗi để sửa rồi nhập lại.
- Đã có giao diện tạo và danh sách đơn vị tính.
- Đã có giao diện tạo, tìm vật tư và xem tồn khả dụng.
- Form tạo đề nghị dùng danh mục đơn vị tính; gõ từ 2 ký tự ở tên hàng sẽ gợi ý vật tư và tự điền mã, đơn vị, mã vạch, tồn kho.
- API mới: `GET /api/v1/don-vi-tinh`.
- Tầng danh mục tương thích cả schema chuẩn và schema rút gọn hiện tại (`DANH_MUC_DONG`).
- Tồn kho trong module Mua hàng là dữ liệu tham chiếu chỉ đọc từ trường `DU_LIEU.ton_kho`; module không tính tồn và không ghi sổ kho.
- Luồng cấp mã vật tư đã có backend F02 (`/api/v1/yeu-cau-cap-ma/...`), nhưng schema rút gọn hiện tại chưa có bảng/hàng đợi tương ứng nên chưa thể vận hành màn hình Kho cấp mã.

## Kiểm tra

- Backend biên dịch Python thành công.
- Vite chuyển đổi thành công `CatalogView.tsx`, `CreateRequestView.tsx` và `App.tsx`.
- Backend đã khởi động lại tại cổng `8010`; OpenAPI đã nhận endpoint đơn vị tính mới.
- Bộ kiểm thử cũ chưa chạy xanh vì đang giả định schema chuẩn (`tai_khoan`, `tham_so_he_thong`, `lich_nghi`...), trong khi DB hiện tại dùng schema rút gọn viết hoa.
