# Trạng thái phiên

## Xuất/in biểu mẫu NCC — 03/10/2026

- Hoàn thành xuất XLSX/PDF BM03/BM06/BM07/BM08 từ mẫu Excel nguồn; thêm nút tải trên các tab NCC, chọn năm BM07 và kỳ BM08.
- BM06 chỉ tải bảng đã duyệt, có 8 tiêu chí/3 dòng ký, ghi hệ số có dữ liệu; BM07 hiện riêng từng NCC/nhóm và kết luận cuối tháng (chưa làm trung bình trọng số cấp NCC).
- Đã cài và thêm `openpyxl` vào requirements. Migration 081 tạo nhật ký xuất biểu mẫu đã áp dụng. `pymupdf` chỉ dùng kiểm tra PDF cục bộ, không là phụ thuộc vận hành.
- 18 test/2 subtest, TypeScript và build đạt. Truy vấn/dựng file BM03/07/08 trên DB đạt; BM06 kiểm tra PDF với dữ liệu giả. Chưa UAT bản in hay số liệu nghiệp vụ.

## Hoàn thiện màn mặt hàng NCC — 03/10/2026

- Form/bảng có thêm công đoạn, điểm kỹ thuật, chất lượng, năng lực tháng và ngày giao chuẩn; thêm bộ lọc phía server, sửa theo phiên bản và lịch sử tạo/sửa/duyệt.
- Nhóm đã duyệt hoặc có điểm giữ phạm vi phân loại cố định, tránh đổi nghĩa điểm cũ. Chỉ Mua hàng được sửa; lỗi giữ nguyên form để chỉnh.
- Đã áp dụng migration 079–080; giữ xếp loại cũ A/B/C và bổ sung 5 bậc BM06. INSERT mặt hàng đã ép kiểu tham số NULL cho ngày duyệt.
- 16 test/2 subtest, TypeScript và build đạt. Luồng repo trên PostgreSQL tạo/sửa/duyệt/chấm/duyệt điểm đạt với dữ liệu rollback; sinh mã/idempotency mock. Quy tắc chọn NCC kiểm thử bằng mock, chưa UAT trình duyệt.
- Kế tiếp: BM03–BM08; đối chiếu danh mục chuẩn và nghiệm thu dữ liệu nghiệp vụ vẫn còn.

## Sửa lỗi danh sách mặt hàng NCC — 03/10/2026

- API `/api/v1/mat-hang-ncc` lỗi IndeterminateDatatype khi bộ lọc NCC/trạng thái là NULL. Các placeholder `%s IS NULL` chưa có kiểu để PostgreSQL suy luận.
- Đã ép kiểu text cho hai tham số kiểm tra NULL ở `mat_hang_ncc_repo.danh_sach`.
- Kiểm tra trực tiếp trên PostgreSQL đạt với: không bộ lọc, chỉ trạng thái, tìm tên và chỉ NCC. Không thay đổi dữ liệu hoặc migration.

## Sửa lỗi mở danh mục NCC — 03/10/2026

- Log người dùng: danh sách NCC lỗi UndefinedColumn `trang_thai_xet_duyet`. DB thiếu các cột hồ sơ xét duyệt trong migration 048.
- Áp dụng migration 077 bổ sung cột xét duyệt/người/ngày và xuất xứ; giữ số NCC, cờ phê duyệt và trạng thái hoạt động. Chỉ NCC có cờ phê duyệt mới ánh xạ DA_DUYET.
- Kiểm tra liên quan phát hiện hàng đợi đến hạn thiếu `trang_thai_duyet`. Áp dụng 078 khôi phục cột, giữ trạng thái duyệt hợp lệ từ cột runtime `trang_thai`, không thay điểm lịch sử.
- Đã chạy trực tiếp service danh sách trang 1/25 và truy vấn hàng đợi đến hạn trên DB cấu hình: cả hai thành công.

## Cập nhật 03/10/2026 — F1 đánh giá theo nhóm NCC

- Phiên tiếp theo: xác nhận DB đã có 074; áp dụng 075 bổ sung cây chủng loại và 076 khôi phục bảng tham số NCC bị thiếu. EXPLAIN ba truy vấn nguồn điểm đạt trên PostgreSQL.
- Đã sửa hai test F03; tổng 10 test nhóm/scope/F03 đạt. Runtime có 33 chủng loại và 17 ĐVT; loại gia công/công đoạn đang rỗng. Chưa nghiệm thu số liệu hoặc chuẩn VTPO/VTTH.

- Migration 074 giữ hồ sơ và điểm cũ theo mã; hồ sơ mới đánh giá theo nhóm hàng chính/chi tiết hoặc loại gia công/công đoạn.
- Đã sửa nguồn điểm hàng hóa, lựa chọn NCC trong Báo giá, phạm vi giao hàng trong báo cáo NCC và các màn khai nhóm/đánh giá/đến hạn.
- Gia công chưa có khóa liên kết giao nhận đủ để tính tự động; giao diện thông báo thiếu dữ liệu. Kho vận hiện chưa có danh mục VTPO/VTTH trong repo để đối chiếu.
- Kiểm thử phạm vi nhóm/lịch sử và scope báo cáo: 6 test đạt. Bộ test F03 mở rộng có hai lỗi ở mock kết nối và truy cập route FastAPI, ngoài phần thay đổi.
- TypeScript và production build frontend đạt; Vite còn cảnh báo bundle lớn hơn 500 kB.
- Đã kiểm tra/cập nhật database ở phiên tiếp theo; chưa nghiệm thu staging. Chi tiết theo `F1_F4_KE_HOACH_6_CHANG.md`.

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
- Tầng danh mục tương thích cả schema chuẩn và schema rút gọn hiện tại (`danh_muc_dong`).
- Tồn kho trong module Mua hàng là dữ liệu tham chiếu chỉ đọc từ trường `DU_LIEU.ton_kho`; module không tính tồn và không ghi sổ kho.
- Luồng cấp mã vật tư đã có backend F02 (`/api/v1/yeu-cau-cap-ma/...`), nhưng schema rút gọn hiện tại chưa có bảng/hàng đợi tương ứng nên chưa thể vận hành màn hình Kho cấp mã.

## Kiểm tra

- Backend biên dịch Python thành công.
- Vite chuyển đổi thành công `CatalogView.tsx`, `CreateRequestView.tsx` và `App.tsx`.
- Backend đã khởi động lại tại cổng `8010`; OpenAPI đã nhận endpoint đơn vị tính mới.
- Bộ kiểm thử cũ chưa chạy xanh vì đang giả định schema chuẩn (`tai_khoan`, `tham_so_he_thong`, `lich_nghi`...), trong khi DB hiện tại dùng schema rút gọn viết hoa.

## Cập nhật 01/10/2026 — Lộ trình NHÓM B · QUẢN TRỊ v3

- Migration `060` đã được chỉnh để mở rộng và dùng lại `nhat_ky_thay_doi` hiện có, không tạo bảng nhật ký danh mục riêng. Trigger ghi nhận tạo/sửa/xóa cho các bảng danh mục chuẩn có mặt trong schema; API `GET /api/v1/danh-muc/{ma}/{id_ban_ghi}/lich-su` đọc theo mã danh mục và khóa bản ghi.
- Sau lỗi database thiếu bảng `nhat_ky_thay_doi`, migration `060` tự khôi phục cấu trúc cơ sở tương thích migration `004` trước khi mở rộng; lần chạy lỗi trong transaction cần chạy lại bằng file đã cập nhật.
- API/service lịch sử có allowlist cho các danh mục đang hỗ trợ; giao diện lịch sử hiện đã nối ở Đơn vị tính và Chủng loại. Dữ liệu cũ/mới được ghi dạng JSON; bảng nhật ký hiện tại cho phép bổ sung hành động `XOA`.
- B2 có schema nền và migration `060` đã seed idempotent đủ 7 loại tài khoản theo DOCX. Người dùng đã xác nhận đổi toàn bộ theo DOCX v3; migration `064` ghi bảng đối chiếu 16 vai trò trong tài liệu và mã `ADMIN` bổ sung thành 7 loại. Chưa chuyển tài khoản/ma trận quyền; không triển khai phần này độc lập khi backend vẫn kiểm tra các mã vai trò cũ.
- Khung điều hướng B1 hiện có đúng 12 tab: 3 Dữ liệu công ty và 9 Dữ liệu hệ thống; khu vực tài khoản/phân quyền/tham số/nhật ký tách riêng. Các màn đang chạy được nối lại (Nhân viên, Bộ phận, Vật tư, Đơn vị tính, Chủng loại, Lệnh sản xuất); các tab còn lại mới là khung, chưa có CRUD/dữ liệu.
- Chưa đạt đủ B1 theo DOCX: chưa có thống kê 4 chỉ số, kiểm tra chất lượng dữ liệu, đánh lại STT, màn chi tiết bản ghi, các tab gộp quy chuẩn/thanh toán và lịch sử ở mọi tab. Nhân viên/bộ phận/công đoạn chưa đủ luồng nhập lô theo yêu cầu v3.
- Chưa chạy migration trên database thật. Trước khi vận hành cần chạy `060` trên đúng database backend và kiểm tra trigger ghi vào `nhat_ky_thay_doi`.

### Kiểm tra phiên

- `compileall` cho route/repo/service lịch sử danh mục: đạt; test `test_catalog_history_service`: 3/3 đạt; `tsc --noEmit`: đạt; `git diff --check`: đạt.
- Chưa xác nhận build Vite trong phiên này: tiến trình esbuild bị môi trường trả `spawn EPERM`. Chưa chạy migration lên database thật.
- Bộ test tổng thể trước đó còn 13 lỗi do fixture/schema DB không khớp và cấu trúc FastAPI của một số test cũ.

## Kiểm tra sau migration 064 — 01/10/2026

- Database đang dùng đã ghi nhận version `064`; bảng đối chiếu có đủ 17 vai trò (16 vai trò v2 và `ADMIN`) và cả 7 tài khoản có `ma_loai_tk`. Không có tài khoản đã gán vai trò mà thiếu loại tài khoản.
- Ma trận quyền hiện tại vẫn theo vai trò cũ. Có 42 cặp (loại tài khoản × trang) mà các vai trò được gộp có quyền khác nhau; không thể lấy một dòng cũ làm quyền chung mà không thay đổi quyền của người dùng.
- API và giao diện quản trị vẫn đọc `vai_tro`. Chưa mở màn sửa quyền theo 7 loại, chưa chuyển kiểm quyền lúc chạy. Cần chuyển đồng bộ backend, frontend và ma trận mới trước khi sử dụng 7 loại để cấp quyền.
- Người dùng đã chốt các ô `Pending` theo bảng quyền v3 trong DOCX. Bảng đối chiếu đã điền quy tắc PQ-07 cho 42 ô lệch và migration `065` đã dựng riêng ma trận 7 × 17 trên database. Backend vẫn dùng quyền v2, nên chưa được coi là hoàn thành chuyển đổi.
- API tài khoản đã đọc `ma_loai_tk` và màn Tài khoản chọn 7 loại; khi lưu, backend đồng thời gán vai trò v2 tương thích theo bộ phận để các luồng cũ còn chạy. Màn Phân quyền v3 và API cho 7 × 17 ô đã chuẩn bị, ghi rõ chưa có hiệu lực. Chưa chuyển hàm kiểm quyền dùng ma trận mới hoặc xử lý đầy đủ nhánh `CAN_DUYET`.
- Trong lúc định chạy thử `065` rồi rollback, lệnh kiểm tra giữ lại `COMMIT` ở cuối file và đã áp dụng migration thật. Đối soát sau đó: 119 ô v3, 240 ô v2 vẫn còn, 7 tài khoản hoạt động; chưa đổi quyền v2 đang được backend sử dụng. Cần tránh lặp lại mẫu chạy thử SQL này.
- PQ-11 trong DOCX yêu cầu chạy ma trận mới song song với ma trận cũ hai tuần, ghi chênh lệch trước khi bỏ ma trận cũ. Chưa cài cơ chế so sánh nền này hoặc duyệt đề xuất cho các ô `CAN_DUYET`, vì vậy chưa chuyển quyền đang chạy sang v3.
