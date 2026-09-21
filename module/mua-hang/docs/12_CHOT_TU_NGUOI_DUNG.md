# CHỐT TỪ NGƯỜI DÙNG — 02/09/2026

Tài liệu này ghi lại những gì anh Long đã chốt, để mọi người thi công dùng
chung một nguồn. **Đây là nguồn ưu tiên cao nhất** — cao hơn suy đoán từ Excel
hay từ tài liệu cũ.

---

## 0 · Khi tài liệu chọi nhau thì nghe ai

Đợt này có hai nguồn cùng mô tả hệ thống, và chúng **mâu thuẫn nhau ở phần
nhìn**. Đọc kỹ mục này trước, nếu không sẽ có người sửa đúng thành sai.

| Vấn đề | Nghe theo | Vì sao |
|---|---|---|
| **Logic nghiệp vụ** — luồng, trạng thái, quy tắc DN-xx/BG-xx, ai được làm gì | `HTMH - Mô tả Chức năng` + `Feedback 1` | Anh Long đã duyệt từng dòng. |
| **Hình thức trình bày** — màu, cỡ chữ, biểu tượng, bố cục | `docs/09_DAC_TA_GIAO_DIEN.md` | Ra đời **sau**, theo yêu cầu thiết kế lại giao diện. |

### Điểm chọi nhau cụ thể — ĐỪNG sửa ngược

`Mô tả Chức năng §2.11` viết: *"Trạng thái — Viên màu: **xanh lá** là xong,
**vàng** là chờ, **đỏ** là vấn đề."*

Câu đó **không còn hiệu lực về màu**. Sau đó anh Long yêu cầu:

> *"màu sắc thì xài nhiều màu thay vì chỉ tập trung vào các màu chủ đạo của
> bộ nhận diện thương hiệu"* → chỉ dùng **xanh `#283A97`**, **đỏ `#EE202E`**
> và thang trung tính.

Nên bảng màu trạng thái hiện tại là **đúng**:

| Ý nghĩa | §2.11 nói | Hệ thống đang dùng | Kết luận |
|---|---|---|---|
| Xong | xanh lá | `.p-ok` — nền xanh nhạt `var(--blue-1)`, chữ xanh thương hiệu | **Giữ nguyên.** Đây là điểm §2.11 đã bị thay. |
| Chờ | vàng | `.p-vang` — hổ phách `#FFF4E0` / chữ `#8A5A00` / viền `#E0A030` | **Giữ nguyên.** Vẫn là vàng, đúng §2.11. |
| Vấn đề | đỏ | `.p-r` đỏ đặc · `.p-ro` đỏ viền | Hai bên trùng nhau, không phải sửa. |

Ba điều dễ hiểu nhầm khi soát bảng trên:

1. **Vàng hổ phách KHÔNG phải vi phạm bộ nhận diện.** Lớp `.p-vang` nằm sẵn
   trong `hd.css:396` — tệp nền của hệ thống thiết kế gốc, dùng chung với
   phần mềm Kế hoạch sản xuất. Nó là màu **cảnh báo của nền tảng**, không
   phải màu ai đó tự thêm. **Không được sửa `hd.css`.**
2. **Đừng đi tìm `.p-b` cho trạng thái "xong".** `.p-b` dùng cho trạng thái
   **đang chạy** (`DANG_GIAO`, `DANG_MUA`, `DA_DAT_HANG`…). "Xong" là `.p-ok`.
3. **Bảng tra đầy đủ nằm ở `MAU_TRANG_THAI`** trong `frontend/assets/app.js`
   (khoảng dòng 187). Thêm trạng thái mới mà quên khai ở đó thì `pill()` rơi
   về `.p-k` — viên **đen** cho mọi trạng thái, và **không có lỗi nào báo ra**
   vì `p-k` là lớp hợp lệ. Đây là lỗi câm, đã xảy ra một lần với bốn mức độ
   của phiếu sự cố.

**Cái §2.11 vẫn còn nguyên hiệu lực** là *ý nghĩa* và *cách phân biệt*: trạng
thái phải là **viên màu**, và ba nhóm nghĩa xong / chờ / vấn đề phải **nhìn
là tách được**. Chỉ có tên màu là đã thay.

Ba quy ước còn lại của §2.11 — tiền `2.268.000`, số lượng `5,44`, ngày
`dd/mm/yyyy`, sớm/trễ dương–âm — **giữ nguyên toàn bộ**, không thuộc diện
thay đổi.

---

## 1 · Lịch làm việc công ty

Nguồn: `Tài liệu Soạn thảo/Huỳnh Đức - Lịch làm việc dự kiến.pdf`

- **Nghỉ hằng tuần: CHỦ NHẬT.** Thứ bảy **VẪN LÀM VIỆC**.
- Ngày nghỉ khác đánh dấu màu đỏ trên lịch.
- **19/04/2026 làm bù** cho thứ bảy 02/05/2025.

⚠ Hệ thống hiện có 15 ngày nghỉ khai trong `LICH_NGHI`, phần lớn là Chủ nhật
rời rạc — **không khớp** lịch này. Phải nạp lại theo đúng tệp PDF.

## 2 · Số ngày xử lý theo mức ưu tiên

| Mức ưu tiên | Số ngày làm việc |
|---|---|
| 1 | **3 ngày** |
| 2 | **5 ngày** |
| 3 | **7 ngày** |

Dùng cho kiểm điểm bất khả thi: *ngày đề nghị (đã tính giờ chốt) + số ngày
theo mức ưu tiên* → ngày dự kiến hàng về. **Đếm theo ngày làm việc của lịch
công ty**, không phải ngày lịch. Chỉ khi ngày dự kiến về **muộn hơn** kỳ hạn
cần hàng mới đánh dấu bất khả thi.

Với gia công ngoài: cộng theo **thời gian gia công tiêu chuẩn** của danh mục
loại gia công. Nếu khác thì yêu cầu **TBP Mua hàng điền thời gian đã thống
nhất với nhà cung cấp**.

## 3 · Bộ lọc chuẩn — dùng chung toàn hệ thống

Đúng bảy trường, theo thứ tự:

1. **Nhà cung cấp**
2. **Lệnh sản xuất**
3. **Mã hàng**
4. **Mã vạch**
5. **Số phiếu đề nghị**
6. **Loại ưu tiên**
7. **Tình trạng**

## 4 · Quy tắc đánh số chứng từ

Nguồn: `Tài liệu Soạn thảo/HTMH - Quy tắc đánh số biểu mẫu.xlsx`, sheet
*So sanh ma*. Cột giữa là mã hệ thống đang dùng, cột phải là cách bộ phận Mua
hàng đang đánh số.

| Loại | Hệ thống đang dùng | Bộ phận Mua hàng đang dùng |
|---|---|---|
| Phiếu đề nghị mua vật tư | `DN-2026-000123` | `[Tên bộ phận]-[ddmm]-[STT trong ngày]` — ví dụ `GCCX-0908-03` |
| Báo giá | `BG-2026-000045` | `[Mã NCC]-[ddmm]-[STT trong ngày]` — ví dụ `FJ-0908-01` |
| Đơn hàng mua | `PO-2026-000156` | `[Mã][yymm][STT trong tháng]` — ví dụ `HDBH2608001` |
| Phiếu GCN | — | `[MM]-[STT trong tháng]` — ví dụ `08-001` |
| Phiếu nhận *(đang gọi là PHIẾU YÊU CẦU NHẬP KHO NGUYÊN LIỆU VẬT TƯ)* | `NH-2026-000341` | `[MM]-[STT trong tháng]` — ví dụ `08-001` |
| Nhà cung cấp | `NCC-00123` | Đang đặt theo tên thường gọi / viết tắt. **BP Mua hàng không có ý kiến — tự đặt theo chuẩn số hoá** |

### Phản hồi 1 §2.5 nói gì

> *"Cách đánh số bất kì chứng từ nào phải theo tiêu chuẩn của công ty —
> **không nên tự tạo**. Xác nhận các hạng mục bạn cần biết cách đánh số chứng
> từ. Tôi sẽ yêu cầu bộ phận mua hàng cung cấp."*

Anh Long **đã cung cấp** — chính là bảng trên. Phản hồi này coi như **đã có
câu trả lời**, phần còn lại là thi công.

### Cách làm

Giữ mã hệ thống (`DN-2026-000123`) làm **khoá chính** — nó bảo đảm độc nhất,
sắp xếp được, và không phụ thuộc vào việc bộ phận có đổi cách đánh số hay
không. Song song, **sinh** số phiếu theo đúng chuẩn công ty và lưu ở
`SO_PHIEU_CU`.

**Nhưng "không nên tự tạo" quyết định cái nào hiện TO trên màn hình:**

| Vị trí | Hiện cái nào |
|---|---|
| Tiêu đề phiếu, danh sách, kết quả tìm kiếm | **Số công ty** (`GCCX-0908-03`) |
| Bản in và tệp xuất | **Số công ty** |
| Dòng phụ dưới tiêu đề, `id` trong đường dẫn, khoá ngoại | Mã hệ thống |
| Ô tìm kiếm | **Tìm được bằng cả hai** |

Người dùng đọc số nào trên giấy thì gõ đúng số ấy vào máy được. Đó là toàn bộ
mục đích của phản hồi §2.5.

### Bộ đếm — chỗ dễ làm sai nhất

Ba chuẩn dùng ba loại bộ đếm **khác nhau**, không dùng chung được:

| Loại | Bộ đếm reset theo | Khoá độc nhất |
|---|---|---|
| Đề nghị `GCCX-0908-03` | **mỗi bộ phận, mỗi ngày** | (bộ phận, ngày) |
| Báo giá `FJ-0908-01` | **mỗi NCC, mỗi ngày** | (NCC, ngày) |
| Đơn hàng `HDBH2608001` | **mỗi tháng** | (tháng) |
| Phiếu GCN / phiếu nhận `08-001` | **mỗi tháng** | (tháng) |

Cấp số phải nằm **trong cùng giao dịch** với việc tạo phiếu và phải chịu được
hai người bấm Tạo cùng lúc — nếu không sẽ có hai phiếu `GCCX-0908-03`. Dùng
đúng cơ chế `sinh_ma.py` đang dùng cho mã hệ thống, đừng viết cơ chế thứ hai.

### Hai chỗ còn mơ hồ — cần anh Long xác nhận

1. **`[Mã]` trong `HDBH2608001` là gì?** Suy từ tệp mẫu `HDBH2608207.pdf` thì
   `HDBH` là một chuỗi **cố định** của công ty (không đổi theo NCC hay bộ
   phận), `2608` = tháng 08/2026, `207` = số thứ tự trong tháng. Cần xác nhận
   `HDBH` có phải hằng số không, và số thứ tự là **3 chữ số**.
2. **`[Tên bộ phận]` trong `GCCX-0908-03` lấy từ đâu?** `GCCX` trông như viết
   tắt của một xưởng. Cần **bảng quy đổi mã bộ phận → chữ viết tắt** dùng trên
   số phiếu, vì `MA_BO_PHAN` trong hệ thống chưa chắc trùng.

Chưa có hai câu trả lời này thì vẫn chạy được: hệ thống dùng `MA_BO_PHAN` sẵn
có và số thứ tự 3 chữ số, và đổi lại chỉ là sửa một bảng quy đổi.

## 5 · Mã vật tư — ĐỊNH DANH KÉP, phân loại để sau

> **CHỐT MỚI 02/09/2026 (chiều) — thay thế mọi diễn giải trước đó.**
>
> *"Các danh mục vật tư + nhóm hiện tại chỉ mang tính chất **so sánh và
> informative**. **Không có dấu hiệu phân loại**. Tôi sẽ phân loại vật tư
> sau. Bây giờ, lấy **cả mã vật tư và tên hàng làm primary key** để phát
> triển hệ thống trước (quản lý độc nhất). Sau này, tôi sẽ gửi bạn hệ thống
> phân mã vật tư kèm phân loại nhóm vật tư sau."*

### 5.1 Điều này bác bỏ cái gì

Bảng mười nhóm trong sheet *"So sanh ma"* (`SAT` · `INOX` · `NHOM` · `BUL` ·
`DIEN` · `DCC` · `DCU` · `SON` · `BOBI` · `GCN`) **KHÔNG phải** một hệ phân
loại. Chính tên sheet đã nói: bảng để **so sánh** cách đặt mã của hai bên.

Migration `060` đã đọc nó thành chuẩn phân nhóm và tự suy ra quan hệ cha–con
cho 14 chủng loại. **`061_go_phan_loai_tu_suy.sql` đã gỡ toàn bộ phần suy
luận đó.** Hiện trạng sau khi gỡ:

| | |
|---|---|
| 27 chủng loại gốc | **hoạt động**, không cha không con, y như trước |
| 8 mã nhóm do 060 tạo | **ngưng** — giữ lại làm mã dành sẵn, không hiện trong ô chọn |
| Quan hệ cha–con | **0** |
| Cột `MA_CHUNG_LOAI_CHA` và cơ chế cây | **giữ nguyên** — là hạ tầng, chờ dữ liệu thật |

Ngày anh Long gửi hệ phân mã, người làm chỉ nhập dòng và nối cha–con trên màn
hình Danh mục. Không cần migration, không cần bản mới.

### 5.2 Quy tắc độc nhất đang thi hành

Hai dòng là **cùng một mặt hàng** khi trùng **CẢ tên lẫn mã**:

| Tình huống | Xử lý |
|---|---|
| cùng TÊN, khác MÃ | **cho phép** — hai biến thể |
| cùng TÊN, cùng MÃ | **chặn** |
| cùng TÊN, cả hai **chưa có mã** | **chặn** — "trống" cũng là một giá trị mã |
| cùng TÊN, một chưa có mã một đã có | **cho phép** |
| khác TÊN, cùng MÃ | **chặn** — một mã không mang hai mặt hàng |
| khác TÊN, cả hai chưa có mã | **cho phép** |

Cơ chế: `ux_vattu_ten_ma UNIQUE (TEN_HANG, COALESCE(MA_VAT_TU, ''))` cộng
`vat_tu_ma_vat_tu_key UNIQUE (MA_VAT_TU)`. Cột `MA_VAT_TU` **cho phép để
trống**.

Đã kiểm chứng cả sáu tình huống bằng ghi thật qua API (`POST /vat-tu`) và
khoá lại bằng `tests/test_danh_muc.py::test_dinh_danh_vat_tu_dung_ca_ma_lan_ten`.

### 5.3 Hệ quả cho phần còn lại của hệ thống

- **Không chức năng nào được đòi có mã** mới cho lập chứng từ. Dòng đề nghị,
  đơn hàng, phiếu nhận đều phải chạy được với mặt hàng chưa cấp mã.
- **Mọi chỗ hiển thị mặt hàng phải hiện CẢ HAI** — mã và tên. Chỗ chưa có mã
  hiện `— chưa có mã` chứ không để trống, để người đọc phân biệt được "chưa
  cấp" với "quên hiển thị".
- **Câu hỏi A1 của `docs/11` không còn chặn.** Chuẩn tiền tố mã là việc của
  đợt sau; hệ thống phát triển tiếp mà không chờ.

## 5-cũ · Ghi chép gốc từ sheet So sanh ma

> *"Kho đang phụ trách đặt mã. Bên mua hàng chỉ phân loại nhóm hàng chính cho
> dễ tra cứu."*

Mười nhóm chốt cho `MA_CHUNG_LOAI`:

| Mã nhóm | Tên nhóm |
|---|---|
| `SAT` | Sắt thép |
| `INOX` | Inox |
| `NHOM` | Nhôm |
| `BUL` | Bulong ốc vít |
| `DIEN` | Vật tư điện |
| `DCC` | Dụng cụ cắt |
| `DCU` | Dụng cụ đo |
| `SON` | Sơn |
| `BOBI` | Bạc đạn |
| `GCN` | Gia công ngoài |

**Hệ quả:** 11 mã nhóm ngoài chuẩn từng nêu ở `docs/11` (`ST` `IN` `TMC` `GC`
`ELI` `LK` `POL` `PK` `KM` `DO` `HC`) là **mã của Kho**, không phải việc của
Mua hàng. Giữ nguyên cách hai cửa hiện tại: mã mới theo chuẩn, mã cũ nạp qua
cửa riêng.

**Cách chọn mã khi lập đề nghị:** người đề nghị chọn **nhóm hàng** rồi chọn
**mặt hàng**, hoặc chọn **"MÃ MỚI"** nếu Kho chưa cấp mã. Mã để trống thì dựa
vào **tên hàng**; Kho vận cập nhật mã khi hàng về.

## 6 · Biểu mẫu in

Nguồn: `Tài liệu Soạn thảo/HTML - Form mẫu in ấn/`

| Biểu mẫu | Định dạng xuất | Khổ giấy | Số bản |
|---|---|---|---|
| Đề nghị vật tư & ĐN gia công ngoài | Excel **+ bản in** | A4 | 1 bản, Mua hàng giữ bản gốc ký sống + 1 tệp Excel trên nhóm |
| Báo giá (gửi hỏi giá NCC) | Excel **+ PDF** | A4 | Xuất tệp gửi NCC, **không in** |
| Đơn đặt hàng (gửi NCC — ra ngoài công ty) | **PDF** + bản in | A4 | 01 bản |
| Giao hàng nội bộ (Mua hàng → Kho vận) | Excel **+ bản in để ký** | **A5 và A4** | 1 bản gốc, Mua hàng bàn giao Kế toán sau khi ký và nhập hoàn thiện |
| Phiếu điều xe (giao tài xế) | **PDF** | A5 | Gửi Điều vận, Mua hàng **không lưu** |

**Yêu cầu layout** (không cần sao chép y hệt mẫu, nhưng phải chuẩn hoá):
logo · tên biểu mẫu · mã số tài liệu · màu theo bảng màu công ty · thông tin
chung về công ty · spacing vừa khổ A4/A5 · **chỗ ký nhận** rõ ràng.
Vị trí logo, thông tin công ty và ô ký: **theo tệp mẫu**.

## 7 · Tiêu chí đánh giá nhà cung cấp và chấm báo giá

- **Đánh giá NCC:** đã có trong biểu mẫu liên quan. Nếu hệ thống chưa có →
  **báo để anh Long gửi biểu mẫu**.
- **Chấm báo giá:** tương tự tiêu chí đánh giá NCC nhưng **đơn giản hơn**. Có
  thể làm gọn lại, hoặc để người dùng tự đánh giá.

## 8 · Yêu cầu về biểu đồ

- **Bỏ tab "Chỉ số COP-03" riêng** — gộp chung vào Báo cáo.
- Mỗi loại báo cáo **không chỉ có bảng**: tuỳ mục đích mà dùng biểu đồ phù hợp
  để **giải thích và kể câu chuyện**.
- **Màu từng phần phải rõ ràng, dễ phân biệt.** Hiện các màu quá gần nhau.
- Lỗi cần sửa: chọn "báo cáo tổng quan" thì bị **chuyển ngược về tab Tổng
  quan**.

## 9 · Dữ liệu mô phỏng

Đã có dữ liệu cho báo cáo. **Còn thiếu** cho: Báo giá · Đặt hàng · Gia công
ngoài · và các tab khác. Cần đủ dữ liệu cho **toàn bộ** tab để đánh giá được
giao diện tổng thể.
