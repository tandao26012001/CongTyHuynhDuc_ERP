# 04 — Quy tắc nghiệp vụ

> Mỗi quy tắc viết ở dạng **KHI – THÌ – TRỪ KHI**, có mã, có chế độ (`CANH_BAO` / `CHAN`), và có thể viết thành một hàm kiểm thử.
> Nguồn: QT-MH-01, hai file Excel, và các quyết định đã chốt.

---

## 0. Nguyên tắc bao trùm: hai chế độ

Mọi quy tắc có cột `CHE_DO` trong bảng `THAM_SO_HE_THONG`:

| Chế độ | Hành vi |
|---|---|
| `CANH_BAO` | Hiện cảnh báo vàng, ghi cờ vào bản ghi, **vẫn cho lưu** |
| `CHAN` | Trả `422`, không cho lưu, nêu rõ phải làm gì |

**Khởi động toàn bộ ở `CANH_BAO`.** Lý do: mã vật tư mới có 4,1%, danh mục NCC được phê duyệt đang trống. Nếu bật `CHAN` ngày đầu thì 96% số dòng không lập được phiếu.

Chuyển từng quy tắc sang `CHAN` khi dữ liệu nền đã sạch. Màn hình Quản trị có bảng bật/tắt này.

---

## 1. Thời gian và lịch làm việc

### 1.1 Giờ chốt trong ngày

| Mã | Quy tắc | Tham số |
|---|---|---|
| `TG-01` | KHI đề nghị vật tư gửi sau **13:30** THÌ `NGAY_HIEU_LUC` = ngày làm việc kế tiếp và bật cờ `TRE_GIO_CHOT` | `GIO_CHOT_DNVT` |
| `TG-02` | KHI đề nghị gia công ngoài gửi sau **15:00** THÌ như trên | `GIO_CHOT_GCN` |
| `TG-03` | KHI phiếu điều xe gửi sau **15:45** THÌ cảnh báo "sẽ xếp vào lịch ngày kế tiếp" | `GIO_CHOT_DIEU_XE` |

```python
def tinh_ngay_hieu_luc(thoi_diem_gui: datetime, gio_chot: time) -> tuple[date, bool]:
    ngay = thoi_diem_gui.date()
    tre = thoi_diem_gui.time() > gio_chot
    if tre or not la_ngay_lam_viec(ngay):
        ngay = cong_ngay_lam_viec(ngay, 1)
    return ngay, tre
```

### 1.2 Ngày làm việc

```
Công ty làm THỨ HAI – THỨ BẢY, 08:00–16:40. Nghỉ hằng tuần: CHỦ NHẬT.
la_ngay_lam_viec(d) =
    d khai LAM_BU trong LICH_NGHI          → LÀM   (thắng cả luật Chủ nhật)
    d.weekday() == CHỦ_NHẬT                 → NGHỈ
    d nằm trong LICH_NGHI với MA='ALL'      → NGHỈ
    còn lại                                 → LÀM
```

> **Nguồn lịch: `Tài liệu Soạn thảo/Huỳnh Đức - Lịch làm việc dự kiến.pdf`,**
> chốt lại ở docs/12 §1. Ngày nghỉ trên tệp đó đánh dấu bằng MÀU ĐỎ chứ không
> bằng chữ, nên phải đọc content stream mới lấy được (cách làm ghi trong
> migration 046). Năm 2026: 51 Chủ nhật + 14 ngày lễ/Tết nghỉ, và **19/04/2026
> là Chủ nhật nhưng VẪN LÀM** — làm bù cho thứ bảy 02/05/2025. Tổng 300 ngày
> làm việc. Migration 046 nạp 5 khoảng nghỉ + 1 ngày làm bù; 51 Chủ nhật không
> nạp vì mã đã loại sẵn.

**Mọi** tính SLA, cảnh báo trễ, và KPI đi qua `cong_ngay_lam_viec()`. Không đâu được tự cộng ngày.

---

## 2. Đề nghị vật tư và gia công ngoài

| Mã | Quy tắc | Chế độ mặc định |
|---|---|---|
| `DN-01` | KHI lập ĐNVT THÌ mỗi dòng bắt buộc có `TEN_HANG` (chọn từ danh mục), `DVT`, `SO_LUONG > 0`, `KY_HAN_YC` | `CHAN` |
| `DN-02` | KHI `LOAI = GIA_CONG_NGOAI` THÌ **bắt buộc** có `MA_CONG_DOAN` | `CHAN` |
| `DN-03` | KHI một `LENH_SAN_XUAT` đã có ĐNVT THÌ **không cho** đề nghị lần hai cho cùng LSX đó | `CANH_BAO` |
| `DN-04` | KHI ĐNVT **không gắn LSX** THÌ yêu cầu duyệt của Ban lãnh đạo kèm lý do trong ghi chú | `CANH_BAO` |
| `DN-05` | KHI dòng có `ID_VT_DE_NGHI IS NULL` (mặt hàng chưa có trong danh mục) THÌ tạo `YEU_CAU_CAP_MA` và chuyển dòng sang `CHO_CAP_MA` | `CANH_BAO` |
| `DN-06` | KHI Mua hàng thấy phiếu thiếu thông tin hoặc sai quy định THÌ được **trả lại** — trạng thái `TRA_LAI`, bắt buộc nhập `LY_DO_TRA_LAI` | `CHAN` |
| `DN-07` | KHI người duyệt vắng mặt THÌ được duyệt online, bật `DUYET_ONLINE`, trạng thái `CHO_KY_BU`, và hệ thống nhắc ký bù vào **ngày làm việc kế tiếp** | — |
| `DN-08` | KHI ĐNVT đã `DA_DUYET` THÌ **khoá sửa** `SO_LUONG`, `TEN_HANG`, `KY_HAN_YC`. Muốn sửa phải huỷ và lập lại | `CHAN` |
| `DN-09` | KHI huỷ dòng THÌ chuyển `TRANG_THAI = HUY` kèm lý do. **Cấm xoá cứng** | `CHAN` |

### 2.1 Đề nghị bất khả thi — cảnh báo ngay lúc lập

Anh Long yêu cầu theo dõi % sản xuất đề nghị bất khả thi theo tháng.

> **ĐỔI CHIỀU — phản hồi lần 1 của anh Long.** Bản đầu cảnh báo khi kỳ hạn
> SỚM HƠN thời gian chuẩn. Nguyên văn phản hồi: *"Nếu sớm hơn thời gian chuẩn
> thì không cần in cảnh báo."* Kỳ hạn đặt xa là chuyện bình thường và không có
> gì đáng lo; thứ đáng lo là hàng VỀ TRỄ hơn lúc cần. Mốc so sánh cũng đổi:
> không còn một con số 5 ngày dùng chung, mà là số ngày xử lý theo **mức ưu
> tiên của lệnh sản xuất gắn với từng dòng**.

```python
def soi_ky_han(dong) -> tuple[bool, str | None, date]:
    if dong.LOAI == 'MUA_HANG':
        # Mức ưu tiên lấy từ LSX của CHÍNH DÒNG, không phải DE_NGHI.MUC_DO_UU_TIEN
        # (cột đó là mức gấp nhất của cả phiếu). Dòng không gắn LSX → mức 3.
        muc = uu_tien_cua_lsx(dong.LENH_SAN_XUAT) or 3
        so_ngay = THAM_SO[f'SO_NGAY_XU_LY_UU_TIEN_{muc}']       # 3 / 5 / 7
    else:  # GIA_CONG_NGOAI
        so_ngay = (dong.SO_NGAY_THONG_NHAT_NCC                  # đã chốt với NCC
                   or so_ngay_chuan_gia_cong(dong.MA_LOAI_GIA_CONG)
                   or THAM_SO['SO_NGAY_CHUAN_GCN'])
    du_kien_ve = cong_ngay_lam_viec(dong.NGAY_HIEU_LUC, so_ngay)
    return du_kien_ve > dong.KY_HAN_YC, thong_diep, du_kien_ve
```

| Mã | Quy tắc |
|---|---|
| `DN-10` | KHI **ngày hàng dự kiến về TRỄ HƠN** `KY_HAN_YC` THÌ **cảnh báo ngay tại màn hình lập phiếu**, ghi `BAT_KHA_THI = true` và `NGAY_DU_KIEN_VE`, **vẫn cho lập** — vì mua hàng vẫn phải giải quyết cho sản xuất. Kỳ hạn xa hơn ngày dự kiến thì **không cảnh báo gì** |
| `DN-11` | Báo cáo tháng phải có: **% dòng bất khả thi**, bổ theo bộ phận yêu cầu, để bộ phận giải trình cuối tháng |
| `DN-12` | Dòng **gia công ngoài** phải đủ ba trường trước khi GỬI DUYỆT: `MA_CONG_DOAN` · `NOI_DUNG_GIA_CONG` · `YEU_CAU_KY_THUAT`. Mặc định **CHẶN**, ngược thông lệ §6 của 00_AI_RULES — ba trường này do chính người đề nghị gõ ra, không phụ thuộc dữ liệu nền còn bẩn, nên không có gì để chờ. Chặn ở bước **gửi**, chỉ **nhắc** ở bước thêm dòng: chặn lúc thêm dòng thì người đề nghị mất cả phiếu nháp vì một con số phải hỏi Kỹ thuật |

> **Số ngày của ba mức ưu tiên ĐÃ CHỐT — 3 / 5 / 7 ngày làm việc** (docs/12
> §2, ngày 02/09/2026). Bản trước để tạm 3 / 5 / 8; migration 046 sửa mức 3 về
> 7. Muốn đổi thì sửa ba tham số `SO_NGAY_XU_LY_UU_TIEN_1/2/3` trên màn hình
> Quản trị, không phải sửa mã — nhưng nhớ sửa kèm `NGAY_XU_LY_MAC_DINH` trong
> `backend/services/de_nghi.py`, đó là lưới an toàn khi tham số chưa nạp và nó
> phải trùng với tham số.

> Hiện trạng để tham chiếu: công thức `TÌNH TRẠNG` của Excel GCN gắn **83,6%** dòng là "Sai QT" — nhưng công thức đó viết sai (`AND(x=y, x>y)` không bao giờ đúng). Con số thật phải tính lại bằng logic trên.

---

## 3. Mức ưu tiên và SLA

### 3.1 Hai trường riêng biệt — không được lẫn

| Trường | Nguồn | Dùng để |
|---|---|---|
| `MUC_DO_UU_TIEN` | Đọc từ `LENH_SAN_XUAT` của hệ Kế hoạch Sản xuất (1 / 2 / 3) | **Quyết định SLA** |
| `TINH_TRANG_YC` | Người yêu cầu / Mua hàng đánh dấu | **Quản lý nội bộ Mua hàng**, không ảnh hưởng SLA |

`TINH_TRANG_YC` ∈ `BINH_THUONG` (79,5%) · `HANG_KHAN_CAP` (10,4%) · `KHAN_CAP_NG` · `HANG_NG`

### 3.2 Bảng SLA

| Mã | Quy tắc | Ưu tiên 1 | Ưu tiên 2 | Ưu tiên 3 |
|---|---|---|---|---|
| `SLA-01` | Từ khi nhận LSX → phải lập ĐNVT trong | trong ngày | 1 ngày | 2 ngày |
| `SLA-02` | Mua hàng phản hồi tiến độ cho Trưởng BP trong | 1–2 ngày | 2–3 ngày | 3–5 ngày |
| `SLA-03` | Kỳ hạn tối thiểu để hàng về (LSX thường): **5 ngày làm việc**, không tính ngày lập ĐNVT | | | |

Tất cả tính bằng **ngày làm việc**.

### 3.3 Cảnh báo trễ hạn

```python
SO_NGAY_SOM_TRE = so_ngay_lam_viec_giua(KY_HAN_YC, NGAY_NHAN or hom_nay)
# > 0 : sớm hạn      = 0 : đúng hạn      < 0 : trễ hạn
```

| Mã | Quy tắc |
|---|---|
| `SLA-04` | KHI `SO_NGAY_SOM_TRE < 0` và chưa nhận hàng THÌ đưa vào danh sách **trễ hạn**, gửi thông báo cho người mua hàng và người yêu cầu |
| `SLA-05` | KHI còn `≤ 2` ngày làm việc tới kỳ hạn và chưa đặt hàng THÌ cảnh báo **sắp trễ** |
| `SLA-06` | **Cấm** dùng cột trạng thái để đo đúng hạn. Phải dùng `SO_NGAY_SOM_TRE` |

> Lỗi của Excel cũ cần tránh: `TT GIAO HÀNG = IF(NGÀY NHẬP<>"", "ĐÃ GIAO", …)` gộp "đã giao" với "đúng hạn", nên hàng giao trễ vẫn hiện `ĐÃ GIAO`.

---

## 4. Gia công ngoài

| Mã | Quy tắc |
|---|---|
| `GCN-01` | `KY_HAN_QUY_DINH = cong_ngay_lam_viec(NGAY_GUI_HANG_DI, SO_NGAY_CHUAN)` |
| `GCN-02` | `SO_NGAY_CHUAN = COALESCE(NHA_CUNG_CAP.KY_HAN_QUY_DINH, LOAI_GIA_CONG.SO_NGAY_CHUAN)` — phiếu **phải hiển thị rõ đang áp nguồn nào** |
| `GCN-03` | Mua hàng cần **0–1 ngày làm việc** để xử lý phiếu và sắp xếp vận chuyển hàng đi; **0–1 ngày** để sắp xếp hàng về |
| `GCN-04` | KHI chọn xong đơn vị gia công THÌ **gửi ngay** thông báo điều xe cho Kho vận (địa chỉ, khối lượng, vật tư cần giao) |
| `GCN-05` | Ưu tiên dùng xe công ty. Không đáp ứng được thì Kho vận thuê ngoài và báo chi phí cho Mua hàng theo dõi |
| `GCN-06` | Phiếu GCN bắt buộc đính kèm: bản vẽ kỹ thuật (có kích thước và yêu cầu gia công), số lượng, ngày dự kiến hoàn thành |
| `GCN-07` | Trường hợp khẩn cấp hoặc đặc biệt: người đề nghị phải gửi phiếu cho Ban lãnh đạo duyệt **trước khi** gửi Mua hàng |

**Số ngày chuẩn theo loại gia công** — xem bảng ở `02_CHUAN_HOA.md` §6. Hai dòng còn tranh chấp giữa QT-MH-01 và Excel: **bọc su** và **đột lỗ lưới** (7 hay 7–10).

---

## 5. Đặt ngoài

| Mã | Quy tắc |
|---|---|
| `DNG-01` | Chỉ vai trò **Kinh doanh** được lập phiếu đặt ngoài |
| `DNG-02` | Phạm vi là **toàn bộ** lệnh sản xuất, không gắn công đoạn cụ thể |
| `DNG-03` | Duyệt bởi **Trưởng BP Kinh doanh**. **Không áp ngưỡng tiền.** Một cấp duy nhất |
| `DNG-04` | Hàng về nhập kho **bán thành phẩm** để kiểm QC, không nhập thẳng thành phẩm |
| `DNG-05` | Hệ Mua hàng theo dõi và hiển thị: LSX/mã hàng nào đang **báo giá / xác nhận kỹ thuật / đã đặt**, và tiến độ với NCC |

---

## 6. Báo giá

| Mã | Quy tắc | Chế độ |
|---|---|---|
| `BG-01` | KHI lập đơn hàng THÌ phải có **tối thiểu 2 báo giá** cho cùng mặt hàng, TRỪ KHI bật `MIEN_TRU_2_BAO_GIA` kèm lý do (độc quyền / đã có hợp đồng / được chỉ định) | `CANH_BAO` |
| `BG-02` | So sánh không chỉ dựa trên giá, mà cả: giá & điều kiện thanh toán · thông số kỹ thuật và chứng chỉ vật tư · thời gian giao hàng và khả năng đáp ứng | — |
| `BG-03` | KHI chọn báo giá THÌ bắt buộc nhập `LY_DO_CHON` nếu **không** chọn báo giá rẻ nhất | `CHAN` |
| `BG-04` | KHI ĐNVT chưa được Kỹ thuật xác nhận thông số THÌ không cho chuyển sang bước báo giá | `CANH_BAO` |
| `BG-05` | Đơn giá phải được **chụp** vào dòng chứng từ tại thời điểm lập. Chứng từ cũ không đổi số khi bảng giá thay đổi | `CHAN` |

---

## 7. Đơn hàng và phê duyệt

### 7.1 Công thức tiền — bản đúng, khác với checklist E9

```python
def thanh_tien(dong) -> int:
    if dong.DON_VI_GIA in ('KG', 'MET', 'LIT'):
        return round(dong.DON_GIA_CO_SO * dong.TRONG_LUONG)
    return round(dong.DON_GIA_CO_SO * dong.SO_LUONG)

TONG_TIEN         = sum(thanh_tien(d) for d in dong)      # tính lại khi đọc, KHÔNG lưu
GIA_TRI_TRUOC_VAT = round(TONG_TIEN / (1 + VAT_SUAT/100)) # VAT 10%
```
Kiểm chứng trên dữ liệu thật: `28.000 × 1,85 = 51.800` · `46.000 × 72 = 3.312.000` · `98.000 × 15 = 1.470.000` · `874.000 × 0,64 = 559.360`

| Mã | Quy tắc |
|---|---|
| `DH-01` | KHI `DON_VI_GIA ≠ PCS` THÌ `TRONG_LUONG` là **bắt buộc**, nếu thiếu thì `422` |
| `DH-02` | `TONG_TIEN` **không lưu ở bảng đầu** — tính lại mỗi lần đọc |
| `DH-03` | Tiền là **số nguyên đồng**. Làm tròn ở bước cuối cùng |

### 7.2 Ngưỡng phê duyệt — QT-MH-01 §7.7

So trên `GIA_TRI_TRUOC_VAT`.

| `PHAN_LOAI` | Giá trị | Người kiểm tra | Cấp duyệt |
|---|---|---|---|
| `CHUYEN_DUNG` | mọi giá trị | Trưởng BP Mua hàng | **Ban lãnh đạo** (GĐ Điều hành) |
| `THONG_DUNG_SX` | ≤ 500.000.000 | NV thực hiện đơn hàng | Trưởng BP Mua hàng |
| `THONG_DUNG_SX` | > 500.000.000 | Trưởng BP Mua hàng | **Ban lãnh đạo** (GĐ Vận hành) |
| `THONG_DUNG_BTBD` | ≤ 50.000.000 | NV thực hiện đơn hàng | Trưởng BP Mua hàng |
| `THONG_DUNG_BTBD` | > 50.000.000 | Trưởng BP Mua hàng | **Ban lãnh đạo** (GĐ Vận hành) |

```python
def cap_duyet_yeu_cau(don_hang) -> str:
    # PO trộn nhiều phân loại → lấy mức NGHIÊM NGẶT NHẤT trong các dòng
    if any(d.PHAN_LOAI_CHUP == 'CHUYEN_DUNG' for d in don_hang.dong):
        return 'BAN_LANH_DAO'
    gia_tri = gia_tri_truoc_vat(don_hang)
    if any(d.PHAN_LOAI_CHUP == 'THONG_DUNG_BTBD' for d in don_hang.dong):
        nguong = THAM_SO['NGUONG_THONG_DUNG_BTBD']    # 50tr
    else:
        nguong = THAM_SO['NGUONG_THONG_DUNG_SX']      # 500tr
    return 'BAN_LANH_DAO' if gia_tri > nguong else 'TBP_MUA_HANG'
```

| Mã | Quy tắc |
|---|---|
| `DH-04` | PO trộn nhiều phân loại: **không tách PO**, lấy mức nghiêm ngặt nhất. Báo cáo chi tiêu bổ **theo dòng** (mã hàng), không theo PO |
| `DH-05` | Hệ thống **hiển thị** `CAP_DUYET_YEU_CAU` như một nhãn trên phiếu, kể cả khi không chặn theo người |
| `DH-06` | KHI đơn hàng `DA_DUYET` THÌ **khoá sửa** mọi trường ảnh hưởng tiền và cam kết |
| `DH-07` | KHI cập nhật tình trạng giao hàng THÌ ghi `LICH_SU_TRANG_THAI` và gửi thông báo cho bộ phận yêu cầu |
| `DH-08` | Cấm chọn NCC chưa có trong danh mục được phê duyệt, TRỪ KHI có duyệt ngoại lệ kèm lý do | `CANH_BAO` |

> **Ghi chú về Q13:** đã chốt GĐ Vận hành · GĐ Điều hành · Ban Quản trị dùng **một vai trò `BAN_LANH_DAO`** và ai cũng duyệt được mọi mức. Hệ thống vẫn tính và hiển thị cấp duyệt yêu cầu theo §7.7 như nhãn cảnh báo. Muốn định tuyến chặt về sau, chỉ cần bật bảng `CAU_HINH_NGUOI_DUYET (PHAN_LOAI, NGUONG_TU, NGUONG_DEN, MA_NHAN_VIEN)` — không phải sửa code.

---

## 8. Nhận hàng và IQC

| Mã | Quy tắc |
|---|---|
| `NH-01` | Một lần giao là **một bản ghi** `NHAN_HANG`. Cấm nhồi nhiều số phiếu vào một ô như Excel cũ (`12-539/01-022`) |
| `NH-02` | `SO_LUONG_DA_NHAN` của dòng đơn hàng = tổng `SO_LUONG_NHAN` của các lần giao |
| `NH-03` | KHI `SO_LUONG_DA_NHAN < SO_LUONG` THÌ dòng ở trạng thái `GIAO_MOT_PHAN` |
| `NH-04` | KHI `SO_LUONG_DA_NHAN > SO_LUONG` THÌ cảnh báo giao thừa, yêu cầu ghi chú |
| `NH-05` | Số lượng thực nhập phải **khớp tuyệt đối** giữa đơn hàng và phiếu yêu cầu nhập kho. Lệch thì phải có lý do |
| `IQC-01` | KHI QC kết luận `KHONG_DAT` THÌ dòng chuyển `IQC_KHONG_DAT`, lập `HANG_KHONG_PHU_HOP`, và **cảnh báo** không nên nhập kho chính thức |
| `IQC-02` | Kết quả IQC tự động cấp số liệu cho `DANH_GIA_NCC.TY_LE_IQC_DAT` — **không nhập tay** |
| `IQC-03` | Hệ Mua hàng **ghi nhận** kết quả IQC, **không** ghi sổ kho, **không** tính tồn |

---

## 9. Thanh toán

| Mã | Quy tắc |
|---|---|
| `TT-01` | Một yêu cầu thanh toán có **N đợt** (`DOT_THANH_TOAN`), không giới hạn 2 đợt như Excel cũ |
| `TT-02` | `TRANG_THAI` của yêu cầu suy ra từ các đợt: chưa đợt nào trả → `CHUA_TT` · một phần → `TT_MOT_PHAN` · đủ → `DA_TT` |
| `TT-03` | Tổng các đợt phải **bằng** `GIA_TRI_DON_HANG`. Hai phía chặn ở hai thời điểm khác nhau: **vượt** thì chặn ngay lúc lập và lúc thêm đợt (`TONG_DOT_VUOT`); **thiếu** thì chặn ở lúc **duyệt** (`TONG_DOT_THIEU`) — lịch trả được dựng dần nên chặn phía thiếu ngay lúc lập sẽ làm phiếu đầu tiên không lập nổi |
| `TT-04` | Hệ thống **ghi nhận và theo dõi**, **không hạch toán**, **không tính công nợ**. Kế toán vẫn làm trên Bravo |
| `TT-05` | Bàn giao chứng từ sang Kế toán ghi vào `BAN_GIAO_CHUNG_TU`; ngày bàn giao cập nhật ngược về `NHAN_HANG` |

---

## 10. Điều xe

| Mã | Quy tắc |
|---|---|
| `DX-01` | Một luồng duy nhất cho mọi hạng mục: `DI_GCN` · `DI_LAY_HANG_GCN` · `MUA_HANG` · `GIAO_HANG` · `GIAO_CHUNG_TU` · `KHAC` |
| `DX-02` | `CHIEU` là trường có danh sách cố định, **không** để text tự do như Excel cũ (đang có `ĐƯA HÀNG ĐI + LẤY HÀNG VỀ` và `ĐƯA HÀNG ĐI+LẤY HÀNG VỀ` là hai giá trị khác nhau) |
| `DX-03` | KHI gửi sau **15:45** THÌ cảnh báo sẽ xếp vào lịch ngày kế tiếp |
| `DX-04` | Ưu tiên xe công ty. Chọn `XE_NGOAI` thì bắt buộc nhập chi phí thuê |
| `DX-05` | Lịch điều xe theo ngày gom theo tài xế và theo xe, để phát hiện trùng lịch |

---

## 11. Nhà cung cấp

| Mã | Quy tắc |
|---|---|
| `NCC-01` | NCC mới phải qua **đánh giá ban đầu** (hồ sơ + sản phẩm mẫu) trước khi vào danh mục được phê duyệt |
| `NCC-02` | NCC trong danh mục phải được **đánh giá định kỳ tối thiểu 1 năm/lần** |
| `NCC-03` | Tiêu chí (QT-MH-01 §7.5): chất lượng sản phẩm · thời gian giao hàng · giá cả · thanh toán · dịch vụ khách hàng · tầm vóc · thời gian đã hợp tác · giá trị giao dịch |
| `NCC-04` | `TY_LE_DUNG_HAN` và `TY_LE_IQC_DAT` **lấy tự động** từ dữ liệu giao dịch, không nhập tay |
| `NCC-05` | NCC không đạt: xử lý theo mức `CANH_BAO` → `TAM_NGUNG` → `LOAI_BO`, ghi vào `NHA_CUNG_CAP.TRANG_THAI` |
| `NCC-06` | KHI NCC ở trạng thái `TAM_NGUNG` hoặc `LOAI_BO` THÌ cảnh báo khi chọn vào báo giá / đơn hàng |

---

## 12. Bảo mật dữ liệu (Hiến chương Ch.8)

| Mức | Dữ liệu trong hệ thống này | Yêu cầu |
|---|---|---|
| Nội bộ | Tiến độ đơn hàng, tình trạng đề nghị | Đăng nhập mới xem được |
| **Hạn chế** | Đơn giá mua, tổng tiền PO | Phân quyền theo vai trò + **ghi nhật ký truy cập** |
| **Tối mật** | Bảng giá NCC, cơ cấu chiết khấu, điều khoản thương mại | Danh sách người được xem cụ thể + nhật ký + **kiểm soát xuất file** |

| Mã | Quy tắc |
|---|---|
| `BM-01` | Quyền **xuất file tách khỏi quyền xem**. Chỉ Trưởng BP và Admin được xuất Excel hàng loạt |
| `BM-02` | Mọi lượt xem và xuất dữ liệu mức Hạn chế/Tối mật ghi vào `NHAT_KY_THAY_DOI` với `HANH_DONG = 'XEM'` / `'XUAT'` |
| `BM-03` | Cột đơn giá và tổng tiền **ẩn hoàn toàn** với vai trò không có quyền — ẩn ở backend, không chỉ ẩn ở giao diện |

---

## 13. Công thức tính toán phụ trợ

### 13.1 Khối lượng vật liệu tấm / thanh

```python
def khoi_luong_kg(dai_mm, rong_mm, day_mm, klr, so_luong=1):
    """KLR đơn vị g/cm³. Trả về kg."""
    return dai_mm * rong_mm * day_mm * klr * so_luong / 1_000_000
```
| Vật liệu | KLR (g/cm³) | Đơn giá tham khảo (đ/kg) |
|---|---|---|
| Thép / SS400 / S45C | 7,85 | 25.000 |
| Inox 304 / 201 | 7,95 | 85.000 |
| Nhôm 6061 | 2,70 | 140.000 |
| Đồng C3604 | 8,80 | — |
| Mica / nhựa POM | 1,41 | 100.000 |
| CAM | 6,40 | — |

```
GIA_CHUA_VAT = GIA / 1,1
```

### 13.2 Chỉ số COP-03

```python
TY_LE_GIAO_DUNG_HAN = 100.0 * số_dòng(SO_NGAY_SOM_TRE >= 0) / số_dòng_đã_nhận
TY_LE_IQC_DAT       = 100.0 * SUM(SO_LUONG_DAT) / SUM(SO_LUONG_KIEM)
TY_LE_SU_DUNG       = 100.0 * số_người_đăng_nhập_30_ngày / tổng_tài_khoản_hoạt_động
TY_LE_BAT_KHA_THI   = 100.0 * số_dòng(BAT_KHA_THI) / tổng_số_dòng_trong_tháng
```

**Hai cách đo đúng hạn — phải gọi tên khác nhau:**

| Chỉ số | Mốc so sánh | Dùng cho |
|---|---|---|
| **Đúng hạn theo yêu cầu** | `KY_HAN_YC` (người yêu cầu đưa ra) | Báo cáo COP-03 lên Ban lãnh đạo |
| **Đúng hạn theo cam kết** | `TRA_LOI_KY_HAN` (Mua hàng cam kết lại) | Chỉ số nội bộ Bộ phận Mua hàng |

> Hiện trạng để so sánh: đo theo yêu cầu cho **66,7% đúng hạn**; hệ GCN đo theo mốc tự đặt cho **96,6%**. Hai con số này **không so được với nhau** — đó là lý do phải gọi tên khác nhau.

---

## 14. Bảng tổng hợp mã quy tắc

| Nhóm | Mã | Số quy tắc |
|---|---|---|
| Thời gian | `TG-01` … `TG-03` | 3 |
| Đề nghị | `DN-01` … `DN-12` | 12 |
| SLA | `SLA-01` … `SLA-06` | 6 |
| Gia công ngoài | `GCN-01` … `GCN-07` | 7 |
| Đặt ngoài | `DNG-01` … `DNG-07` | 7 |
| Báo giá | `BG-01` … `BG-05` | 5 |
| Đơn hàng | `DH-01` … `DH-08` | 8 |
| Nhận hàng & IQC | `NH-01` … `NH-05`, `IQC-01` … `IQC-03` | 8 |
| Thanh toán | `TT-01` … `TT-05` | 5 |
| Điều xe | `DX-01` … `DX-06` | 6 |
| Nhà cung cấp | `NCC-01` … `NCC-06` | 6 |
| Tồn kho | `TK-01` … `TK-04` | 4 |
| Bảo mật | `BM-01` … `BM-03` | 3 |
| | **Tổng** | **81** |

Mỗi mã phải có ít nhất một hàm kiểm thử tương ứng trong `tests/`. Hiến chương 2.4 [B]: bộ kiểm thử cho toàn bộ quy tắc nghiệp vụ chính phải chạy đạt trước mỗi lần triển khai.
