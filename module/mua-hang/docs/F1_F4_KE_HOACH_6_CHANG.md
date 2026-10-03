# Lộ trình hoàn thiện F1–F4

## Cập nhật 03/10/2026 — Xuất/in BM03–BM08

- Đã có API `/api/v1/bieu-mau/ncc/{bieu_mau}/tai` và nút Excel/PDF tại: Danh mục (BM03), từng bảng điểm đã duyệt (BM06), Đến hạn đánh giá (BM07), Sổ theo dõi (BM08).
- Excel điền trực tiếp bốn tệp ISO gốc, giữ logo/bố cục, ô gộp và tiêu đề. PDF lấy cùng nội dung, khổ A4 (BM06 dọc, còn lại ngang), Unicode tiếng Việt, phân trang và chỗ ký BM06. Không thực thi chuỗi nhập bằng dấu '=' như công thức Excel.
- BM03 chỉ lấy NCC đã phê duyệt, sản phẩm từ nhóm cung cấp đã duyệt. BM06 kiểm tra trạng thái ở server, giữ 8 tiêu chí/3 dòng ký, hiện tỷ lệ hệ số có dữ liệu, không biến điểm trống thành 0.
- BM07 có chọn năm; mỗi dòng = NCC + nhóm cung cấp, kết luận là lần chấm đã duyệt gần nhất trong tháng. Tháng không chấm để trống. Chưa gộp thành điểm trung bình cấp NCC theo trọng số giao dịch (F1-H4); dòng theo nhóm hiện rõ trên giao diện.
- BM08 lọc ngày nhận, quy đổi Chấp nhận → Đạt; Đổi trả/Khiếu nại/Giảm giá → Không đạt; Khác → Chưa xác định, giữ kết quả gốc trong ngoặc.
- Quyền tải theo `ncc.xem`; mỗi lần xuất thành công ghi nhật ký. Migration 081 đã áp dụng trên DB runtime. Bộ truy vấn xuất không dùng giới hạn 500 dòng của giao diện.
- Kiểm tra: 18 test và 2 subtest đạt; TypeScript/build đạt. BM03/BM07/BM08 đã truy vấn và dựng hai định dạng trên DB thực tế; BM06 thử bằng dữ liệu giả, kiểm tra trực quan PDF và phân trang một trang với khối ký.
- Còn nghiệm thu: bản in thực tế, bố cục với nội dung rất dài, đối soát điểm/danh mục và quyết định điểm tổng hợp NCC theo F1-H4. Chưa nghiệm thu người dùng trên trình duyệt.

## Cập nhật 03/10/2026 — Hoàn thiện màn Mặt hàng NCC

- Đã bổ sung form và cột hiển thị: công đoạn, điểm kỹ thuật, mức/điểm chất lượng, năng lực tháng, số ngày làm việc giao chuẩn. Giá trị chưa nhập giữ NULL, không tự đổi thành 0.
- Bộ lọc nhóm chính/chi tiết, loại gia công, chất lượng và trạng thái được gửi tới backend và lọc trước giới hạn 500 dòng; không chỉ lọc tập dữ liệu đã tải ở frontend.
- Đã có PATCH sửa với phiên bản; chỉ Mua hàng được sửa. Nhóm đã duyệt hoặc có bảng điểm không được đổi phạm vi phân loại; tạo nhóm mới để giữ lịch sử điểm. Thông tin kỹ thuật/chất lượng/năng lực vẫn sửa được.
- Đã thêm lịch sử tạo/sửa/duyệt từng nhóm trong cùng giao dịch và nút xem lịch sử. Không giả lập lịch sử cho hồ sơ cũ.
- Đã áp dụng 079 (bảng lịch sử) và 080 (khôi phục 5 bậc BM06 trên schema runtime vẫn chỉ nhận A/B/C). Sửa tham số NULL trong INSERT mặt hàng.
- Kiểm tra đạt: 16 test cùng 2 subtest; TypeScript và production build. PostgreSQL chạy luồng tạo → sửa → lịch sử → duyệt → chấm → duyệt bảng điểm bằng dữ liệu thử và rollback. Sinh mã/idempotency được mock trong lần thử DB này.
- Bước chọn NCC khi báo giá đã kiểm thử quy tắc Không chọn/Dự phòng bằng mock; chưa nghiệm thu toàn bộ đơn mua thật hoặc thao tác trình duyệt.
- Còn thiếu: nguồn danh mục chuẩn VTPO/VTTH, loại gia công/công đoạn và các biểu mẫu BM03–BM08. Không tự nạp danh mục suy đoán.

## Cập nhật 03/10/2026 — Bắt đầu F1 theo nhóm hàng

### Kiểm tra database và khôi phục nền F1

- Database đang cấu hình đã có migration 074 và chỉ mục chống trùng nhóm; xác nhận lại bằng truy vấn trực tiếp.
- Đã áp dụng migration 075 bổ sung `chung_loai.ma_cha` đang thiếu; không tự gán quan hệ nhóm hay thay dữ liệu chủng loại.
- Đã áp dụng migration 076 khôi phục bảng tham số bị thiếu và bốn tham số chấm điểm/chu kỳ NCC từ migration gốc. Ngưỡng giá trị giao dịch vẫn là 0 (chưa cấu hình), không tự đặt ngưỡng tiền.
- Kiểm tra PostgreSQL bằng EXPLAIN đạt cho ba truy vấn nguồn điểm và điều kiện nhóm đệ quy. Đây là kiểm tra cấu trúc/truy vấn, chưa phải đối soát điểm nghiệp vụ.
- Test nhóm, scope báo cáo và F03: 10 test đạt; đã sửa mock sinh mã và kiểm tra route qua OpenAPI.
- Danh mục runtime: 33 chủng loại, 17 ĐVT, chưa có loại gia công/công đoạn. Chưa có nguồn chuẩn VTPO/VTTH để xác nhận quan hệ nhóm con.

- Đã thêm migration 074 phân biệt hồ sơ mới theo nhóm và hồ sơ cũ theo mã vật tư; không đổi điểm, không gộp hoặc xóa lịch sử cũ.
- Hồ sơ mới chống trùng theo NCC + nhóm chính/chi tiết hoặc loại gia công/công đoạn. Điểm hàng hóa lấy từ toàn bộ mã thuộc nhóm đã chọn và các nhóm con; chọn nhóm chi tiết sẽ giới hạn phạm vi vào nhánh đó.
- Chọn NCC ở Báo giá và thống kê giao hàng ở báo cáo NCC dùng cùng điều kiện nhóm. Ưu tiên bảng điểm nhóm chi tiết so với nhóm chính, rồi đến hồ sơ cũ theo mã.
- Giao diện khai nhóm, đánh giá và đến hạn hiển thị phạm vi nhóm/hồ sơ cũ; đổi nhóm chính sẽ xóa lựa chọn nhóm chi tiết cũ.
- Chưa có giao dịch thì điểm giá trị giao dịch để trống, không quy thành 0.
- Còn thiếu: danh mục chuẩn VTPO/VTTH từ Kho vận (thư mục module hiện trống), ánh xạ giao nhận gia công theo loại/công đoạn, chuyển đổi hồ sơ cũ có đối soát, biểu mẫu BM03–BM08.
- Đã xác nhận 074 và áp dụng 075–076 trên database đang cấu hình. Đối soát dữ liệu nghiệp vụ và nghiệm thu staging vẫn chưa hoàn thành.

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

**Kiểm tra ngày 03/10/2026:** 40 kiểm tra API với database thật đạt, dữ liệu thử đã rollback; 23 test NCC, 4 test F03 và kiểm tra TypeScript đạt. Đã sửa chống trùng bảng điểm chờ duyệt và đồng bộ cờ phê duyệt NCC. Chưa chốt nghiệm thu toàn bộ: cần UAT trình duyệt, giao dịch để đối soát điểm/định mức và xác nhận biểu mẫu. Chi tiết: [F1_KET_QUA_NGHIEM_THU.md](F1_KET_QUA_NGHIEM_THU.md).

**Trạng thái: Đang làm.** Đã có hồ sơ NCC, mặt hàng NCC, đánh giá theo mặt hàng, định mức tháng và sổ theo dõi BM08 ở mức code. Chưa nghiệm thu in biểu mẫu và luồng phê duyệt trên schema đích.

- [ ] Hoàn thiện hồ sơ NCC và mặt hàng: mã vật tư/công đoạn, kỹ thuật, chất lượng, năng lực, ngày giao chuẩn.
- [ ] Hoàn thiện BM03, BM06, BM07, BM08; số liệu và định dạng khớp biểu mẫu nguồn.
- [ ] Kiểm tra điểm, xếp loại, duyệt đánh giá, lịch sử và chống trùng đánh giá theo mặt hàng.
- [ ] Kiểm tra định mức tháng trên đơn hàng đã duyệt và đặt ngoài; chặn/nhắc vượt định mức theo quy tắc.
- [ ] Kiểm tra quyền riêng cho giá NCC và phạm vi xem/sửa NCC.

**Qua cổng khi:** tạo/sửa/duyệt/in đủ 4 biểu mẫu, kiểm thử công thức đánh giá và định mức, test chéo quyền NCC.

## Chặng 3 — F3 Đặt ngoài

**Cập nhật phạm vi quyền ngày 03/10/2026:** Danh sách phiếu lọc SQL theo `toan_bo`/`bo_phan`/`ca_nhan`; bộ phận lấy từ nhân viên lập phiếu như phần trao đổi/tệp. Chi tiết, sửa dòng/báo giá, yêu cầu kỹ thuật, lập/sửa/nhận đợt giao, duyệt/chuyển trạng thái kiểm tra scope của hành động. Hàng đợi Kỹ thuật dùng scope `xac_nhan_kt`; trả lời kiểm tra thêm quyền/scope xác nhận. Scope không hợp lệ hoặc thiếu bộ phận bị từ chối. Kiểm tra scope trước khi trả kết quả idempotency; lịch sử theo mã liên phiếu chỉ trả với scope toàn bộ, scope giới hạn chỉ trả lịch sử dòng đang xem.

Kiểm tra: 35 test Đặt ngoài, 5 test thông báo và test dùng chung kết nối đạt; SQL danh sách/kiểm tra chủ hồ sơ và luồng nhận hàng chạy fixture DB thật, đã rollback. Không cần migration. Chưa chạy UAT bằng đăng nhập thật hoặc thay đổi phạm vi quyền giữa lúc một request đang thực thi. Danh mục LSX/NCC tham chiếu vẫn theo quyền màn hình, không coi là hồ sơ phiếu đặt ngoài.

**Cập nhật nhận hàng ngày 03/10/2026:** Nhận đợt giao chỉ khi phiếu đã đặt/đang làm; mỗi đợt ghi nhận toàn bộ lượng đã lên lịch và không được nhận lặp. Giao dịch khóa phiếu, đối soát lượng, cập nhật trạng thái/ngày nhận từng dòng và toàn phiếu, tăng phiên bản, ghi lịch sử. Nhận một phần giữ `DANG_LAM`; mọi dòng nhận đủ mới sang `DA_NHAN`. Chuyển thủ công sang `DA_NHAN` hoặc `HOAN_THANH` cũng bị chặn nếu không có dòng hoặc chưa nhận đủ từng dòng; hoàn tất vẫn chặn yêu cầu kỹ thuật chưa xác nhận. UI cập nhật lại phiếu sau nhận và hiển thị lượng nhận/tổng đặt. Không tự chuyển đổi dữ liệu nhận lịch sử thiếu đợt giao.

Đã kiểm tra repository với fixture trên DB thật: nhận nhiều đợt/nhiều dòng, trạng thái từng dòng/phiếu, nhận lặp, hoàn tất thiếu hàng, còn yêu cầu kỹ thuật và phiếu đã kết thúc; dữ liệu thử rollback. Script: `scripts/kiem_tra_nhan_dat_ngoai.py`. Bộ test Đặt ngoài hiện 31/31 đạt sau sửa hồ sơ giả lập vai trò Kỹ thuật; chưa chạy browser UAT hay stress test đồng thời. Không cần migration mới.

**Rà soát ngày 03/10/2026:** Đã có UI/backend nhập LSX, nội dung từng dòng, báo giá nhiều NCC, yêu cầu/xác nhận kỹ thuật theo mã và yêu cầu lại, đợt giao, lịch sử đổi ngày dự kiến, trao đổi/tệp. Kiểm tra đọc DB xác nhận 9 bảng liên quan và khóa ngoại sự cố đã có; chưa chạy vòng đời API đầu-cuối trên DB thật. Test Đặt ngoài: 29/30 đạt, 1 lỗi do hồ sơ giả lập thiếu `vai_tro=KY_THUAT`; 6 test trao đổi/tệp và 5 test thông báo kỹ thuật đạt.

Các khoảng trống còn lại: UI vẫn nhập mã sự cố tự do (DB kiểm tra tồn tại nhưng chưa kiểm tra liên quan NCC/dòng); mã hàng thay thế chưa có lịch sử riêng; xóa hạn cam kết chưa ghi lịch sử; nhận đợt giao hiện chỉ cập nhật ngày thực tế, chưa đồng bộ trạng thái/đối soát lượng nhận để chặn hoàn tất; API chính mới kiểm quyền màn hình, chưa áp dụng scope người lập/bộ phận như phần trao đổi/tệp. Ưu tiên tiếp theo: hoàn thiện nhận hàng và điều kiện kết thúc phiếu, sau đó scope và lịch sử/sự cố, rồi nghiệm thu vòng đời trên DB thật.

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
