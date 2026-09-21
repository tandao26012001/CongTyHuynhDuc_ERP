# 13 — Đối chiếu mô hình dữ liệu với Supabase hiện tại

> Thời điểm kiểm tra metadata: 2026-09-16.
> Phạm vi: chỉ đọc cấu trúc, ràng buộc, thống kê số dòng ước lượng và quyền của schema `public`.
> Không đọc hoặc sao chép dữ liệu nghiệp vụ, thông tin liên hệ, mật khẩu hay chuỗi kết nối.

> **Cập nhật triển khai 2026-09-16:** schema `mua_hang` đã được tạo thành công theo
> phương án song song. `public` được giữ nguyên; chưa thực hiện migration dữ liệu thật.

## 1. Kết luận

Không tạo đè mô hình trong `03_MO_HINH_DU_LIEU.md` lên schema `public` hiện tại.

Supabase đã có một mô hình ERP dùng tên tiếng Anh, dữ liệu thật và quan hệ đang hoạt động. Mô hình này có nhiều nghiệp vụ trùng với tài liệu mới nhưng khác nền tảng thiết kế:

- phần lớn khoá chính là `INTEGER` sinh từ sequence;
- người dùng được nối bằng `user.id`, không phải `MA_NHAN_VIEN`;
- nhiều trường tiền và số lượng dùng `DOUBLE PRECISION`;
- phần lớn ngày giờ dùng `TIMESTAMP WITHOUT TIME ZONE`;
- bảng giao dịch không có đủ bộ cột `ID · NGAY_TAO · NGUOI_TAO · NGAY_SUA · NGUOI_SUA · PHIEN_BAN`;
- tên bảng/cột và trạng thái chưa theo bộ mã tiếng Việt không dấu trong tài liệu mới.

Phương án đề nghị: tạo schema riêng `mua_hang`, triển khai DDL chuẩn ở đó, sau đó di trú/đồng bộ dữ liệu từ `public` qua bảng ánh xạ. Không xoá, đổi tên hoặc thay kiểu trực tiếp các bảng cũ trong giai đoạn đầu.

## 2. Hiện trạng Supabase có ảnh hưởng đến migration

### 2.1 Dữ liệu lõi đã tồn tại

Số dòng dưới đây lấy từ thống kê PostgreSQL, dùng để đánh giá phạm vi và có thể chênh nhẹ so với `COUNT(*)`:

| Bảng hiện tại | Số dòng ước lượng | Ý nghĩa |
|---|---:|---|
| `item` | 1.464 | danh mục vật tư/hàng |
| `inventory` | 1.464 | tồn kho — ngoài phạm vi hệ Mua hàng mới |
| `lenh_san_xuat` | 420 | dữ liệu lệnh sản xuất |
| `supplier` | 53 | nhà cung cấp |
| `customer` | 36 | khách hàng |
| `department` | 19 | bộ phận |
| `unit_of_measure` | 17 | đơn vị tính |
| `purchase_request` | 11 | đề nghị mua hàng |
| `purchase_request_item` | 17 | dòng đề nghị |
| `outside_purchase_request` | 2 | đặt ngoài |
| `outside_purchase_request_item` | 17 | dòng đặt ngoài |
| `user` | 11 | tài khoản cũ |

Các bảng mua hàng/giao nhận còn lại phần lớn chưa có dữ liệu hoặc có rất ít dữ liệu. Đây là điều kiện thuận lợi để chuyển sang mô hình mới, nhưng danh mục và kho phải được giữ nguyên, đối soát và không được ghi đè.

### 2.2 An toàn Supabase cần xử lý trước khi public API

Tất cả bảng `public` đang kiểm tra đều có:

- RLS tắt;
- vai trò `anon` và `authenticated` được cấp đầy đủ `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`;
- không có policy RLS;
- chỉ thấy trigger bảo vệ bất biến trên `stock_ledger_entry`.

Đây là rủi ro nghiêm trọng nếu REST API/GraphQL của Supabase đang mở ra internet, đặc biệt với các bảng `user`, `salary_config`, `salary_slip`, dữ liệu kho và dữ liệu đối tác. Cần thực hiện một migration bảo mật riêng sau khi xác nhận ứng dụng cũ đang kết nối bằng vai trò nào. Không thu hồi quyền hoặc bật RLS hàng loạt khi chưa kiểm tra vì có thể làm ứng dụng cũ ngừng chạy.

Extension `pg_trgm` chưa được cài. Tài liệu mới cần extension này cho tìm kiếm mờ vật tư và nhà cung cấp.

## 3. Ma trận ánh xạ chính

| Mô hình mới | Bảng gần nhất hiện có | Đánh giá | Hướng xử lý |
|---|---|---|---|
| `VAT_TU` | `item` | Trùng một phần | Di trú; tạo `ID` dạng `VT-...`, giữ ánh xạ `item.id ↔ VAT_TU.ID`; đổi tiền từ `double precision`; bổ sung tên không dấu, phân loại, phôi gốc/gộp |
| `DON_VI_TINH` | `unit_of_measure` | Gần tương đương | Chuẩn hoá `code/symbol`, thêm `SO_LE`, tạo bảng ánh xạ ID số sang `DVT` |
| `CHUNG_LOAI` | `item_category` và `item.category` | Trùng một phần | Hợp nhất, chuẩn hoá mã; không lấy text tự do làm FK |
| `NHA_CUNG_CAP` | `supplier` | Trùng phần lõi | Di trú; giữ hai cờ vai trò và bổ sung kỳ hạn, loại gia công, trạng thái chuẩn |
| `KHACH_HANG` | `customer` | Trùng phần lõi | Di trú và cấp `MA_KHACH_HANG`; không nối bằng tên |
| `BO_PHAN` | `department` | Thiếu mã chuẩn | Cấp/đối chiếu `MA_BO_PHAN`; giữ bảng ánh xạ ID cũ |
| `NHAN_VIEN` | `user` | Không tương đương hoàn toàn | Không coi tài khoản là hồ sơ nhân viên; cần nguồn nhân sự và `MA_NHAN_VIEN` chuẩn |
| `TAI_KHOAN` | `user` và `auth.users` | Xung đột kiến trúc | Phải chốt dùng auth tự quản hay Supabase Auth trước khi tạo DDL |
| `LENH_SAN_XUAT` | `lenh_san_xuat` | Trùng một phần | Giữ dữ liệu nguồn; chuẩn hoá khóa và `TIMESTAMPTZ`; bảng mới chỉ đọc |
| `LSX_DONG` | chưa có | Thiếu | Tạo mới; cần nguồn `MA_VACH` và quan hệ một lệnh–nhiều dòng |
| `CONG_DOAN` | `process_operation` | Gần tương đương nhưng đang trống | Tạo/di trú mã `CD01...CD39`, `GCN` |
| `DE_NGHI` | `purchase_request` | Trùng nghiệp vụ, lệch cấu trúc | Di trú 11 bản ghi qua mapping; không sửa tại chỗ |
| `DE_NGHI_DONG` | `purchase_request_item` | Trùng nghiệp vụ, lệch kiểu | Di trú 17 bản ghi; chuyển số lượng sang `NUMERIC(14,4)` và snapshot danh mục |
| `DAT_NGOAI*` | `outside_purchase_request*` | Trùng đáng kể | Di trú sang hai bảng đầu/chi tiết chuẩn |
| `YEU_CAU_BAO_GIA`, `BAO_GIA*` | `outside_purchase_quote` | Thiếu lớp yêu cầu báo giá và chi tiết | Tạo mới; chỉ dùng dữ liệu cũ làm nguồn migration khi có |
| `DON_HANG*` | `purchase_order*`, `outside_purchase_order` | Trùng một phần | Tạo đầu/chi tiết chuẩn; không giữ `item_id` ở bảng đầu; tiền dùng `BIGINT` |
| `NHAN_HANG*` | `stock_document*` | Khác ranh giới hệ thống | Hệ mới chỉ ghi nhận nhận hàng; kho cũ vẫn sở hữu tồn và sổ kho |
| `KET_QUA_IQC` | `quality_inspection` | Trùng phần lớn | Di trú/đồng bộ; nối bằng ID dòng nhận hàng mới |
| `HANG_KHONG_PHU_HOP` | `non_conformity` | Trùng phần lớn | Di trú/đồng bộ, đổi ID chuỗi và audit chuẩn |
| `YEU_CAU_THANH_TOAN*` | `payment_request`, `payment_installment` | Trùng phần lớn | Di trú; tiền từ `double precision` sang `BIGINT` có báo cáo làm tròn |
| `BAN_GIAO_CHUNG_TU*` | `document_handover*` | Trùng phần lớn | Di trú, thay ID số bằng mã chứng từ |
| `DIEU_XE*` | `vehicle_dispatch*` | Trùng phần lớn | Di trú; tiền `BIGINT`, km `NUMERIC(8,1)`, tài xế/xe dùng mã |
| `DANH_GIA_NCC` | `supplier_evaluation` | Trùng phần lớn | Di trú; điểm dùng `NUMERIC(5,2)` và thêm số liệu tự động |
| `CONG_VIEC*` | `task` | Trùng bảng đầu, thiếu chi tiết | Di trú có chọn lọc và tạo `CONG_VIEC_DONG` |
| `THAM_SO_HE_THONG` | `system_setting` | Gần tương đương nhưng đang trống | Tạo bảng mới và nạp bộ tham số trong tài liệu |
| nhật ký/trạng thái/thông báo | `audit_log`, `approval_history`, `notification` | Rời rạc | Tạo mô hình chuẩn; cân nhắc adapter đọc lịch sử cũ |
| `BO_DEM_CHUNG_TU` | `document_code_sequence` | Khác khóa năm | Tạo mới với PK `(TIEN_TO, NAM)` |

## 4. Bảng bắt buộc tạo mới

Các khái niệm sau không có bảng tương đương đủ dùng trong schema hiện tại:

- `MUC_DICH_SU_DUNG`, `LOAI_GIA_CONG`, `LICH_NGHI`, `ANH_XA_TIEN_TO`;
- `XE`, `TAI_XE`, `VAT_LIEU_TINH_TOAN`, `MAU_SON_KHACH_HANG`;
- `NHAN_VIEN`, `LSX_DONG`, `VAI_TRO`, `PHIEN_DANG_NHAP` theo đúng thiết kế mới;
- `DOI_VAT_LIEU`, `YEU_CAU_HUY`, `YEU_CAU_CAP_MA`;
- `YEU_CAU_BAO_GIA`, `YCBG_DONG`, `BAO_GIA_DONG`;
- `LICH_SU_TRANG_THAI`, `TRAO_DOI`, `TEP_DINH_KEM`, `SU_CO`, `LICH_SU_GOP_VAT_TU`;
- `BO_DEM_CHUNG_TU` và view trạng thái tổng hợp.

## 5. Điểm phải sửa/chốt trong tài liệu trước khi sinh DDL

1. **Tên vật lý trong PostgreSQL:** tên viết HOA nhưng không đặt trong dấu nháy kép sẽ được PostgreSQL lưu thành chữ thường. Nên dùng tên vật lý chữ thường (`vat_tu`, `de_nghi`) và giữ quy ước HOA ở tài liệu/nghiệp vụ; không nên tạo identifier có nháy kép.
2. **Auth:** `TAI_KHOAN` tự lưu `MAT_KHAU_HASH` đang trùng vai trò với `auth.users` của Supabase và bảng `public.user` cũ. Cần chốt một cơ chế duy nhất.
3. **Khóa liên hệ người dùng:** tài liệu yêu cầu mọi giao dịch lưu `MA_NHAN_VIEN`, trong khi DB cũ dùng `user.id INTEGER`. Migration bắt buộc có bảng ánh xạ và không được suy từ tên.
4. **`TONG_TIEN`:** nguyên tắc cấm lưu tổng tiền nhưng `DON_HANG.GIA_TRI_TRUOC_VAT` lại cho phép cache. Cần chốt đây là cột tính/generated, view, hay cache có trigger kiểm soát.
5. **View `V_TINH_TRANG_MA_HANG`:** SQL hiện tại có thể sinh nhiều dòng cho một dòng đề nghị khi có nhiều báo giá, đơn hàng hoặc lần nhận; chưa thực sự lấy “chứng từ mới nhất”. Cần viết lại bằng `LATERAL`, `DISTINCT ON` hoặc aggregate.
6. **Chỉ mục trùng:** `ix_vattu_ten_kd` và `ix_vt_trgm` cùng đánh GIN trên `VAT_TU.TEN_KHONG_DAU`; chỉ giữ một.
7. **Ràng buộc nghiệp vụ:** nhiều trường trạng thái/phân loại mới chỉ được mô tả bằng comment. DDL chạy thật cần `CHECK`, FK danh mục hoặc bảng trạng thái.
8. **Audit không đồng nhất:** một số bảng ghi `+ 6 cột`, một số `+ 4 cột audit`, một số bảng chi tiết không có đủ cột. Cần phân loại rõ bảng giao dịch và áp cùng một chuẩn.
9. **Xoá cứng:** tài liệu cấm xoá cứng nhưng nhiều quan hệ cần chỉ rõ `ON DELETE RESTRICT`; không để mặc định hoặc `CASCADE` trên chứng từ/lịch sử.
10. **Tên hàng duy nhất:** `UNIQUE(TEN_HANG)` là so sánh phân biệt hoa/thường và không xử lý tên không dấu. Cần unique theo khóa chuẩn hoá nếu muốn thực thi tính độc nhất ở DB.
11. **Nguồn danh mục dùng chung:** phải chốt bảng nào do hệ cũ sở hữu và đồng bộ một chiều, tránh hai hệ cùng sửa `item`, nhân viên, bộ phận, lệnh sản xuất.

## 6. Kế hoạch triển khai đề nghị

### Giai đoạn 1 — Khoá thiết kế

- Chốt auth: Supabase Auth hay phiên tự quản.
- Chốt schema riêng `mua_hang` và quyền truy cập của backend.
- Chốt chủ sở hữu các danh mục dùng chung.
- Sửa 11 điểm ở mục 5 thành DDL rõ ràng.

### Giai đoạn 2 — Tạo nền schema

- Tạo `mua_hang` và extension `pg_trgm`.
- Tạo danh mục độc lập, bảng nguồn chỉ đọc, bảng tài khoản/quyền và bộ đếm chứng từ.
- Tạo đầy đủ PK, FK, unique, check, index, trigger cập nhật `PHIEN_BAN`.
- Mặc định không cấp quyền cho `anon`; backend dùng tài khoản DB tối thiểu cần thiết.

### Giai đoạn 3 — Migration danh mục

- Nạp `DON_VI_TINH`, `CHUNG_LOAI`, `BO_PHAN`, `NHAN_VIEN` chuẩn.
- Di trú `item`, `supplier`, `customer`, `lenh_san_xuat` qua bảng staging/mapping.
- Xuất báo cáo dòng không khớp; không im lặng bỏ dòng.

### Giai đoạn 4 — Tạo luồng giao dịch

- Tạo đề nghị, báo giá, đơn hàng, nhận hàng/IQC, thanh toán, điều xe và lịch sử.
- Di trú lượng nhỏ giao dịch cũ sau khi danh mục đã có mapping.
- Tạo view trạng thái tổng hợp đã khử trùng theo chứng từ mới nhất.

### Giai đoạn 5 — Chuyển đổi

- Chạy đối soát số dòng, tổng tiền, số lượng và khóa ngoại.
- Chạy song song/read-only với hệ cũ trong thời gian xác nhận.
- Chỉ chuyển ghi sang schema mới sau khi người phụ trách nghiệp vụ ký xác nhận.

## 7. Trạng thái migration schema

Phương án schema riêng đã được xác nhận và triển khai:

- 4 migration đã áp dụng và ghi nhận trong `mua_hang.schema_migrations`;
- 59 bảng và 1 view đã được tạo;
- 100/100 khóa ngoại hợp lệ;
- 32 trigger tăng `PHIEN_BAN` và cập nhật `NGAY_SUA` đã được tạo;
- extension `pg_trgm` phiên bản 1.6 đã được cài;
- `anon` và `authenticated` không có `USAGE`, `SELECT` hoặc `INSERT` trên schema mới;
- 14 tham số hệ thống mặc định đã được nạp;
- phép thử trigger trong transaction thành công và đã rollback dữ liệu thử.

Mã nguồn migration nằm trong `supabase/migrations/` và được điều phối bởi
`supabase/deploy_mua_hang.sql`. Bước tiếp theo là chuẩn bị staging/mapping và báo cáo
đối soát trước khi di trú dữ liệu từ `public`; không chuyển dữ liệu trực tiếp khi chưa có
bảng mã nhân viên và các danh mục chuẩn được xác nhận.

### Cập nhật staging và di trú danh mục

Đã tạo staging, hàm chuẩn hoá, bảng ánh xạ và báo cáo đối soát. Kết quả chuyển tự động an toàn:

| Nhóm | Nguồn | Đã chuyển | Chờ rà soát |
|---|---:|---:|---:|
| Đơn vị tính | 17 | 17 | 0 |
| Chủng loại | 1 | 1 | 0 |
| Vật tư | 1.464 | 1.464 | 0 |
| Nhà cung cấp | 53 | 2 | 51 |
| Bộ phận | 19 | 18 | 1 |
| Nhân viên | 11 | 10 | 1 |
| Khách hàng | 36 | 0 | 36 |
| Lệnh sản xuất | 420 | 0 | 420 |

Trong 1.464 vật tư đã chuyển, 817 dòng có mã đạt regex và 647 dòng để `MA_VAT_TU = NULL`
theo chiến lược V1. Không có vật tư thiếu ĐVT hoặc trùng `TEN_HANG`.

51 NCC chưa chuyển vì phần lớn giá trị trong cột MST nguồn dài quá giới hạn 20 ký tự, dấu hiệu
cho thấy cột nguồn có thể đang chứa nội dung khác MST. Migration không cắt ngầm và không sao
chép sai dữ liệu này. Từ các CSV bổ sung, `department.name` được xác nhận có cấu trúc mã ngắn:
18 bộ phận đạt định dạng và đã chuyển; 10 nhân viên có mã tối đa 20 ký tự, khớp bộ phận và đã
chuyển. Không có nhân viên mồ côi khóa ngoại. Một bộ phận và một nhân viên còn chờ rà soát.
Khách hàng và lệnh sản xuất chưa chuyển vì nguồn vẫn thiếu mã khách hàng chuẩn hoặc `MA_VACH`.

### Cập nhật giao dịch và phân quyền

- Khách hàng, lệnh sản xuất và đặt ngoài được xác nhận `BO_QUA`; dữ liệu `public` không bị xóa.
- Đã chuyển đủ 11 đề nghị và 17 dòng đề nghị, không có dòng mồ côi; tổng số lượng nguồn và
  đích cùng bằng `1658.0000`.
- Hai trạng thái cũ `DANG_MUA` có số PO và ngày giao dự kiến được ánh xạ thành `DA_DAT_HANG`.
- Đã nạp 15 vai trò và 225 ô quyền theo `06_PHAN_QUYEN.md`; không có quyền sửa, duyệt hoặc
  xuất nào thiếu quyền xem.
- Không nhập 11 mật khẩu băm cũ. Backend đã dùng `search_path = mua_hang, public`; script
  bootstrap chỉ cho phép tạo một tài khoản `QUAN_TRI_KY_THUAT` gốc bằng mật khẩu nhập ẩn.
