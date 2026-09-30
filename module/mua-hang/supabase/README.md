# Supabase — schema `mua_hang`

## Chuyển Điều xe sang Kho vận (F4)

Trước khi áp dụng migration `047`, tạo một bản Excel lịch sử bằng
`python scripts/xuat_lich_su_dieu_xe.py` từ thư mục `module/mua-hang`.
File nằm trong `output/` (không đưa lên Git), gồm bốn sheet `DIEU_XE`,
`DIEU_XE_DONG`, `XE`, `TAI_XE`. Đối chiếu số dòng in ra với CSDL rồi bàn giao
file cho Kho vận. Migration `047` chỉ gỡ quyền và tham số Điều xe; các bảng lịch
sử vẫn còn nguyên.

Các migration này chỉ tạo schema mới `mua_hang`; không sửa hoặc xoá đối tượng trong `public`.

Chạy toàn bộ trong một transaction:

```bash
psql "$DATABASE_URL" -X -f supabase/deploy_mua_hang.sql
```

Nếu bất kỳ câu lệnh nào lỗi, `ON_ERROR_STOP` và transaction sẽ rollback toàn bộ lần triển khai.

Sau khi chạy, kiểm tra:

```sql
SELECT * FROM mua_hang.schema_migrations ORDER BY version;
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'mua_hang';
```

Schema không cấp quyền cho `anon` hoặc `authenticated`. Backend hiện kết nối trực tiếp bằng
`DATABASE_URL`; trước production cần tạo một DB role riêng và chỉ cấp quyền tối thiểu cho role đó.

### Sửa DB đã ghi nhận migration 050 nhưng thiếu cấu trúc Đặt ngoài v3

Nếu API báo thiếu cột hoặc bảng chi tiết Đặt ngoài, chạy hai migration sửa trên đúng database
đang cấu hình cho backend. Chúng bổ sung cột, chuẩn hóa tên bảng/cột cũ và giữ lại dữ liệu:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/052_sua_cot_chi_tiet_dat_ngoai.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/053_chuan_hoa_bang_chi_tiet_dat_ngoai.sql
```

Xác nhận sau khi chạy:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='mua_hang' AND table_name='dat_ngoai_dong'
  AND column_name IN ('ngay_khach_yeu_cau','ngay_ncc_cam_ket',
                      'ngay_du_kien_noi_bo','id_su_co');
SELECT table_name FROM information_schema.tables
WHERE table_schema='mua_hang' AND table_name IN
  ('dat_ngoai_xac_nhan_kt','dat_ngoai_dot_giao','dat_ngoai_lich_su_ky_han');
```

### Khôi phục bộ đếm mã chứng từ bị thiếu

Nếu API ghi xác nhận kỹ thuật báo `relation "bo_dem_chung_tu" does not exist`, chạy migration
`supabase/migrations/055_khoi_phuc_bo_dem_chung_tu.sql` trên đúng database backend đang dùng:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/055_khoi_phuc_bo_dem_chung_tu.sql
```

Kiểm tra bảng đã được khôi phục:

```sql
SELECT to_regclass('mua_hang.bo_dem_chung_tu');
```

### Bỏ mã kết luận khỏi xác nhận kỹ thuật Đặt ngoài

Chạy migration `057` trên database backend đang dùng. Migration xóa cột `ket_luan` và các mã kết luận
đã lưu; nội dung, người xác nhận và thời điểm xác nhận vẫn được giữ:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/057_bo_cot_ket_luan_xac_nhan_ky_thuat.sql
```

### Lịch sử điều chỉnh lịch giao Đặt ngoài

Migration `058` bổ sung bảng lưu ngày cũ/mới, lý do, người sửa và thời điểm khi đổi ngày dự kiến
của từng đợt giao. Chạy trên đúng database backend đang dùng trước khi sử dụng chức năng này:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/058_lich_su_dieu_chinh_dot_giao.sql
```

`anh_xa_du_lieu_cu` dùng để quản lý mapping khi di trú từ các bảng `public` hiện tại. Các file
này không tự động di trú dữ liệu thật khi cài schema mới.

## Staging và di trú danh mục

Migration `005` tạo vùng staging và hàm đối soát. Hai migration `006`/`006b` là bản nâng cấp
cho database đã chạy phiên bản `005` cũ, không cần chạy khi cài mới từ đầu.

Tạo lại snapshot staging:

```sql
SELECT mua_hang.lam_moi_staging();
SELECT * FROM mua_hang.doi_soat_migration
WHERE dot_chay = (SELECT max(dot_chay) FROM mua_hang.doi_soat_migration)
ORDER BY loai;
```

Chỉ sau khi kiểm tra báo cáo mới chạy `007_chuyen_danh_muc_an_toan.sql`. File `007` chỉ chuyển
các dòng mang trạng thái `SAN_SANG`; nguồn `public` không bị cập nhật hoặc xoá.

Trạng thái đợt 2026-09-16:

- 17 đơn vị tính, 1 chủng loại, 1.464 vật tư và 2 NCC đã chuyển;
- 817 vật tư có mã đạt regex, 647 vật tư để `MA_VAT_TU = NULL` theo V1;
- 18/19 bộ phận và 10/11 nhân viên đã chuyển sau khi xác nhận cấu trúc CSV;
- 1 bộ phận, 1 nhân viên, 36 khách hàng và 420 lệnh sản xuất chờ xác nhận mã/cấu trúc;
- 51 NCC chờ rà soát vì cột MST nguồn vượt giới hạn 20 ký tự.

### Trạng thái mới nhất

- Đã xác nhận `TĐ → TDH` và mã nhân viên `NV000108`;
- đã chuyển đủ 19 bộ phận, 11 nhân viên và 53 NCC; MST mới của NCC đều là `NULL`;
- khách hàng, lệnh sản xuất và đặt ngoài được đánh dấu `BO_QUA`, không xóa nguồn `public`;
- đã chuyển đủ 11 đề nghị và 17 dòng; tổng số lượng đối soát là `1658.0000`;
- trạng thái cũ `DANG_MUA` có số PO được ánh xạ thành `DA_DAT_HANG`;
- đã nạp 15 vai trò × 15 trang = 225 dòng phân quyền;
- tài khoản quản trị gốc đã được tạo; script bootstrap tự khóa khi đã có tài khoản.

Sau khi bootstrap, migration `018` cho phép tài khoản đăng ký ở trạng thái `CHO_DUYET` chưa
có vai trò; vai trò trở thành bắt buộc khi tài khoản hoạt động. Migration `019` bảo đảm tên
đăng nhập unique không phân biệt hoa/thường.
