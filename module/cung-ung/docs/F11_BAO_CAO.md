# F11 — Tổng quan · Báo cáo & Phân tích · KPI

> Thay thế: sheet `BAO CAO DA GIAO` (304 dòng), `BCMH TĐ` (910 dòng), `Trang thai ma 1722`, `Báo cáo tuần GCN`, `Báo cáo ngày GCN`, `BÁO CÁO HÀNG KHẨN CẤP`, `Thống kê`, và macro VBA `XuatPDFBCN`.

---

## 1. Nguyên tắc bắt buộc (Hiến chương 1.6 [B])

> Báo cáo và số tổng hợp phải tính **trực tiếp từ dữ liệu giao dịch gốc tại thời điểm truy vấn**. Cấm lấy file kết quả đã xuất trước đó làm đầu vào tính toán tiếp theo.

Bài học đã trả giá ở hệ Kế hoạch Sản xuất: phân tích năng lực đọc từ file đã xuất nên cho ra chỉ số sử dụng máy thấp giả tạo.

Nếu buộc phải lưu kết quả tính sẵn vì tốc độ, giao diện **phải hiển thị thời điểm tính** và cảnh báo khi dữ liệu đã cũ.

---

## 2. Màn hình TỔNG QUAN — trang chủ

Đây là 7 ô trạng thái mà tài liệu Menu liệt kê. Chúng **không phải trạng thái của một chứng từ** — chúng là **trạng thái tổng hợp ở cấp mã hàng**, suy ra từ view `V_TINH_TRANG_MA_HANG` (xem `03_MO_HINH_DU_LIEU.md` §13).

```
┌ Tổng quan ────────────────────── [Tháng này ▾] [Bộ phận ▾] ┐
│                                                              │
│  TÌNH TRẠNG MÃ HÀNG                                          │
│  ┌────────┬────────┬────────┬────────┬────────┬──────┬─────┐│
│  │Đang XN │Đã duyệt│Đang    │Đã đặt  │Đang    │Đã giao│Đã   ││
│  │đề nghị │đề nghị │báo giá │hàng    │giao    │đúng hạn│giao ││
│  │        │        │        │        │        │       │trễ  ││
│  │   47   │  128   │   86   │  312   │  204   │  891  │ 143 ││
│  └────────┴────────┴────────┴────────┴────────┴──────┴─────┘│
│                                                              │
│  CẦN CHÚ Ý                          VIỆC CỦA TÔI            │
│  🔴 Trễ hạn            143          Chờ tôi duyệt      5    │
│  🟠 Sắp trễ (≤2 ngày)   38          Việc được giao    48    │
│  ⚠  Chờ cấp mã VT       47          Phiếu bị trả lại   2    │
│  ⚠  Đề nghị bất khả thi 12          Chờ ký bù          1    │
│  ⚠  Tồn đọng >30 ngày   61                                  │
│                                                              │
│  CHỈ SỐ COP-03 — tháng 08/2026                              │
│  ┌──────────────────────┬──────────────────────┐            │
│  │ Giao hàng đúng hạn   │ Chất lượng IQC       │            │
│  │      86,2%           │       99,1%          │            │
│  │  ▁▂▃▅▆▇█ (6 tháng)   │  ▇▇█▇██▇             │            │
│  └──────────────────────┴──────────────────────┘            │
│  Đề nghị bất khả thi 4,8%  ·  Tỷ lệ sử dụng hệ thống 83%    │
└──────────────────────────────────────────────────────────────┘
```

**Ba nguyên tắc bố cục:**
1. **Trạng thái mã hàng lên đầu** — đúng mục tiêu tối thượng "nắm bắt theo từng mã hàng".
2. **Cần chú ý** đặt trước **chỉ số** — người dùng mở app để biết phải làm gì, không phải để ngắm biểu đồ.
3. Mọi ô số **bấm được**, mở thẳng danh sách đã lọc sẵn.

---

## 3. Bảy báo cáo chuẩn

| Mã | Báo cáo | Thay sheet Excel | Ai xem | Kỳ |
|---|---|---|---|---|
| `BC01` | Tình trạng mua hàng | `THEO DOI MUA HANG` lọc | Mua hàng, BGĐ | Tuần/Tháng |
| `BC02` | Tiến độ giao hàng & trễ hạn | `Trang thai ma 1722` | Mua hàng, BP yêu cầu | Ngày/Tuần |
| `BC03` | Tồn đọng | `BCMH TĐ` (910 dòng) | Mua hàng, BGĐ | Tuần |
| `BC04` | Hàng đã giao trong ngày | `BAO CAO DA GIAO` | Mua hàng, Kho | Ngày |
| `BC05` | Chất lượng nhà cung cấp | `BM07` + `Báo cáo tuần GCN` | Mua hàng, QC, BGĐ | Tháng/Quý |
| `BC06` | Hoạt động nội bộ | — | Trưởng BP Mua hàng | Tuần/Tháng |
| `BC07` | Đề nghị bất khả thi | **mới** | BGĐ, các BP sản xuất | **Tháng** |
| `BC08` | Hàng khẩn cấp | `BÁO CÁO HÀNG KHẨN CẤP` | BGĐ | Tháng |
| `BC09` | Thống kê điều xe | `Thống kê` | Kho vận | Tháng |

---

## 4. Chỉ số COP-03 — công thức chính xác

### 4.1 Giao hàng đúng hạn — **hai cách đo, phải gọi tên khác nhau**

| Chỉ số | Mốc so sánh | Dùng cho |
|---|---|---|
| **Đúng hạn theo yêu cầu** | `KY_HAN_YC` — kỳ hạn người yêu cầu đưa ra | Báo cáo COP-03 lên Ban lãnh đạo |
| **Đúng hạn theo cam kết** | `TRA_LOI_KY_HAN` — kỳ hạn Mua hàng cam kết lại | Chỉ số nội bộ Bộ phận Mua hàng |

```sql
-- theo yêu cầu (chỉ số chính thức)
SELECT 100.0 * count(*) FILTER (WHERE nhd.SO_NGAY_SOM_TRE >= 0) / NULLIF(count(*), 0)
FROM NHAN_HANG_DONG nhd JOIN NHAN_HANG nh ON nh.ID = nhd.ID_NHAN_HANG
WHERE nh.NGAY_NHAN BETWEEN %(tu)s AND %(den)s;
```

> **Vì sao phải tách:** hiện trạng đo theo yêu cầu cho **66,7% đúng hạn**; hệ GCN đo theo mốc tự đặt cho **96,6%**. Hai con số này **không so được với nhau**. Trộn chúng vào một chỉ số là tự lừa mình.

### 4.2 Ba chỉ số còn lại

```python
TY_LE_IQC_DAT     = 100.0 * SUM(SO_LUONG_DAT) / SUM(SO_LUONG_KIEM)
TY_LE_SU_DUNG     = 100.0 * số_tài_khoản_đăng_nhập_30_ngày / tổng_tài_khoản_HOAT_DONG
TY_LE_BAT_KHA_THI = 100.0 * số_dòng(BAT_KHA_THI) / tổng_số_dòng_trong_tháng
```

`TY_LE_SU_DUNG` là chỉ số **A6** của checklist và cũng là tiêu chí đánh giá 30 ngày sau triển khai của Hiến chương 10.2 (**mục tiêu ≥80%**).

---

## 5. BC07 — Báo cáo đề nghị bất khả thi

> Yêu cầu của anh Long: *"Thêm tracking theo dõi SX đã đề nghị bất khả thi bao nhiêu %/tháng vì đề nghị mua hàng vẫn phải giải quyết cho sản xuất ra sản phẩm nhưng cần giải trình cuối tháng."*

```
┌ Đề nghị bất khả thi — tháng 08/2026 ────────────────────────┐
│ Toàn công ty: 97/2.014 dòng = 4,8%          [⭳ Tải xuống]   │
├──────────────────────────────────────────────────────────────┤
│ Bộ phận              Tổng dòng  Bất khả thi   Tỷ lệ    Xu hướng│
│ Gia Công Chính Xác      1.104        62       5,6%   ▂▃▅▄▆▅  │
│ Gia Công Kết Cấu 3        412        21       5,1%   ▃▂▄▃▂▃  │
│ Tự Động Hoá               188         9       4,8%   ▁▂▁▃▂▂  │
│ Vận Hành (bảo trì)        310         5       1,6%   ▁▁▂▁▁▁  │
├──────────────────────────────────────────────────────────────┤
│ CHI TIẾT — Gia Công Chính Xác (62 dòng)          [Mở ▾]      │
│ │Ngày │Người YC │Tên hàng      │Kỳ hạn YC│Sớm nhất│Thiếu    │
│ │03/08│Mr. Sáng │S45C-Phi 35   │05/08    │10/08   │-5 ngày  │
│ │07/08│Mr. Mạnh │Dao phay D16  │08/08    │14/08   │-6 ngày  │
└──────────────────────────────────────────────────────────────┘
```

Cột "Sớm nhất" = `cong_ngay_lam_viec(NGAY_HIEU_LUC, 5)` với mua hàng, hoặc `+ SO_NGAY_CHUAN` với gia công ngoài. Cột "Thiếu" là số ngày làm việc còn thiếu.

Đây là báo cáo để **bộ phận giải trình cuối tháng** — mua hàng vẫn phải giải quyết, nhưng con số phải minh bạch.

```sql
SELECT dn.MA_BO_PHAN,
       count(*)                                   AS tong_dong,
       count(*) FILTER (WHERE d.BAT_KHA_THI)      AS bat_kha_thi,
       round(100.0 * count(*) FILTER (WHERE d.BAT_KHA_THI) / count(*), 1) AS ty_le
FROM DE_NGHI_DONG d JOIN DE_NGHI dn ON dn.ID = d.ID_DE_NGHI
WHERE dn.NGAY_HIEU_LUC BETWEEN %(tu)s AND %(den)s AND dn.TRANG_THAI <> 'HUY'
GROUP BY dn.MA_BO_PHAN ORDER BY ty_le DESC;
```

---

## 6. BC03 — Báo cáo tồn đọng (thay `BCMH TĐ`)

Sheet hiện có **910 dòng**, có dòng trễ **−120 ngày**.

Cột giữ nguyên như Excel để người dùng quen mắt:
`STT · NGƯỜI YÊU CẦU · NGÀY YC ĐẶT HÀNG · LỆNH SX · SỐ PHIẾU ĐNVT · TÊN HÀNG · ĐVT · SL · KỲ HẠN YC · SỐ NGÀY GN · TRẢ LỜI KỲ HẠN · MÃ VẠCH · GHI CHÚ · NV MUA HÀNG`

Sắp xếp: trễ nhiều nhất lên đầu. Có nút xuất PDF (thay macro VBA `XuatPDFBCN`).

Phân nhóm theo mức trễ: `>90 ngày` · `30–90` · `1–30` · `chưa tới hạn`.

---

## 7. BC05 — Chất lượng nhà cung cấp

```
┌ Chất lượng nhà cung cấp — Quý 3/2026 ───────────────────────┐
│ [Ngành nghề ▾] [Xếp loại ▾]                  [⭳ Tải xuống]  │
├──────────────────────────────────────────────────────────────┤
│ Theo ngành nghề     Đúng hạn  IQC đạt  Không PH  Số đơn      │
│ SƠN TĨNH ĐIỆN         97,8%    99,4%       1        90       │
│ XI MẠ                 94,3%    98,1%       2        35       │
│ NHIỆT LUYỆN           90,5%   100,0%       0        21       │
│ GIA CÔNG KHÁC         96,7%    97,8%       3        90       │
├──────────────────────────────────────────────────────────────┤
│ NCC CẦN CHÚ Ý                                                │
│ 🔴 TUYÊN HƯNG   đúng hạn 61%  ·  3 lần không phù hợp         │
│ 🟠 THÀNH LỢI    đúng hạn 74%  ·  1 lần không phù hợp         │
└──────────────────────────────────────────────────────────────┘
```

> **Lưu ý:** báo cáo tuần GCN hiện tại cho ra **97,9% "sớm hạn"** — con số không đáng tin vì công thức Excel tính cả dòng **chưa giao** là "sớm hạn". Hệ mới chỉ tính trên dòng **đã nhận hàng**.

---

## 8. BC06 — Hoạt động nội bộ

```
┌ Hoạt động nội bộ — tháng 08/2026 ───────────────────────────┐
│ NV mua hàng│Tiếp nhận│Đã đặt│Đã giao│Trễ│Đúng hạn│TB xử lý  │
│ Như            412     398    364    41   88,7%   1,2 ngày  │
│ Ms. Ngọc       367     359    331    22   93,4%   0,9 ngày  │
│ Ms. Trâm       154     149    141     8   94,3%   1,1 ngày  │
│ Thiên           61      58     54     3   94,4%   1,4 ngày  │
├──────────────────────────────────────────────────────────────┤
│ Thời gian trung bình theo chặng (ngày làm việc)              │
│ Đề nghị → duyệt      0,4    │ Báo giá → đặt hàng      1,1    │
│ Duyệt → báo giá      1,3    │ Đặt hàng → nhận hàng    6,8    │
└──────────────────────────────────────────────────────────────┘
```

Thời gian theo chặng tính từ bảng `LICH_SU_TRANG_THAI` — đây là lý do bảng đó phải tồn tại (giáo trình GĐ1 §2A.7: *"chứng từ này nằm chờ duyệt bao lâu?"*).

> **Nhạy cảm:** báo cáo này lộ năng suất cá nhân (checklist I12). Cần truyền thông rõ mục đích là **hỗ trợ quy trình, không phải phạt**, và chỉ Trưởng BP Mua hàng cùng Ban lãnh đạo được xem.

---

## 9. Logic backend

```
GET /api/v1/tong-quan?ky=&bo_phan=
GET /api/v1/bao-cao/tinh-trang-mua-hang
GET /api/v1/bao-cao/tien-do-giao-hang
GET /api/v1/bao-cao/ton-dong
GET /api/v1/bao-cao/da-giao?ngay=
GET /api/v1/bao-cao/chat-luong-ncc?tu=&den=
GET /api/v1/bao-cao/hoat-dong-noi-bo?tu=&den=
GET /api/v1/bao-cao/bat-kha-thi?thang=
GET /api/v1/bao-cao/hang-khan-cap?thang=
GET /api/v1/bao-cao/thong-ke-dieu-xe?tu=&den=
GET /api/v1/bao-cao/{ma}/tai-xuong?dinh_dang=csv|xlsx|pdf
GET /api/v1/kpi/cop03?ky=
```

```python
def bao_cao(ma, loc, ho_so):
    pham_vi = kiem_quyen(ho_so, 'bao_cao', 'xem')
    if loc.tai_xuong:
        kiem_quyen(ho_so, 'bao_cao', 'xuat')          # BM-01: xuất tách khỏi xem
        nhat_ky.ghi(bang='BAO_CAO', id_ban_ghi=ma, hanh_dong='XUAT',
                    nguoi=ho_so.MA_NHAN_VIEN)          # BM-02
    du_lieu = CHAY_BAO_CAO[ma](loc, pham_vi, ho_so)    # luôn tính từ giao dịch gốc
    if not co_quyen_xem_gia(ho_so):
        du_lieu = bo_cot_tien(du_lieu)                 # BM-03: ẩn ở backend
    return du_lieu
```

---

## 10. Chuẩn thiết kế cho mọi màn hình báo cáo

| Yêu cầu | Chi tiết |
|---|---|
| Bố cục | Bộ lọc trên · thẻ số liệu · bảng hoặc biểu đồ · nút tải xuống |
| Bộ lọc chuẩn | Từ ngày – Đến ngày · Bộ phận · Trạng thái · Mã hàng/Mã vạch |
| Bảng **và** biểu đồ | Checklist F12: cả hai, không chỉ một |
| Số liệu | `tabular-nums`, canh phải, dấu phân cách nghìn, tiền là số nguyên |
| Màu ngữ nghĩa | 🔴 xấu · 🟠 cảnh báo · 🟢 tốt — **không** dùng HD-RED cho nút |
| Mỗi ô số | Bấm được, mở danh sách đã lọc sẵn |
| Ba trạng thái | Đang tải · Lỗi · Không có dữ liệu — bắt buộc |
| Tải xuống | CSV (UTF-8 **có BOM** để Excel đọc đúng tiếng Việt) · Excel · PDF |
| Xu hướng | Biểu đồ đường 6–12 kỳ gần nhất cạnh mỗi chỉ số chính |
| Thời điểm tính | Hiện "Tính lúc HH:MM" ở góc, nếu có cache thì cảnh báo dữ liệu cũ |

**Chọn dạng biểu đồ:**

| Nội dung | Dạng |
|---|---|
| Xu hướng theo thời gian | Đường |
| So sánh giữa bộ phận / NCC | Cột ngang, sắp giảm dần |
| Tỷ lệ đạt / không đạt | Thanh xếp chồng 100% |
| Phân bố mức trễ | Cột (histogram) |
| Cơ cấu chi tiêu theo chủng loại | Cột ngang — **không dùng bánh** khi >5 mục |

---

## 11. Kiểm thử

| # | Kịch bản | Kết quả mong đợi |
|---|---|---|
| 1 | Tổng quan tháng 08 | Tổng 7 ô trạng thái = tổng số dòng đang hoạt động |
| 2 | Bấm ô "Trễ hạn 143" | Mở danh sách 143 dòng đã lọc sẵn |
| 3 | Tính đúng hạn theo yêu cầu và theo cam kết | Hai con số khác nhau, gọi tên khác nhau |
| 4 | Báo cáo GCN | Chỉ tính dòng **đã nhận hàng**, không tính dòng chưa giao là "sớm hạn" |
| 5 | Vai trò không có quyền xuất | Nút tải xuống ẩn **và** API trả `403` |
| 6 | Xuất báo cáo | Có bản ghi `NHAT_KY_THAY_DOI` với `HANH_DONG = XUAT` |
| 7 | Vai trò không có quyền xem giá | Báo cáo không có cột tiền |
| 8 | Xuất CSV có tiếng Việt | Mở bằng Excel hiển thị đúng dấu (UTF-8 có BOM) |
| 9 | Báo cáo bất khả thi tháng 08 | Khớp với số dòng có `BAT_KHA_THI = true` |
| 10 | Vai trò `TBP_YEU_CAU` xem báo cáo | Chỉ thấy dữ liệu bộ phận mình |
| 11 | Báo cáo trên khoảng 12 tháng, ~24.000 dòng | Trả về **< 3 giây** |
| 12 | Báo cáo khi không có dữ liệu | Trạng thái rỗng có gợi ý, không phải bảng trắng |
| 13 | Thời gian theo chặng | Tính từ `LICH_SU_TRANG_THAI`, không phải từ chênh lệch ngày trên bảng đầu |
