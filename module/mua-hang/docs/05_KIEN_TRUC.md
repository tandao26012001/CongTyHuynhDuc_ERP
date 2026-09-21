# 05 — Kiến trúc, chuẩn API và xử lý lỗi

---

## 1. Cấu trúc thư mục

```
he-thong-mua-hang/
├── run.py                       # điểm khởi chạy: uvicorn backend.api.server:app
├── requirements.txt
├── README.md                    # người mới chạy được trong 30 phút
├── .env.example                 # mẫu biến môi trường, KHÔNG chứa giá trị thật
├── .gitignore                   # data/ output/ backup/ .env
│
├── backend/
│   ├── api/
│   │   ├── server.py            # tạo app, gắn middleware, mount router  (<300 dòng)
│   │   ├── middleware.py        # chặn quyền ở MỘT chỗ duy nhất
│   │   ├── envelope.py          # vỏ phản hồi {ok, data, error, ma_loi}
│   │   └── routes/
│   │       ├── auth.py          de_nghi.py      xac_nhan_kt.py
│   │       ├── bao_gia.py       don_hang.py     giao_nhan.py
│   │       ├── dat_ngoai.py     dieu_xe.py      thanh_toan.py
│   │       ├── nha_cung_cap.py  danh_muc.py     bao_cao.py
│   │       └── tien_ich.py      quan_tri.py
│   ├── services/                # LOGIC NGHIỆP VỤ
│   │   ├── de_nghi.py           xac_nhan_kt.py   bao_gia.py
│   │   ├── don_hang.py          giao_nhan.py     dat_ngoai.py
│   │   ├── dieu_xe.py           thanh_toan.py    nha_cung_cap.py
│   │   ├── cong_viec.py         bao_cao.py       kpi.py
│   │   ├── catalog_service.py   # LỚP DUY NHẤT truy cập danh mục dùng chung
│   │   ├── lich_lam_viec.py     # la_ngay_lam_viec · cong_ngay_lam_viec
│   │   ├── quy_tac.py           # kiểm quy tắc, đọc chế độ CANH_BAO/CHAN
│   │   ├── sinh_ma.py           tinh_tien.py     tinh_khoi_luong.py
│   │   ├── taikhoan.py          phanquyen.py     duyet.py
│   │   ├── thong_bao.py         trao_doi.py      nhat_ky.py
│   │   ├── nhap_lo.py           luu_tru.py
│   │   └── ...
│   ├── data/                    # NƠI DUY NHẤT chạm cơ sở dữ liệu
│   │   ├── ket_noi.py           # pool kết nối, quản lý giao dịch
│   │   ├── repo_de_nghi.py      repo_don_hang.py    repo_vat_tu.py
│   │   ├── repo_ncc.py          repo_giao_nhan.py   repo_he_thong.py
│   │   └── migrations/          001_khoi_tao.sql · 002_...
│   └── config/
│       ├── paths.py             constants.py     tham_so.py
│
├── frontend/
│   ├── index.html               # ứng dụng một trang
│   └── assets/
│       ├── hd.css               # lấy nguyên từ hệ Kế hoạch Sản xuất
│       ├── api.js               # tầng gọi API tập trung
│       ├── app.js               # điều hướng + khung chung   (<500 dòng)
│       ├── trang/               # mỗi màn hình một file
│       │   ├── de_nghi.js  bao_gia.js  don_hang.js  giao_nhan.js
│       │   ├── dat_ngoai.js  dieu_xe.js  thanh_toan.js  ncc.js
│       │   ├── danh_muc.js  bao_cao.js  quan_tri.js  tien_ich.js
│       └── img/logo.png
│
├── data/     output/     backup/          # KHÔNG lên Git
└── docs/                                   # bộ tài liệu này + ERD + API
    ├── 00_AI_RULES.md … 08_...
    ├── F01_… F12_…
    └── ERD.md
```

**Trần 500 dòng cho mỗi file.** Bài học từ hệ Kế hoạch Sản xuất: file 14.000 dòng phải tách ra mới làm việc được với AI. Chia theo **nghiệp vụ**, không chia theo tầng kỹ thuật.

---

## 2. Ba tầng — trách nhiệm rõ ràng

```
api/       nhận yêu cầu → kiểm quyền → chuyển đổi kiểu → gọi service → bọc vỏ phản hồi
           KHÔNG chứa if/else nghiệp vụ, KHÔNG tính toán, KHÔNG truy vấn SQL

services/  toàn bộ quy tắc nghiệp vụ, tính toán, điều phối giao dịch
           KHÔNG biết HTTP, KHÔNG biết SQL cụ thể — chỉ gọi repo

data/      duy nhất nơi có câu lệnh SQL
           KHÔNG chứa quy tắc nghiệp vụ
```

Tầng trên gọi tầng dưới. Tầng dưới **không bao giờ** gọi ngược lên.

**Ví dụ đúng:**
```python
# api/routes/de_nghi.py
@router.post('/de-nghi/{id}/duyet')
async def duyet(id: str, body: DuyetBody, request: Request):
    ho_so = lay_ho_so(request)                       # middleware đã gắn
    kiem_quyen(ho_so, trang='de_nghi', hanh_dong='duyet')
    kq = svc_de_nghi.duyet(id, ho_so.MA_NHAN_VIEN, body.ghi_chu, body.phien_ban)
    return thanh_cong(kq)

# services/de_nghi.py
def duyet(id, nguoi_duyet, ghi_chu, phien_ban):
    with giao_dich() as conn:
        dn = repo.lay_de_nghi(conn, id, khoa=True)
        if dn.PHIEN_BAN != phien_ban: raise XungDot(...)
        if dn.TRANG_THAI not in ('CHO_DUYET','CHO_KY_BU'): raise ViPhamNghiepVu(...)
        repo.cap_nhat_trang_thai(conn, id, 'DA_DUYET', nguoi_duyet)
        repo.ghi_lich_su(conn, 'DE_NGHI', id, dn.TRANG_THAI, 'DA_DUYET', nguoi_duyet, ghi_chu)
        thong_bao.gui(conn, dn.NGUOI_YEU_CAU, 'DE_NGHI_DUYET', ...)
        return repo.lay_de_nghi(conn, id)
```

---

## 3. Chuẩn API

### 3.1 Vỏ phản hồi (Hiến chương 2.2 [B])

```json
// thành công
{"ok": true,  "data": {...}, "error": null, "ma_loi": null}
// lỗi
{"ok": false, "data": null, "error": "Đề nghị đã duyệt, không sửa được.", "ma_loi": "DN_DA_DUYET"}
```

```python
# api/envelope.py
def thanh_cong(data=None):  return {"ok": True, "data": data, "error": None, "ma_loi": None}
def that_bai(error, ma_loi): return {"ok": False, "data": None, "error": error, "ma_loi": ma_loi}
```

Dùng exception handler toàn cục để mọi lỗi đều ra đúng vỏ này — **không** để FastAPI trả `{"detail": ...}` mặc định.

### 3.2 Mã trạng thái

| Mã | Khi nào | Ví dụ `ma_loi` |
|---|---|---|
| `200` | Thành công | |
| `400` | Gửi **sai cách** — thiếu trường, sai kiểu | `THIEU_TRUONG`, `SAI_KIEU` |
| `401` | Chưa đăng nhập / hết phiên | `CHUA_DANG_NHAP`, `HET_PHIEN` |
| `403` | Không có quyền | `KHONG_CO_QUYEN` |
| `404` | Không tìm thấy | `KHONG_TIM_THAY` |
| `409` | Người khác đã sửa (`PHIEN_BAN` lệch) | `XUNG_DOT_PHIEN_BAN` |
| `422` | Gửi **đúng cách** nhưng nghiệp vụ không cho | `DN_DA_DUYET`, `THIEU_TRONG_LUONG` |
| `500` | Lỗi hệ thống | `LOI_HE_THONG` |

Phân biệt `400` và `422`: **400 là gửi sai cách. 422 là gửi đúng cách nhưng nghiệp vụ không cho phép.**

### 3.3 Quy ước đường dẫn

```
/api/v1/<đối-tượng>                     GET   danh sách (có phân trang + bộ lọc)
/api/v1/<đối-tượng>/{id}                GET   chi tiết
/api/v1/<đối-tượng>                     POST  tạo mới
/api/v1/<đối-tượng>/{id}                PUT   sửa
/api/v1/<đối-tượng>/{id}/<hành-động>    POST  chuyển trạng thái (duyệt, trả-lai, huy)
/api/v1/<đối-tượng>/{id}/in             GET   xuất PDF
/api/v1/<đối-tượng>/tai-xuong           GET   xuất CSV/Excel
```

Tất cả bằng **tiếng Việt không dấu, kebab-case**: `/api/v1/de-nghi`, `/api/v1/don-hang/{id}/duyet`, `/api/v1/nha-cung-cap`.

### 3.4 Danh sách endpoint — bảng tổng hợp

| Nhóm | Endpoint |
|---|---|
| Xác thực | `POST /dang-nhap` · `POST /dang-ky` · `POST /dang-xuat` · `GET /toi` · `POST /doi-mat-khau` |
| Đề nghị | `GET /de-nghi` · `GET /de-nghi/{id}` · `POST /de-nghi` · `PUT /de-nghi/{id}` · `POST /de-nghi/{id}/gui` · `/duyet` · `/tra-lai` · `/huy` · `/phan-cong` · `GET /de-nghi/{id}/in` |
| Xác nhận KT | `GET /xac-nhan-kt` · `POST /doi-vat-lieu` · `POST /doi-vat-lieu/{id}/duyet` · `/tu-choi` · `POST /yeu-cau-huy` · `POST /yeu-cau-cap-ma` · `POST /yeu-cau-cap-ma/{id}/cap` |
| Báo giá | `GET /yeu-cau-bao-gia` · `POST /yeu-cau-bao-gia` · `GET /bao-gia` · `POST /bao-gia` · `GET /bao-gia/so-sanh?ids=` · `POST /bao-gia/{id}/chon` |
| Đơn hàng | `GET /don-hang` · `POST /don-hang` · `POST /don-hang/tu-de-nghi` · `POST /don-hang/{id}/duyet` · `/huy` · `GET /don-hang/{id}/in` · `GET /don-hang/tien-do` |
| Giao việc | `GET /cong-viec` · `GET /cong-viec/cua-toi` · `POST /cong-viec/giao` · `POST /cong-viec/{id}/xong` |
| Giao nhận | `GET /nhan-hang` · `POST /nhan-hang` · `POST /iqc` · `POST /hang-khong-phu-hop` · `GET /nhan-hang/{id}/in` |
| Đặt ngoài | `GET /dat-ngoai` · `POST /dat-ngoai` · `POST /dat-ngoai/{id}/duyet` · `GET /dat-ngoai/tien-do` |
| Điều xe | `GET /dieu-xe` · `POST /dieu-xe` · `GET /dieu-xe/lich?ngay=` · `POST /dieu-xe/{id}/xac-nhan` · `GET /dieu-xe/{id}/in` |
| Thanh toán | `GET /yeu-cau-thanh-toan` · `POST /yeu-cau-thanh-toan` · `POST /dot-thanh-toan` · `GET /ban-giao-chung-tu` · `POST /ban-giao-chung-tu` |
| NCC | `GET /nha-cung-cap` · `POST /nha-cung-cap` · `PUT /nha-cung-cap/{id}` · `POST /nha-cung-cap/{id}/phe-duyet` · `GET /danh-gia-ncc` · `POST /danh-gia-ncc` |
| Danh mục | `GET /danh-muc` · `GET /danh-muc/{ma}` · `POST /danh-muc/{ma}/them` · `/sua` · `/xoa` · `GET /danh-muc/{ma}/tai-xuong` · `GET /vat-tu/tim?q=` · `POST /vat-tu/gop` |
| Nhập lô | `GET /nhap-lo/{ma}/mau` · `POST /nhap-lo/{ma}/kiem-tra` · `POST /nhap-lo/{ma}/ghi` |
| Báo cáo | `GET /tong-quan` · `GET /bao-cao/tinh-trang-mua-hang` · `/tien-do-giao-hang` · `/chat-luong-ncc` · `/hoat-dong-noi-bo` · `/ton-dong` · `/bat-kha-thi` · `GET /bao-cao/{ma}/tai-xuong` |
| Tiện ích | `GET /thong-bao` · `POST /thong-bao/da-doc` · `GET /trao-doi` · `POST /trao-doi` · `POST /tep-dinh-kem` · `POST /su-co` · `POST /tinh-khoi-luong` |
| Quản trị | `GET /tai-khoan` · `POST /tai-khoan/{ma}/duyet` · `/khoa` · `GET /phan-quyen` · `POST /phan-quyen/ma-tran` · `GET /tham-so` · `PUT /tham-so/{ma}` · `GET /nhat-ky` · `POST /luu-tru/chuyen` · `/phuc-hoi` |

### 3.5 Chống trùng thao tác

Mọi endpoint `POST` thay đổi dữ liệu nhận header `X-Idempotency-Key` (UUID sinh ở frontend khi mở form). Backend lưu key vào bảng `THAO_TAC_DA_XU_LY(KEY, KET_QUA, THOI_DIEM)`; gặp lại key cũ thì trả nguyên kết quả cũ.

→ Bấm nút ba lần **không** tạo ba chứng từ (Hiến chương 2.2 [B]).

### 3.6 Xung đột đồng thời (409)

Mọi `PUT`/`POST` sửa dữ liệu gửi kèm `phien_ban` của bản ghi.

```python
if ban_ghi.PHIEN_BAN != phien_ban_gui_len:
    raise XungDot("Người khác vừa cập nhật. Tải lại để xem số liệu mới rồi nhập lại thay đổi của bạn.")
```
Ghi thành công thì `PHIEN_BAN += 1`. Frontend hiện băng `xung-dot` (đã có sẵn trong `hd.css`).

---

## 4. Xử lý lỗi

### 4.1 Quy tắc viết thông báo lỗi

- Tiếng Việt, nói rõ **phải làm gì tiếp theo**.
- Không lộ chi tiết kỹ thuật ra giao diện — ghi vào log kèm `ma_loi`.
- Không xin lỗi, không mơ hồ.

| Sai | Đúng |
|---|---|
| "Lỗi validation" | "Dòng 3 thiếu trọng lượng. Đơn giá tính theo kg nên phải nhập trọng lượng." |
| "Không thể thực hiện" | "Đề nghị đã được duyệt nên không sửa được. Huỷ phiếu và lập lại nếu cần thay đổi." |
| "Internal Server Error" | "Hệ thống gặp sự cố (mã LOI_HE_THONG_4821). Vui lòng thử lại; nếu vẫn lỗi hãy báo Quản trị kèm mã này." |

### 4.2 Cây exception

```python
class LoiNghiepVu(Exception):      ma_loi: str; http = 422
class ThieuDuLieu(LoiNghiepVu):    http = 400
class KhongCoQuyen(LoiNghiepVu):   http = 403
class KhongTimThay(LoiNghiepVu):   http = 404
class XungDot(LoiNghiepVu):        http = 409
```

### 4.3 Ranh giới giao dịch

Một thao tác nghiệp vụ = **một giao dịch**. Ví dụ "duyệt đơn hàng" phải cùng lúc: đổi trạng thái · ghi lịch sử trạng thái · ghi nhật ký thay đổi · tạo thông báo. Nếu dừng giữa chừng thì **rollback toàn bộ**.

```python
@contextmanager
def giao_dich():
    conn = pool.getconn()
    try:
        yield conn; conn.commit()
    except Exception:
        conn.rollback(); raise
    finally:
        pool.putconn(conn)
```

---

## 5. Lớp truy cập danh mục dùng chung

```python
# services/catalog_service.py
"""Lớp DUY NHẤT đọc danh mục do hệ thống khác sở hữu.
V1 đọc bảng nội bộ đã nạp. V2 đổi thân hàm sang gọi API mà KHÔNG sửa nghiệp vụ."""

def lay_vat_tu(id: str) -> VatTu: ...
def tim_vat_tu(tu_khoa: str, gioi_han=20) -> list[VatTu]: ...
def lay_nhan_vien(ma: str) -> NhanVien: ...
def lay_bo_phan() -> list[BoPhan]: ...
def lay_lenh_san_xuat(ma: str) -> LenhSanXuat: ...
def lay_cong_doan() -> list[CongDoan]: ...
```

**Không** service nào khác được truy vấn trực tiếp các bảng `VAT_TU`, `NHAN_VIEN`, `BO_PHAN`, `LENH_SAN_XUAT`, `CONG_DOAN`.

Khi hệ nguồn không phản hồi (V2): báo lỗi kết nối rõ ràng, cho phép lưu nháp không đồng bộ và thử lại sau, **không làm sập ứng dụng**.

---

## 6. Cấu hình và biến môi trường

```bash
# .env  (KHÔNG lên Git)
HD_DB_DSN=postgresql://hd_mh:***@127.0.0.1:5432/hd_mua_hang
HD_BASE_DIR=/srv/hd/he-thong-mua-hang
HD_SECRET_KEY=***
HD_MOI_TRUONG=phat_trien        # phat_trien | thu_nghiem | chay_that
HD_PHIEN_HET_HAN_PHUT=480
```

Mọi hằng số **nghiệp vụ** (giờ chốt, ngưỡng tiền, số ngày SLA, chế độ quy tắc) nằm trong bảng `THAM_SO_HE_THONG`, Admin sửa được qua giao diện. Mọi hằng số **kỹ thuật** nằm trong `config/constants.py`.

**Cấm hardcode đường dẫn.** Dùng `config/paths.py` đọc từ `HD_BASE_DIR`.

---

## 7. Nhật ký và audit

```python
# services/nhat_ky.py
def ghi(conn, bang, id_ban_ghi, hanh_dong, cot=None, cu=None, moi=None, nguoi=None, request=None)
```

| Hành động | Ghi khi |
|---|---|
| `TAO` `SUA` `HUY` | Mọi thay đổi dữ liệu, ghi từng cột thay đổi với giá trị cũ và mới |
| `DUYET` | Mọi lần duyệt — **đây là thứ thay chữ ký giấy**, phải ghi IP và thiết bị |
| `XEM` `XUAT` | Chỉ với dữ liệu mức Hạn chế và Tối mật (đơn giá, tổng tiền, bảng giá NCC) |

Nhật ký **chỉ ghi thêm, không sửa, không xoá**. Kể cả Admin cũng không có endpoint sửa nhật ký.

---

## 8. Sao lưu (Hiến chương 1.5 [B])

| Việc | Yêu cầu |
|---|---|
| Sao lưu tự động | `pg_dump` hàng ngày, giữ **30 bản** gần nhất |
| Nơi lưu | Ít nhất **2 nơi** khác nhau |
| Thử phục hồi | **Mỗi quý một lần**, có ghi biên bản |
| Trước thao tác sửa hàng loạt | Bắt buộc sao lưu trước — nút "Nhập lô" và "Gộp mã" tự gọi sao lưu |

> Bản sao lưu chưa từng phục hồi thử coi như không tồn tại.

---

## 9. Lưu trữ (giải pháp cho "dữ liệu nặng")

Đây là chức năng thay cho sheet `TONG HOP` mà hiện đang làm thủ công.

```
POST /api/v1/luu-tru/xem-truoc   { den_ngay: '2025-12-31' }
   → số bản ghi sẽ chuyển, bổ theo bảng
POST /api/v1/luu-tru/chuyen      → chuyển sang schema `luu_tru`, giữ nguyên ID
POST /api/v1/luu-tru/phuc-hoi    → đưa ngược lại
GET  /api/v1/luu-tru/kho         → tra cứu dữ liệu đã lưu trữ
```

**Điều kiện được lưu trữ:** chứng từ đã `HOAN_THANH` hoặc `HUY`, đã bàn giao chứng từ, và cũ hơn N tháng (`THAM_SO['THANG_GIU_DU_LIEU_NONG']`, mặc định 18).

Dữ liệu đã lưu trữ **vẫn tra cứu được**, chỉ không xuất hiện trong danh sách và báo cáo mặc định.

---

## 10. Hiệu năng — thứ tự ưu tiên bắt buộc

1. **Đo trước.** Bật `log_min_duration_statement` của Postgres, tìm truy vấn chậm thật.
2. **Sửa truy vấn** — thêm chỉ mục, bỏ `SELECT *`, bỏ N+1.
3. **Phân trang** — mọi danh sách mặc định 50 dòng, không bao giờ trả hết.
4. **Lưu trữ** dữ liệu cũ.
5. **Chỉ khi vẫn chậm** mới tính tới cache — và phải hiển thị thời điểm tính kèm cảnh báo dữ liệu cũ (Hiến chương 1.6).

> Cấm sửa lỗi hiệu năng bằng cách đoán. Quy trình bắt buộc: tái hiện → đo → sửa đúng chỗ → kiểm chứng → ghi nguyên nhân gốc vào nhật ký lỗi (Hiến chương 2.5 [B]).

---

## 11. Ba môi trường

| Môi trường | Nơi chạy | Dữ liệu |
|---|---|---|
| Phát triển | Máy cá nhân | Dữ liệu giả |
| Thử nghiệm | Máy chủ | Bản sao dữ liệu thật |
| Chạy thật | Máy chủ nội bộ nhà máy | Dữ liệu thật |

**Cấm sửa trực tiếp trên môi trường chạy thật.** Mọi sửa chữa đi qua thử nghiệm.

Thư mục gốc: Linux `/srv/hd/he-thong-mua-hang/` · Windows `D:\HD\he-thong-mua-hang\`
Dữ liệu vận hành đặt trên ổ **tách khỏi ổ hệ điều hành**.
Mã nguồn nằm trong Git **kể từ ngày đầu**, kể cả khi chỉ một người làm.
