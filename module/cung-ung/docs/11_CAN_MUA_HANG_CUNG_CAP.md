# CẦN BỘ PHẬN MUA HÀNG CUNG CẤP

*Lập ngày 01/09/2026, sau khi đối chiếu 53 sheet của ba workbook Excel cũ với
hệ thống (xem [10_PHU_SONG_EXCEL.md](10_PHU_SONG_EXCEL.md)).*

Mỗi mục dưới đây là một thứ **hệ thống không tự suy ra được từ dữ liệu**. Chúng
tôi đã cố gắng đọc ngược từ Excel; những gì đọc được đều đã đưa vào hệ thống.
Phần còn lại cần người biết nghiệp vụ trả lời.

Cột **"Chưa có thì sao"** nói rõ hậu quả — để bộ phận Mua hàng biết cái nào gấp.

---

## A · CHẶN CỨNG — chưa có thì không chạy được

> ### ⚠ ĐỌC TRƯỚC — bốn mục A1 · A3-b · A4 · A5 KHÔNG CÒN CHẶN
>
> Anh Long trả lời chiều 02/09/2026:
>
> > *"Các danh mục vật tư + nhóm hiện tại chỉ mang tính chất so sánh và
> > informative. Không có dấu hiệu phân loại. Tôi sẽ phân loại vật tư sau.
> > Bây giờ, lấy cả mã vật tư và tên hàng làm primary key để phát triển hệ
> > thống trước. Sau này tôi sẽ gửi hệ thống phân mã vật tư kèm phân loại
> > nhóm vật tư sau."*
>
> Nghĩa là: **đừng chờ**. Bốn câu hỏi dưới đây chuyển từ *"chặn cứng"* sang
> *"nhận sau"*, và hệ thống phát triển tiếp bằng **định danh kép mã + tên**
> (xem `docs/12` §5). Giữ chúng ở đây để khi anh Long gửi bộ mã thì có sẵn
> danh sách việc phải làm — **không phải để hỏi lại**.
>
> | Mục | Nội dung | Trạng thái |
> |---|---|---|
> | A1 | 11 tiền tố mã ngoài chuẩn | nhận sau · Kho vận phụ trách |
> | A3-b | Danh mục vật tư thật chưa nạp | nhận sau · cùng đợt bộ mã |
> | A4 | 11 chủng loại chưa gom nhóm | nhận sau · **đã gỡ phần tự suy** |
> | A5 | 2 nhóm rỗng | không còn áp dụng · đã ngưng 8 mã dành sẵn |


### A1. Mười một mã nhóm vật tư ngoài chuẩn

> **ĐÃ CÓ TRẢ LỜI MỘT PHẦN (02/09/2026).** Anh Long: *"Kho đang phụ trách đặt
> mã. Bên mua hàng chỉ phân loại nhóm hàng chính cho dễ tra cứu."*
> → Câu hỏi bên dưới **đổi người nhận**: hỏi **Kho vận**, không phải Mua hàng.
> Phần phân nhóm mà Mua hàng phụ trách đã chốt xong, xem **A4**.


Chuẩn `QT-KV-01-PL02` quy định mã `VT-[tình trạng phôi]-…` với sáu tình trạng:
`NC` `LC` `TN` `TL` `PT` `PL`. Nhưng danh mục đang lưu hành có thêm **11 mã
nhóm khác**, phủ **9.573 mã**:

| Mã | Số mã đang dùng | Mã | Số mã đang dùng |
|---|---:|---|---:|
| `ST` | 3.650 | `PK` | 436 |
| `IN` | 1.170 | `KM` | 399 |
| `TMC` | 877 | `DO` | 313 |
| `GC` | 735 | `HC` | 157 |
| `ELI` | 632 | | |
| `LK` | 627 | | |
| `POL` | 577 | | |

**Cần trả lời:** mỗi mã trên nghĩa là gì, và nó hợp lệ hay sai chuẩn?

- Nếu **hợp lệ** → chúng tôi bổ sung vào chuẩn `docs/02 §1.1`, mã mới cũng
  dùng được.
- Nếu **sai chuẩn, sẽ cấp lại mã** → giữ nguyên cách hiện tại (hai cửa: mã mới
  theo chuẩn, mã cũ đi cửa riêng và được đánh dấu `TRUOC_HE_THONG`).

**Chưa có thì sao:** hệ thống vẫn nạp được danh mục cũ (đã mở cửa riêng), nhưng
không biết mã nào cần cấp lại, nên không lập được kế hoạch chuẩn hoá.

### A2. Bảy mươi sáu mã viết bằng dấu cách

Sheet **"Kho PO"** có 76 mã dạng `VT SX 01` — dùng **khoảng trắng** thay gạch
nối, và số thứ tự **2 chữ số** thay 3.

**Cần:** danh sách 76 mã này viết lại đúng dạng, hoặc xác nhận cho phép hệ
thống tự đổi `VT SX 01` → `VT-SX-001`.

**Chưa có thì sao:** 76 mã này không nạp được — hệ thống cố ý không nhận khoảng
trắng trong mã, vì cho phép sẽ sinh ra hai mã trông giống hệt nhau.

### A3. Bảng quy đổi tên viết tắt nhà cung cấp

Sheet **"Quản lý điều xe"** ghi đối tác bằng **tên viết tắt** (cột "Công ty
hoặc NCC"), không có mã. Hệ thống nối bằng `MA_NCC`.

**Cần:** bảng hai cột `Tên viết tắt → Mã nhà cung cấp` cho các đối tác xuất
hiện trong sổ điều xe.

**Chưa có thì sao:** **685 chuyến xe** trong dữ liệu cũ mất liên kết đối tác —
nạp lên hệ thống sẽ thành các chuyến không biết đi đâu, và báo cáo điều xe theo
đối tác sẽ rỗng.

---

### A3-b. Danh mục vật tư THẬT chưa được nạp vào hệ thống

Đo trên cơ sở dữ liệu demo ngày 02/09/2026: bảng `VAT_TU` có **511 dòng** —
500 dòng do bộ sinh dữ liệu mẫu bịa ra, 11 dòng hạt giống thử tay. **Không có
dòng nào** đến từ danh mục thật của công ty.

Danh mục thật vẫn nằm nguyên trong tệp nguồn, chưa mất mát gì:

| Sheet trong *Danh mục Tên hàng (Mua hàng + Gia công ngoài + Kho).xlsx* | Số dòng |
|---|---:|
| Mua hàng | 12.029 |
| Kho Vật tư PO | 10.105 |
| Gia công ngoài | 6.108 |
| Kho Hàng lẻ | 1.466 |
| Kho PO | 77 |

**Vì sao chưa nạp:** hệ thống chưa có trình nạp cho danh mục này
(`scripts/` có `nap_lsx.py`, `nap_nhan_su.py`, `nap_mau_son.py`,
`nap_lich_nghi.py` — **không có** `nap_vat_tu.py`), và quan trọng hơn là câu
hỏi **A1 chưa có lời giải**: 9.573 mã đang dùng 11 tiền tố ngoài chuẩn
`QT-KV-01-PL02`. Nạp trước khi chốt chuẩn nghĩa là nạp vào một danh mục mà
sau đó phải cấp lại mã cho gần một vạn dòng.

**Ảnh hưởng tới việc đánh giá giao diện:** ô chọn vật tư trên màn hình đang
được thử với 500 dòng. Con số thật là **hơn 12.000**. Ô chọn chạy mượt với
500 dòng **không chứng minh được gì** về việc nó có mở nổi trên điện thoại ở
xưởng hay không — đó chính là rủi ro mà migration 032 đã viết ra bằng chữ.

**Cần chốt:** có nạp danh mục thật vào bản demo để thử ở đúng quy mô không?

- **Có** → tôi viết `scripts/nap_vat_tu.py`, nạp với dấu riêng để gỡ ra được,
  và đo lại thời gian mở ô chọn ở quy mô thật. Mã nào sai chuẩn vẫn nạp được
  vì cửa mã cũ đã mở sẵn (`vat_tu.kiem_dinh_dang_ma`, cổng `cho_phep_ma_cu`).
- **Không** → giữ 500 dòng mẫu, nhưng **đừng kết luận** về tốc độ ô chọn vật
  tư từ bản demo này.

### A4. Mười một chủng loại chưa xếp được vào nhóm hàng chính

Anh Long đã chốt **10 nhóm hàng chính** (nguồn: *HTMH - Quy tắc đánh số biểu
mẫu.xlsx*, sheet "So sanh ma"). Hệ thống đã nạp đủ 10 nhóm và tự xếp được
**14 / 27** chủng loại đang có vào đúng nhóm — xem migration
`060_nhom_vat_tu_chinh.sql`.

**Mười một chủng loại còn lại chưa xếp**, vì xếp bừa thì hại hơn để trống:

| Chủng loại | Vướng ở đâu |
|---|---|
| `HHK` Hợp kim | Hợp kim **nhôm** hay thép **hợp kim**? Hai nhóm khác hẳn nhau. |
| `BAN_LE` Bản lề · `LO_XO` Lò xo · `LUOI` Lưới · `B_XE` Bánh xe | Đều là phần cứng lắp ráp nhưng **không phải bu lông ốc vít**. Gom vào `BUL` thì nhóm `BUL` mất tác dụng làm lối tắt. |
| `CU` Đồng · `NHUA` Nhựa · `GO` Gỗ · `MICA` Mica · `KHI` Khí | Là vật liệu **không nằm trong 10 nhóm chính**. |
| `KHAC` Khác | Bản thân đã là thùng chứa phần dư. |

**Cần trả lời — chọn một trong hai:**

1. **Xếp vào nhóm sẵn có** → cho biết chủng loại nào vào nhóm nào.
2. **Mở thêm nhóm chính thứ 11, 12…** → cho biết mã và tên nhóm.

**Chưa có thì sao:** 11 chủng loại này vẫn **tra cứu bình thường** — chúng nằm
ở gốc cây, ngang hàng với 10 nhóm chính, y như trước khi có phân nhóm. Chỉ là
chưa được gom lại.

**Trả lời rồi thì sửa ở đâu:** quản trị tự kéo trên màn hình **Danh mục →
Chủng loại**. **Không cần** migration mới, **không cần** triển khai bản mới.

### A5. Hai nhóm chính hiện chưa có chủng loại con nào

`DCU` (Dụng cụ đo) và `GCN` (Gia công ngoài) đã tạo nhưng **rỗng** — danh mục
27 chủng loại hiện tại không có mục nào thuộc hai nhóm này.

**Cần xác nhận:** đây là nhóm **đặt trước cho hàng sắp tới** (đúng như dự kiến),
hay danh mục đang **thiếu** các chủng loại dụng cụ đo / hạng mục gia công ngoài
mà lẽ ra phải có?

## B · SỐ LIỆU CHUẨN — chưa có thì hệ thống tính ra số sai

### B1. Thuế suất VAT

Excel gắn cứng **8%**; tham số `VAT_SUAT` của hệ thống mặc định **10%**.

**Cần:** thuế suất đúng đang áp dụng, và có mặt hàng nào dùng suất khác không.

**Chưa có thì sao:** đơn đặt hàng in ra sai tiền thuế.

### B2. Giờ chốt điều xe

Sơ đồ **"Quy Trình điều vận"** ghi ba lần **"trước 16h00"**; hệ thống dùng
`GIO_CHOT_DIEU_XE` mặc định **15:45**.

**Cần:** giờ chốt đúng.

**Chưa có thì sao:** lệch 15 phút, mà quy tắc DX-03 đẩy yêu cầu gửi sau giờ
chốt sang **ngày làm việc kế tiếp** — nên 15 phút này quyết định xe chạy hôm
nay hay ngày mai.

### B3. Kỳ hạn gia công ngoài lấy theo đâu

Tài liệu (`docs/04` GCN-02, `docs/02 §6`) và Excel đều ưu tiên
`NHA_CUNG_CAP.KY_HAN_QUY_DINH`; mã nguồn hiện **không đọc cột đó**.

**Cần:** xác nhận thứ tự ưu tiên khi tính kỳ hạn — kỳ hạn riêng của NCC trước,
hay số ngày chuẩn của loại gia công trước?

**Chưa có thì sao:** mọi kỳ hạn gia công ngoài với NCC có kỳ hạn riêng đều sai.

### B4. Hai mươi sáu mã loại gia công còn thiếu

Danh mục `LOAI_GIA_CONG` của hệ thống thiếu 26 mã đang dùng trong sổ, dẫn đầu
là **LÀM ĐEN** (917 dòng) và nhóm **sửa chữa máy móc**.

**Cần:** danh sách mã loại gia công đầy đủ, **kèm số ngày chuẩn cho từng mã**.
Kèm mã ngành nghề tương ứng cho nhà cung cấp — trong đó **"MẠ KẼM TẤM LỚN"** và
**"CẮT CHẤN"** hiện chưa có.

**Chưa có thì sao:** phiếu gia công ngoài cho các loại này không chọn được loại,
và kỳ hạn phải nhập tay từng phiếu.

### B5. Hệ số 1,2 ở máy tính vật liệu

Sheet **"CONG THUC"** nhân khối lượng với **1,2**.

**Cần:** đó là **hao hụt khi cắt** hay **phụ phí**? Áp cho mọi vật liệu hay chỉ
một số?

**Chưa có thì sao:** máy tính khối lượng ra số lệch 20% so với cách bộ phận đang
tính tay.

### B6. Đơn giá cắt lazer và tốc độ cắt

Sheet **"LAZER"** tra đơn giá và tốc độ theo độ dày vật liệu.

**Cần:** hai bảng này ở dạng bảng (độ dày → đơn giá, độ dày → tốc độ), theo
từng loại vật liệu.

**Chưa có thì sao:** không báo giá được việc cắt lazer trên hệ thống.

---

## C · XÁC NHẬN CÁCH LÀM — để hệ thống không làm khác thói quen

Bảy câu dưới đây chỉ cần trả lời **có / không** hoặc một câu ngắn.

| # | Câu hỏi | Vì sao hỏi |
|---|---|---|
| C1 | Cột **TUẦN** của sổ mua hàng đang rỗng 100% — đã bỏ hẳn chưa? | Nếu còn dùng thì phải thêm cột và cách đánh số tuần |
| C2 | Bỏ khổ **A5** của phiếu giao hàng nội bộ có được không? | Đang dùng A5 cho phiếu ít dòng để tiết kiệm giấy; hệ thống định in A4 tự co |
| C3 | Tên hàng trên **phiếu giao hàng nội bộ** phải là tên **nội bộ** (ngược với đơn đặt hàng dùng tên NCC) — xác nhận? | Hai chứng từ dùng hai tên khác nhau cho cùng một món |
| C4 | Sổ **"Theo dõi PGH làm đen"** gộp chung luồng đề nghị gia công ngoài, hay giữ riêng? | Quyết định có cần màn hình riêng không |
| C5 | Cách ghi ghép số phiếu kiểu **"06-206/06-342"** sẽ không còn — có chấp nhận? | Hệ thống cấp một mã cho một phiếu; muốn gộp thì phải thiết kế khác |
| C6 | Hai mức khẩn cấp **gắn đích danh lãnh đạo** (A. Huỳnh / A. Duy) có giữ không, hay chỉ cần cờ "đã được BLĐ duyệt khẩn"? | Gắn tên người vào cấu trúc dữ liệu thì đổi người là phải sửa hệ thống |
| C7 | Hai cột **TT ĐẶT HÀNG** và **TT GIAO HÀNG** đã gộp thành một `TINH_TRANG`. Người dùng vẫn quen lọc theo hai cột riêng (4.010/9.104 dòng đang "CHƯA ĐH") — có cần tách lại? | Ảnh hưởng bộ lọc của màn hình dùng nhiều nhất |

---

### C-mới. Phạm vi "cá nhân" — mình LẬP, hay mình ĐƯỢC PHÂN CÔNG?

`Mô tả Chức năng §2.2` định nghĩa phạm vi cá nhân là:

> *"Chứng từ mình lập **hoặc mình được phân công**"*

Mã nguồn hiện chỉ làm **vế đầu** ở năm chỗ. Chín câu truy vấn lọc theo
`NGUOI_TAO` — người **gõ** phiếu — và không xét cột người **được giao việc**:

| Bảng | Cột người được phân công đang bị bỏ qua | Hậu quả |
|---|---|---|
| `KET_QUA_IQC` | `NGUOI_KIEM` | Nhân viên QC đi kiểm lô hàng, nhưng phiếu do người khác gõ → **không thấy kết quả của chính mình**. |
| `NHAN_HANG` | `NGUOI_NHAN` | Thủ kho nhận hàng thật, người khác nhập máy → không thấy phiếu. |
| `GIAO_HANG_NOI_BO` | `NGUOI_GIAO`, `NGUOI_NHAN` | Như trên. |
| `YEU_CAU_BAO_GIA` | *(không có cột phân công)* | Không ảnh hưởng. |
| `DON_HANG` | *(không có cột phân công — nằm ở `DE_NGHI.NGUOI_MUA_HANG`)* | Cần nối ngược qua đề nghị nếu muốn làm. |

**Vì sao tôi KHÔNG tự sửa:** nới phạm vi là **mở rộng quyền nhìn dữ liệu**.
Ba bảng trên chứa kết quả kiểm tra chất lượng và chứng từ kho — mở rộng ai
thấy được là quyết định của anh Long, không phải của người viết mã. Sửa nhầm
hướng này không có lỗi nào báo ra: nó chỉ lặng lẽ cho thêm người xem thêm dữ
liệu.

**Cần chốt — chọn một:**

1. **Làm đúng §2.2** → thêm cột phân công vào bộ lọc phạm vi (3 bảng, mỗi
   bảng một dòng mã, đã có sẵn tham số `cot_nguoi_2` dùng cho đề nghị).
2. **Giữ nguyên** → sửa lại câu chữ §2.2 thành *"chứng từ mình lập"* cho khớp
   mã, để lần soát sau không ai báo lại đúng việc này.

**Chưa chốt thì sao:** trong thực tế người làm thường cũng là người gõ, nên
hai cách cho ra kết quả giống nhau **hầu hết thời gian** — sai lệch chỉ lộ ra
đúng lúc có người làm thay, tức là lúc bận nhất.

### C-mới-2. Tài khoản dùng khi trình bày hệ thống

Dữ liệu mô phỏng mang dấu `NGUOI_TAO = 'MAU_SINH'` để lệnh dọn `--xoa` tìm
lại được. `MAU_SINH` **không phải mã nhân viên thật**, nên với năm bảng ở mục
trên, tài khoản có phạm vi **cá nhân** sẽ thấy **màn hình trống**.

Đo thật trên máy chủ demo:

| Tài khoản | Phạm vi | Tab Đơn hàng | Tab Yêu cầu báo giá |
|---|---|---:|---:|
| `demo_nv_mua_hang` | cá nhân | **0** dòng | **1** dòng |
| `demo_tbp_mua_hang` | bộ phận | 646 | 181 |
| `demo_quan_tri_nghiep_vu` | toàn bộ | 646 | 181 |

**Khuyến nghị:** khi trình bày, đăng nhập bằng tài khoản **từ cấp trưởng bộ
phận trở lên**. Đây không phải lỗi — nó là ranh giới an toàn giữa dữ liệu mẫu
và dữ liệu vận hành, và chính ranh giới đó cho phép xoá sạch bộ mẫu trước khi
chạy thật.

## D · BỐN KHÁC BIỆT CÓ CHỦ Ý — báo trước để không tưởng hệ thống sai

Đây **không phải câu hỏi**, chỉ là thông báo. Khi đối chiếu số của hệ thống với
sổ Excel cũ sẽ thấy lệch ở bốn chỗ, và cả bốn đều là **cố ý**:

1. **Số π** — hệ thống dùng `3,14159`, Excel dùng `3,14`. Lệch khoảng **0,05%**
   khi tính hình tròn và hình ống. Hệ thống chính xác hơn.
2. **Đếm ngày làm việc, không đếm ngày lịch.** Kỳ hạn và số ngày trễ của hệ
   thống bỏ qua Chủ nhật và ngày nghỉ; sổ cũ đếm hết. Cùng một phiếu, hệ thống
   sẽ ra số ngày **nhỏ hơn**.
3. **Báo cáo tồn đọng (BC03) chỉ đếm dòng CHƯA NHẬN**, sổ cũ đếm cả dòng đã
   nhận một phần. Con số của hệ thống sẽ **nhỏ hơn**.
4. **Tiền được tính lại mỗi lần đọc** (quy tắc DH-02), Excel đóng băng thành
   tiền lúc gõ. Sửa đơn giá của một đơn hàng cũ sẽ làm đổi số liệu quá khứ —
   nếu bộ phận muốn giữ nguyên số đã chốt thì phải nói, chúng tôi sẽ đóng băng.

---

## E · ĐÃ XỬ LÝ, KHÔNG CẦN CUNG CẤP GÌ

Ghi lại để bộ phận khỏi mất công tìm:

- **Mã vật tư để trống** — hệ thống đã cho phép. Cặp `(Tên hàng, Mã vật tư)` là
  khoá nhận dạng: cùng tên mà chưa có mã thì chỉ được một dòng; cùng tên khác
  mã thì được nhiều dòng. Hiện **426/510** vật tư trong hệ thống chưa có mã và
  vẫn dùng bình thường.
- **Nạp danh mục cũ** — đã mở cửa riêng, nhận **99,1%** trong 10.687 mã đang
  lưu hành mà không phải nới chuẩn cho mã mới.
- **Nội dung bản in** — chờ bộ phận gửi bản chính thức, chưa cần làm gì.


---

## F · BỐN MƯƠI TÁM CÂU PHÁT SINH KHI THI CÔNG

*Bổ sung ngày 02/09/2026, sau khi bổ sung 77 hạng mục từ báo cáo phủ sóng.*

Mỗi câu dưới đây là một chỗ hệ thống **đã làm xong phần kỹ thuật** nhưng cần
người biết nghiệp vụ chốt lại con số hoặc cách làm. Chưa chốt thì chức năng
vẫn chạy theo mặc định tạm — nêu rõ ở cột sau.


### Màu sơn và gia công ngoài (32 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Bảng TRÊN MÀN HÌNH có in trống thay số 0 giống tệp xuất không? | Mục 39 chỉ nói 'Xuất tệp' nên tôi chỉ áp cho CSV/Excel/PDF, giữ nguyên màn hình. Nhưng chính chú thích trong bao_cao.py đã ghi: 'bảng trên màn hình và | — |
| 2 | Ba cột SO_LUONG_KHONG_DAT · SO_LUONG_KIEM · SO_LUONG_KHONG_HOP_LE: 0 nghĩa là 'chưa kiểm' hay 'đã kiểm, không có cái nào'? | Quy tắc tôi cài (tiền tố SO_LUONG) đang XOÁ TRẮNG cả ba cột này khi bằng 0. Nhưng chúng nằm ở ranh giới: 'số lượng không đạt = 0' có thể là tin TỐT đã | — |
| 3 | Cột TON_KHO bằng 0 để trống hay in 0? | Tôi CỐ Ý không đưa TON_KHO vào quy tắc dù nó là cột số lượng, vì 'tồn kho = 0' nghĩa là HẾT HÀNG — một câu trả lời thật và quan trọng, để trống sẽ thà | — |
| 4 | Route GET /bao-cao/{ma}/tai-xuong chỉ trả CSV, không nhận tham số dinh_dang | Tầng dịch vụ svc.xuat() đã hỗ trợ đủ csv/excel/pdf và tôi đã thử chạy được cả ba, nhưng route vẫn gọi cứng xuat_csv nên qua HTTP chỉ tải được CSV — ng | Chưa mở tham số dinh_dang cho route tải xuống. |
| 5 | Khi nào siết quy tắc DN-13 (sơn tĩnh điện phải có mã màu) từ CẢNH BÁO sang CHẶN? | docs/10 mục 21 viết là 'bắt buộc', nhưng ngày cột này ra đời danh mục MAU_SON mới có 8 dòng lấy từ Excel. Bật CHẶN ngay thì mọi phiếu sơn dùng màu chư | Chưa dám tự chốt thời điểm siết — đây là quyết định vận hành, siết sớm là chặn cả dây chuyền sơn. |
| 6 | Bộ phận nào SỞ HỮU danh mục Màu sơn, và vai trò nào được sửa? | Tôi tạm khai so_huu='MUA_HANG', vai_tro_sua = Quản trị + TBP Mua hàng. Nhưng ma trận quyền hiện cho TBP_MUA_HANG đúng quyền XEM trang danh_muc (ô 'X:T | Không tự sửa ma trận quyền — đổi một ô là đổi quyền của cả một vai trò trên toàn bộ màn hình Dữ liệu gốc. |
| 7 | Bảng quy đổi TÊN VIẾT TẮT CÔNG TY (ghi trên bản vẽ / trong Excel) → MA_KHACH_HANG | Script nạp dò được mã khách hàng cho 3 trong 6 tên công ty xuất hiện ở hai sheet; 3 tên còn lại là mã viết tắt nội bộ không khớp tên nào trong danh mụ | Không đoán bừa mã khách hàng — gán sai một dòng là màu của khách này chạy sang phiếu của khách kia mà không ai thấy. |
| 8 | Quy tắc đặt MÃ MÀU nội bộ | Script đang cấp mã MS001, MS002… theo thứ tự đọc từ Excel. Nếu công ty đã có quy ước riêng (theo khách hàng, theo hệ màu RAL/Munsell, theo nhà cung cấ | Chưa có quy định nào về mã màu trong tài liệu đã đọc. |
| 9 | Dòng KHÔNG phải gia công ngoài có được mang mã màu không? Và công đoạn 'CD39 Sơn nội bộ' có phải chọn màu không? | Hiện backend cho phép ghi mã màu vào bất kỳ dòng nào (miễn mã có thật), còn giao diện chỉ hiện ô cho loại gia công SON_TD. Nếu Sơn nội bộ cũng cần mã  | Chưa rõ Sơn nội bộ có dùng chung bảng quy đổi màu với sơn tĩnh điện đặt ngoài hay không. |
| 10 | Có che ba cột liên hệ (Người liên lạc · Số điện thoại · Email) khi XUẤT/IN biểu mẫu BM03 không? | docs/10 dòng 630 ghi đây là việc "chốt quy tắc" chưa có lời giải. Hiện trạng tôi giữ nguyên: sheet QT-MH-01-BM03 gốc CÓ ba cột ấy nên tệp tải xuống cũ | Chưa che thêm gì so với quy tắc máy chủ đang áp. |
| 11 | Với hình thức "theo hoá đơn" (TT_100_HOA_DON, TT_50_HOA_DON), có nên tạm điền số tiền đợt theo giá trị ĐƠN HÀNG rồi để người lập sửa lại khi có hoá đơn không? | Hiện tôi để KHÔNG tự điền và nói rõ lý do trên màn hình. Chọn vậy vì hoá đơn nhà cung cấp thường lệch với đơn hàng (tròn số, phụ phí, tỷ giá) và một c | Chưa tự điền cho hai hình thức tính theo hoá đơn. |
| 12 | Con số km người dùng gõ tay vào phiếu điều xe là km MỘT LƯỢT hay km CẢ CHUYẾN? | Tôi chọn MỘT LƯỢT cho thống nhất với cột SO_KM của danh mục nhà cung cấp (nguồn tự điền), rồi nhân số chuyến ở đúng một chỗ trước khi ghi. Hệ quả: DIE | — |
| 13 | Có cần nạp lại số km cho dữ liệu điều xe cũ đã đổ vào hệ thống không? | Công thức chỉ áp cho phiếu tạo/sửa TỪ NAY. Bảng DIEU_XE hiện chỉ có 4 dòng (đều là dữ liệu demo/thử nghiệm) nên chưa cần gì. Nhưng khi nạp 685 chuyến  | Chưa biết đã nạp dữ liệu cũ chưa và nạp bằng script nào. |
| 14 | Tệp CSV tải xuống từ bảng theo dõi có được phép chứa cột GIÁ (đơn giá cơ sở, thành tiền) không? | Hiện COT_XUAT_TIEN_DO cố ý bỏ hết cột giá. Lý do: màn hình che giá theo TỪNG DÒNG (nhân viên mua hàng chỉ xem giá dòng mình phụ trách), mà một tệp CSV | Chưa thêm cột giá vào tệp xuất — cần quyết định nghiệp vụ trước. |
| 15 | Trên biểu mẫu QT-KV-01-BM03, ô 'Số phiếu ĐNVT' Kho vận cần số nào: mã hệ thống (DN-2026-000780) hay số phiếu cũ trên sổ Excel (DE_NGHI.SO_PHIEU_CU)? | Đang trả mã hệ thống. Trong giai đoạn chạy song song hai hệ, thủ kho quen đọc số cũ; nếu cần cả hai thì thêm SO_PHIEU_CU vào lay_dong và bảng dòng (th | Chưa trả SO_PHIEU_CU kèm theo. |
| 16 | Trần 5.000 dòng cho tệp tải xuống bảng theo dõi có đủ không? | Đang đặt bằng trần của 9 báo cáo chuẩn để hai đường xuất không ra hai kích cỡ khác nhau. Bảng theo dõi hiện có 3.011 dòng trên dữ liệu mẫu, còn sổ 'Bá | Chưa thêm dòng cảnh báo khi tệp bị cắt, và chưa nới trần — cần biết số dòng thật của kỳ cao điểm. |
| 17 | THOI_GIAN_TOI_NOI_PHUT có được dùng vào quy tắc chống trùng lịch xe (DX-05) không, hay chỉ để tham khảo? | Cột này giờ đã hiện trên danh sách và hộp chi tiết điều xe. Người xếp lịch đọc nó để biết chuyến kế tiếp xếp được từ mấy giờ, nhưng hệ thống VẪN chưa  | Chưa nối vào quy tắc DX-05 — thiếu cột giờ khởi hành và thiếu quyết định nghiệp vụ. |
| 18 | Tiêu chí đưa dữ liệu vào kho lưu trữ: theo TRẠNG THÁI (như Excel — cứ hoàn tất là chuyển) hay theo MỐC THỜI GIAN (như hiện nay — cũ hơn N tháng VÀ đã hoàn thành/huỷ)? | docs/10 §4 mục 26 ghi rõ đây là việc cần chốt. Hiện THU_TU_LUU_TRU đòi ĐỒNG THỜI hai điều kiện: trạng thái HOAN_THANH/HUY và cũ hơn tham số SO_THANG_L | Giữ nguyên tiêu chí cũ. |
| 19 | Mã và số ngày chuẩn cho hạng mục LÀM ĐEN trong danh mục LOAI_GIA_CONG | BC12 đã nhận tham số ma_loai_gia_cong nhưng danh mục hiện chỉ có 14 mã (AN_MON, BOC_SU, CAY_CUOC, DOT_LO_LUOI, EDM, MAI_TRON, MA_KEM, NAN_THANG, NHONG | Lọc BC12 riêng cho hạng mục làm đen |
| 20 | Có backfill DE_NGHI_DONG.NGAY_DU_KIEN_VE cho dữ liệu cũ không, và tính theo công thức nào | Cột QUY_TRINH (Đúng QT / Sai QT) của BC02 so NGAY_DU_KIEN_VE với KY_HAN_YC. Đo trên CSDL: chỉ 4/994 dòng gia công ngoài có NGAY_DU_KIEN_VE (migration  | Điền NGAY_DU_KIEN_VE cho dữ liệu cũ để cột QUY_TRINH có số |
| 21 | Sổ chi phí gia công ngoài (BC13) tính theo NGÀY ĐẶT HÀNG hay NGÀY GIAO | BC13 đang lấy theo DON_HANG.NGAY_DAT với lập luận chi phí phát sinh lúc đặt mua dịch vụ. Nhưng sheet gốc "CHI PHÍ STĐ XK" của workbook B có cột đầu ti | — |
| 22 | Ngoài KG còn đơn vị khối lượng nào được cộng vào BC12 không | Hằng DON_VI_KHOI_LUONG trong repo_bao_cao.py hiện chỉ có 'KG', vì sổ gốc chỉ cộng cột "Tổng số Kg". Nếu Kho vận có dùng TAN hay GAM ở đâu đó thì phải  | — |
| 23 | Cột DON_HANG.LOAI có được điền đúng lúc lập đơn không, hay nên bỏ hẳn | Đo được: cả 646 đơn hàng đều mang DON_HANG.LOAI='MUA_HANG', kể cả 526 dòng đơn hàng có gốc là phiếu GIA CÔNG NGOÀI. Mọi bộ lọc loại vì thế phải đi vòn | — |
| 24 | Cột GIÁ TRỊ MUA của BC05 nên đo theo mốc nào: NGÀY NHẬN HÀNG (đang làm) hay NGÀY ĐẶT HÀNG (giống pivot THÀNH TIỀN của sổ Excel)? Và dòng giao THIẾU thì tính nguyên giá trị dòng đơn hàng (đang làm) hay chia tỉ lệ theo số lượng đã nhận? | Hiện cột tiền đo cùng mốc với phần còn lại của BC05 (dòng NHẬN trong kỳ), mỗi dòng đơn hàng cộng đúng một lần dù giao nhiều đợt. Nếu anh Long đối chiế | Đổi mốc là một dòng sửa, nhưng đổi rồi thì số liệu quá khứ đọc khác đi — phải chốt trước khi báo cáo được dùng để đối chiếu. |
| 25 | Có lập DANH MỤC lý do huỷ dòng đề nghị không, hay để ô văn bản tự do như hiện nay? | Bảng 'theo_ly_do' của BC24 gom theo đúng nguyên văn người dùng gõ, nên sẽ có nhiều dòng gần giống nhau. Tôi CỐ Ý không chuẩn hoá ngầm (cắt chuỗi, gộp  | Thêm danh mục là đổi biểu mẫu xin huỷ + migration; phải chốt bộ giá trị với nghiệp vụ trước. |
| 26 | Quy tắc đánh MÃ TÀI LIỆU lệnh mua hàng dạng NNN/MMYYYY/ĐN/MH (mục 17 của P1) | Cột 'Mã tài liệu lệnh mua hàng' (CONG_VIEC.SO_PHIEU_CU) trong BC22 hiện trống hết vì giao_viec() chưa sinh mã, và BO_DEM_CHUNG_TU chưa có cột THÁNG để | Thuộc cụm khác (P1 mục 17) và cần chốt quy tắc đánh số trước; BC22 đã chừa sẵn cột, mã sinh ra là hiện ngay. |
| 27 | BP Kho vận có được xem 'Số tiền trả tại chỗ' không? Hiện docs/06 §3.1 XEM_GIA không có TBP_KHO_VAN/NV_KHO_VAN, nên dieu_xe._gon() gỡ cột SO_TIEN_THANH_TOAN trước khi tới bản in. Kết quả: đúng người in tờ phiếu và phát tiền mặt cho tài xế lại là người KHÔNG thấy số tiền — tờ bảng kê in ra có ô tiền trống và dòng tổng tuyến trống. | Quyết định một trong hai: (a) thêm hai vai trò Kho vận vào XEM_GIA (nhưng thế là mở luôn đơn giá mua hàng cho họ), hoặc (b) tách 'tiền trả tại chỗ' ra | Bản in bảng kê và BC40 hiện để trống ô tiền với vai trò Kho vận. Đã ghi chú rõ trong docstring in_pdf._bang_chuyen. |
| 28 | Ngày đến hạn của một đợt thanh toán lấy theo đâu khi DOT_THANH_TOAN.NGAY_DU_KIEN để trống: lùi về YEU_CAU_THANH_TOAN.KY_HAN_THANH_TOAN (cách tôi đang làm), hay coi là chưa có hạn? | Quyết định này đổi cả số tiền của từng bậc kỳ hạn trong BC31. Trên dữ liệu demo có 1/3 đợt rơi vào nhánh lùi này. | Đang lùi về kỳ hạn của phiếu; đợt không có cả hai mới vào nhóm '(chưa có kỳ hạn)'. |
| 29 | Trần 40 phiếu cho một lượt in gộp có đủ cho một ngày cao điểm không? Macro Excel cũ làm 8 phiếu/lượt. | Vượt trần thì hệ thống cắt bớt. Cần biết số chuyến/ngày lớn nhất thực tế để đặt trần đúng. | Trần 40 là con số tôi tự đặt (rộng gấp 5 lần macro cũ) ở dieu_xe.cac_phieu_trong_ngay. |
| 30 | Chốt khuôn chuỗi QUY CÁCH cho hình TRÒN ĐẶC và hình ỐNG | Sổ cũ CHỈ có công thức CONCATENATE cho hình TẤM (ô K9 sheet "CONG THUC"). Hai hình còn lại tôi đang suy theo cùng lối viết: tròn đặc `Thép C45 (Ø30*50 | Đã cài khuôn tạm theo suy luận từ hai ô tự do trong sổ cũ và ghi rõ trong docstring của quy_cach_vat_lieu.py rằng đây là phần Exce |
| 31 | Chốt cách tính KHỐI LƯỢNG và DIỆN TÍCH của hình ỐNG: đúng hình học hay xấp xỉ thành mỏng như sổ cũ | Phát hiện thêm một chỗ lệch NGOÀI bốn chỗ đã liệt kê ở mục 41. Sheet "LAZER" ô O3 tính thể tích ống bằng công thức thành mỏng `π×Ø×Dài×Dày`, còn hệ th | Đã giữ công thức chính xác (hệ thống đúng hơn, và mạ/sơn tính tiền theo diện tích thật nên khai thừa là trả thừa tiền), và đã ghi  |
| 32 | Xác nhận số ngày đệm giữa kỳ hạn nội bộ và kỳ hạn hẹn nhà cung cấp | Excel trừ đúng 1 ngày LỊCH cho mọi dòng, không phân biệt hàng nội thành hay hàng đi tỉnh, không phân biệt mua hàng hay gia công ngoài. Cần Mua hàng xá | Đã cài đúng như Excel (1 ngày lịch) và đưa số ngày ra tham số `KY_HAN_YC_SOM_HON_NGAY` để Quản trị đổi được mà không phải triển kh |

### Thanh toán và công nợ (5 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Tổng các đợt LỆCH với tỷ lệ của hình thức thanh toán thì CHẶN hay chỉ CẢNH BÁO? | Tôi chọn cảnh báo (trả về trường canh_bao, không chặn), vì "50% giá trị đơn" trả làm hai đợt 25% vẫn đúng hình thức, và vì TY_LE là dữ liệu Quản trị s | Chưa có quy tắc chặn theo tỷ lệ; chỉ TT-03 (tổng đợt không vượt giá trị đơn) là chặn. |
| 2 | Xác nhận năm giá trị của danh mục Lý do thanh toán và mười giá trị của Hình thức thanh toán. | Có bốn giá trị tôi phải tự quyết đưa vào hay không, vì hai nguồn không khớp nhau: · "Cọc làm khuôn" và "Thanh toán 80% giá trị đơn hàng" — CÓ trong sổ | Đã nạp theo phương án hợp nhất nói trên, chờ anh Long xác nhận hoặc cắt bớt. |
| 3 | Danh mục thanh toán do BỘ PHẬN NÀO sở hữu và ai được sửa? | Tôi khai so_huu='MUA_HANG' và vai_tro_sua = QUAN_TRI + TBP_MUA_HANG, theo đúng lối ba danh mục anh em (chung-loai, muc-dich-su-dung, loai-gia-cong). N | Chưa đổi ma trận quyền để TBP Mua hàng sửa được danh mục. |
| 4 | 'Công nợ' và 'Tiền mặt' của sheet NCC là điều khoản bằng LỜI hay là con SỐ (hạn mức tiền)? | Cột CSDL đang là TEXT nên tôi làm ô chữ, gợi ý 'Ví dụ: 30 ngày kể từ ngày nhận hàng' / 'Ví dụ: trả ngay khi nhận hàng'. Nếu thực chất là hạn mức công  | — |
| 5 | Sáu bậc kỳ hạn của BC31 có đúng cách Kế toán muốn chia không: Quá hạn >90 · Quá hạn 31–90 · Quá hạn 1–30 · Đến hạn trong 7 ngày · Còn trên 7 ngày · (chưa có kỳ hạn). | Tôi chia nửa quá hạn trùng BC03 (để người đọc không phải nhớ hai bảng quy đổi) và nửa sắp tới theo TUẦN (giả định Kế toán lập kế hoạch chi theo tuần). | Bậc đang chạy theo ngưỡng tôi tự đặt; đổi ngưỡng chỉ phải sửa hằng _BAC_KY_HAN và NHAN_BAC_KY_HAN trong repo_bao_cao.py. |

### Điều xe (4 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Số chuyến tối đa của một phiếu điều xe là 3 hay còn cao hơn? | Hiện chặn ở 3 tại CẢ HAI nơi: ThanTao/ThanSua (ge=1, le=3) và ô chọn 1/2/3 ở frontend. Căn cứ là sổ 'Quản lý điều xe' cũ không có dòng nào quá 3 lượt. | — |
| 2 | Phụ xe lấy từ danh mục TÀI XẾ hay cần một danh mục nhân sự riêng? | Tôi đang cho chọn từ danh mục tài xế (repo.danh_sach_tai_xe) vì cột PHU_XE không có khoá ngoại và backend không kiểm gì cả — để gõ tự do thì vài tháng | — |
| 3 | 'Đi đủ' của bước 5 quy trình điều vận có đúng nghĩa 'mọi chuyến đã ở trạng thái HOAN_THANH' không, hay còn tiêu chí khác (ví dụ tài xế phải nộp lại chứng từ, phải khai số km đồng hồ)? | BC41 và tab Cuối ngày đang kết luận 'Đi đủ / Chưa đủ' theo định nghĩa này. Nếu nghiệp vụ đòi thêm điều kiện thì con số 'tài xế đi đủ' đang cao hơn thự | Định nghĩa nằm ở đúng MỘT nơi (dieu_xe.tong_ket_cuoi_ngay), sửa một chỗ là cả màn hình lẫn báo cáo đổi theo. |
| 4 | Bảng TAI_XE trên cơ sở dữ liệu demo đang RỖNG (0 bản ghi) và backend/testing/sinh_du_lieu_mau.py không sinh TAI_XE lẫn DIEU_XE. | Không có tài xế nào thì không xếp lịch cho tài xế được, tab 'Lịch tài xế', bản in gom theo tài xế và cả BC41 đều không có gì để hiện — cả cụm điều xe  | Để thử được, tôi đã chèn tay MỘT bản ghi bịa: TAI_XE('DEMO_NV_KHO_VAN','Tài xế thử nghiệm A'). Đây là dữ liệu thử, không phải ngườ |

### Nhà cung cấp và biểu mẫu (1 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Ô 'Đạt/Không đạt' của biểu mẫu BM08 hiển thị thế nào khi kết luận IQC là 'Đạt có điều kiện'? | Cột đang lấy KET_QUA_IQC.KET_LUAN, mà ràng buộc ck_kqiqc ở migration 011 cho phép ba giá trị: DAT · KHONG_DAT · DAT_CO_DIEU_KIEN. Biểu mẫu giấy chỉ vẽ | Đang hiển thị nguyên văn cả ba giá trị, chưa gộp theo quy ước biểu mẫu. |

### Hiển thị và xuất tệp (2 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Tiêu đề tệp CSV nên giữ MÃ CỘT hay đổi sang nhãn tiếng Việt? | Tôi đã đổi tiêu đề Excel và PDF sang tiếng Việt nhưng GIỮ NGUYÊN mã cột cho CSV, vì hai lý do: (1) chú thích DINH_DANG_XUAT trong bao_cao.py mô tả csv | Chưa đổi tiêu đề CSV sang tiếng Việt. |
| 2 | Có thêm cột riêng cho LÃNH ĐẠO DUYỆT KHẨN vào bảng DE_NGHI không? (docs/10 §2(4): DE_NGHI thiếu cột 'MỨC ĐỘ XỬ LÝ — ai duyệt khẩn'; sheet Excel tách hai cột theo hai lãnh đạo, 88 dòng và 7 dòng) | Bảng 'theo_nguoi_duyet' của BC08 hiện gom theo DE_NGHI.NGUOI_DUYET_BP — người duyệt PHIẾU, không phải người duyệt KHẨN. Với phiếu khẩn hai người này t | Thêm cột vào DE_NGHI là đổi lược đồ + đổi luồng duyệt, phải chốt nghiệp vụ trước. |

### Giao việc và lưu trữ (3 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Kho lưu trữ có phải là dữ liệu tra cứu CHUNG của bộ phận Mua hàng, hay vẫn giữ phạm vi từng người như dữ liệu đang chạy? | Tôi cài mặc định AN TOÀN: áp đúng phạm vi của quyền xem trang Đơn hàng. Hệ quả thực tế là NV_MUA_HANG (phạm vi cá nhân) chỉ thấy chứng từ có tên mình  | Đã cài bản hẹp (an toàn) và cho màn hình nói rõ 'Bạn đang xem trong phạm vi CÁ NHÂN' để người dùng không tưởng kho rỗng. |
| 2 | Nhân viên mua hàng có được sửa TRẢ LỜI KỲ HẠN trên phiếu đề nghị ĐÃ ĐƯỢC DUYỆT không? | Ô sửa nhanh đang chạy được vì TRA_LOI_KY_HAN không nằm trong TRUONG_KHOA_SAU_DUYET (backend/services/de_nghi.py:35-38) — tức luật hiện hành cho phép.  | Chưa thêm ràng buộc lý do — mọi lần sửa vẫn được ghi vào NHAT_KY_THAY_DOI kèm giá trị cũ và mới. |
| 3 | Số ngày chờ xác nhận kỹ thuật đếm từ mốc nào, và bao nhiêu ngày thì coi là QUÁ HẠN? | BC23 đang đếm từ DE_NGHI_DONG.NGAY_TAO (xấp xỉ: luồng hiện tại đánh dấu cần xác nhận KT ngay lúc lập phiếu nên hai mốc trùng nhau ở gần hết các dòng). | Số ngày chuẩn là quyết định nghiệp vụ; đọc bảng lịch sử là một phép nối LATERAL cho từng dòng, chỉ đáng làm khi luồng đổi. |

### Khác (1 câu)

| # | Cần chốt | Để làm gì | Chưa chốt thì |
|---|---|---|---|
| 1 | Mốc thời gian mặc định khi tra bảng 'Dòng đơn đặt hàng' nên là KỲ HẠN GIAO hay NGÀY ĐẶT của đơn cha? | Bảng DON_HANG_DONG không có cột ngày đặt (ngày đặt nằm trên phiếu cha DON_HANG). Tôi chọn KY_HAN_GIAO vì đó là cột ngày duy nhất nằm ngay trên dòng và | Đã ghi nhãn rõ trên giao diện ('Từ Kỳ hạn giao hàng') để người dùng biết mình đang lọc theo mốc nào, không đoán mò. |
