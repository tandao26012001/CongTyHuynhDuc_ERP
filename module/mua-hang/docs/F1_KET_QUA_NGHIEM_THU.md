# Kiểm tra nghiệm thu F1 — 03/10/2026

## Phạm vi và cách chạy

Chạy API trong tiến trình bằng FastAPI TestClient, sử dụng database đang cấu hình. Chỉ giả lập hồ sơ phiên đăng nhập; phân quyền, service, SQL, sinh mã và idempotency chạy thật. Dùng một tài khoản hiện có làm khóa người thực hiện, tạo NCC/nhóm thử riêng. Toàn bộ dữ liệu thử, bộ đếm, idempotency và audit xuất được rollback cùng giao dịch; script kiểm tra NCC/nhóm thử không còn sau rollback. Không kiểm tra đăng nhập hoặc thao tác trên trình duyệt.

Từ thư mục gốc:

```powershell
.venv/Scripts/python.exe module/mua-hang/scripts/nghiem_thu_f1.py
$env:PYTHONPATH='module/mua-hang'
.venv/Scripts/python.exe -m unittest discover -s module/mua-hang/tests -p 'test_ncc*.py'
.venv/Scripts/python.exe -m unittest discover -s module/mua-hang/tests -p 'test_f03.py'
npm run lint:mua-hang
```

## Kết quả

- 40 kiểm tra API đạt: đề xuất/duyệt NCC; đề xuất/sửa/duyệt nhóm; phân quyền vai trò; gửi lặp; chống trùng; phiên bản cũ; lịch sử 3 thao tác; nguồn điểm không có giao dịch; chấm điểm/duyệt; tạo kỳ đánh giá tiếp theo; giới hạn điểm; định mức và che số tiền.
- BM03/BM06/BM07/BM08 tải XLSX và PDF thành công, XLSX đọc được, PDF đúng cấu trúc đầu/cuối; có 8 bản ghi audit xuất trong giao dịch thử. BM06 chưa duyệt bị chặn. Không coi kiểm tra cấu trúc file là nghiệm thu bố cục in.
- Hai route cố định `so-bm08` và `danh-gia-den-han` trả 200.
- 23 test NCC và 4 test F03 đạt; TypeScript không lỗi. Test F03 là test có mock, chưa chứng minh luồng chọn báo giá trên DB thật.

## Lỗi đã sửa trong đợt kiểm tra

1. Cho phép nhiều bảng điểm chờ duyệt cùng nhóm: khóa dòng nhóm trước khi kiểm tra/tạo bảng điểm. Gửi lại cùng idempotency vẫn trả bảng điểm cũ; gửi khóa mới khi còn bảng điểm chờ duyệt trả 409. Kiểm tra tuần tự đạt; chưa stress test nhiều kết nối đồng thời.
2. Duyệt đề xuất NCC chưa cập nhật cờ `da_phe_duyet` mà yêu cầu báo giá sử dụng: duyệt nay cập nhật cả cờ và ngày phê duyệt. Không tự sửa các hồ sơ lịch sử đã tồn tại.

## Chưa đủ điều kiện chốt nghiệm thu F1

- Chưa chạy UAT trên trình duyệt bằng tài khoản đăng nhập thật và kiểm tra phạm vi cá nhân/bộ phận.
- Chưa dựng giao dịch PO/nhận hàng/IQC/sự cố để đối soát điểm tự động, BM08 có dữ liệu và vượt định mức. Fixture hiện không có giao dịch; định mức chỉ kiểm tra đặt/đọc/quyền/phiên bản.
- Chưa chạy đầu-cuối chọn báo giá với NCC KHÔNG CHỌN/DỰ PHÒNG và lý do vượt định mức trên DB thật.
- Chưa đối chiếu bố cục in bốn biểu mẫu với biểu mẫu nguồn, hoặc người nghiệp vụ ký xác nhận số liệu.
- Chưa có danh mục chuẩn VTPO/VTTH và ánh xạ giao dịch gia công; BM07 hiện tổng hợp từng NCC + nhóm, chưa có điểm tổng NCC có trọng số.

Kết luận: luồng API cốt lõi đạt trong phạm vi trên; F1 chưa được chốt nghiệm thu nghiệp vụ toàn bộ.
