  # Mô tả chức năng hiện tại — Hệ thống Mua hàng

Ngày rà soát: **04/09/2026**  
Phạm vi: mã nguồn hiện tại, 14 trang trong ma trận quyền, 17 router nghiệp vụ và
276 thao tác HTTP (gồm `/health` và `/api/v1/phien-ban`).

Tài liệu này là bản tra cứu nhanh theo **hệ thống đang chạy**. Đặc tả chi tiết
về trường dữ liệu, quy tắc và giao diện vẫn nằm ở `docs/F01_*.md` đến
`docs/F12_*.md` và tài liệu bàn giao bản 2.

## 1. Chức năng dùng chung

### Đăng nhập và tài khoản

- Người dùng đăng ký, đăng nhập, đăng xuất, xem hồ sơ và đổi mật khẩu.
- Tài khoản mới phải được Quản trị duyệt và gán vai trò trước khi dùng.
- Phiên đăng nhập có thời hạn; tài khoản bị khoá không được tiếp tục truy cập.
- Hệ thống có 16 vai trò. Quyền được kiểm ở máy chủ theo bốn hành động: xem,
  sửa, duyệt, xuất; dữ liệu còn được giới hạn theo cá nhân, bộ phận hoặc toàn bộ.

### Kiểm soát chung

- Mọi API nghiệp vụ trả cùng một vỏ `{ok, data, error, ma_loi}`.
- Nút gửi hỗ trợ khoá chống bấm lặp; nhiều lần gửi cùng khoá chỉ tạo một chứng từ.
- Chứng từ dùng phiên bản để chặn hai người ghi đè thay đổi của nhau.
- Thay đổi trạng thái, duyệt và xuất dữ liệu được ghi nhật ký.
- Quy tắc cấu hình được có thể chạy ở chế độ `CANH_BAO` hoặc `CHAN`.
- Lịch làm việc, ngày nghỉ, ngày làm bù và giờ chốt được dùng khi tính kỳ hạn.
- Trường giá được cắt ở máy chủ với vai trò không có quyền, không chỉ ẩn ở giao diện.

## 2. Mười bốn trang chức năng

| Trang | Người dùng làm được gì | Đầu ra/chuyển tiếp chính |
|---|---|---|
| **Tổng quan** | Xem số việc theo trạng thái, KPI và mở danh sách đã lọc từ từng ô số | Dẫn đến đề nghị, đơn hàng, giao nhận và báo cáo chi tiết |
| **Đề nghị mua hàng** | Tạo đề nghị mua hàng/gia công ngoài, thêm nhiều dòng, gửi duyệt, duyệt/trả lại, phân công, huỷ; kiểm tra kỳ hạn và LSX | Dòng đã duyệt đi sang xác nhận kỹ thuật, cấp mã, báo giá hoặc mua hàng |
| **Xác nhận kỹ thuật** *(ba tab trong trang Đề nghị)* | Xác nhận dùng được/không dùng được, đề xuất và duyệt đổi mã hàng, xin/cấp/gắn mã vật tư, xử lý yêu cầu huỷ | Cập nhật mã được duyệt mua nhưng giữ nguyên mã người đề nghị ban đầu |
| **Báo giá** | Chọn dòng chờ hỏi giá, tạo/gửi YCBG, nhập nhiều báo giá, so sánh, chấm tiêu chí, miễn trừ và chọn NCC | Báo giá được chọn là nguồn lập đơn hàng |
| **Đơn hàng** | Lập PO từ báo giá hoặc thủ công, tính tiền/VAT, duyệt theo hạn mức, theo dõi giao hàng, đổi kỳ hạn có ghi nguồn, in/xuất | Đơn đã duyệt đi sang nhận hàng; dòng đơn có thể được giao thành công việc |
| **Giao việc** | Trưởng bộ phận giao việc; người nhận nhận việc, báo xong; người giao xác nhận hoặc trả lại | Thông báo và lịch sử trạng thái công việc |
| **Giao nhận** | Nhận hàng nhiều lần, nhận thiếu/thừa có kiểm soát, yêu cầu IQC, QC ghi kết quả và TBP QC xác nhận, lập hàng không phù hợp/giao bù, giao hàng nội bộ | Cập nhật số đã nhận, chất lượng NCC và tồn kho sau khi bên nhận xác nhận |
| **Tồn kho** *(tab trong Giao nhận)* | Xem tồn/đã hứa/khả dụng, nhập và điều chỉnh tồn, giữ chỗ, lập phiếu xuất, Kho duyệt hoặc từ chối, nhả giữ chỗ quá hạn | Sổ chuyển động tồn; phần xuất thiếu quay lại luồng mua |
| **Đặt ngoài** | Kinh doanh kéo dòng từ LSX, lập/gửi/duyệt phiếu, chọn NCC, hỏi và so sánh giá, lập đơn gia công, theo dõi công đoạn và nhận về | Theo dõi riêng theo LSX; có thể phát sinh nhu cầu điều xe |
| **Điều xe** | Lập yêu cầu, áp giờ chốt, xin duyệt ngoại lệ, xếp xe/tài xế, phát hiện trùng lịch, xem lịch theo ngày/tài xế/tuyến, xác nhận/hủy và in | Lịch điều xe và thống kê km/chi phí theo phạm vi quyền |
| **Thanh toán** | Lập yêu cầu thanh toán nhiều đợt, duyệt, đánh dấu đã trả, quét quá hạn, lập bàn giao chứng từ | Trạng thái thanh toán được suy từ các đợt, không nhập tay |
| **Nhà cung cấp** | Tìm kiếm, tạo/sửa, duyệt/tạm ngưng/loại bỏ, khai nhóm hàng, đánh giá ban đầu/định kỳ, gộp NCC trùng, xuất danh sách | Cung cấp NCC hợp lệ cho báo giá, đơn hàng và đặt ngoài; số liệu lấy từ giao dịch/IQC |
| **Dữ liệu gốc** | Quản lý 25 danh mục, vật tư, cây nhóm/chủng loại; tìm gần đúng; cấp/gộp mã; nhập lô có kiểm tra và tệp lỗi | Dữ liệu nền dùng chung cho mọi chứng từ |
| **Báo cáo** | Xem Tổng quan, COP-03 và 24 báo cáo; lọc, xem biểu đồ, mở dòng nguồn, tải CSV theo quyền | Số liệu tính trực tiếp từ chứng từ và ghi nhật ký khi xuất |
| **Tiện ích** | Máy tính vật liệu/khối lượng/thành tiền, thông báo, hộp thư/trao đổi, trò chuyện, tệp đính kèm, báo sự cố | Có thể chép kết quả tính sang chứng từ và chuyển tin nhắn thành việc |
| **Quản trị** | Duyệt/khoá tài khoản, đổi vai trò, xem/sửa ma trận quyền và tham số, tra nhật ký, chuyển/phục hồi lưu trữ | Cấu hình vận hành toàn hệ thống; không thay thế nghiệp vụ của các bộ phận |

> Ma trận hệ thống có 14 mã trang vì **Xác nhận kỹ thuật** và **Tồn kho** là
> các tab của trang khác; bảng trên tách chúng thành dòng riêng để người dùng
> dễ tìm chức năng.

## 3. Luồng hoạt động chính

```text
Đề nghị → TBP duyệt → xác nhận kỹ thuật/cấp mã khi cần
        → yêu cầu báo giá → so sánh/chọn NCC → đơn hàng → duyệt
        → nhận hàng nhiều lần → IQC khi được yêu cầu
        → giao nội bộ/xác nhận nhận → tăng tồn
        → yêu cầu thanh toán theo đợt → bàn giao chứng từ
```

Các luồng phụ:

- **Đặt ngoài:** LSX → phiếu đặt ngoài → duyệt → báo giá/đơn gia công → công
  đoạn → nhận về.
- **Điều xe:** yêu cầu từ bộ phận/NCC/đặt ngoài → kiểm giờ chốt → xếp xe và tài
  xế → thực hiện → xác nhận.
- **Hàng lỗi:** nhận hàng → IQC hai bước → biên bản không phù hợp → trả NCC →
  giao bù bằng một lần nhận mới để không mất lịch sử lô đầu.

## 4. Vai trò demo

Có 16 tài khoản mẫu tương ứng 16 vai trò, dùng để kiểm đúng menu và quyền. Danh
sách tài khoản nằm ở `demo/README.md` và `Tài liệu Bàn giao/BAT-DAU-TU-DAY.md`.
Tài khoản `demo_quan_tri_nghiep_vu` thấy đủ 14 trang và có quyền xem giá; không
nên dùng tài khoản này để nghiệm thu luồng của người dùng thường vì nó che mất
các lỗi thiếu quyền.

## 5. Giới hạn đang biết

- Báo cáo hiện tải **CSV**, chưa có bản PDF cho BC01–BC24.
- Thông báo chỉ ở trong ứng dụng; chưa gửi Zalo/email.
- Tệp đính kèm chưa được quét virus.
- Số biểu mẫu cũ (`SO_PHIEU_CU`) vẫn nhập tay; chưa tự sinh đủ chuẩn đánh số
  công ty.
- Một số quyết định nghiệp vụ/dữ liệu nền còn chờ chốt; xem
  `docs/CAN_CUNG_CAP.md` và `docs/11_CAN_MUA_HANG_CUNG_CAP.md`.
- Các lỗi và điểm lệch đã xác minh nằm trong
  `docs/BAO_CAO_KIEM_THU_2026-09-04.md`.
