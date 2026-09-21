# 06 — Vai trò, phân quyền và tài khoản

---

## 1. Danh sách vai trò

Đã chốt: Kho vận có tài khoản riêng theo bộ phận; GĐ Vận hành, GĐ Điều hành và Ban Quản trị dùng **chung một vai trò**.

| Mã vai trò | Tên hiển thị | Ai | Phạm vi dữ liệu |
|---|---|---|---|
| `QUAN_TRI_KY_THUAT` | Quản trị kỹ thuật | Team dev, IT | Toàn bộ + cấu hình + nhật ký |
| `QUAN_TRI_NGHIEP_VU` | Quản trị nghiệp vụ | **Trưởng BP Mua hàng** (chủ hệ thống) | Toàn bộ nghiệp vụ + danh mục + tham số. **Không** sửa được nhật ký |
| `BAN_LANH_DAO` | Ban lãnh đạo | GĐ Vận hành · GĐ Điều hành · Ban Quản trị | Xem toàn công ty · duyệt mọi mức |
| `TBP_MUA_HANG` | Trưởng BP Mua hàng | | Toàn bộ phận Mua hàng · duyệt trong hạn mức |
| `NV_MUA_HANG` | Nhân viên Mua hàng | Như · Ms. Ngọc · Ms. Trâm · Thiên | Chứng từ được phân công |
| `TBP_YEU_CAU` | Trưởng bộ phận (yêu cầu) | Trưởng các BP sản xuất | Bộ phận mình · duyệt ĐNVT của bộ phận |
| `NV_YEU_CAU` | Nhân viên (yêu cầu) | Người lập ĐNVT ở xưởng | Phiếu do mình tạo |
| `KY_THUAT` | Kỹ thuật | BP Kỹ thuật | Chứng từ cần xác nhận kỹ thuật |
| `TBP_KHO_VAN` | Trưởng BP Kho vận | | Danh mục vật tư · xác nhận tồn · điều xe |
| `NV_KHO_VAN` | Nhân viên Kho vận | | Nhận hàng · xác nhận tồn · điều xe |
| `QC` | Kiểm soát chất lượng | | IQC · hàng không phù hợp |
| `TBP_KINH_DOANH` | Trưởng BP Kinh doanh | | Đặt ngoài · duyệt đặt ngoài |
| `NV_KINH_DOANH` | Nhân viên Kinh doanh | | Lập đặt ngoài |
| `KE_TOAN` | Kế toán | | Xem yêu cầu thanh toán · bàn giao chứng từ |
| `CHI_XEM` | Chỉ xem | | Theo chỉ định |

> **Vì sao tách `QUAN_TRI_KY_THUAT` và `QUAN_TRI_NGHIEP_VU`:** Hiến chương 4.1 ghi rõ ADMIN **không duyệt nghiệp vụ**. Chủ hệ thống là Trưởng BP Mua hàng — người này cần toàn quyền danh mục và tham số, nhưng **không nên** có quyền sửa nhật ký hay cấp tài khoản cho chính mình lên cấp cao hơn.

---

## 2. Danh sách trang (dùng làm khoá trong ma trận quyền)

| Mã trang | Màn hình | File chức năng |
|---|---|---|
| `home` | Tổng quan | F11 |
| `de_nghi` | Đề nghị vật tư & gia công ngoài | F01 |
| `xac_nhan_kt` | Xác nhận kỹ thuật · đổi vật liệu · yêu cầu huỷ | F02 |
| `bao_gia` | Yêu cầu báo giá · so sánh báo giá | F03 |
| `don_hang` | Đơn đặt hàng · theo dõi tiến độ | F04 |
| `cong_viec` | Giao việc · việc của tôi | F04 |
| `giao_nhan` | Nhận hàng · IQC · hàng không phù hợp | F05 |
| `dat_ngoai` | Đặt ngoài | F06 |
| `dieu_xe` | Yêu cầu điều xe · lịch điều xe | F07 |
| `thanh_toan` | Yêu cầu thanh toán · bàn giao chứng từ | F08 |
| `ncc` | Danh mục & đánh giá nhà cung cấp | F09 |
| `danh_muc` | Dữ liệu gốc: vật tư · ĐVT · chủng loại · xe | F10 |
| `bao_cao` | Báo cáo & phân tích | F11 |
| `tien_ich` | Máy tính khối lượng · sự cố | F12 |
| `quan_tri` | Người dùng · phân quyền · tham số · nhật ký · lưu trữ | F12 |

---

## 3. Ma trận quyền

Bốn chiều: **XEM · SỬA · DUYỆT · XUẤT** + **PHẠM VI**.
`X` = có · `–` = không · phạm vi: `TB` toàn bộ · `BP` bộ phận · `CN` cá nhân/được phân công

| Vai trò \ Trang | home | de_nghi | xac_nhan_kt | bao_gia | don_hang | cong_viec | giao_nhan | dat_ngoai | dieu_xe | thanh_toan | ncc | danh_muc | bao_cao | tien_ich | quan_tri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `QUAN_TRI_KY_THUAT` | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM+SỬA TB | XEM+SỬA TB | XEM+XUẤT TB | XEM+SỬA | **toàn quyền** |
| `QUAN_TRI_NGHIEP_VU` | XEM TB | XEM+SỬA+DUYỆT TB | XEM+DUYỆT | XEM+SỬA TB | XEM+SỬA+DUYỆT TB | XEM+SỬA TB | XEM TB | XEM TB | XEM+SỬA TB | XEM+SỬA TB | XEM+SỬA+DUYỆT TB | XEM+SỬA TB | XEM+XUẤT TB | XEM+SỬA | XEM tham số/lưu trữ |
| `BAN_LANH_DAO` | XEM TB | XEM+**DUYỆT** TB | XEM | XEM TB | XEM+**DUYỆT** TB | XEM TB | XEM TB | XEM TB | XEM TB | XEM+DUYỆT TB | XEM+DUYỆT TB | XEM TB | XEM+XUẤT TB | XEM | – |
| `TBP_MUA_HANG` | XEM BP | XEM+SỬA+DUYỆT TB | XEM+DUYỆT | XEM+SỬA+DUYỆT TB | XEM+SỬA+DUYỆT TB | XEM+SỬA TB | XEM TB | XEM | XEM+SỬA | XEM+SỬA+DUYỆT | XEM+SỬA+DUYỆT | XEM | XEM+**XUẤT** TB | XEM+SỬA | – |
| `NV_MUA_HANG` | XEM CN | XEM+SỬA CN | XEM+SỬA | XEM+SỬA CN | XEM+SỬA CN | XEM CN | XEM | XEM | XEM+SỬA | XEM+SỬA | XEM+SỬA | XEM | XEM CN | XEM+SỬA | – |
| `TBP_YEU_CAU` | XEM BP | XEM+SỬA+**DUYỆT** BP | XEM+SỬA BP | XEM BP | XEM BP | XEM BP | XEM BP | – | XEM+SỬA BP | – | XEM | XEM | XEM BP | XEM | – |
| `NV_YEU_CAU` | XEM CN | XEM+SỬA CN | XEM CN | – | XEM CN | XEM CN | XEM CN | – | XEM+SỬA CN | – | XEM | XEM | – | XEM | – |
| `KY_THUAT` | XEM | XEM TB | XEM+SỬA+**DUYỆT** TB | XEM | XEM | XEM CN | XEM | XEM | – | – | XEM | XEM | XEM | XEM | – |
| `TBP_KHO_VAN` | XEM BP | XEM TB | XEM+**DUYỆT** (cấp mã) | – | XEM TB | XEM BP | XEM+SỬA TB | XEM | XEM+SỬA+DUYỆT TB | – | XEM | XEM+**SỬA** TB (vật tư) | XEM BP | XEM | – |
| `NV_KHO_VAN` | XEM CN | XEM | XEM | – | XEM | XEM CN | XEM+SỬA | XEM | XEM+SỬA | – | XEM | XEM | – | XEM | – |
| `QC` | XEM | XEM | XEM | – | XEM | XEM CN | XEM+**SỬA+DUYỆT** (IQC) | XEM | – | – | XEM | XEM | XEM | XEM | – |
| `TBP_KINH_DOANH` | XEM BP | XEM | XEM | XEM | XEM | XEM BP | XEM | XEM+SỬA+**DUYỆT** TB | XEM+SỬA | – | XEM | XEM | XEM BP | XEM | – |
| `NV_KINH_DOANH` | XEM CN | XEM | XEM | XEM | XEM | XEM CN | XEM | XEM+SỬA CN | XEM+SỬA | – | XEM | XEM | – | XEM | – |
| `KE_TOAN` | XEM | XEM | – | XEM | XEM TB | – | XEM | XEM | – | XEM+SỬA TB | XEM | XEM | XEM+XUẤT | XEM | – |
| `CHI_XEM` | XEM | XEM | – | – | XEM | – | XEM | XEM | XEM | – | XEM | XEM | XEM | XEM | – |

### 3.1 Dữ liệu nhạy cảm — quyền riêng, không nằm trong ma trận trang

| Dữ liệu | Mức | Vai trò được xem |
|---|---|---|
| `DON_GIA`, `THANH_TIEN`, `TONG_TIEN` trên chứng từ | Hạn chế | `QUAN_TRI_*` · `BAN_LANH_DAO` · `TBP_MUA_HANG` · `NV_MUA_HANG` · `KE_TOAN` |
| Bảng giá NCC, chiết khấu, điều khoản thương mại | **Tối mật** | `QUAN_TRI_NGHIEP_VU` · `BAN_LANH_DAO` · `TBP_MUA_HANG` |
| Quyền **xuất file hàng loạt** | — | `QUAN_TRI_*` · `TBP_MUA_HANG` · `KE_TOAN` (chỉ phần thanh toán) |

**Ẩn ở backend, không chỉ ẩn ở giao diện.** Vai trò không có quyền thì API **không trả về** các trường này, chứ không phải trả về rồi frontend ẩn đi.

```python
def loc_truong_nhay_cam(ban_ghi: dict, ho_so) -> dict:
    if not co_quyen_xem_gia(ho_so):
        for k in ('DON_GIA_CO_SO', 'THANH_TIEN', 'TONG_TIEN', 'GIA_TRI_TRUOC_VAT'):
            ban_ghi.pop(k, None)
    return ban_ghi
```

---

## 4. Chặn quyền — một chỗ duy nhất

```python
# api/middleware.py
CONG_KHAI = {'/api/v1/dang-nhap', '/api/v1/dang-ky', '/api/v1/bo-phan-cong-khai', '/health'}

@app.middleware('http')
async def chan_quyen(request, call_next):
    duong = request.url.path
    if duong in CONG_KHAI or not duong.startswith('/api/'):
        return await call_next(request)
    token = request.headers.get('X-Phien', '')
    ho_so = tk.lay_ho_so_tu_token(token)
    if not ho_so:
        return JSONResponse(status_code=401,
            content=that_bai('Phiên đã hết. Hãy đăng nhập lại.', 'HET_PHIEN'))
    request.state.ho_so = ho_so
    return await call_next(request)
```

Từng route gọi thêm `kiem_quyen(ho_so, trang, hanh_dong)`:

```python
def kiem_quyen(ho_so, trang: str, hanh_dong: str):   # 'xem'|'sua'|'duyet'|'xuat'
    q = pq.lay(ho_so.VAI_TRO, trang)
    if not q or not getattr(q, f'DUOC_{hanh_dong.upper()}'):
        raise KhongCoQuyen(f'Bạn không có quyền {hanh_dong} ở màn hình này.')
    return q.PHAM_VI      # dùng để lọc dữ liệu tiếp
```

### 4.1 Lọc theo phạm vi — chỗ hay quên nhất

```python
def loc_theo_pham_vi(cau_truy_van, pham_vi, ho_so):
    if pham_vi == 'toan_bo':  return cau_truy_van
    if pham_vi == 'bo_phan':  return cau_truy_van.where(MA_BO_PHAN=ho_so.MA_BO_PHAN)
    return cau_truy_van.where(NGUOI_TAO=ho_so.MA_NHAN_VIEN)   # ca_nhan
```

**Áp dụng cả ở endpoint danh sách LẪN endpoint chi tiết.** Lỗi phổ biến nhất: lọc danh sách đúng nhưng `GET /de-nghi/{id}` quên lọc, nên đổi id trên thanh địa chỉ là xem được phiếu của bộ phận khác.

### 4.2 Bài kiểm tra bắt buộc trước nghiệm thu

> Đăng nhập bằng tài khoản A, sửa mã định danh trên thanh địa chỉ thành bản ghi của tài khoản B. Hệ thống phải trả `403` và **không trả dữ liệu**. Kiểm tra trên **mọi** endpoint, không chỉ endpoint chính.

Viết thành test tự động chạy qua toàn bộ danh sách endpoint.

---

## 5. Đăng nhập và cấp tài khoản

### 5.1 Luồng

```
Người dùng tự đăng ký
  ├─ Tên đăng nhập (tự đặt, không dấu, ≥3 ký tự, chỉ chữ/số/. _ -)
  ├─ MÃ NHÂN VIÊN  ← BẮT BUỘC, đối chiếu với bảng NHAN_VIEN
  ├─ Họ và tên     ← tự điền theo mã nhân viên, chỉ đọc
  ├─ Bộ phận       ← tự điền theo mã nhân viên, chỉ đọc
  └─ Mật khẩu (≥8 ký tự)
       ↓
  TRANG_THAI = CHO_DUYET, chưa đăng nhập được
       ↓
  Quản trị duyệt và GÁN VAI TRÒ  →  TRANG_THAI = HOAT_DONG
```

| Quy tắc | Nội dung |
|---|---|
| Định danh nghiệp vụ | **`MA_NHAN_VIEN`** — mọi bảng giao dịch lưu mã này, không lưu tên đăng nhập |
| Đăng nhập | Bằng `MA_TAI_KHOAN` (tên tự đặt) cho tiện gõ |
| Mã nhân viên không có trong danh sách | Chặn đăng ký, hướng dẫn liên hệ Nhân sự |
| Một mã nhân viên | Chỉ được **một** tài khoản đang hoạt động |
| Mật khẩu | **bcrypt**, cost ≥ 12. Cấm lưu chữ thường đọc được |
| Không tài khoản nào tự có quyền | Vai trò do Quản trị gán khi duyệt |
| Nghỉ việc | Thu hồi quyền trong **24 giờ**. `TRANG_THAI = KHOA`, **không xoá** |
| Phiên | Token ngẫu nhiên 64 ký tự, hết hạn theo `HD_PHIEN_HET_HAN_PHUT` (mặc định 8 giờ) |

### 5.2 Endpoint

```
POST /api/v1/dang-ky          { ma_tai_khoan, ma_nhan_vien, mat_khau }
POST /api/v1/dang-nhap        { ma_tai_khoan, mat_khau }  → { token, ho_so }
POST /api/v1/dang-xuat
GET  /api/v1/toi              → hồ sơ + quyền của các trang (để dựng menu)
POST /api/v1/doi-mat-khau     { mat_khau_cu, mat_khau_moi }
GET  /api/v1/tai-khoan                        (quản trị)
POST /api/v1/tai-khoan/{ma}/duyet  { vai_tro } (quản trị)
POST /api/v1/tai-khoan/{ma}/khoa               (quản trị)
POST /api/v1/tai-khoan/{ma}/dat-lai-mat-khau   (quản trị)
```

`GET /toi` trả về cả ma trận quyền của người đang đăng nhập để frontend dựng menu:

```json
{"ok": true, "data": {
  "ma_nhan_vien": "202302003", "ho_va_ten": "…", "ma_bo_phan": "MH",
  "vai_tro": "NV_MUA_HANG",
  "quyen": {"de_nghi": {"xem": true, "sua": true, "duyet": false, "pham_vi": "ca_nhan"},
            "don_hang": {"xem": true, "sua": true, "duyet": false, "pham_vi": "ca_nhan"}},
  "xem_gia": true
}}
```

> Nhắc lại Hiến chương 4.3: **ẩn nút trên giao diện không phải là phân quyền.** Menu dựng theo `quyen` chỉ để người dùng đỡ rối; backend vẫn phải tự kiểm trên mọi endpoint.

---

## 6. Nạp dữ liệu tài khoản ban đầu

1. Nạp `NHAN_VIEN` (175 bản ghi) và `BO_PHAN` (14 bản ghi) từ hệ Kế hoạch Sản xuất.
2. Tạo **một** tài khoản `QUAN_TRI_KY_THUAT` gốc bằng script, mật khẩu đặt qua biến môi trường.
3. Tài khoản `QUAN_TRI_NGHIEP_VU` cho Trưởng BP Mua hàng do tài khoản gốc tạo.
4. Mọi tài khoản còn lại: người dùng tự đăng ký, Quản trị duyệt.

**Không** tạo sẵn hàng loạt tài khoản — vì mật khẩu mặc định là lỗ hổng, và vì cách này ép đúng luồng "Admin gán vai trò" của Hiến chương.
