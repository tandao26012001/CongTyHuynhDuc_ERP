# Lộ trình hoàn thiện F1–F4

Mục tiêu là đưa từng chức năng đạt 90–100% theo đặc tả v3, có kiểm thử nghiệp vụ và dữ liệu đối soát. Không tính migration đã viết hoặc giao diện đã dựng là nghiệm thu. Migration F1–F3 chỉ được triển khai sau khi xác nhận đúng schema đích; lịch sử F4 phải được xuất và đối chiếu trước khi chuyển Kho vận.

## Chặng 1 — Nền dữ liệu, quyền và ranh giới hệ thống

**Trạng thái: Đang làm; chưa qua cổng DB.** Đã có migration 047–053, tách quyền giá, thêm hồ sơ trao đổi/tệp và migration 052–053 sửa schema Đặt ngoài cũ đã ghi nhận 050 nhưng thiếu/khác cấu trúc F3. Đã siết mã hồ sơ, kích thước upload và header tải tệp; đã có test bảo vệ các trường hợp này.

- [x] Quyền xem giá giao dịch và giá NCC tách riêng ở backend.
- [x] F4 được xác định là dữ liệu Kho vận; Mua hàng chỉ xuất lịch sử và bàn giao.
- [x] Giới hạn dung lượng, MIME cho phép, đường dẫn hồ sơ và đường dẫn tải tệp được kiểm tra phía server.
- [ ] Đối chiếu schema đích với migration 047–051; xác nhận các bảng nguồn báo cáo và cột Đặt ngoài.
- [x] Áp dụng migration 052 trên DB runtime; xác nhận bốn cột F3 đã có.
- [ ] Áp dụng migration 053 trên DB runtime; xác nhận bảng xác nhận kỹ thuật, đợt giao, lịch sử đổi hạn và thử mở chi tiết mã hàng.
- [ ] Chạy migration trên môi trường staging đúng schema và kiểm tra quyền của mọi vai trò.
- [ ] Kiểm thử log/audit cho xem, tải, xuất và thay đổi dữ liệu nhạy cảm.

**Qua cổng khi:** migration chạy sạch trên staging, kiểm tra quyền API đạt, không dùng database thiếu bảng/cột để nghiệm thu.

## Chặng 2 — F1 Nhà cung cấp

**Trạng thái: Đang làm.** Đã có hồ sơ NCC, mặt hàng NCC, đánh giá theo mặt hàng, định mức tháng và sổ theo dõi BM08 ở mức code. Chưa nghiệm thu in biểu mẫu và luồng phê duyệt trên schema đích.

- [ ] Hoàn thiện hồ sơ NCC và mặt hàng: mã vật tư/công đoạn, kỹ thuật, chất lượng, năng lực, ngày giao chuẩn.
- [ ] Hoàn thiện BM03, BM06, BM07, BM08; số liệu và định dạng khớp biểu mẫu nguồn.
- [ ] Kiểm tra điểm, xếp loại, duyệt đánh giá, lịch sử và chống trùng đánh giá theo mặt hàng.
- [ ] Kiểm tra định mức tháng trên đơn hàng đã duyệt và đặt ngoài; chặn/nhắc vượt định mức theo quy tắc.
- [ ] Kiểm tra quyền riêng cho giá NCC và phạm vi xem/sửa NCC.

**Qua cổng khi:** tạo/sửa/duyệt/in đủ 4 biểu mẫu, kiểm thử công thức đánh giá và định mức, test chéo quyền NCC.

## Chặng 3 — F3 Đặt ngoài

**Trạng thái: Đang làm.** Đã có chi tiết dòng, xác nhận kỹ thuật, đợt giao, trường lịch sử đổi hạn và trao đổi/tệp. Chưa hoàn tất giao diện luồng sự cố và đối soát nhận hàng.

  - [x] Nghiệp vụ bổ sung: NCC, đơn giá và hạn giao được chọn/lưu độc lập theo từng mã; một phiếu có thể gom mã của nhiều NCC. Phiếu chỉ sang Chờ duyệt khi mọi mã đã có NCC và giá. Migration 054 chuyển NCC cũ từ đầu phiếu xuống từng dòng.
- [ ] Hoàn thiện nhập/sửa từng dòng và hiển thị yêu cầu gia công, kỹ thuật, chất lượng, NCC cam kết.
- [ ] Ghi lịch sử khi đổi mã hàng hoặc hạn cam kết; bắt buộc lý do và người/thời điểm sửa.
- [ ] Nối báo cáo sự cố thực tế vào dòng đặt ngoài; không dùng mã sự cố tự do không kiểm tra.
- [ ] Hoàn thiện xác nhận kỹ thuật/QC và nhận nhiều đợt; tổng lượng nhận không vượt lượng đặt.
- [x] Thay thao tác nhập ngày nhận bằng điều khiển ngày trên từng đợt; kiểm tra trạng thái phiếu sau từng lần giao.
- [ ] Kiểm tra trao đổi, tệp và quyền truy cập chéo hồ sơ.

**Qua cổng khi:** chạy được vòng đời phiếu từ lập đến hoàn tất, sửa/nhận lặp an toàn, lịch sử đầy đủ và kiểm thử quyền theo người lập/bộ phận.

## Chặng 4 — F2 Báo cáo

**Trạng thái: Đang làm; chưa đạt độ tin cậy số liệu.** Đã dựng 7 tab và xuất XLSX/PDF. Scope cá nhân/bộ phận hiện lọc ở SQL; KPI tính trên toàn bộ tập đã lọc, còn bảng chỉ trả tối đa 2.000 dòng. Export tập lớn, phân trang và một số bộ lọc/chỉ tiêu vẫn chưa hoàn tất; chưa dùng làm báo cáo chốt.

- [ ] Ánh xạ đủ 24 báo cáo cũ sang 7 nhóm/tab và lập bảng đối soát từng chỉ tiêu.
- [ ] Tính KPI trên toàn bộ tập dữ liệu đã lọc; phân trang dữ liệu bảng độc lập với tổng hợp.
- [ ] Bổ sung bộ lọc bộ phận, nhân viên, nhóm hàng, NCC, trạng thái và thời gian theo từng tab.
- [ ] Kiểm tra công thức giao đúng hạn, IQC đạt, phản hồi báo giá, công nợ/đợt thanh toán, hiệu quả NCC và đặt ngoài.
- [ ] Tách quyền giá giao dịch/giá NCC cho dữ liệu, biểu đồ, export và PDF; ghi audit lượt xuất.
- [ ] Đối chiếu mẫu dữ liệu đã ẩn danh với Excel nguồn; kiểm tra ranh giới ngày, trạng thái rỗng và dữ liệu lớn.

**Qua cổng khi:** tổng số và KPI khớp truy vấn đối soát; thay đổi trang không đổi KPI; export khớp bảng; test scope và quyền giá không lộ dữ liệu.

## Chặng 5 — F4 Điều xe và bàn giao Kho vận

**Trạng thái: Chặn phụ thuộc Kho vận/DB.** Đã loại Điều xe khỏi phạm vi chức năng Mua hàng theo quyết định v3 và có script xuất lịch sử. Đặc tả v3 không yêu cầu checkbox “Đã báo Kho vận điều xe”.

- [ ] Chạy script xuất trên schema có đủ bảng `dieu_xe`, `dieu_xe_dong`, `xe`, `tai_xe`.
- [ ] Đối chiếu số dòng, khóa liên kết, chuyến xe và lịch sử trước khi bàn giao file cho Kho vận.
- [ ] Kho vận xác nhận nơi tiếp nhận, người sở hữu dữ liệu và cách tra cứu sau chuyển giao.
- [ ] Kiểm tra migration 047 chỉ gỡ quyền/tham số Mua hàng, không xóa dữ liệu lịch sử.
- [ ] Gỡ mọi liên kết/route Điều xe còn xuất hiện trong menu Mua hàng sau khi đã bàn giao.

**Qua cổng khi:** có biên bản/số liệu đối chiếu và xác nhận tiếp nhận từ Kho vận. Không tạo màn hình Điều xe mới trong Mua hàng.

## Chặng 6 — Tích hợp, hồi quy và nghiệm thu

**Trạng thái: Chưa bắt đầu.**

- [ ] Nối báo cáo với dữ liệu Đơn hàng và Thanh toán đã triển khai; hiện hai màn hình này còn ComingSoon nên KPI liên quan chưa thể nghiệm thu đầu-cuối.
- [ ] Chạy test backend/frontend trên staging, migration từ trạng thái DB thực tế và test phân quyền bằng từng vai trò.
- [ ] Chạy kịch bản người dùng cho NCC, đặt ngoài, báo cáo và bàn giao Kho vận; xác nhận biểu mẫu và số liệu.
- [ ] Kiểm tra hiệu năng với tập dữ liệu lớn, upload giới hạn, export, audit và khôi phục sau lỗi.
- [ ] Chốt danh sách lỗi còn lại, người phụ trách và biên bản UAT.

**Qua cổng khi:** không còn lỗi mức chặn/cao, test chính đạt, các chủ hệ thống xác nhận kết quả và mọi phụ thuộc ngoài code có đầu mối xử lý.

## Điều kiện hiện tại đang chặn nghiệm thu

- Database cấu hình hiện có không khớp các bảng/cột mà F1–F4 và migration 047–051 cần; chưa chạy migration trên database này.
- Chưa có kết quả bàn giao lịch sử Điều xe được Kho vận xác nhận.
- Đơn hàng và Thanh toán chưa có màn hình vận hành, nên báo cáo tương ứng chưa thể đối chiếu đầu-cuối.
- Test tổng hiện có lỗi nền do schema DB/tests cũ; cần staging đúng schema để phân loại và chốt regression.
