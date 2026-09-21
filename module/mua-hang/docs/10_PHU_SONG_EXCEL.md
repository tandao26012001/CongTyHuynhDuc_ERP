# BÁO CÁO PHỦ SÓNG — 53 SHEET / 3 WORKBOOK GỐC ĐỐI CHIẾU VỚI HỆ THỐNG

Ngày lập: 01/09/2026 · Nguồn: kết quả đối chiếu của sáu người (45 sheet) + phần tự đối chiếu bổ sung 8 sheet còn sót (đã đo lại trực tiếp trên tệp Excel và trên mã nguồn).

**Kết luận nhanh:** 53/53 sheet nay đã có người soi. Không sheet nào đạt mức **ĐỦ**. Ba sheet **CHƯA CÓ** chỗ chứa nào trong hệ thống, 48 sheet **THIẾU MỘT PHẦN**, 2 sheet **KHÔNG CẦN** chuyển. Bốn khoảng trống lớn nhất, theo thứ tự nguy hiểm: (1) khuôn mã vật tư trong mã nguồn loại bỏ 10.257/10.687 mã kho đang lưu hành — chặn cứng việc nạp dữ liệu; (2) sáu biểu mẫu ISO đang in ra giấy hằng ngày chưa có mẫu in; (3) hai công thức số học của điều xe và một luật kỳ hạn của gia công ngoài chưa được cài, làm lệch số liệu báo cáo; (4) ba màn hình có backend đủ nhưng không có giao diện (giao việc, lập yêu cầu thanh toán, chi tiết việc của tôi).

---

## 1. BẢNG PHỦ SÓNG 53 SHEET

Ký hiệu workbook: **A** = MUA HANG MẪU GỬI LONG.xlsx (25 sheet) · **B** = Quản lý GCN+ĐX 2026.xlsm (23 sheet) · **C** = Danh mục Tên hàng (Mua hàng + Gia công ngoài + Kho).xlsx (5 sheet).

### 1.1 — CHƯA CÓ (3 sheet)

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 1 | **YEU CAU THANH TOAN IN** (A) | Biểu mẫu in "Phiếu yêu cầu thanh toán trả trước"; 15 ô VLOOKUP từ sổ TDYCTT theo một mã tra cứu, hai ô ký | CHƯA CÓ | Dữ liệu nguồn có (`YEU_CAU_THANH_TOAN` + `DOT_THANH_TOAN`) nhưng **chức năng in không tồn tại**: `backend/services/in_pdf.py` chỉ có 3 mẫu (`don_hang`, `phieu_dieu_xe`, `lich_dieu_xe`); `backend/api/routes/thanh_toan.py` không có route `/in`. docs/F08 §3 đã khai `GET /api/v1/yeu-cau-thanh-toan/{id}/in` — chưa cài |
| 2 | **Thông tin màu sơn** (B) | Bảng tra 3 dòng: mã màu khách hàng → mã màu quy đổi sơn tĩnh điện → công ty áp dụng | CHƯA CÓ | Không có bảng, cột hay danh mục nào trong 74 bảng. `backend/config/danh_muc_dinh_nghia.py` (17 danh mục) không có màu sơn. Mã màu hiện bị nhét vào chuỗi tự do `DE_NGHI_DONG.NOI_DUNG_GIA_CONG` |
| 3 | **ghi chú màu sơn stđ** (B, sheet ẩn) | Bảng tra 6 dòng: mã màu trên bản vẽ → mã sơn công ty dùng → công ty khách áp dụng | CHƯA CÓ | Như trên. Hai sheet màu sơn cùng nghiệp vụ nhưng khác khoá tra (mã khách vs mã bản vẽ), nên phải gộp thành MỘT danh mục ba khoá |

### 1.2 — THIẾU MỘT PHẦN (48 sheet)

**A. Mua hàng — sổ lõi và báo cáo dựng trên nó**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 4 | **THEO DOI MUA HANG** (A) | Bảng dữ liệu gốc kiêm sổ theo dõi — xương sống workbook A. 9.104 dòng/13.626 hàng, 37 cột, 36.425 ô công thức, 0 dropdown | THIẾU MỘT PHẦN | `DE_NGHI(+DONG)` · `DON_HANG(+DONG)` · `NHAN_HANG(+DONG)` · `GIAO_HANG_NOI_BO` · `BAN_GIAO_CHUNG_TU`, gộp ở view `V_TINH_TRANG_MA_HANG` (mig 020). Màn hình `don_hang` tab "Theo dõi tiến độ". BC01–BC04, BC08 |
| 5 | **TONG HOP** (A) | Kho lưu trữ các dòng ĐÃ HOÀN TẤT, cùng 37 cột; 6.717 dòng, 100% đã ĐH + đã giao, 0 ID SP trùng sổ đang chạy | THIẾU MỘT PHẦN | Cùng cụm bảng + `backend/services/luu_tru.py` (schema `luu_tru`, `THU_TU_LUU_TRU`, `xem_truoc/chuyen/tra_cuu_kho/phuc_hoi`). Màn hình `quan_tri` tab Lưu trữ |
| 6 | **BAO CAO DA GIAO** (A) | Báo cáo "Hàng đã giao trong ngày", 301 dòng, 17 cột, toàn bộ là VLOOKUP về TDDH theo ID SP dán vào cột Q | THIẾU MỘT PHẦN | BC04 — `bao_cao.py::_bc04` → `repo_bao_cao.bc04_da_giao` (dòng 503). Màn hình `bao_cao`, `giao_nhan` |
| 7 | **BCMH TĐ** (A) | Báo cáo "Mua hàng tồn đọng", 907 dòng, 5.160 ô công thức — sheet nặng công thức nhất workbook A | THIẾU MỘT PHẦN | BC03 — `bao_cao.py::_bc03` → `repo_bao_cao.bc03_ton_dong` (dòng 481) chạy trên `V_TINH_TRANG_MA_HANG`; chú thích trong mã ghi thẳng "thay sheet BCMH TĐ" |
| 8 | **Trang thai ma 1722** (A) | Báo cáo — ô tổng kết 5 hàng: Sớm hạn / Đúng hạn / Trễ hạn của 1.722 mã hàng, 1 công thức SUM | THIẾU MỘT PHẦN | BC02 (`_bc02`) + KPI `kpi_cop03`, tính từ `NHAN_HANG_DONG.SO_NGAY_SOM_TRE` |

**B. Lệnh mua hàng và hàng đợi việc**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 9 | **LỆNH MUA HÀNG NEW** (A) | Biểu mẫu in — Lệnh mua hàng phát cho NV mua hàng, 12 cột, 89 dòng dữ liệu; ô L1 ghi sẵn quy tắc đánh số | THIẾU MỘT PHẦN | `CONG_VIEC` + `CONG_VIEC_DONG` (tiền tố LMH/LMHD). `don_hang.giao_viec/nhan_viec/xong_viec/xac_nhan_xong/tra_lai_viec`. Màn hình `cong_viec` |
| 10 | **LMH THIEN** (A) | Hàng đợi việc cá nhân của MỘT nhân viên mua hàng — 13 cột × 65 hàng, 683 ô công thức; dán ID SP vào cột M, 11 cột tự kéo | THIẾU MỘT PHẦN | `CONG_VIEC(+DONG)`; `don_hang.viec_cua_toi/chi_tiet_cong_viec`; màn hình `cong_viec` tab "Việc của tôi" (`don_hang.js::veViecCuaToi`) |

**C. Xác nhận kỹ thuật**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 11 | **XÁC NHẬN THÔNG TIN** (A) | Bảng làm việc kiêm biểu mẫu in — dòng đề nghị cần người khác xác nhận trước khi mua; 35 dòng, 9 ô VLOOKUP, cột J gõ tay | THIẾU MỘT PHẦN | `DE_NGHI_DONG.CAN_XAC_NHAN_KT/KET_QUA_KT/...` + `DOI_VAT_LIEU` + `YEU_CAU_HUY` + `YEU_CAU_CAP_MA`; `services/xac_nhan_kt.py`; `frontend/assets/trang/xac_nhan_kt.js`; docs/F02 |

**D. Báo giá và đơn đặt hàng**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 12 | **QT-MH-01-BM04.** (A) | Biểu mẫu in — Yêu cầu báo giá gửi NCC, 51 dòng chi tiết, mọi ô VLOOKUP theo ID SP | THIẾU MỘT PHẦN | `YEU_CAU_BAO_GIA` (12 cột) + `YCBG_DONG` (11 cột); `services/bao_gia.py`; màn hình `bao_gia` |
| 13 | **QT-MH-01-BM06 ĐƠN ĐẶT HÀNG** (A) | Biểu mẫu in — Đơn đặt hàng gửi NCC, 45 dòng + khối CỘNG/VAT/TỔNG + khối xuất hoá đơn + 3 ô ký (mã in bên trong ô là BM05) | THIẾU MỘT PHẦN | `DON_HANG` + `DON_HANG_DONG`; `in_pdf.py::don_hang` (mẫu BM05); `GET /don-hang/{id}/in`; `tinh_tien.py`; `so_chu.py` |

**E. Giao nhận — phiếu giao hàng nội bộ và bàn giao chứng từ**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 14 | **QT-KV-01-BM03 PGH NB A5** (A) | Biểu mẫu in A5 — Phiếu yêu cầu nhập kho NVL, 12 dòng, 3 ô ký (Thủ kho · Bảo vệ · Người lập) | THIẾU MỘT PHẦN | `GIAO_HANG_NOI_BO(+DONG)`; `services/giao_hang_noi_bo.py`; màn hình `giao_nhan`; docs/F05 §4.4 |
| 15 | **QT-KV-01-BM03 PGH NB A4** (A) | Cùng biểu mẫu, khổ A4, 87 dòng; công thức trùng khít 13/13 với bản A5 | THIẾU MỘT PHẦN | Như trên. docs/F05 §4.4 đã chốt "hệ mới in A4, tự co theo số dòng" |
| 16 | **PGH** (B) | Biểu mẫu in — Phiếu giao hàng gia công ngoài, 18 dòng + TỔNG CỘNG + 3 ô ký; **đính chính**: vùng dữ liệu thật chỉ tới hàng 29, không phải 28.595 hàng | THIẾU MỘT PHẦN | `GIAO_HANG_NOI_BO(+DONG)`; số ký nhận ở `SO_LUONG_GIAO`; màn hình `giao_nhan` |
| 17 | **PHIẾU BÀN GIAO CHỨNG TỪ** (A) | Sổ theo dõi kiêm biểu mẫu bàn giao chứng từ gốc sang Kế toán; 178 dòng, KHÔNG công thức, gom nhóm theo NCC bằng ô trống | THIẾU MỘT PHẦN | `BAN_GIAO_CHUNG_TU` (11 cột) + `BGCT_DONG` (8 cột), mig 011 dòng 185–214; tab "Bàn giao chứng từ" trong `thanh_toan.js` |

**F. Nhà cung cấp**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 18 | **NCC** (A) | Bảng dữ liệu gốc — danh bạ nhà cung cấp, 800 dòng, 14 cột, không công thức | THIẾU MỘT PHẦN | `NHA_CUNG_CAP` (35 cột); màn hình `ncc` tab Danh mục; `services/nha_cung_cap.py` |
| 19 | **QT-MH-01-BM03** (A) | Biểu mẫu in — Danh mục NCC được phê duyệt (khung 50 dòng, hiện chưa có dòng dữ liệu) | THIẾU MỘT PHẦN | `NHA_CUNG_CAP.DA_PHE_DUYET/NGAY_PHE_DUYET/PHAN_LOAI_NCC`; `GET /nha-cung-cap/tai-xuong` → `nha_cung_cap.py::danh_muc_phe_duyet()` (chú thích ghi rõ "biểu mẫu BM03") |
| 20 | **SỔ THEO DÕI TÌNH TRẠNG NHÀ CUNG** (A) | Biểu mẫu in kiêm sổ theo dõi QT-MH-01-BM08 (ver 01, hiệu lực 02/01/2026) — hiện TRỐNG HOÀN TOÀN, chỉ có khung tiêu đề | THIẾU MỘT PHẦN | `HANG_KHONG_PHU_HOP` (mig 011, chú thích ghi "nguồn cho sổ BM08") + `KET_QUA_IQC`; `giao_nhan` tab "Hàng không phù hợp"; `kiem_tra_dau_vao.py`; BC05 |
| 21 | **Danh mục thông tin KH&NCC** (B) | Bảng dữ liệu gốc kiêm bảng tra — 81 dòng × 14 cột; khoá tra thật của cả workbook B là cột "Tên viết tắt" | THIẾU MỘT PHẦN | `NHA_CUNG_CAP` và `KHACH_HANG`; màn hình `ncc`, `danh_muc` |

**G. Thanh toán**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 22 | **THEO DOI YC THANH TOAN** (A) | Sổ theo dõi kiêm bảng dữ liệu gốc (bảng TDYCTT) — 978 dòng, 19 cột; 7 cột đầu VLOOKUP theo ID SP | THIẾU MỘT PHẦN | `YEU_CAU_THANH_TOAN` + `DOT_THANH_TOAN` (mig 011); màn hình `thanh_toan`; docs/F08 |

**H. Danh mục nguồn**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 23 | **Danh Muc** (A) | Bảng tra — nguồn cho mọi ô chọn của workbook A; 9 cột, mỗi cột một danh sách độc lập | THIẾU MỘT PHẦN | Màn hình `danh_muc` (17 danh mục ở `danh_muc_dinh_nghia.py`): `NHAN_VIEN` · `DON_VI_TINH` · `XE` · `MUC_DICH_SU_DUNG` (12, khớp) · `CHUNG_LOAI` (27, khớp) · `de_nghi.TINH_TRANG_HOP_LE` · `dieu_xe.CHIEU` |
| 24 | **Danh mục tài xế & Xe** (B) | Bảng tra — 3 danh mục nguồn: công nhân viên/tài xế (CSCN), danh mục xe + nhóm xe + mức độ (DSXE) | THIẾU MỘT PHẦN | `XE`, `TAI_XE`, `NHAN_VIEN` (mig 005); màn hình `danh_muc` mục `xe`/`tai-xe`; `GET /dieu-xe/danh-muc` |
| 25 | **THỜI GIAN GC-1** (B) | Bảng tra gốc — "Quy định thời gian đi gia công": 14 loại × 3/4/5/7 ngày + dải mốc ngày 0→8. Không có ô công thức | THIẾU MỘT PHẦN | `LOAI_GIA_CONG` (14 dòng, `SO_NGAY_CHUAN`) — **số ngày khớp 100%** với sheet; cộng `NHA_CUNG_CAP.KY_HAN_QUY_DINH` cho ngoại lệ |
| 26 | **Mua hàng** (C) | Bảng dữ liệu gốc — danh mục tên hàng mua: 12.028 dòng × 2 cột (TÊN HÀNG · TÊN QUY ĐỔI). Đo lại: 9.620 tên duy nhất, 2.408 dòng trùng tên, chỉ 750 dòng (6,2%) có TÊN QUY ĐỔI | THIẾU MỘT PHẦN | `VAT_TU` (mig 005 dòng 56) + `LICH_SU_GOP_VAT_TU`; `services/vat_tu.py` (tìm mờ `goi_y_trung`, ngưỡng `NGUONG_TRUNG_TEN` 85%, gộp mã); màn hình `danh_muc`; hộp thoại nhập lô (`frontend/assets/trang/nhap_lo.js`, docs/F10 §5.5). Docstring `vat_tu.py` đã nêu đúng con số của sheet này |
| 27 | **Gia công ngoài** (C) | Bảng dữ liệu gốc — 6.107 dòng × 7 cột: CÔNG VIỆC · NGƯỜI YÊU CẦU · khoá ghép "TÊN HÀNG - MÃ VẠCH - QUY CÁCH" · TÊN HÀNG · MÃ VẠCH (5.920 dòng có) · QUY CÁCH (6.025 dòng có) · NỘI DUNG GIA CÔNG | THIẾU MỘT PHẦN | `DE_NGHI_DONG` (`TEN_HANG_CHUP`, `MA_VACH`, `QUY_CACH`, `NOI_DUNG_GIA_CONG`, `MA_LOAI_GIA_CONG`) + `LOAI_GIA_CONG`. Đo lại: 41 giá trị CÔNG VIỆC khác nhau, chỉ 15 ánh xạ được vào 14 mã đang có (4.991 dòng); **1.068 dòng / 26 giá trị chưa có mã**, dẫn đầu là LÀM ĐEN 917 dòng |
| 28 | **Kho Vật tư PO** (C) | Bảng dữ liệu gốc — 10.102 dòng: TÊN HÀNG → MÃ-VT. Mã theo khuôn VT-[nhóm vật liệu]-[stt] (ST 3.650 · IN 1.170 · TMC 877 · GC 735 · ELI 632 · LK 627 · POL 577 · SX 529 · PK 436 · KM 399 · DO 313 · HC 157) | THIẾU MỘT PHẦN | `VAT_TU.MA_VAT_TU` + `KHO` + `LOAI_PHOI`; `vat_tu.kiem_dinh_dang_ma` / `suy_kho_va_phoi`. **Đo lại: chỉ 430/10.102 mã lọt 4 khuôn hiện hành**; 9.672 mã bị loại vì đoạn thứ 2 là mã vật liệu chứ không phải mã tình trạng phôi (NC/LC/TN/TL/PT/PL) |
| 29 | **Kho Hàng lẻ** (C) | Bảng dữ liệu gốc — 1.465 dòng: TÊN HÀNG - QUY CÁCH → MÃ VT. Đoạn 2 đúng chuẩn tình trạng phôi (TL 475 · PL 32 · TN 2) | THIẾU MỘT PHẦN | Như trên. **Đo lại: 956/1.465 dòng (65%) mã = "0" tức chưa được cấp mã; 509 dòng có mã thì 0 dòng lọt khuôn** vì số thứ tự chỉ 2 chữ số (nới về `\d{2,}` thì 203 dòng lọt) |
| 30 | **Kho PO** (C) | Bảng dữ liệu gốc — 76 dòng: TÊN HÀNG - QUY CÁCH → MÃ VT dạng "VT SX nn" | THIẾU MỘT PHẦN | Như trên. **Đo lại: 0/76 lọt khuôn** — dùng khoảng trắng thay dấu gạch nối và số thứ tự 2 chữ số, trong khi `RE_SX` đòi `VT-SX-\d{3,}` |

**I. Tiện ích tính toán**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 31 | **CONG THUC** (A) | Vùng nháp — máy tính khối lượng và tiền vật liệu tấm; 22 dòng, mỗi dòng một lần bấm máy | THIẾU MỘT PHẦN | `services/may_tinh_vat_lieu.py`; `VAT_LIEU_TINH_TOAN` (8 vật liệu, mig 005 dòng 250); màn hình `tien_ich`; docs/F12 §1. Công thức khối lượng và thành tiền **khớp hoàn toàn** |
| 32 | **LAZER** (A) | Vùng nháp — khối lượng, thể tích, diện tích cho 3 hình dạng + bảng đơn giá cắt lazer theo độ dày + bảng tốc độ cắt | THIẾU MỘT PHẦN | `may_tinh_vat_lieu.HINH_DANG = ('TAM','TRON_DAC','ONG')` khớp đúng 3 hình dạng; đơn giá tham khảo ở mig 016; docs/F12 §1 ghi thẳng "thay sheet CONG THUC và LAZER" |

**J. Điều xe**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 33 | **LIST DIEU XE DI SG** (A) | Sổ theo dõi kiêm bảng kê in "Bảng kê chi tiết lấy hàng" tuyến Sài Gòn; 9 điểm dừng/20 dòng; 3 cột liên hệ VLOOKUP không bọc IFERROR | THIẾU MỘT PHẦN | `DIEU_XE` + `DIEU_XE_DONG` + `XE` + `TAI_XE`; màn hình `dieu_xe`; `in_pdf.lich_dieu_xe`; BC09; docs/F07 |
| 34 | **LIST DIEU XE DI BH** (A) | Sổ theo dõi kiêm NGUỒN cho biểu mẫu in, tuyến Biên Hoà; 14 cột (thêm kích thước, số lượng, người điều xe, ngày điều xe, ngày đi, số phiếu ĐX) + vùng phụ gom theo LOẠI XE | THIẾU MỘT PHẦN | Như trên; `dieu_xe.lich_theo_xe/lich_theo_tai_xe`; số phiếu cũ giữ ở `DIEU_XE.SO_PHIEU_CU` |
| 35 | **ĐIỀU XE (QT-KV-01-BM01)** (A) | Biểu mẫu in "Phiếu yêu cầu điều xe" (ver 01, hiệu lực 30/01/2026); 25 dòng toàn VLOOKUP về LIST DIEU XE DI BH | THIẾU MỘT PHẦN | `in_pdf.py::phieu_dieu_xe` (dòng 313, docstring ghi "Mẫu QT-KV-01-BM01"); `GET /dieu-xe/{id}/in`; docs/F07 §4.5 |
| 36 | **Quản lý điều xe** (B) | Bảng dữ liệu gốc — sổ nhập liệu chính của điều xe (bảng QLDX, ~685 chuyến, 24 cột) | THIẾU MỘT PHẦN | `DIEU_XE` + `DIEU_XE_DONG` (mig 014); `services/dieu_xe.py`; màn hình `dieu_xe` tab "Yêu cầu"/"Lịch ngày"; BC09 |
| 37 | **Lịch điều xe** (B) | Báo cáo — pivot lịch chạy MỘT ngày, kèm hai nút macro (về sổ, in phiếu) | THIẾU MỘT PHẦN | `GET /dieu-xe/lich` → `dieu_xe.lich_theo_xe`; `GET /dieu-xe/lich/in` → `in_pdf.lich_dieu_xe` |
| 38 | **Phiếu điều xe** (B) | Biểu mẫu in QT-KV-01-BM01 — 8 khối phiếu (206 dòng) đổ bằng VLOOKUP, macro `xuatpdfncr` xuất PDF hàng loạt | THIẾU MỘT PHẦN | `GET /dieu-xe/{id}/in` → `in_pdf.phieu_dieu_xe` |
| 39 | **Lịch làm việc tài xế-1** (B, ẩn) | Báo cáo — pivot gom lịch một ngày theo TÀI XẾ để in giao đầu ngày; ngày = TODAY()+1 | THIẾU MỘT PHẦN | `GET /dieu-xe/lich-tai-xe` → `dieu_xe.lich_theo_tai_xe`; màn hình `dieu_xe` tab "Lịch tài xế" |
| 40 | **Thống kê** (B, ẩn) | Báo cáo — pivot: dòng = Tài xế × Đối tác, cột = Khu vực × Hạng mục, giá trị = Tổng Số Km | THIẾU MỘT PHẦN | `GET /dieu-xe/thong-ke` → `repo_dieu_xe.thong_ke`; BC09 (`_bc09` gọi lại đúng hàm này) |
| 41 | **Quy trình** (B, ẩn) | Tài liệu quy trình — 5 bước × 4 luồng (Mua hàng · Giao hàng · Gia công ngoài · Khác) | THIẾU MỘT PHẦN | docs/F07 §2 (DX-01); chuỗi `dieu_xe.tao → xep_lich → xac_nhan`; 4 luồng thay bằng cột `HANG_MUC` (7 giá trị) |
| 42 | **Quy Trình điều vận** (B, ẩn) | Tài liệu quy trình — sơ đồ 5 bước vẽ bằng shape, mốc giờ chuyển thông tin, gán tên 3 tài xế cố định | THIẾU MỘT PHẦN | docs/F07 §2; tham số `GIO_CHOT_DIEU_XE` + luồng `CHO_DUYET_NGOAI_LE` (`dieu_xe.tao/duyet_ngoai_le`) |

**K. Gia công ngoài**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 43 | **Quản lý GCN** (B) | Bảng dữ liệu gốc — sổ cái gia công ngoài của cả công ty; 6.051 dòng, 33 cột, ~88.400 ô công thức, 14 công thức lặp trên mọi dòng | THIẾU MỘT PHẦN | `DE_NGHI(+DONG)` LOẠI='GIA_CONG_NGOAI' → `BAO_GIA` → `DON_HANG(+DONG)` → `NHAN_HANG(+DONG)`; view `V_TINH_TRANG_MA_HANG`; màn hình `de_nghi`/`bao_gia`/`don_hang`/`giao_nhan`. **KHÔNG phải** bảng `DAT_NGOAI*`/màn hình `dat_ngoai` (docs/F06 §1 là nghiệp vụ khác) |
| 44 | **Báo cáo ngày GCN** (B) | Báo cáo + biểu mẫu in — danh sách phiếu GCN đang chạy (135 dòng hiện), 15 cột VLOOKUP, cột "Lọc In" đánh dấu v | THIẾU MỘT PHẦN | BC02 (`_bc02` → `bc02_tien_do_giao_hang` trên `V_TINH_TRANG_MA_HANG`) + màn hình `bao_cao` |
| 45 | **Báo cáo tuần GCN** (B) | Báo cáo — pivot Ngành nghề × Tình trạng NCC (sớm/đúng/trễ), lọc theo TUẦN; bên phải là bảng ba tỷ lệ | THIẾU MỘT PHẦN | BC05 khối `theo_nganh_nghe` (`bc05_chat_luong_ncc`), gom theo `NHA_CUNG_CAP.NGANH_NGHE` |
| 46 | **BÁO CÁO HÀNG KHẨN CẤP** (B) | Báo cáo — 12 tháng × (tổng phiếu · số phiếu khẩn cấp theo từng lãnh đạo duyệt · tỉ lệ). Số tổng nhập tay, chỉ 2 cột tỉ lệ có công thức | THIẾU MỘT PHẦN | BC08 (`bc08_hang_khan_cap`, lọc `TINH_TRANG_YC IN ('HANG_KHAN_CAP','KHAN_CAP_NG')`) |
| 47 | **Theo dõi PGH làm đen** (B) | Sổ theo dõi + biểu mẫu in riêng hạng mục "Làm đen", tính theo TỔNG SỐ KG; 344 dòng; vùng lọc in bên phải | THIẾU MỘT PHẦN | Có thể lưu như đề nghị GCN: `DE_NGHI(+DONG)` với `DVT_CHUP='kg'`. **Nhưng `LOAI_GIA_CONG` không có mã "Làm đen"** — đo lại trên workbook C: 917 dòng |
| 48 | **CHI PHÍ STĐ XK** (B) | Sổ theo dõi — 29 dòng, chi phí sơn tĩnh điện cho hàng xuất khẩu: ngày giao · nội dung gắn số phiếu xuất kho · thành tiền. Nhập tay hoàn toàn | THIẾU MỘT PHẦN | `DON_HANG.GIA_TRI_TRUOC_VAT` + `DON_HANG_DONG.DON_GIA_CO_SO`; thanh toán ở `YEU_CAU_THANH_TOAN` + `DOT_THANH_TOAN` |

**L. Khối tiêu đề tài liệu ISO (3 sheet mới soi)**

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 49 | **Logo HĐ** (B) | **Không phải sheet rác.** Khuôn tiêu đề (letterhead) dùng lại cho các báo cáo: tên công ty · trụ sở · chi nhánh · ô "Mã hiệu" (GCN-23-02) · ô "Ngày phát hành" (01/01/2023) · tên báo cáo · mức bảo mật "Sử dụng nội bộ" · 1 ảnh logo · 7 vùng gộp ô. Còn chứa tiêu đề "BÁO CÁO TỒN ĐỘNG GIA CÔNG NGOÀI" | THIẾU MỘT PHẦN | `in_pdf.py` có `_dau_trang` và hằng `TEN_CONG_TY = 'CÔNG TY TNHH HUỲNH ĐỨC'` **gắn cứng ở dòng 44**. Không có tham số hệ thống nào cho mã hiệu tài liệu, phiên bản, ngày phát hành, mức bảo mật, địa chỉ trụ sở/chi nhánh, logo |
| 50 | **Logo HĐ (2)** (B) | Khuôn tiêu đề thứ hai (mã hiệu QC-23-01, tên "QUẢN LÝ CÔNG ĐOẠN HÀNG ĐÃ GIAO QC"), 3 ảnh, 8 vùng gộp; **kèm hướng dẫn 6 bước NHẬP PHÔI và 3 bước XUẤT PHÔI theo mã vạch** | THIẾU MỘT PHẦN | Phần tiêu đề: như trên. Phần nhập/xuất phôi theo mã vạch: hệ thống có `TON_KHO` (mig 023) và `VAT_TU.LOAI_PHOI` nhưng **không có màn hình nhập/xuất phôi theo mã vạch** — grep "PHOI" chỉ ra `vat_tu.py` và mig 005 |
| 51 | **Logo HĐ (3)** (B) | Khuôn tiêu đề thứ ba — mang tiêu đề "BẢNG KIỂM TRA CHẤT LƯỢNG XỬ LÝ BỀ MẶT" đứng tên một nhà cung cấp xử lý bề mặt, tức biểu mẫu QC của NCC được kẹp vào hồ sơ | THIẾU MỘT PHẦN | Gần nhất là `KET_QUA_IQC` + `HANG_KHONG_PHU_HOP`, nhưng không có chỗ đính kèm / lưu biểu mẫu QC do NCC phát hành |

### 1.3 — KHÔNG CẦN (2 sheet)

| # | Sheet (WB) | Vai trò | Mức phủ | Nơi phủ trong hệ thống |
|---|---|---|---|---|
| 52 | **XÁC NHẬN THÔNG TIN NHƯ** (A) | Bản sao cá nhân của một NV mua hàng — trùng khít 10/10 mẫu công thức với "XÁC NHẬN THÔNG TIN"; thực tế dùng làm sổ riêng các dòng đã HỦY (cột J điền sẵn "HỦY" cho cả 10 dòng trống) | KHÔNG CẦN | Thay bằng bộ lọc `DE_NGHI.NGUOI_MUA_HANG` + `TRANG_THAI_DONG='HUY'` trên màn hình `de_nghi`. Nhưng phải bảo đảm hai điều để không ai còn cần bản sao: bộ lọc "chỉ dòng tôi phụ trách" và xem được lý do huỷ (`YEU_CAU_HUY`) |
| 53 | **MENU** (B) | Trang điều hướng — không có ô dữ liệu, chỉ ảnh và 7 nút hình chữ nhật | KHÔNG CẦN | Màn hình `home` + thanh điều hướng 14 màn hình (`frontend/index.html`, `app.js`) |

---

## 2. TÓM TẮT BỐN CÂU HỎI

### (1) Có sót sheet nào không?

**Có — sót đúng 8 sheet, nay đã soi xong và đưa vào bảng trên.** Sáu người báo cáo 45 sheet; ba workbook cộng lại là 53. Tám sheet bị bỏ qua gồm:

**Ba sheet của workbook B mang tên "Logo HĐ", "Logo HĐ (2)", "Logo HĐ (3)"** — bị bỏ vì tên gợi ý là ảnh trang trí. Thực tế đây là **khuôn tiêu đề tài liệu ISO dùng lại** cho các báo cáo: tên công ty, trụ sở và chi nhánh, ô "Mã hiệu" (GCN-23-02, QC-23-01), ô "Ngày phát hành" (01/01/2023), tên báo cáo, dấu mức bảo mật "Sử dụng nội bộ", cộng logo dạng ảnh. Đây chính là thứ mà **năm người khác nhau đã ghi "khối tiêu đề biểu mẫu (Mã tài liệu · Phiên bản · Ngày hiệu lực · Số trang) chưa có nơi lưu"** — nay đã tìm ra nguồn gốc và mẫu chuẩn của nó. Ngoài ra "Logo HĐ (2)" còn chứa hướng dẫn thao tác **nhập phôi / xuất phôi theo mã vạch** (6 bước nhập, 3 bước xuất) — một nghiệp vụ kho chưa có màn hình nào, và "Logo HĐ (3)" chứa biểu mẫu kiểm tra chất lượng xử lý bề mặt do một nhà cung cấp phát hành.

**Năm sheet của workbook C — "Danh mục Tên hàng (Mua hàng + Gia công ngoài + Kho).xlsx"** — bị bỏ nguyên tệp: `Mua hàng`, `Gia công ngoài`, `Kho Vật tư PO`, `Kho Hàng lẻ`, `Kho PO`. Đây là tệp **quan trọng nhất cho việc nạp dữ liệu**, vì nó là toàn bộ danh mục tên hàng và mã vật tư đang lưu hành. Kết quả đo trực tiếp:

| Sheet | Dòng | Nội dung | Phát hiện chính |
|---|---|---|---|
| Mua hàng | 12.028 | TÊN HÀNG · TÊN QUY ĐỔI | 9.620 tên duy nhất, 2.408 dòng trùng tên → `VAT_TU.TEN_HANG UNIQUE` sẽ chặn khi nạp; chỉ 750 dòng (6,2%) có TÊN QUY ĐỔI và **không có cột nào ở cấp danh mục để chứa nó** |
| Gia công ngoài | 6.107 | CÔNG VIỆC · NGƯỜI YÊU CẦU · khoá ghép · TÊN HÀNG · MÃ VẠCH · QUY CÁCH · NỘI DUNG GIA CÔNG | 41 giá trị CÔNG VIỆC, chỉ 15 ánh xạ được vào 14 mã `LOAI_GIA_CONG`; **1.068 dòng thuộc 26 giá trị chưa có mã**, dẫn đầu LÀM ĐEN 917 dòng, sau đó CẮT PHÔI 37, BỌC PU 25, BẮN CÁT 11, CẮT LASER + CHẤN 11, IN LỤA 5, SƠN ĐIỆN DI 2, XỬ LÝ PHOTPHAT 2, MẠ KẼM NHÚNG NÓNG 1… và **cả một nhóm "sửa chữa máy móc" (~30 dòng, 8 biến thể) hoàn toàn không có mã và không có số ngày chuẩn** |
| Kho Vật tư PO | 10.102 | TÊN HÀNG · MÃ-VT | Chỉ **430 mã lọt 4 khuôn** trong `vat_tu.CAC_KHUON`; 9.672 mã dùng khuôn VT-[nhóm vật liệu]-[stt] (ST · IN · TMC · GC · ELI · LK · POL · PK · KM · DO · HC) mà quy định QT-KV-01-PL02 không định nghĩa và mã nguồn không chấp nhận |
| Kho Hàng lẻ | 1.465 | TÊN HÀNG - QUY CÁCH · MÃ VT | **956 dòng (65%) mã ghi "0" tức chưa được cấp mã**; 509 dòng có mã đều đúng khuôn tình trạng phôi (TL/PL/TN) nhưng **0 dòng lọt** vì số thứ tự chỉ 2 chữ số |
| Kho PO | 76 | TÊN HÀNG - QUY CÁCH · MÃ VT | 76/76 ghi dạng "VT SX nn" — khoảng trắng thay gạch nối, 2 chữ số → **0 dòng lọt** |

Đối chiếu thêm với văn bản gốc **"2. (QT-KV-01-PL02) QUY ĐỊNH ĐẶT MÃ VẬT TƯ.docx"**: quy định ghi rõ "[STT]: Số thứ tự **bắt đầu từ 01**" và mọi ví dụ đều 2 chữ số (TH-VP-01 · VT NC SUS201 HO 01 · TL-MK-HSS-01), trong khi `vat_tu.py` ép `\d{3}`. Quy định còn có **kho thứ tư — Kho thành phẩm, mã = chính mã vạch sản phẩm** — mã nguồn không có khuôn nào cho nó. Và quy định dùng tiền tố **TH cho "Kho vật tư tiêu hao"**, còn seed `KHO` ở mig 023 dòng 48 lại đặt `('TH','Kho thành phẩm')` và `('TL','Kho tồn linh tinh')` (quy định: TL = Kho tools) — **ba tên kho lệch nhau giữa quy định và cơ sở dữ liệu.**

### (2) Logic cốt lõi nào chưa được thể hiện?

**Mua hàng — theo dõi tiến độ.** Bốn lỗi cùng nằm ở một chỗ. (a) **SNGH của dòng ĐÃ NHẬN bị tính lại theo hôm nay**: Excel `=IF(NGÀY NHẬP="", KỲ HẠN YC−TODAY(), KỲ HẠN YC−NGÀY NHẬP)` — nhận rồi thì số đóng băng; `don_hang.tien_do` gọi `so_ngay_som_tre(h.KY_HAN_YC, conn=conn)` không truyền `ngay_nhan` và truy vấn `repo_don_hang.tien_do` thậm chí không SELECT ngày nhận, nên dòng đã giao đúng hạn cứ mỗi ngày lại âm thêm một đơn vị; view `V_TINH_TRANG_MA_HANG` lại làm đúng → **hai màn hình cho hai con số khác nhau trên cùng một dòng**. (b) **Đơn vị đo đổi âm thầm**: Excel đếm ngày lịch, hệ thống đếm ngày làm việc (`lich_lam_viec.so_ngay_lam_viec_giua`) — cải tiến có chủ ý nhưng không ghi chú trên giao diện. (c) **Dấu của số ngày trễ có ba quy ước trong một hệ thống**: Excel/`NHAN_HANG_DONG.SO_NGAY_SOM_TRE` âm là trễ, `V_TINH_TRANG_MA_HANG.SO_NGAY_TRE_LICH` dương là trễ, lại thêm hai đơn vị (ngày lịch ở BC03, ngày làm việc ở `giao_nhan._tinh_som_tre`). (d) **NGƯỜI MUA HÀNG chỉ có ở cấp phiếu**: đo trên Excel, 242/739 phiếu ĐNVT đang chạy (33%) và 279/794 phiếu lưu trữ (35%) có từ hai NV mua hàng trở lên trên cùng một phiếu; `don_hang.giao_viec()` còn ghi đè `NGUOI_MUA_HANG` cho cả phiếu qua `repo_de_nghi.cap_nhat_de_nghi`, nên giao một dòng cho người khác là đổi luôn người phụ trách của mọi dòng còn lại.

**Ràng buộc danh mục.** `DE_NGHI_DONG.MA_CHUNG_LOAI` và `MUC_DICH_SU_DUNG` khai VARCHAR(20) **không có REFERENCES** (mig 007) và `services/de_nghi.py` chỉ lấy chuỗi thô; chỉ ĐVT được kiểm qua `catalog_service.kiem_dvt`. Hậu quả đo được trên Excel: ĐVT có ≥12 biến thể, MỤC ĐÍCH SỬ DỤNG lẫn ký tự xuống dòng, MÃ VẬT TƯ bị gõ nhầm thành chủng loại. Hai bảng `CHUNG_LOAI` (27 mã) và `MUC_DICH_SU_DUNG` (12 mã) đã có sẵn — chỉ thiếu khoá ngoại và bước kiểm.

**Lệnh mua hàng.** Quy tắc đánh mã tài liệu ghi ngay trong ô L1 của sheet: `NNN/MMYYYY/ĐN/MH`, bộ đếm **reset theo THÁNG**. Hệ thống chỉ sinh `LMH-2026-000089` và `BO_DEM_CHUNG_TU` chỉ có ba cột (TIEN_TO, NAM, SO_HIEN_TAI) — **đếm theo NĂM nên không sinh nổi số theo tháng**; cột `CONG_VIEC.SO_PHIEU_CU` có sẵn nhưng `giao_viec()` không bao giờ ghi vào.

**Báo giá.** **Luật trừ một ngày** — ô E9 của BM04 là `=VLOOKUP($G9,TDDH[],22,0)−1`: kỳ hạn ghi trên phiếu hỏi giá = kỳ hạn YC trừ 1 ngày để chừa thời gian hàng về. `bao_gia.tao_yeu_cau_bao_gia()` chép nguyên `dong.KY_HAN_YC` → **NCC được hẹn muộn hơn Excel đúng một ngày**. Cùng chỗ đó, `repo.tao_ycbg_dong()` không bao giờ được truyền `dong.GHI_CHU` (xem `bao_gia.py` ~dòng 136–146) nên ghi chú kỹ thuật rơi mất khi đi hỏi giá, trong khi Excel in nó ra.

**Đơn đặt hàng.** **Luật tên quy đổi** (ô B12): in cho NCC thì ưu tiên tên NCC hiểu, không có mới lấy tên nội bộ. Cột `DON_HANG_DONG.TEN_NCC_GHI_TREN_CHUNG_TU` đã có (mig 010 dòng 160) nhưng `in_pdf.py::don_hang()` in thẳng `TEN_HANG_CHUP`. Thiếu tiếp: khối CỘNG / THUẾ VAT / TỔNG CỘNG tách ba dòng; câu tự đổi theo VAT (`IF(K59>0,"Đơn giá chưa bao gồm VAT","Đơn giá trên đã bao gồm VAT")`); dòng địa điểm-ngày tháng lấy theo ngày đặt hàng; ghi chú từng dòng. Và **thuế suất lệch**: Excel gắn cứng 8%, tham số `VAT_SUAT` mặc định 10.

**Giao nhận.** `repo_giao_hang_noi_bo.py::lay_dong()` chỉ SELECT cột của chính `GIAO_HANG_NOI_BO_DONG`, không nối sang `DE_NGHI/DE_NGHI_DONG`, nên sáu cột của biểu mẫu (Người yêu cầu, Số phiếu ĐNVT, Mã vật tư, Số lượng đặt hàng, Lệnh sản xuất, Mã vạch) **có chỗ chứa mà không lấy ra được**. Luật tên quy đổi ở phiếu nội bộ phải **ngược chiều** với đơn đặt hàng (kho cần tên nội bộ) — chưa có luật nào. Luật chọn khổ giấy theo số dòng (A5 ít dòng / A4 nhiều dòng) đã được docs/F05 §4.4 chốt bỏ, cần xác nhận lại với Kho vận.

**Thanh toán.** **Luật tính số tiền đợt theo tỷ lệ**: cột "Thanh toán lần 1" = `[Giá trị đơn hàng] × 50%`, tỷ lệ lấy đúng từ HÌNH THỨC THANH TOÁN (30/40/50/60/70/100%). Hệ thống lưu `HINH_THUC_THANH_TOAN` là varchar(200) tự do, `SO_TIEN` mỗi đợt gõ tay và **không đối chiếu với tỷ lệ**; chỉ kiểm tổng không vượt giá trị đơn (TT-03). Ba danh mục `LY_DO_THANH_TOAN`, `HINH_THUC_THANH_TOAN`, `LY_DO_YEU_CAU` mà docs/F08 §4 đã chốt "quản lý ở F10, Admin sửa được, không hardcode" **chưa được khai** trong `danh_muc_dinh_nghia.py`. Và `YEU_CAU_THANH_TOAN` chỉ có `ID_DON_HANG` (cấp phiếu), **không có `ID_DON_HANG_DONG`**, trong khi cả sổ lẫn phiếu in đều làm việc ở cấp dòng hàng.

**Gia công ngoài — ba luật kỳ hạn.** (a) **GCN-02 chưa đúng thực tế**: Excel `T5 = VLOOKUP(NHÀ CUNG CẤP, 'Danh mục thông tin KH&NCC', 11, 0)` — số ngày RIÊNG của từng NCC thắng trước; docs/04 GCN-02 và docs/02 §6 cũng viết `COALESCE(NHA_CUNG_CAP.KY_HAN_QUY_DINH, LOAI_GIA_CONG.SO_NGAY_CHUAN)`; nhưng `de_nghi.py::so_ngay_gia_cong` chỉ đọc `so_ngay_thong_nhat_ncc` → `LOAI_GIA_CONG.SO_NGAY_CHUAN` → tham số `SO_NGAY_CHUAN_GCN`, **không hề đọc `NHA_CUNG_CAP.KY_HAN_QUY_DINH`** dù cột đó tồn tại và màn hình NCC vẫn cho nhập. (b) **GCN-01**: Excel `U = H + T` tính từ **NGÀY GỬI HÀNG ĐI**; hệ thống tính từ `NGAY_HIEU_LUC` của đề nghị. (c) **GCN-03**: sheet THỜI GIAN GC-1 quy định thêm 1 ngày đưa hàng đi trước và 1 ngày giao lại cho sản xuất sau; `ngay_du_kien_ve()` chỉ cộng số ngày gia công. Thêm: luật **"Sai QT"** (`IF(SỐ NGÀY < KỲ HẠN QUY ĐỊNH, "Sai QT", "Đúng QT")` — 5.055/6.051 dòng = 83,5% đang Sai QT) chỉ tương đương một phần với `BAT_KHA_THI` + DN-10, và không áp cho phiếu gia công lập thẳng không qua đề nghị.

**Điều xe — hai công thức số học bị mất.** (a) **Số Km = Km(danh mục) × Số chuyến** (công thức Q4). `dieu_xe._doi_tac` chép thẳng `ncc.SO_KM` vào `DIEU_XE.SO_KM` mà không nhân số chuyến → **mọi tổng km ở BC09 thấp hơn thực tế với chuyến đi 2–3 lượt**. Kèm theo đó, cột `SO_CHUYEN` tồn tại trong CSDL nhưng `ThanTao/ThanSua` không khai, `services.tao()/sua()` không ánh xạ, biểu mẫu không có ô → luôn nằm ở mặc định 1. (b) **Thời gian tới nơi = (Số Km ÷ 40 km/h) × 60, cộng 10 phút dự phòng** — chưa có công thức, chưa có tham số "tốc độ trung bình" và "phút đệm" trong `THAM_SO_HE_THONG`. (c) **Giờ chốt lệch**: sơ đồ "Quy Trình điều vận" ghi ba lần "trước 16h00", hệ thống đặt `GIO_CHOT_DIEU_XE` mặc định **15:45** → phiếu gửi trong khoảng 15:45–16:00 bị đẩy nhầm sang ngày làm việc kế tiếp. (d) **Lịch mặc định phải là NGÀY MAI** (`E3 = TODAY()+1`), API `/dieu-xe/lich` mặc định hôm nay. (e) **Một chuyến — nhiều điểm dừng**: sheet cho mỗi DÒNG một nhà cung cấp, một địa chỉ và một số tiền phải trả riêng (tuyến Sài Gòn ghé 9 nơi trên một xe); `DIEU_XE` chỉ có một `ID_DOI_TAC`, một `DIA_CHI`, một `SO_TIEN_THANH_TOAN` ở đầu phiếu và `DIEU_XE_DONG` không có ba cột đó — đây là lỗ hổng **cấu trúc**, không phải lỗ hổng hiển thị.

**Điều xe — cảnh báo ánh xạ dữ liệu cũ (bắt buộc đọc trước khi nạp).** Ba công thức tra ngược ở "Quản lý điều xe" đang lệch cột so với nhãn của chúng: cột O nhãn "Vùng" thật ra lấy cột **Khu vực**; cột U nhãn "Người liên hệ" lấy cột **Số km**; cột V nhãn "STĐ" lấy cột **Người liên hệ**. **685 dòng dữ liệu vì thế mang nhãn sai — khi nạp phải ánh xạ theo CÔNG THỨC, tuyệt đối không theo tên cột.**

**Tiện ích tính toán.** Thiếu `CONCATENATE(A," (",B,"*",C,"*",D,"mm",")")` — luật sinh QUY CÁCH chuẩn từ kích thước, tức cách sheet ép mọi người viết quy cách giống nhau; máy tính không đẩy quy cách sang dòng chứng từ nên DM-02 sẽ phải đi dọn tên trùng về sau. Thiếu chiều ngược của VAT (`Đơn giá × 10% + Đơn giá` — tính giá đã gồm VAT từ giá chưa VAT); thiếu **diện tích bề mặt** cho cả 3 hình dạng (dùng để tính tiền sơn, xi mạ, cắt theo m²); thiếu bảng **đơn giá cắt lazer theo độ dày** và bảng **tốc độ cắt theo độ dày**; ống ở Excel nhập phi + dài + dày còn hệ thống bắt nhập đường kính ngoài + trong (đúng hơn về toán nhưng người cầm bản vẽ "phi 60 dày 2" phải tự nhẩm). Hệ số **1,2** ở ô N53/N55 (hao hụt hay phụ phí?) chưa có tham số tương ứng — cần hỏi để chốt.

**Lưu trữ.** Excel cắt sang kho lưu trữ theo **TRẠNG THÁI** (đã đặt + đã giao, bất kể thời gian); `luu_tru.THU_TU_LUU_TRU` cắt theo **MỐC THỜI GIAN**. Nếu theo ngày thì thao tác quen thuộc "giao xong là cắt xuống TONG HOP" biến mất. Thêm: Excel **đóng băng số tiền** (sổ lưu trữ chỉ còn 2 ô có công thức THÀNH TIỀN), hệ thống theo DH-02 cố ý không lưu `THANH_TIEN/TONG_TIEN` mà tính lại mỗi lần đọc → **một lần sửa đơn giá sẽ làm đổi cả số liệu quá khứ**.

**Luật in chung cho mọi biểu mẫu.** Excel bọc mọi ô bằng `LET(..., IFERROR(IF(x=0,"",x),""))` — "0 hoặc không tra được thì để TRỐNG". Hệ thống chưa có quy ước tương ứng khi xuất tệp trong `bao_cao.py`: số 0 và ô trống sẽ hiện như nhau. (Riêng phần `#N/A` thì `in_pdf` đã sửa đúng — chỉ in số dòng có thật.)

**Danh mục và mã vật tư (từ workbook C).** Khuôn mã trong `vat_tu.CAC_KHUON` đòi `\d{3}` trong khi quy định QT-KV-01-PL02 ghi "bắt đầu từ 01" và mọi ví dụ đều 2 chữ số; khuôn không có dạng **VT-[nhóm vật liệu]-[stt]** mà 9.672 mã kho đang dùng; không có khuôn cho **Kho thành phẩm = mã vạch**; tên ba kho trong seed `KHO` lệch với quy định. Danh mục `LOAI_GIA_CONG` thiếu 26 giá trị công việc đang chạy thật (1.068 dòng). Không có chỗ chứa cấp danh mục cho **TÊN QUY ĐỔI** (750 dòng): `DON_HANG_DONG.TEN_NCC_GHI_TREN_CHUNG_TU` là cấp dòng đơn hàng nên phải gõ lại mỗi lần đặt.

### (3) Báo cáo nào của Excel chưa có tương đương?

Nhóm theo cụm, mỗi dòng là một báo cáo người dùng **đang dùng thật** mà bộ BC01–BC10 không trả lời được:

**Mua hàng**
1. Thống kê mua hàng theo **CHỦNG LOẠI** (27 chủng loại). Grep `MA_CHUNG_LOAI` trong `repo_bao_cao.py` và `bao_cao.py`: 0 kết quả.
2. Thống kê theo **MỤC ĐÍCH SỬ DỤNG** (NVL · VTTH · CCDC · CPX · QLDN · TSCĐ…) — mã phân bổ chi phí kế toán, 57% dòng Excel có điền. Grep: 0 kết quả.
3. **Giá trị mua hàng theo NHÀ CUNG CẤP theo kỳ** — BC05 chỉ đo tỷ lệ đúng hạn/IQC/hàng không phù hợp, không có cột tiền, trong khi Excel pivot được từ cột THÀNH TIỀN.
4. **Báo cáo/nhóm theo TUẦN** — hệ thống chỉ có `_khoang_thang` và `xu_huong_thang`. Người dùng đang gọi tên "tuần 34".
5. **Bảng ba nhóm Sớm hạn · Đúng hạn · Trễ hạn kèm dòng tổng** (sheet Trang thai ma 1722) — BC02 gộp "sớm" với "đúng" thành một, `kpi_cop03` cũng chỉ ra một tỷ lệ.
6. **Tra cứu lịch sử mua hàng theo mã hàng / NCC xuyên qua cả dữ liệu đang chạy lẫn đã lưu trữ** — công dụng chính của sheet TONG HOP; `luu_tru.tra_cuu_kho` chỉ nhận `loc['id']`, không tra được theo tên hàng, NCC, lệnh sản xuất hay khoảng ngày, và lại nằm trong màn hình `quan_tri`.
7. **Báo cáo tổng kết kỳ trên dữ liệu đã hoàn tất** — dòng đã chuyển sang schema `luu_tru` biến mất khỏi BC01–BC03 mà không có cảnh báo nào.
8. **BC04 chỉ chạy MỘT ngày** (`loc['ngay']`) trong khi sheet thật đang giữ 301 dòng trải từ 19/06 đến 22/08 — người dùng đang xài như báo cáo THEO KHOẢNG. Và BC04 thiếu 10/17 cột của sheet.
9. **BC03 thiếu cột GHI CHÚ** — cột quan trọng nhất vì nó ghi LÝ DO tồn đọng ("hết hàng", "chờ xác nhận số lượng", "chưa tìm được đơn vị"). View `V_TINH_TRANG_MA_HANG` không có cột ghi chú nào → **báo cáo tồn đọng không nói được vì sao tồn**.
10. **Sổ theo dõi lệnh mua hàng đã phát trong tháng** — `don_hang.thong_ke_giao_viec` đã viết xong ở backend nhưng không màn hình nào hiển thị. Cũng không đo được năng suất theo LỆNH (BC06 đo theo NGƯỜI và giới hạn 4 vai trò).
11. **Bảng tổng hợp hàng đợi của TOÀN BỘ nhân viên mua hàng** — `repo.thong_ke_nhan_vien` có, màn hình không có.
12. **Bản in / xuất tệp cho hàng đợi việc cá nhân** (NV mua hàng đang in sheet LMH THIEN mang theo khi đi mua).

**Báo giá — xác nhận — huỷ**
13. **Sổ "YCBG đã gửi mà NCC chưa trả lời / quá HAN_TRA_LOI"** — cột `HAN_TRA_LOI` và `NGAY_GUI` đã có, không báo cáo nào dựng trên chúng.
14. **Thống kê khối lượng và thời gian xử lý xác nhận kỹ thuật** (bao nhiêu dòng chờ, chờ bao lâu, ai tồn nhiều nhất).
15. **Sổ các dòng đề nghị bị HỦY theo người mua hàng và theo lý do** — `YEU_CAU_HUY` đủ dữ liệu; BC07 chỉ đo "bất khả thi", khác với "bị huỷ".
16. **Không in / không kết xuất được danh sách chờ xác nhận kỹ thuật** (Excel đang in tờ này đưa Kỹ thuật ký tay).

**Nhà cung cấp**
17. **Danh mục NCC được phê duyệt (BM03)** chưa nằm trong BC01–BC10 — chỉ tồn tại dạng JSON qua `/nha-cung-cap/tai-xuong`, chưa có bản in PDF, chưa có CSV, và **giao diện không hề gọi endpoint đó** (grep "tai-xuong" trong `frontend/` chỉ ra `bao_cao.js`).
18. **Xuất danh bạ NCC ĐẦY ĐỦ** — `/tai-xuong` chỉ lấy NCC đã phê duyệt và đang hoạt động, không thay được sheet NCC 800 dòng vốn liệt kê cả NCC chưa duyệt / ngừng giao dịch.
19. **Bản in "Sổ theo dõi tình trạng nhà cung cấp" đúng khổ QT-MH-01-BM08** (đủ 9 cột, có khối tiêu đề mã tài liệu · phiên bản · ngày hiệu lực · số trang).

**Thanh toán**
20. **Toàn bộ mảng thanh toán không có báo cáo nào**: BC01–BC10 không có báo cáo thanh toán; màn hình `thanh_toan` không nằm trong `bao_cao.BAO_CAO` nên không xuất được CSV/Excel/PDF.
21. **Bảng công nợ đến hạn theo NCC và theo kỳ hạn** — chỉ có tab "Quá hạn" đếm số phiếu đã trễ.
22. **Sổ bàn giao chứng từ theo kỳ** (đã bàn giao bao nhiêu, còn tồn bao nhiêu, tồn bao lâu) — dữ liệu đủ (`NHAN_HANG.NGAY_BAN_GIAO_CHUNG_TU` + `/nhan-hang/chua-ban-giao`) nhưng chỉ là danh sách trên màn hình. Cộng thêm: **báo cáo bàn giao chứng từ** nói chung (27% dòng sổ đang chạy và 91% dòng sổ lưu trữ có ngày bàn giao).

**Gia công ngoài**
23. **Danh sách gia công ngoài trong ngày** — BC02 **không lọc được theo `LOAI='GIA_CONG_NGOAI'`**, trộn chung mua hàng với gia công; và thiếu 4 cột (Đơn vị gia công · Nội dung gia công · Kỳ hạn quy định · Đúng/Sai QT · Trả lời kỳ hạn).
24. **Báo cáo tuần GCN theo ngành nghề × ba bậc sớm/đúng/trễ kèm ba tỷ lệ** — BC05 chỉ có hai bậc (`SO_NGAY_SOM_TRE >= 0` và phần còn lại), không lọc theo tuần, và không tách được riêng phần gia công ngoài (chạy trên `NHAN_HANG` không lọc `DON_HANG.LOAI`).
25. **Tổng hợp hàng khẩn cấp theo THÁNG có TỈ LỆ** — BC08 chỉ trả danh sách dòng, **không có mẫu số** (tổng số phiếu trong tháng) nên không tính được tỉ lệ, mà tỉ lệ mới là thứ báo lãnh đạo; lại đếm theo DÒNG trong khi Excel đếm theo PHIẾU.
26. **Tổng hợp khối lượng "làm đen" theo THÁNG và theo NCC (tổng Kg)** — không báo cáo nào cộng theo khối lượng.
27. **Sổ chi phí gia công ngoài theo kỳ** (tổng chi phí theo tháng, tách theo loại gia công và theo NCC).
28. **"BÁO CÁO TỒN ĐỘNG GIA CÔNG NGOÀI"** — tên báo cáo xuất hiện trên cả ba sheet Logo HĐ, tức là một biểu mẫu đã ban hành; chưa có tương đương (BC03 không lọc được theo `LOAI`).
29. **"QUẢN LÝ CÔNG ĐOẠN HÀNG ĐÃ GIAO QC"** (mã hiệu QC-23-01) — chưa có tương đương.

**Điều xe**
30. **BẢNG KÊ CHI TIẾT LẤY HÀNG cho tài xế** — PDF lịch hiện in Mã phiếu · Đối tác · Vùng · Km · Hạng mục · Chiều · Ghi chú, thiếu đúng ba cột làm nên giá trị của sheet: **NGƯỜI LIÊN HỆ · SỐ ĐT · SỐ TIỀN PHẢI TRẢ TẠI CHỖ**, và thiếu dòng tổng tiền cả tuyến.
31. **Bản in gom theo TUYẾN/KHU VỰC** — `in_pdf.lich_dieu_xe` gom theo MÃ XE; `DIEU_XE.VUNG` đã có dữ liệu nên chỉ thiếu một cách gom.
32. **Bản in lịch làm việc theo TÀI XẾ (PDF)** — đúng tờ Excel in để giao tài xế đầu ngày; `/dieu-xe/lich/in` gọi `lich_theo_xe`, chỉ có bản gom theo xe.
33. **In gộp nhiều phiếu điều xe một lượt** (macro `xuatpdfncr` làm 8 phiếu/lượt) — hệ thống chỉ có `/dieu-xe/{id}/in` từng phiếu.
34. **Km và số chuyến theo KHU VỰC · theo TÀI XẾ · theo XE · theo ĐỐI TÁC, và ma trận chéo Khu vực × Hạng mục** — `thong_ke` chỉ trả `theo_vung` và `theo_hang_muc`, hai bảng một chiều rời nhau. BC09 cũng không có thống kê theo LOẠI XE (bảng phụ R:X của sheet LIST DIEU XE DI BH).
35. **Tổng kết cuối ngày cho điều vận** — bước 5 của quy trình ("PKD tổng kết lại tài xế có đi đủ không") và câu cuối sơ đồ điều vận ("cuối ngày BP Điều vận báo cáo tiến độ"); BC06 chỉ tính NV mua hàng, BC09 chỉ tính km và số chuyến.

**Bản in còn thiếu (gộp lại cho dễ theo dõi)** — `in_pdf.py` hiện chỉ có `don_hang`, `phieu_dieu_xe`, `lich_dieu_xe`; toàn hệ thống chỉ có 3 endpoint `/in`. Sáu biểu mẫu ISO đang in ra giấy hằng ngày mà chưa có mẫu: **Lệnh mua hàng · BM04 Yêu cầu báo giá (docs/F03 §50 đã đặc tả) · BM03 Danh mục NCC phê duyệt · QT-KV-01-BM03 PGH nội bộ (docs/F05 §57 đã đặc tả) · Phiếu bàn giao chứng từ (docs/F08 §3) · Phiếu yêu cầu thanh toán trả trước (docs/F08 §3)** — cộng thêm PGH gia công ngoài và BM08 sổ theo dõi NCC.

### (4) Cột dữ liệu gốc nào còn thiếu?

Gom theo bảng, mỗi mục nói rõ **cột Excel nào không có chỗ chứa** (khác với "có chỗ chứa nhưng không truy vấn/không hiện" — phần đó xếp riêng ở cuối).

**Thiếu hẳn cột trong CSDL**

| Bảng cần thêm | Cột thiếu | Vì sao cần |
|---|---|---|
| `DE_NGHI_DONG` | **NGƯỜI MUA HÀNG cấp DÒNG** | 33–35% phiếu ĐNVT có từ 2 NV mua hàng; hiện chỉ có `DE_NGHI.NGUOI_MUA_HANG` cấp phiếu và `giao_viec()` ghi đè cả phiếu |
| `DE_NGHI` / `DON_HANG` | **NGÀY GỬI HÀNG ĐI** (gia công ngoài) | Mốc gốc của GCN-01: Kỳ hạn quy định = Ngày gửi hàng đi + số ngày chuẩn. Chỉ suy gián tiếp qua `DIEU_XE.NGAY_DIEU_XE` chiều `DUA_HANG_DI`, mà đó là phiếu điều xe chứ không phải xác nhận hàng rời cổng |
| `DE_NGHI_DONG` | **SỐ NGÀY** = Kỳ hạn SX YC − Ngày YC gia công | Con số giải thích tại sao phiếu bị đánh "Sai QT" (83,5% dòng) |
| `DE_NGHI` | **MỨC ĐỘ XỬ LÝ — ai duyệt khẩn** | Excel tách hai lãnh đạo (88 dòng và 7 dòng); `NGUOI_DUYET_BP` không phân biệt duyệt thường với duyệt khẩn. Chặn luôn báo cáo hàng khẩn cấp theo lãnh đạo |
| `DON_HANG` | **ĐỊA ĐIỂM GIAO HÀNG** | Ô C62 của BM06: mặc định kho công ty nhưng được phép đổi. 23 cột hiện có: không có `DIA_DIEM_GIAO` |
| `GIAO_HANG_NOI_BO` | **ID_NCC**, **SO_PHIEU_CU** (số PGH nội bộ cũ dạng 07-004), **số lượng ĐẶT HÀNG** tách khỏi số giao, **ô ký BẢO VỆ** | Bốn ô của biểu mẫu QT-KV-01-BM03/PGH. `NHAN_HANG` có `SO_PHIEU_CU` nhưng chính phiếu giao nội bộ thì không |
| `GIAO_HANG_NOI_BO_DONG` | **ĐƠN GIÁ và THÀNH TIỀN**, **NV mua hàng** | Biểu mẫu PGH của workbook B có; phiếu giao không nói được lô hàng tốn bao nhiêu tiền gia công |
| `YEU_CAU_THANH_TOAN` | **ID_DON_HANG_DONG** (và kéo theo TÊN HÀNG · ĐVT · SỐ LƯỢNG · KỲ HẠN YC chụp lại), **NGÀY NHẬP ĐNTT** tách khỏi ngày yêu cầu | Cả sổ 978 dòng lẫn phiếu in đều làm việc ở cấp DÒNG HÀNG; hiện chỉ có `ID_DON_HANG` |
| `DIEU_XE_DONG` | **ĐỐI TÁC · ĐỊA CHỈ · SỐ TIỀN PHẢI TRẢ theo từng điểm dừng** | Một chuyến ghé 9 nhà cung cấp; phiếu in BM01 cũng in mỗi dòng một đối tác/địa điểm. Đây là lỗ hổng cấu trúc lớn nhất của điều xe |
| `DIEU_XE` | **NGƯỜI LIÊN HỆ · SĐT của điểm đến** (chụp lại), **giờ hẹn tới từng điểm** | `THOI_GIAN_TOI_NOI_PHUT` là số phút di chuyển, không phải giờ hẹn |
| `NHA_CUNG_CAP` | **KHU_VUC** (địa bàn chi tiết), **XUẤT XỨ**, **CHỨC VỤ người liên lạc** tách khỏi tên, **TT khác** (ghi chú thứ hai) | `DIEU_XE` có `KHU_VUC` nhưng danh mục NCC không có → cột ở phiếu không có nguồn để tự điền. Grep `xuat_xu/XUAT_XU` toàn backend: 0 kết quả |
| `KHACH_HANG` | **VUNG · SO_KM · KHU_VUC · NGANH_NGHE** | `dieu_xe._doi_tac` khi loại đối tác là KH chỉ trả `DIA_CHI` → chuyến giao hàng cho khách không tự điền vùng/km, kéo theo BC09 đếm thiếu km của cả mảng giao hàng |
| `VAT_TU` | **TÊN QUY ĐỔI cấp danh mục** | 750 dòng của workbook C; `TEN_NCC_GHI_TREN_CHUNG_TU` là cấp dòng đơn hàng nên phải gõ lại mỗi lần |
| `DON_HANG_DONG` | **D · R · T · KLR** (kích thước và khối lượng riêng đã dùng), **GIÁ CHƯA VAT / ĐÃ VAT** | Chỉ giữ `TRONG_LUONG` (kết quả) và `QUY_CACH` (chuỗi tự do); khi giá lệch không kiểm lại được phép tính đã bấm |
| Danh mục mới | **MÀU SƠN** (mã bản vẽ · mã màu khách · mã sơn công ty dùng · công ty áp dụng) | Hai sheet workbook B; hiện nhét vào `NOI_DUNG_GIA_CONG` |
| Danh mục mới | **ĐƠN GIÁ CẮT LAZER theo độ dày** và **TỐC ĐỘ CẮT theo độ dày** + định mức công máy | Không thuộc `VAT_LIEU_TINH_TOAN` (bảng đó là giá vật liệu theo kg) |
| Danh mục mới | **LY_DO_THANH_TOAN · HINH_THUC_THANH_TOAN · LY_DO_YEU_CAU** (9 + 3 + 3 giá trị ở cột 6 sheet Danh Muc) | docs/F08 §4 đã chốt phải quản lý ở F10; chưa khai trong `danh_muc_dinh_nghia.py` |
| `LOAI_GIA_CONG` | **26 mã còn thiếu**, dẫn đầu **LÀM ĐEN** (917 dòng), và cả nhóm **sửa chữa máy móc** | Đo trên workbook C sheet "Gia công ngoài": 1.068/6.107 dòng không có mã |
| `LOAI_GIA_CONG` | **Dải mốc thời gian từng chặng** (ngày 0 lập phiếu · ngày 1 hàng đi · ngày N có hàng · ngày N+1 giao SX) | Hiện chỉ có MỘT số `SO_NGAY_CHUAN` |
| Tham số hệ thống | **Mã số thuế · địa chỉ trụ sở · địa chỉ chi nhánh · email nhận hoá đơn · logo · mã hiệu tài liệu · phiên bản · ngày phát hành · mức bảo mật · văn bản "Lưu ý quan trọng" trên đơn hàng** | Đã truy vấn: 71 tham số, không có MST/CÔNG TY/HOÁ ĐƠN. `in_pdf.py` gắn cứng `TEN_CONG_TY` ở dòng 44. Đây là nội dung của ba sheet **Logo HĐ** |
| Tham số hệ thống | **Tốc độ trung bình (40 km/h) · phút đệm (10) · hệ số 1,2** ở máy tính vật liệu | Ba hằng số đang nằm trong công thức Excel |
| Nối kết | **Khoá nối chi phí gia công → phiếu xuất khẩu** | `YEU_CAU_THANH_TOAN` chỉ tham chiếu `ID_DON_HANG`; `PHIEU_XUAT_KHO` là phiếu xuất VẬT TƯ theo đề nghị, không phải phiếu xuất khẩu hàng |

**Có chỗ chứa nhưng không truy vấn / không hiện / không nhập được** (sửa rẻ hơn nhiều, ưu tiên làm trước)

- `repo_don_hang.tien_do` không SELECT ngày nhận (gây lỗi SNGH) và không kéo tên vật tư đã quy đổi → bảng theo dõi không biết mã hàng đã bị đổi.
- `repo_don_hang.lay_dong_cong_viec` chỉ trả 5 trường; thiếu 6 trường mà sheet LMH THIEN đang kéo về và **đều có sẵn**: `DE_NGHI.NGUOI_YEU_CAU`, `NGAY_HIEU_LUC`, `DE_NGHI_DONG.LENH_SAN_XUAT`, `DE_NGHI.SO_PHIEU_CU`, `TRA_LOI_KY_HAN`, `GHI_CHU` — chỉ cần thêm JOIN.
- `repo_xac_nhan_kt.hang_doi_ky_thuat` thiếu `LENH_SAN_XUAT`, `MA_VACH`, `ID_SP_CU` (Kỹ thuật dùng mã vạch và lệnh SX để tra bản vẽ).
- `repo_giao_hang_noi_bo.lay_dong` không nối `DE_NGHI/DE_NGHI_DONG` → 6 cột biểu mẫu trống.
- `repo_dieu_xe._COT_HIEN` không SELECT `NHA_CUNG_CAP.NGUOI_LIEN_HE/SDT` và không SELECT `THOI_GIAN_TOI_NOI_PHUT` → tài xế cầm phiếu không có số gọi.
- `DIEU_XE.SO_CHUYEN`, `THOI_GIAN_TOI_NOI_PHUT`, `KHU_VUC`, `SO_PHIEU_CU`, `PHU_XE` — có cột, **không có ô nhập trên giao diện**; `DIEU_XE_DONG.KICH_THUOC/SO_LUONG/DVT/TRONG_LUONG` cũng vậy (giao diện chỉ cắt textarea theo xuống dòng, `dieu_xe.js` dòng 315).
- Biểu mẫu "Thêm nhà cung cấp" (`nha_cung_cap.js::moThemNCC`) chỉ có 8 ô, thiếu Địa chỉ · Người liên hệ · SĐT · SĐT 2 · Fax · Mail · Có hoá đơn · Công nợ · Tiền mặt; lược đồ `ThanTaoNCC` thiếu 5 trường (`sdt_2`, `fax`, `co_hoa_don`, `cong_no`, `tien_mat`) — CSDL có cột, `repo_ncc.CO_SUA` cho sửa, nhưng lúc TẠO không truyền vào được.
- `V_TINH_TRANG_MA_HANG` không có `ID_SP_CU` và không có cột GHI CHÚ → BC03 mất cột lý do tồn đọng và không đối chiếu ngược được sổ cũ.
- BC02 không lấy `BAT_KHA_THI`, `TRA_LOI_KY_HAN`, tên NCC, nội dung gia công, ngày dự kiến về — **view đã có, chỉ là câu SELECT không lấy**.
- BC04 không kéo `DON_HANG_DONG.SO_LUONG` để đặt cạnh số giao (mất phép soi giao thiếu/giao dư).
- Bảng "Hàng không phù hợp" trên `giao_nhan.js::veKhongPhuHop` chỉ hiện 8 cột, thiếu 5 cột của BM08 (Ngày nhận hàng · Tên sản phẩm · Mã sản phẩm · Đạt/Không đạt · Người giám sát) — dữ liệu đều có, `repo_kiem_tra_dau_vao.danh_sach_hkph` không lấy.
- Bảng danh sách thanh toán chỉ 9 cột, thiếu Người đề nghị · Ngày yêu cầu · Lý do thanh toán · Hình thức thanh toán · Tình trạng hàng.

---

## 3. NHÃN TIẾNG VIỆT CẦN BỔ SUNG (MÃ CỘT → NHÃN HIỂN THỊ)

Đây là bảng nhãn dùng cho **giao diện, tiêu đề bản in, và tiêu đề cột khi xuất tệp**. Lý do bắt buộc: `bao_cao.py::_nhan_cot` hiện sinh nhãn bằng `khoa.replace('_',' ').capitalize()`, nên PDF/Excel/CSV in ra "Ten hang chup", "Dvt chup", "So luong nhan", "Ket luan iqc". **Chỗ cần cắm bảng nhãn là `_nhan_cot`, không phải đổi tên cột CSDL.**

### BAN_GIAO_CHUNG_TU / BGCT_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| BAN_GIAO_CHUNG_TU.NGAY_BAN_GIAO | Ngày bàn giao chứng từ |
| BAN_GIAO_CHUNG_TU.NGUOI_BAN_GIAO | Người bàn giao |
| BAN_GIAO_CHUNG_TU.NGUOI_NHAN | Người nhận (Kế toán) |
| BGCT_DONG.SO_PGH | Số phiếu giao hàng nội bộ |
| BGCT_DONG.ID_NHAN_HANG | Phiếu nhận hàng |
| BGCT_DONG.ID_NCC | Nhà cung cấp |
| BGCT_DONG.NGAY_NHAN_HANG | Ngày nhập hàng |
| BGCT_DONG.STT_DONG | Số thứ tự dòng |

### BO_DEM_CHUNG_TU · CHUNG_LOAI · CONG_DOAN · DON_VI_TINH
| Mã cột | Nhãn tiếng Việt |
|---|---|
| BO_DEM_CHUNG_TU.TIEN_TO / NAM / SO_HIEN_TAI | Bộ đếm số chứng từ: tiền tố · năm · số hiện tại |
| CHUNG_LOAI.MA_CHUNG_LOAI | Mã chủng loại vật tư (mã viết tắt — cần cột tên đầy đủ đi kèm khi hiển thị) |
| CHUNG_LOAI.MA_CHUNG_LOAI_CHA | Chủng loại cấp trên |
| CONG_DOAN.MA_CONG_DOAN = 'GCN' | Gia công ngoài |
| DON_VI_TINH.DVT | Đơn vị tính |
| DON_VI_TINH.SO_LE | Số chữ số thập phân được phép nhập |

### CONG_VIEC / CONG_VIEC_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| CONG_VIEC.SO_PHIEU_CU | Mã tài liệu lệnh mua hàng (dạng 024/052026/ĐN/MH) |
| CONG_VIEC.LOAI | Loại việc (xử lý đề nghị · sinh từ trò chuyện) |
| CONG_VIEC.NGUOI_GIAO | Người phát lệnh |
| CONG_VIEC.NGUOI_NHAN | Nhân viên mua hàng nhận lệnh |
| CONG_VIEC.NGAY_GIAO | Ngày phát lệnh mua hàng |
| CONG_VIEC.HAN_XU_LY | Hạn xử lý |
| CONG_VIEC.NGAY_BAO_XONG | Ngày người nhận báo đã làm xong |
| CONG_VIEC.NGUOI_XAC_NHAN / NGAY_XAC_NHAN | Người / ngày xác nhận đã xong |
| CONG_VIEC.LY_DO_TRA_LAI | Lý do trả lại việc |
| CONG_VIEC.TRANG_THAI | Tình trạng việc (mới · đang làm · chờ xác nhận · xong) |
| CONG_VIEC.PHAN_HOI | Phản hồi của người nhận khi báo xong |
| CONG_VIEC_DONG.ID_DE_NGHI_DONG | Dòng đề nghị được giao trong lệnh này |
| CONG_VIEC_DONG.STT_DONG | Số thứ tự dòng trong lệnh mua hàng |

### DE_NGHI
| Mã cột | Nhãn tiếng Việt |
|---|---|
| DE_NGHI.SO_PHIEU_CU | Số phiếu ĐNVT (số cũ trên sổ Excel) — **luồng gia công ngoài đọc là "Số phiếu GCN"** |
| DE_NGHI.NGAY_HIEU_LUC | Ngày ĐNVT / Ngày yêu cầu đặt hàng (ngày phiếu có hiệu lực sau giờ chốt) |
| DE_NGHI.TRE_GIO_CHOT | Gửi sau giờ chốt |
| DE_NGHI.TINH_TRANG_YC | Tình trạng yêu cầu (bình thường · hàng khẩn cấp · khẩn cấp NG · hàng NG) — GCN đọc là "Mức độ xử lý" |
| DE_NGHI.NGUOI_MUA_HANG | Nhân viên mua hàng phụ trách |
| DE_NGHI.NGUOI_YEU_CAU | Người yêu cầu |
| DE_NGHI.CAN_BLD_DUYET | Cần Ban lãnh đạo duyệt |
| DE_NGHI.MA_BO_PHAN | Bộ phận yêu cầu |

### DE_NGHI_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| ID_SP_CU | ID SP (mã dòng theo sổ Excel cũ) |
| TEN_HANG_CHUP | Tên hàng (chụp lại lúc lập phiếu) |
| DVT_CHUP | Đơn vị tính (chụp lại lúc lập phiếu) |
| PHAN_LOAI_CHUP | Phân loại vật tư (chụp lại lúc lập phiếu) |
| QUY_CACH | Quy cách |
| MA_CHUNG_LOAI | Chủng loại |
| MUC_DICH_SU_DUNG | Mục đích sử dụng |
| KY_HAN_YC | Kỳ hạn yêu cầu — GCN đọc là "Kỳ hạn sản xuất yêu cầu" |
| TRA_LOI_KY_HAN | Trả lời kỳ hạn (ngày nhà cung cấp hứa giao) |
| NGAY_DU_KIEN_VE | Kỳ hạn quy định (ngày hàng dự kiến về) |
| SO_NGAY_THONG_NHAT_NCC | Số ngày gia công đã thống nhất riêng với nhà cung cấp |
| LENH_SAN_XUAT | Số phiếu ĐNSX (lệnh sản xuất) |
| MA_VACH | Mã vạch (mã lô của lệnh sản xuất) |
| ID_VT_DE_NGHI | Vật tư người yêu cầu đề nghị (xưởng xin ban đầu) |
| ID_VT_DUYET_MUA | Vật tư được duyệt mua (tên quy đổi sau khi đổi vật liệu) |
| TRANG_THAI_DONG | Tình trạng dòng đề nghị |
| BAT_KHA_THI | Không mua được (bất khả thi) — GCN đọc là "Sai quy trình: kỳ hạn ngắn hơn thời gian gia công chuẩn" |
| CAN_XAC_NHAN_KT | Cần Kỹ thuật xác nhận |
| KET_QUA_KT | Kết quả xác nhận kỹ thuật |
| NGUOI_XAC_NHAN_KT | Người xác nhận kỹ thuật |
| THOI_DIEM_XAC_NHAN_KT | Thời điểm xác nhận kỹ thuật |
| GHI_CHU_KT | Ghi chú của Kỹ thuật |
| MA_LOAI_GIA_CONG | Loại gia công |
| MA_CONG_DOAN | Công đoạn |
| NOI_DUNG_GIA_CONG | Nội dung gia công |

### DIEU_XE / DIEU_XE_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| DIEU_XE.ID | Số phiếu điều xe |
| DIEU_XE.SO_PHIEU_CU | Số phiếu cũ trên Excel (phiếu GCN / số phiếu điều xe cũ) |
| DIEU_XE.NGAY_LAP_PHIEU | Ngày lập phiếu (Excel gọi là "Ngày điều xe") |
| DIEU_XE.NGAY_DIEU_XE | Ngày xe đi (Excel gọi là "Ngày đi") |
| DIEU_XE.THOI_DIEM_GUI | Thời điểm gửi yêu cầu |
| DIEU_XE.TRE_GIO_CHOT | Gửi sau giờ chốt điều xe |
| DIEU_XE.NGUOI_DE_NGHI | Người điều xe (người đề nghị) — họ và tên |
| DIEU_XE.MA_BO_PHAN | Bộ phận đề nghị |
| DIEU_XE.ID_DOI_TAC | Đối tác đến lấy / giao hàng |
| DIEU_XE.LOAI_DOI_TAC | Loại đối tác (nhà cung cấp hay khách hàng) |
| DIEU_XE.DIA_CHI | Địa điểm đến |
| DIEU_XE.KHU_VUC | Khu vực (địa bàn chi tiết nơi đến) |
| DIEU_XE.VUNG | Vùng (mã tuyến điều xe: BH1, BH3, BD, SG…) |
| DIEU_XE.SO_KM | Số km một lượt |
| DIEU_XE.SO_CHUYEN | Số chuyến (số lượt trong ngày) |
| DIEU_XE.THOI_GIAN_TOI_NOI_PHUT | Thời gian tới nơi (phút) |
| DIEU_XE.SO_TIEN_THANH_TOAN | Số tiền phải trả tại chỗ cho nhà cung cấp (Excel viết tắt: SÔ TIỀN TT) |
| DIEU_XE.CHI_PHI_THUE | Chi phí thuê xe ngoài |
| DIEU_XE.KHAN | Mức độ khẩn (bình thường / gấp) |
| DIEU_XE.CHIEU | Chiều của chuyến xe (đưa hàng đi / lấy hàng về / đưa đi và lấy về) |
| DIEU_XE.HANG_MUC | Hạng mục chuyến (đi gia công ngoài · lấy hàng gia công về · mua hàng · giao hàng · giao chứng từ · khác) |
| DIEU_XE.MA_XE | Xe |
| DIEU_XE.TAI_XE | Tài xế |
| DIEU_XE.PHU_XE | Phụ xe |
| DIEU_XE.TRANG_THAI | Trạng thái phiếu (chưa xử lý · đang xử lý · hoàn thành · huỷ) |
| DIEU_XE.LY_DO_NGOAI_LE | Lý do xin ngoại lệ |
| DIEU_XE.NGUOI_DUYET_NGOAI_LE / THOI_DIEM_DUYET_NGOAI_LE | Người duyệt ngoại lệ / Thời điểm duyệt ngoại lệ |
| DIEU_XE_DONG.NOI_DUNG | Nội dung điều xe |
| DIEU_XE_DONG.KICH_THUOC | Kích thước kiện hàng |
| DIEU_XE_DONG.TRONG_LUONG | Trọng lượng (kg) |
| DIEU_XE_DONG.DVT | Đơn vị tính |
| DIEU_XE_DONG.STT_DONG | Số thứ tự dòng |
| DIEU_XE_DONG.ID_DE_NGHI_DONG | Dòng đề nghị vật tư gắn với chuyến này |

### DOI_VAT_LIEU
| Mã cột | Nhãn tiếng Việt |
|---|---|
| TEN_TU | Đổi từ vật liệu |
| TEN_SANG | Đổi sang vật liệu |
| ID_VT_TU / ID_VT_SANG | Mã vật tư đổi từ / Mã vật tư đổi sang |
| NOI_DUNG_YEU_CAU | Nội dung yêu cầu xác nhận |

### DON_HANG / DON_HANG_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| DON_HANG.SO_PHIEU_CU | Số đơn đặt hàng (số hợp đồng/PO ghi trên chứng từ nhà cung cấp) |
| DON_HANG.NGAY_DAT | Ngày đặt hàng |
| DON_HANG.LOAI | Loại đơn (mua hàng / gia công ngoài) |
| DON_HANG.GIA_TRI_TRUOC_VAT | Giá trị đơn hàng trước thuế VAT |
| DON_HANG.PHAN_LOAI_CAO_NHAT | Phân loại hàng nghiêm ngặt nhất trong đơn |
| DON_HANG.CAP_DUYET_YEU_CAU | Cấp duyệt cần thiết |
| DON_HANG.KY_HAN_GIAO | Kỳ hạn giao hàng |
| DON_HANG.DIEU_KIEN_THANH_TOAN | Điều kiện thanh toán |
| DON_HANG_DONG.TEN_HANG_CHUP | Tên hàng (chụp lại lúc lập phiếu) |
| DON_HANG_DONG.TEN_NCC_GHI_TREN_CHUNG_TU | Tên quy đổi (tên nhà cung cấp ghi trên chứng từ) |
| DON_HANG_DONG.DVT_CHUP | Đơn vị tính (chụp lại lúc lập phiếu) |
| DON_HANG_DONG.PHAN_LOAI_CHUP | Phân loại hàng (chụp lại lúc lập phiếu) |
| DON_HANG_DONG.QUY_CACH | Quy cách (kích thước dài × rộng × dày) |
| DON_HANG_DONG.DON_GIA_CO_SO | Đơn giá theo đơn vị giá (đơn giá KG/M/L) |
| DON_HANG_DONG.DON_VI_GIA | Đơn vị tính của đơn giá |
| DON_HANG_DONG.SO_LUONG_DON_VI_GIA | Số lượng quy theo đơn vị giá (trọng lượng/chiều dài dùng để nhân đơn giá) |
| DON_HANG_DONG.TRONG_LUONG | Trọng lượng (kg) |
| DON_HANG_DONG.SO_LUONG_DA_NHAN | Số lượng đã nhận |
| DON_HANG_DONG.TRA_LOI_KY_HAN | Kỳ hạn nhà cung cấp trả lời |
| DON_HANG_DONG.KY_HAN_YC | Kỳ hạn người yêu cầu cần hàng |
| DON_HANG_DONG.TRANG_THAI_DONG | Tình trạng của dòng hàng |

### DOT_THANH_TOAN / YEU_CAU_THANH_TOAN
| Mã cột | Nhãn tiếng Việt |
|---|---|
| YEU_CAU_THANH_TOAN.TINH_TRANG_HANG | Tình trạng hàng (hàng đã về / hàng chưa về) |
| YEU_CAU_THANH_TOAN.TRANG_THAI | Tình trạng thanh toán (chưa thanh toán / trả một phần / đã thanh toán / đã huỷ) |
| YEU_CAU_THANH_TOAN.KY_HAN_THANH_TOAN | Kỳ hạn phải trả tiền |
| YEU_CAU_THANH_TOAN.GIA_TRI_DON_HANG | Giá trị đơn hàng dùng để đối chiếu tổng các đợt |
| YEU_CAU_THANH_TOAN.NGUOI_DE_NGHI | Người đề nghị thanh toán |
| YEU_CAU_THANH_TOAN.NGUOI_LAP | Người lập phiếu (ô ký trái của biểu mẫu) |
| YEU_CAU_THANH_TOAN.NGUOI_DUYET | Người duyệt (ô ký phải của biểu mẫu) |
| YEU_CAU_THANH_TOAN.NGAY_DUYET | Ngày duyệt phiếu |
| YEU_CAU_THANH_TOAN.LY_DO_THANH_TOAN | Lý do phải thanh toán (vì sao nhà cung cấp không cho công nợ) |
| YEU_CAU_THANH_TOAN.LY_DO_YEU_CAU | Lý do yêu cầu chi tiền lúc này (để lấy hàng về / đặt cọc / trả công nợ) |
| DOT_THANH_TOAN.ID_YCTT | Mã yêu cầu thanh toán (phiếu cha) |
| DOT_THANH_TOAN.DOT_SO | Đợt thanh toán thứ mấy (thay hai cột Lần 1 / Lần 2 của Excel) |
| DOT_THANH_TOAN.SO_TIEN | Số tiền của đợt này (ô "Số tiền cọc" trên phiếu in là số tiền đợt 1) |
| DOT_THANH_TOAN.NGAY_DU_KIEN | Ngày dự kiến trả |
| DOT_THANH_TOAN.NGAY_THUC_TE | Ngày thực tế đã trả |

### GIAO_HANG_NOI_BO / GIAO_HANG_NOI_BO_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| GIAO_HANG_NOI_BO.ID | Số phiếu giao hàng nội bộ (PGH nội bộ) |
| GIAO_HANG_NOI_BO.MA_BO_PHAN_GIAO | Bộ phận giao |
| GIAO_HANG_NOI_BO.MA_BO_PHAN_NHAN | Bộ phận nhận |
| GIAO_HANG_NOI_BO.MA_KHO | Kho nhận hàng |
| GIAO_HANG_NOI_BO.NGAY_GIAO | Ngày giao |
| GIAO_HANG_NOI_BO.NGAY_NHAN_THUC | Ngày kho thực nhận |
| GIAO_HANG_NOI_BO_DONG.ID_NHAN_HANG_DONG | Dòng phiếu nhận hàng gốc |
| GIAO_HANG_NOI_BO_DONG.TEN_HANG_CHUP | Tên hàng (chụp lại lúc lập phiếu) |
| GIAO_HANG_NOI_BO_DONG.DVT_CHUP | Đơn vị tính (chụp lại lúc lập phiếu) |
| GIAO_HANG_NOI_BO_DONG.SO_LUONG_GIAO | Số lượng yêu cầu nhập kho / Số lượng ký nhận |

### HANG_KHONG_PHU_HOP / KET_QUA_IQC
| Mã cột | Nhãn tiếng Việt |
|---|---|
| HANG_KHONG_PHU_HOP.MO_TA | Vấn đề phát sinh |
| HANG_KHONG_PHU_HOP.KET_QUA | Kết quả xử lý (đổi trả / khiếu nại / chấp nhận / giảm giá / khác). **CẢNH BÁO TRÙNG TÊN: đây KHÔNG phải cột "Đạt/Không đạt" của BM08 — cột đó là `KET_QUA_IQC.KET_LUAN`** |
| HANG_KHONG_PHU_HOP.HUONG_XU_LY | Hướng xử lý (diễn giải) |
| HANG_KHONG_PHU_HOP.MA_HUONG_XU_LY | Mã hướng xử lý (trả nhà cung cấp / sửa lại / nhận nhượng / giảm giá / huỷ bỏ / khác) |
| HANG_KHONG_PHU_HOP.ID_KET_QUA_IQC | Mã kết quả kiểm tra chất lượng đầu vào (IQC) |
| HANG_KHONG_PHU_HOP.NGUOI_GIAM_SAT | Người giám sát xử lý |
| HANG_KHONG_PHU_HOP.NGAY_DONG | Ngày đóng biên bản |
| KET_QUA_IQC.KET_LUAN | Kết quả kiểm: Đạt / Không đạt / Đạt có điều kiện |
| KET_QUA_IQC.LOI_PHAT_HIEN | Lỗi phát hiện khi kiểm |

### NHAN_HANG / NHAN_HANG_DONG
| Mã cột | Nhãn tiếng Việt |
|---|---|
| NHAN_HANG.NGAY_NHAN | Ngày nhập hàng |
| NHAN_HANG.LAN_GIAO | Lần giao thứ mấy |
| NHAN_HANG.MA_KHO | Kho nhận hàng |
| NHAN_HANG.SO_PHIEU_CU | Số PGH nội bộ (số cũ, ví dụ 06-510) |
| NHAN_HANG.NGAY_BAN_GIAO_CHUNG_TU | Ngày bàn giao chứng từ |
| NHAN_HANG_DONG.TEN_HANG_CHUP | Tên hàng (chụp lại lúc nhận hàng) |
| NHAN_HANG_DONG.DVT_CHUP | Đơn vị tính (chụp lại lúc nhận hàng) |
| NHAN_HANG_DONG.SO_LUONG_NHAN | Số lượng giao |
| NHAN_HANG_DONG.SO_NGAY_SOM_TRE | SNGH — số ngày giao sớm (+) / trễ (−) |
| NHAN_HANG_DONG.LA_GIAO_BU | Là lần giao bù cho hàng thiếu / không đạt |
| NHAN_HANG_DONG.ID_HKPH_GOC | Biên bản hàng không phù hợp mà dòng này giao bù cho |

### NHA_CUNG_CAP
| Mã cột | Nhãn tiếng Việt |
|---|---|
| MA_NCC | Mã nhà cung cấp (mã viết tắt nội bộ — thay cho "Tên viết tắt" của Excel) |
| MST | Mã số thuế |
| NGANH_NGHE | Ngành nghề / Mảng kinh doanh |
| MAT_HANG | Sản phẩm chính |
| NHOM_HANG_CHINH | Nhóm mặt hàng chính |
| NHOM_HANG_CHI_TIET | Các nhóm mặt hàng chi tiết |
| KHA_NANG_GIA_CONG | Khả năng gia công (công việc nhà cung cấp nhận làm) |
| MA_LOAI_GIA_CONG | Loại gia công ngoài nhận làm |
| PHAN_LOAI_NCC | Xếp loại nhà cung cấp sau đánh giá |
| DA_PHE_DUYET | Đã được phê duyệt vào danh sách NCC chính thức |
| NGAY_PHE_DUYET | Ngày phê duyệt |
| NGUOI_LIEN_HE | Người liên lạc |
| SDT / SDT_2 | Số điện thoại / Số điện thoại 2 (di động người liên hệ) |
| KY_HAN_QUY_DINH | Kỳ hạn giao quy định riêng của nhà cung cấp (số ngày) |
| VUNG | Vùng (mã tuyến điều xe) |
| SO_KM | Quãng đường từ công ty tới nhà cung cấp (km) |
| CO_HOA_DON | Có xuất hoá đơn VAT |
| CONG_NO / TIEN_MAT | Bán công nợ / Bán tiền mặt |
| LA_NCC_MUA_HANG | Là nhà cung cấp mua hàng |
| LA_NCC_GIA_CONG | Là đơn vị gia công ngoài |
| TEN_KHONG_DAU | Tên viết không dấu (chỉ dùng để tìm kiếm và dò trùng) |

### VAT_TU · VAT_LIEU_TINH_TOAN · LOAI_GIA_CONG · MUC_DICH_SU_DUNG · XE · TAI_XE · NHAN_VIEN
| Mã cột | Nhãn tiếng Việt |
|---|---|
| VAT_TU.MA_VAT_TU | Mã vật tư |
| VAT_TU.TEN_HANG | Tên hàng |
| VAT_TU.TEN_HANG_CU | Tên hàng cũ (trước khi gộp mã) |
| VAT_TU.TEN_KHONG_DAU | Tên không dấu (chỉ dùng để tìm kiếm) |
| VAT_TU.PHAN_LOAI | Phân loại vật tư (thông dụng SX · thông dụng BTBD · chuyên dùng) |
| VAT_TU.KHO | Kho quản lý (suy từ mã vật tư) |
| VAT_TU.LOAI_PHOI | Tình trạng phôi (NC nguyên cây · LC lẻ cây · TN tấm nguyên · TL tấm lẻ · PT phôi tấm · PL phôi lẻ) |
| VAT_TU.ID_VT_GOC | Vật tư gốc |
| VAT_TU.ID_GOP_VE | Đã gộp về mã |
| VAT_TU.NGUON_CAP_MA | Khâu đã cấp mã (nhận hàng · danh mục · yêu cầu cấp mã · nhập lô · có sẵn trước hệ thống) |
| VAT_TU.KHOI_LUONG_RIENG | Khối lượng riêng (g/cm³) |
| VAT_LIEU_TINH_TOAN.MA | Mã vật liệu |
| VAT_LIEU_TINH_TOAN.KHOI_LUONG_RIENG | Khối lượng riêng (g/cm³) — Excel viết tắt là KLR |
| VAT_LIEU_TINH_TOAN.DON_GIA_THAM_KHAO | Đơn giá tham khảo theo ki-lô-gam |
| VAT_LIEU_TINH_TOAN.DON_VI_GIA | Đơn vị tính giá |
| LOAI_GIA_CONG.SO_NGAY_CHUAN | Thời gian gia công chuẩn (ngày làm việc) |
| LOAI_GIA_CONG.MA_CONG_DOAN | Công đoạn áp dụng |
| MUC_DICH_SU_DUNG.MA | Mã mục đích sử dụng — NVL = Nguyên vật liệu · VTTH = Vật tư tiêu hao · CCDC = Công cụ dụng cụ · CPX = Chi phí xưởng · QLDN = Quản lý doanh nghiệp · TSCD = Tài sản cố định · GCN = Gia công ngoài · SON = Sơn · COMTRUA = Cơm trưa · TMCANTIN = Thương mại căn tin · AMTGD1/AMTGD2 = Ăn mòn / gia công đợt 1, đợt 2 |
| XE.MA_XE / NHOM_XE / BIEN_SO / LOAI_XE | Mã xe / Nhóm xe / Biển số / Loại xe (xe máy · tải nhỏ · tải trung) |
| TAI_XE.MA_NHAN_VIEN | Mã nhân viên (tài xế) |
| NHAN_VIEN.HO_VA_TEN / MA_BO_PHAN | Họ và tên / Bộ phận |
| LENH_SAN_XUAT.NGAY_NHAN_LENH | Ngày phát lệnh sản xuất |

### YEU_CAU_BAO_GIA / YCBG_DONG / YEU_CAU_HUY
| Mã cột | Nhãn tiếng Việt |
|---|---|
| YEU_CAU_BAO_GIA.SO_PHIEU_CU | Số yêu cầu báo giá cũ (trên Excel) |
| YEU_CAU_BAO_GIA.NGAY_GUI | Ngày gửi cho nhà cung cấp |
| YEU_CAU_BAO_GIA.HAN_TRA_LOI | Hạn nhà cung cấp phải trả lời |
| YCBG_DONG.TEN_HANG_CHUP / DVT_CHUP | Tên hàng / Đơn vị tính (chụp lại lúc lập phiếu) |
| YCBG_DONG.QUY_CACH | Quy cách |
| YCBG_DONG.KY_HAN_YC | Kỳ hạn yêu cầu |
| YCBG_DONG.STT_DONG | Số thứ tự dòng |
| YCBG_DONG.ID_DE_NGHI_DONG | Dòng đề nghị vật tư gốc |
| YEU_CAU_HUY.LY_DO | Lý do huỷ |
| YEU_CAU_HUY.NGUOI_YEU_CAU | Người xin huỷ |
| YEU_CAU_HUY.THOI_DIEM_DUYET | Thời điểm duyệt huỷ |

### View, bảng hệ thống, kho lưu trữ
| Mã cột | Nhãn tiếng Việt |
|---|---|
| V_TINH_TRANG_MA_HANG.TINH_TRANG | Tình trạng mã hàng (gộp TT đặt hàng và TT giao hàng) |
| V_TINH_TRANG_MA_HANG.SO_NGAY_TRE_LICH | Số ngày trễ (đếm theo ngày lịch) — **Excel gọi là SỐ NGÀY GN và ghi dấu ngược lại** |
| V_TINH_TRANG_MA_HANG.SO_NGAY_SOM_TRE | Số ngày sớm (+) hoặc trễ (−), đếm theo ngày làm việc |
| V_TINH_TRANG_MA_HANG.ID_DE_NGHI | Số phiếu đề nghị vật tư |
| V_TINH_TRANG_MA_HANG.* (TEN_HANG_CHUP · DVT_CHUP · KY_HAN_YC · TRA_LOI_KY_HAN · NGAY_HIEU_LUC · MA_BO_PHAN · MA_VACH · TINH_TRANG_YC · BAT_KHA_THI) | Dùng lại đúng nhãn của `DE_NGHI` / `DE_NGHI_DONG` ở trên |
| luu_tru.DE_NGHI_DONG / DON_HANG_DONG / NHAN_HANG_DONG | Kho lưu trữ — dòng đề nghị / dòng đơn hàng / dòng nhận hàng đã hoàn tất |
| MIGRATION_DA_CHAY | Các bước nâng cấp cơ sở dữ liệu đã chạy |
| NHAT_KY_THAY_DOI | Nhật ký thay đổi (ai sửa gì, lúc nào, cũ → mới) |
| LICH_SU_TRANG_THAI | Lịch sử chuyển trạng thái chứng từ |
| LICH_SU_KY_HAN | Lịch sử dời kỳ hạn giao hàng |
| LICH_SU_KY_HAN.LOAI_KY_HAN | Loại kỳ hạn được đổi (kỳ hạn yêu cầu hay kỳ hạn giao) |
| LICH_SU_KY_HAN.NGUON | Nguồn đổi kỳ hạn (người yêu cầu hay nhà cung cấp) |

### Hằng và khoá API (nhãn cho giao diện, không phải cột CSDL)
| Mã | Nhãn tiếng Việt |
|---|---|
| HINH_DANG: TAM / TRON_DAC / ONG | Tấm / Tròn đặc / Ống |
| dai · rong · day | Chiều dài · Chiều rộng · Độ dày |
| duong_kinh · dk_ngoai · dk_trong | Đường kính · Đường kính ngoài · Đường kính trong |
| khoi_luong_kg | Khối lượng (kg) |
| gia_truoc_vat | Giá chưa thuế VAT |
| vat_suat | Thuế suất VAT (%) |

---

## 4. VIỆC PHẢI LÀM, XẾP THEO MỨC QUAN TRỌNG

### P0 — Chặn cứng việc chuyển đổi, hoặc đang cho ra số sai (làm trước tiên)

1. **Chốt lại khuôn mã vật tư rồi sửa `backend/services/vat_tu.py`.** Hiện `CAC_KHUON` loại 10.257/10.687 mã kho đang lưu hành. Ba việc con: (a) nới `\d{3}` → `\d{2,}` cho khớp quy định QT-KV-01-PL02 ("bắt đầu từ 01"); (b) quyết định với anh Long và Kho vận: 9.672 mã dạng `VT-[nhóm vật liệu]-[stt]` (ST · IN · TMC · GC · ELI · LK · POL · PK · KM · DO · HC) là **hợp lệ và phải thêm khuôn**, hay là **sai chuẩn và phải cấp mã lại**; (c) thêm khuôn cho Kho thành phẩm (mã = mã vạch sản phẩm) mà quy định có nhưng mã nguồn thiếu. Kèm theo: chuẩn hoá "VT SX 01" (khoảng trắng, 2 chữ số) của 76 dòng Kho PO.
2. **Sửa tên ba kho trong `backend/data/migrations/023_ton_kho.sql` dòng 48** cho khớp QT-KV-01-PL02: `TH` = Kho vật tư tiêu hao (đang ghi "Kho thành phẩm"), `TL` = Kho tools (đang ghi "Kho tồn linh tinh"), `VT` = Kho nguyên vật liệu. Nếu giữ nguyên tên hiện tại thì `suy_kho_va_phoi` đang gán sai kho cho mọi mã `TH-*`.
3. **Sửa lỗi SNGH tính lại theo hôm nay.** `backend/services/don_hang.py::tien_do` phải truyền `ngay_nhan` vào `so_ngay_som_tre`, và `backend/data/repo_don_hang.py::tien_do` phải SELECT ngày nhận. Đây là lỗi làm hai màn hình cho hai con số khác nhau trên cùng một dòng.
4. **Cài công thức `Số Km = Km × Số chuyến`** trong `backend/services/dieu_xe.py::_doi_tac` (hoặc lúc ghi), đồng thời mở đường nhập `so_chuyen`: khai trong `ThanTao/ThanSua` ở `backend/api/routes/dieu_xe.py`, ánh xạ trong `services/dieu_xe.tao()/sua()`, thêm ô chọn 1–3 ở `frontend/assets/trang/dieu_xe.js`. Chưa làm thì **mọi số km của BC09 đều thấp hơn thực tế**.
5. **Chốt GCN-02 rồi sửa `backend/services/de_nghi.py::so_ngay_gia_cong`.** Tài liệu (docs/04 GCN-02, docs/02 §6) và Excel đều ưu tiên `NHA_CUNG_CAP.KY_HAN_QUY_DINH`; mã nguồn không đọc cột đó. Phải sửa một trong hai cho khớp — đang lệch thì mọi kỳ hạn gia công ngoài đều sai với NCC có kỳ hạn riêng.
6. **Cài luật trừ một ngày ở `backend/services/bao_gia.py::tao_yeu_cau_bao_gia()`** (`YCBG_DONG.KY_HAN_YC = dong.KY_HAN_YC − 1`) và truyền `dong.GHI_CHU` vào `repo.tao_ycbg_dong()`. Hai dòng sửa, giải quyết việc NCC bị hẹn muộn hơn một ngày và ghi chú kỹ thuật bị rơi mất.
7. **Chốt thuế suất VAT trước khi in ra giấy** — Excel gắn cứng 8%, tham số `VAT_SUAT` trong `backend/services/tinh_tien.py` mặc định 10.
8. **Chốt giờ chốt điều xe**: sơ đồ "Quy Trình điều vận" ghi ba lần "trước 16h00", `services/dieu_xe.tao` dùng `GIO_CHOT_DIEU_XE` mặc định 15:45. Lệch 15 phút mà DX-03 lại đẩy sang ngày làm việc kế tiếp.
9. **Thống nhất một quy ước dấu và một đơn vị cho "số ngày trễ"** trên toàn hệ thống (`SO_NGAY_SOM_TRE` âm-là-trễ theo ngày làm việc vs `SO_NGAY_TRE_LICH` dương-là-trễ theo ngày lịch), rồi ghi chú rõ trên giao diện rằng hệ thống đếm ngày làm việc còn sổ cũ đếm ngày lịch — nếu không, người dùng đối chiếu sẽ kết luận hệ thống sai.
10. **Viết tài liệu ánh xạ dữ liệu điều xe cũ trước khi nạp**: ba cột của "Quản lý điều xe" mang nhãn sai so với công thức (O="Vùng" thật ra là Khu vực, U="Người liên hệ" thật ra là Số km, V="STĐ" thật ra là Người liên hệ) trên 685 dòng. Kèm bảng quy đổi **Tên viết tắt NCC → MA_NCC**, nếu không toàn bộ 685 chuyến mất liên kết đối tác. Và ánh xạ cột "MÃ VẬT TƯ" của sheet TONG HOP sang `DE_NGHI_DONG.MA_CHUNG_LOAI` (KHÔNG sang `VAT_TU.MA_VAT_TU`), nếu không sẽ sinh hàng trăm mã vật tư rác.
11. **Chốt cách xử lý số tiền của dữ liệu đã lưu trữ**: Excel đóng băng thành tiền, hệ thống theo DH-02 tính lại mỗi lần đọc → một lần sửa đơn giá làm đổi cả số liệu quá khứ.

### P1 — Chức năng đang dùng hằng ngày mà hệ thống không có

12. **Viết sáu mẫu in còn thiếu trong `backend/services/in_pdf.py` cùng các route `/in`**, theo thứ tự khẩn: (a) **PGH nội bộ QT-KV-01-BM03** (docs/F05 §57 đã đặc tả `GET /nhan-hang/{id}/in`) — có ba người ký, không in thì nghiệp vụ đứng; (b) **Phiếu yêu cầu thanh toán trả trước** (docs/F08 §3); (c) **Phiếu bàn giao chứng từ** (docs/F08 §3) — chứng từ Kế toán ký nhận; (d) **BM04 Yêu cầu báo giá** (docs/F03 §50); (e) **Lệnh mua hàng**; (f) **BM03 Danh mục NCC phê duyệt** và **BM08 Sổ theo dõi tình trạng NCC**.
13. **Thêm bảng tham số "khối tiêu đề tài liệu"** (mã hiệu · phiên bản · ngày phát hành · mức bảo mật · tên công ty · địa chỉ trụ sở · địa chỉ chi nhánh · mã số thuế · email nhận hoá đơn · logo) và cắm vào `in_pdf._dau_trang`, thay hằng `TEN_CONG_TY` gắn cứng ở dòng 44. Mẫu chuẩn lấy từ ba sheet **Logo HĐ**.
14. **Làm màn hình GIAO VIỆC.** Backend đã đủ (`POST /cong-viec/giao`, `GET /cong-viec`, `GET /cong-viec/{id}`, `/thong-ke`, `/tra-lai`, `/xac-nhan`) nhưng **không màn hình nào gọi**; lối duy nhất giao được việc hiện nay là nút trong khung trò chuyện (`frontend/assets/tro_chuyen.js`) và lối đó cố ý không cho chọn dòng đề nghị. Tức là **không có nơi nào để Trưởng BP Mua hàng chọn N dòng rồi phát một lệnh mua hàng** — đúng việc mà sheet LỆNH MUA HÀNG NEW làm.
15. **Làm bảng chi tiết cho "Việc của tôi"** — gọi `GET /cong-viec/{id}` (giao diện chưa gọi bao giờ) và bổ sung JOIN sang `DE_NGHI` trong `repo_don_hang.lay_dong_cong_viec` để có đủ 11 cột của sheet LMH THIEN. Thêm ô sửa nhanh **TRẢ LỜI KỲ HẠN** ngay trên hàng đợi việc.
16. **Làm màn hình lập yêu cầu thanh toán.** `frontend/assets/trang/thanh_toan.js` không gọi `POST /yeu-cau-thanh-toan` lần nào; màn hình rỗng chỉ dẫn "mở trang Đơn hàng rồi bấm Yêu cầu thanh toán" nhưng `don_hang.js` cũng không có nút đó. Backend đã sẵn sàng.
17. **Cài quy tắc mã tài liệu lệnh mua hàng** dạng `NNN/MMYYYY/ĐN/MH`: thêm cột THÁNG vào `BO_DEM_CHUNG_TU` (hiện chỉ TIEN_TO · NAM · SO_HIEN_TAI nên không đếm theo tháng được), và cho `giao_viec()` ghi vào `CONG_VIEC.SO_PHIEU_CU`.
18. **Thêm khoá ngoại và bước kiểm cho `MA_CHUNG_LOAI` và `MUC_DICH_SU_DUNG`** trên `DE_NGHI_DONG` (mig 007 + `services/de_nghi.py`). Hai bảng danh mục đã có sẵn 27 và 12 mã.
19. **Bổ sung 26 mã `LOAI_GIA_CONG` còn thiếu** (mig mới), dẫn đầu **LÀM ĐEN** (917 dòng) và nhóm **sửa chữa máy móc**, kèm số ngày chuẩn cho từng mã. Thêm mã ngành nghề tương ứng cho `NHA_CUNG_CAP.NGANH_NGHE`, trong đó có "MẠ KẼM TẤM LỚN" và "CẮT CHẤN" chưa có.
20. **Thêm ba danh mục thanh toán** (`LY_DO_THANH_TOAN`, `HINH_THUC_THANH_TOAN`, `LY_DO_YEU_CAU`) vào `backend/config/danh_muc_dinh_nghia.py` đúng như docs/F08 §4 đã chốt, và **cài luật tính số tiền đợt theo tỷ lệ** lấy từ hình thức thanh toán.
21. **Thêm danh mục MÀU SƠN** gộp hai sheet workbook B thành một bảng ba khoá (mã bản vẽ · mã màu khách · mã sơn công ty dùng) + công ty áp dụng, và **bắt buộc phiếu sơn tĩnh điện phải có mã màu** (thiếu mã màu là nguyên nhân chờ hàng thấy rõ trong dữ liệu).
22. **Bổ sung các ô nhập còn thiếu**: biểu mẫu NCC (9 ô: Địa chỉ · Người liên hệ · SĐT · SĐT 2 · Fax · Mail · Có hoá đơn 3 trạng thái · Công nợ · Tiền mặt) + 5 trường trong `ThanTaoNCC`; biểu mẫu điều xe (Số chuyến · Khu vực · Số phiếu cũ · Phụ xe, và bốn cột dòng Kích thước/Số lượng/ĐVT/Trọng lượng thay cho việc cắt textarea).
23. **Bổ sung cột SELECT còn thiếu trong 5 truy vấn** (rẻ, làm nhanh): `repo_giao_hang_noi_bo.lay_dong` (+6 cột từ DE_NGHI/DE_NGHI_DONG) · `repo_xac_nhan_kt.hang_doi_ky_thuat` (+LENH_SAN_XUAT, MA_VACH, ID_SP_CU) · `repo_dieu_xe._COT_HIEN` (+NGUOI_LIEN_HE, SDT của NCC, +THOI_GIAN_TOI_NOI_PHUT) · `repo_kiem_tra_dau_vao.danh_sach_hkph` (+5 cột của BM08) · BC02 (+BAT_KHA_THI, TRA_LOI_KY_HAN, tên NCC, nội dung gia công, ngày dự kiến về).
24. **Nối nút "Tải xuống" của BM03** — endpoint `GET /nha-cung-cap/tai-xuong` đã có nhưng giao diện không hề gọi; đồng thời gỡ mâu thuẫn quyền (`danh_muc_phe_duyet()` đòi đồng thời `ncc/xem` và `bao_cao/xuat` trong khi docs/06 §3 không cấp `xuat` cho trang `ncc`) và chốt quy tắc che ba cột liên hệ khi in.
25. **Mở rộng bộ lọc bảng theo dõi**: backend `_menh_de_tien_do` thêm CHỦNG LOẠI · MỤC ĐÍCH SỬ DỤNG · TÌNH TRẠNG YC (ba cột người dùng lọc nhiều nhất), và nối các bộ lọc backend đã hỗ trợ (khoảng ngày · Bộ phận · NCC · NV mua hàng) ra giao diện đúng như docs/F04 §4.1; thêm nút **Tải xuống** mà đặc tả đã vẽ.
26. **Mở rộng tra cứu kho lưu trữ** — `luu_tru.tra_cuu_kho` hiện chỉ nhận `loc['id']`; phải tra được theo tên hàng, NCC, lệnh sản xuất, khoảng ngày, và **đưa ra khỏi màn hình `quan_tri`** vì người cần nó là nhân viên mua hàng. Đồng thời **chốt tiêu chí lưu trữ**: theo trạng thái (như Excel) hay theo mốc thời gian (như `THU_TU_LUU_TRU` hiện nay).

### P2 — Báo cáo (theo thứ tự người dùng hỏi nhiều nhất)

27. **Cho BC02 lọc theo `LOAI='GIA_CONG_NGOAI'`** và bổ sung 4 cột → có ngay "Báo cáo ngày GCN".
28. **Tách ba bậc sớm / đúng / trễ** ở BC02, BC05 và `kpi_cop03` (hiện gộp "sớm" vào "đúng"), kèm dòng tổng → có "Trang thai ma 1722" và "Báo cáo tuần GCN".
29. **Thêm nhóm theo TUẦN** (`_khoang_tuan` bên cạnh `_khoang_thang`) — người dùng đang gọi tên "tuần 34".
30. **Thêm mẫu số cho BC08** (tổng số phiếu trong tháng) để tính tỉ lệ khẩn cấp, và đếm theo PHIẾU chứ không theo DÒNG; thêm trường "lãnh đạo duyệt khẩn".
31. **Thêm báo cáo theo CHỦNG LOẠI và theo MỤC ĐÍCH SỬ DỤNG** (hai grep cùng ra 0 kết quả trong `repo_bao_cao.py`).
32. **Thêm cột tiền vào BC05** (giá trị mua theo NCC theo kỳ) và **cột GHI CHÚ vào BC03** (lý do tồn đọng — cần thêm cột ghi chú vào view `V_TINH_TRANG_MA_HANG`), **cột `ID_SP_CU` vào view** để đối chiếu ngược sổ cũ.
33. **Cho BC04 nhận khoảng ngày** (`tu_ngay`/`den_ngay`) và bổ sung 10 cột còn thiếu.
34. **Thêm cụm báo cáo thanh toán** (đưa màn hình `thanh_toan` vào `bao_cao.BAO_CAO`): sổ YCTT, công nợ đến hạn theo NCC và theo kỳ hạn, sổ bàn giao chứng từ theo kỳ, sổ YCBG quá hạn trả lời.
35. **Thêm cụm báo cáo điều xe**: bảng kê chi tiết lấy hàng cho tài xế (đủ Người liên hệ · SĐT · Tiền trả tại chỗ · dòng tổng tiền tuyến), bản in gom theo TUYẾN và theo TÀI XẾ, in gộp nhiều phiếu theo lịch ngày, thống kê km/chuyến theo Khu vực · Tài xế · Xe · Đối tác · Loại xe và ma trận Khu vực × Hạng mục, tổng kết cuối ngày "tài xế có đi đủ không".
36. **Thêm báo cáo còn lại của gia công ngoài**: tồn đọng GCN (tên biểu mẫu đã in trên ba sheet Logo HĐ), khối lượng "làm đen" theo tháng và theo NCC (tính bằng Kg), chi phí gia công theo kỳ, và "Quản lý công đoạn hàng đã giao QC".
37. **Thêm báo cáo nội bộ còn thiếu**: sổ lệnh mua hàng đã phát trong tháng và bảng hàng đợi toàn bộ NV mua hàng (`thong_ke_giao_viec` và `thong_ke_nhan_vien` đã có, chỉ thiếu màn hình), thống kê xác nhận kỹ thuật, sổ dòng bị huỷ theo người và theo lý do.

### P3 — Nhãn, trải nghiệm và những thứ cần hỏi lại người dùng

38. **Cắm bảng nhãn ở mục 3 vào `bao_cao.py::_nhan_cot`** và vào các màn hình — hiện xuất tệp ra "Ten hang chup", "So luong nhan", "Ket luan iqc".
39. **Áp luật in trống thay vì in số 0** khi xuất tệp (`IF(x=0,"",x)` của Excel) — "0" trong sổ cũ nghĩa là "chưa có", không phải "bằng không".
40. **Thêm luật sinh QUY CÁCH chuẩn từ kích thước** ở máy tính vật liệu (`Vật liệu (D*R*T mm)`) và đẩy sang dòng chứng từ; thêm chiều ngược của VAT; thêm tính **diện tích bề mặt** cho 3 hình dạng; thêm ô nhập độ dày thành ống để máy tự quy ra đường kính trong; thêm hai bảng danh mục **đơn giá cắt lazer** và **tốc độ cắt** theo độ dày.
41. **Ghi chú công khai bốn khác biệt có chủ ý** để người dùng không tưởng hệ thống sai: π = 3,14159 (Excel 3,14, lệch ~0,05% với hình tròn/ống) · đếm ngày làm việc thay ngày lịch · BC03 chỉ đếm dòng chưa nhận nên con số nhỏ hơn sổ cũ · hai cột TT ĐẶT HÀNG + TT GIAO HÀNG gộp thành một `TINH_TRANG` (dù 4.010/9.104 dòng đang "CHƯA ĐH" và người dùng vẫn quen lọc theo đó).
42. **Danh sách câu hỏi phải chốt với người dùng trước khi thi công tiếp:** (a) cột TUẦN của sổ mua hàng rỗng 100% — đã bỏ hẳn chưa? (b) bỏ khổ A5 của PGH nội bộ có chấp nhận được không (đang dùng cho phiếu ít dòng để tiết kiệm giấy)? (c) tên quy đổi trên PGH nội bộ phải là tên **nội bộ** (ngược với đơn đặt hàng) — xác nhận? (d) hệ số 1,2 ở máy tính vật liệu là hao hụt cắt hay phụ phí? (e) sổ "Theo dõi PGH làm đen" đưa vào chung luồng đề nghị GCN hay giữ riêng? (f) cách ghi ghép số PGH kiểu "06-206/06-342" sẽ không còn — báo trước; (g) hai mức khẩn cấp gắn đích danh lãnh đạo có giữ không, hay chỉ cần cờ "đã được BLĐ duyệt khẩn"?