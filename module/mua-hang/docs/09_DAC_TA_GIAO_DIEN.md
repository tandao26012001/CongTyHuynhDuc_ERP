# ĐẶC TẢ THI CÔNG GIAO DIỆN — HỆ THỐNG MUA HÀNG & GIA CÔNG NGOÀI

**Bản tham chiếu:** `../demo (production planning)/frontend`
**Bản phải sửa:** `/Users/philong/Documents/Huỳnh Đức/Nghiên Cứu - Phát Triển (R&D)/Phát triển Phần mềm/Hệ thống Mua hàng/frontend`

---

## 0 · ĐỌC TRƯỚC KHI GÕ DÒNG NÀO

### 0.1 Tin tốt: nền móng đã đúng, chỉ phần xây trên là lệch

`frontend/assets/hd.css` của bản Mua hàng **gần như trùng khít** bản gốc (diff chỉ 5 chỗ, đều là bổ sung hợp lý: chú thích `.sp`, thêm `.fstep.on`, sửa `flex-basis` cho `.loc-bar` trên điện thoại). Nghĩa là **toàn bộ ngôn ngữ thị giác đã nằm sẵn trong tệp** — `.phead`, `.rong`, `.tw`, `.card.stat`, `.pie-wrap`, `.uchip`, `.rail-g`, `.tabs`…

Vấn đề là **17 tệp trang không dùng gì trong số đó**. Số đo thực tế quét được:

| Lớp có trong hd.css | Số lần dùng ở `trang/*.js` |
|---|---|
| `.phead` (đầu trang chuẩn) | **0** |
| `.tw` (khung bọc bảng) | **0** |
| `.rong` (trạng thái rỗng cấp trang) | **0** |
| `.rail-g` (nhãn nhóm menu) | **0** |
| `.uchip` / `.av` (thẻ người dùng) | **0** |
| `<h3>` trong `.card-h` | **0** (26 chỗ dùng `<b>`) |
| `<svg>` (biểu tượng) | **0** trên toàn bộ frontend |
| `<h1>` (tiêu đề trang) | **0** |
| Biểu đồ (pie / thanh chồng) | **0** |
| `<table class="tbl">` không bọc gì | **44 / 65 bảng** |

Kết luận: **không phải viết lại CSS. Phải viết lại markup mà JS sinh ra.**

### 0.2 Ba luật bất di bất dịch

1. **KHÔNG sửa `hd.css`.** Hai hệ thống dùng chung. Mọi bổ sung đi vào `hd-mua-hang.css`, nạp sau.
2. **Không thêm màu mới.** Hai họ màu (xanh 5 sắc độ, đỏ 4 sắc độ) + thang mực. Hết. Xem §1.
3. **Không dùng emoji làm biểu tượng.** Emoji đổi hình theo hệ điều hành, không nhận `currentColor`, không in ra PDF được. Thay bằng `<svg>` từ bộ `IC`. Xem §2.

---

## 1 · BẢNG MÀU VÀ PHÔNG CHỮ CHỐT

### 1.1 Danh sách ĐẦY ĐỦ biến màu được phép dùng

Khai ở `hd.css:1-13`. **Ngoài bảng này, không có màu nào khác được phép xuất hiện trong mã.**

```css
:root{
  /* ── Họ XANH — màu nền của mọi thứ bình thường ─────────────────── */
  --blue:#283A97;    /* HD-BLUE. Hành động chính, tiêu đề, nét biểu đồ */
  --blue-7:#1E2C75;  /* Xanh đậm hơn — chỉ dùng cho :hover của .btn-b */
  --blue-4:#4A5CB8;  /* Xanh vừa — mức "sát trần", lớp thứ 2 của biểu đồ */
  --blue-2:#C6CCE9;  /* Xanh nhạt — viền pill, mũi tên .fstep, lát pie nhạt */
  --blue-1:#EEF0F9;  /* Xanh rất nhạt — nền th, nền hover hàng bảng, nền ô icon */

  /* ── Họ ĐỎ — CHỈ dành cho báo động ─────────────────────────────── */
  --red:#EE202E;     /* HD-RED. Quá hạn, lỗi, huỷ, xoá, vạch "bạn ở đây" */
  --red-7:#C4141F;   /* :hover của .btn-r */
  --red-2:#F9B9BE;   /* Viền .btn-or, lát pie đỏ nhạt */
  --red-1:#FDECEE;   /* Nền .alert.rd, nền .breaker */

  --black:#000; --white:#fff;

  /* ── Nền và đường kẻ ───────────────────────────────────────────── */
  --paper:#F4F6FA;   /* Nền trang, nền .modal-f, nền hàng nhóm .grp */
  --rule:#DCE1EC;    /* Viền hộp, viền ô nhập */
  --rule-2:#EDF0F6;  /* Gạch chân td, rãnh nền thanh tỷ lệ */

  /* ── Thang mực (chữ) ───────────────────────────────────────────── */
  --ink:#0E1220;     /* Chữ chính */
  --ink-2:#59627A;   /* Chữ phụ, nhãn .stat .k, mô tả .phead p */
  --ink-3:#8A93AA;   /* Chữ mờ, .mute2, trạng thái rỗng */

  /* ── Khoảng cách (dùng biến, KHÔNG gõ px) ──────────────────────── */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px;
  --r:5px; --r-lg:9px;             /* bo góc nhỏ / lớn */
  --sh1 --sh2 --sh3                /* ba mức đổ bóng */
  --rail:250px; --top:58px;        /* rộng menu trái / cao thanh trên */
}
```

**Ngoại lệ DUY NHẤT được cấp phép:** bộ vàng cảnh báo tiến độ, đã có sẵn ở `hd.css:396` và **chỉ dùng qua lớp `.p-vang` / `.cb-tre`**, tuyệt đối không gõ lại mã hex:

```css
.p-vang{background:#FFF4E0;color:#8A5A00;border-color:#E0A030}
```

Nghĩa nghiệp vụ của vàng: **"chưa sai nhưng phải nhìn"** — sắp trễ, cần xác nhận, hệ thống đoán chưa chắc. Không dùng vàng cho "đang chờ duyệt" (chờ duyệt là bình thường → xám `.p-g`).

### 1.2 Bảng ánh xạ MÀU ĐANG DÙNG SAI → THAY BẰNG

| Vị trí | Đang là | Thay bằng | Vì sao |
|---|---|---|---|
| `hd-mua-hang.css:201` `.ghi-chu-quy-tac` | `color:#075985; border:1px solid #BAE6FD` | `color:var(--blue); border-color:var(--blue-2)` | `#075985`/`#BAE6FD` là xanh da trời Tailwind — ngoài bộ nhận diện |
| `hd-mua-hang.css:203` `.ghi-chu-quy-tac.canh-bao` | `color:#92400E; border-color:#FDE68A` | `color:#8A5A00; border-color:#E0A030` (bộ vàng đã cấp phép) | thống nhất một sắc vàng duy nhất với `.p-vang` |
| `hd-mua-hang.css:284` `.so-sap-tre` | `color:#B45309` | `color:#8A5A00` | như trên |
| `trang/de_nghi.js:253` | `style="color:#92400E"` | bỏ style, dùng `class="cb cb-tre"` | màu không được nằm trong JS |
| `hd-mua-hang.css:31` `--info:var(--blue-4)` | (đã đúng) | giữ | biến alias hợp lệ, **nhưng** phải xoá 3 mã hex chết trong khối chú thích ở dòng 10-27 để không ai chép nhầm lại |

### 1.3 Ba biến alias `--ok / --warn / --info`

Người viết trước đã sửa đúng hướng (trỏ về thang xanh/đỏ). **Giữ nguyên**, nhưng ghi rõ vào tệp quy ước dùng:

```css
--ok:   var(--blue);    --ok-1:  var(--blue-1);   /* xong, đúng hạn, lưu thành công */
--info: var(--blue-4);  --info-1:var(--blue-1);   /* ghi chú, gợi ý */
--warn: var(--red);     --warn-1:var(--red-1);    /* sắp trễ, cần để mắt */
```

Quy tắc phân biệt hai mức đỏ, ghi vào đầu tệp cho người sau:
- **Đỏ VIỀN** (`.p-ro` / `.p-warn`, nền trắng chữ đỏ) = *sắp* trễ, nhắc nhở.
- **Đỏ ĐẶC** (`.p-r`, nền đỏ chữ trắng) = *đã* quá hạn, lỗi, huỷ.

### 1.4 Phông chữ — **LỖI NẶNG NHẤT ĐANG CÓ**

`frontend/index.html:10` nạp:

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

**Thiếu `Roboto Condensed`.** Trong khi `hd.css` dùng Condensed ở **9 chỗ trọng yếu**: `.cond`, `.eyebrow`, `.label`, `.stat .k`, `.pill`, `.tbl` (toàn bộ thân bảng), `.tbl th`, `.rail-g`, `.av`, `.uchip span`, `.buoc-n`, `.fstep b`. Tất cả đang rơi về Roboto thường → nhãn và bảng rộng hơn thiết kế 8-12%, cột bảng bị đẩy, chữ hoa giãn `.07em` trông thưa và nhoè.

**Sửa (bắt buộc, làm đầu tiên):**

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Condensed:wght@400;700&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

### 1.5 Bảng cỡ chữ chốt — không gõ `font-size` tự do nữa

| Vai trò | Phông | Cỡ | Lớp có sẵn |
|---|---|---|---|
| Chữ thân | Roboto 400 | 14px | (mặc định `body`) |
| Chữ phụ | Roboto 400 | 13px | `.t-sm` |
| Chữ nhỏ nhất | Roboto 400 | 12px | `.t-xs` |
| Tiêu đề trang | Roboto 700 | 23px | `<h1>` |
| Tiêu đề thẻ | Roboto 700 | 15px | `<h3>` |
| Nhãn nhóm / eyebrow | Condensed 700 HOA | 11px, ls .14em | `.eyebrow` |
| Nhãn ô nhập | Condensed 700 HOA | 12px, ls .07em | `.label` |
| Nhãn ô số liệu | Condensed 700 HOA | 11px, ls .10em | `.stat .k` |
| Tiêu đề cột bảng | Condensed 700 HOA | 11px, ls .07em | `.tbl th` |
| Thân bảng | Condensed 400 | 13.5px | `.tbl` |
| Nhãn trạng thái | Condensed 700 | 11.5px | `.pill` |
| **Mọi con số** | Roboto Mono, tabular-nums | theo ngữ cảnh | `.mono` / `.num` |
| Số lớn ô số liệu | Roboto Mono 700 | 30px | `.stat .v` |

**Luật con số:** bất kỳ chữ số nào người dùng phải *so sánh theo cột dọc* (số lượng, tiền, phần trăm, ngày, mã phiếu) đều phải mang `.mono` hoặc `.num`. Không có ngoại lệ.

---

## 2 · BỘ BIỂU TƯỢNG

### 2.1 Quy cách vẽ — một khuôn duy nhất

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="…"/></svg>
```

- `viewBox="0 0 24 24"` — lưới vuông 24 đơn vị, **không đổi**.
- `fill="none"` — hình nét, không tô đặc.
- `stroke="currentColor"` — **mấu chốt**: nét lấy màu từ `color` của thẻ cha, nên khi mục menu đổi sang `.on` (chữ trắng) hay ô icon đổi sang nền đỏ, biểu tượng tự đổi theo, không phải viết thêm luật nào.
- Độ dày nét theo cỡ hiển thị: **1.8** cho 17-19px (menu, thẻ), **1.9** cho ô 34px, **2.0-2.2** cho 14-16px (nút nhỏ).

### 2.2 Hàm sinh biểu tượng — thêm vào `app.js`

```js
/* Sinh một thẻ <svg> từ khoá biểu tượng.
   ic  — khoá trong từ điển IC
   cx  — bề rộng px (mặc định 17, bằng cỡ icon menu)
   day — độ dày nét (mặc định 1.8) */
const icon = (ic, cx = 17, day = 1.8) => IC[ic]
  ? `<svg viewBox="0 0 24 24" width="${cx}" height="${cx}" fill="none"
       stroke="currentColor" stroke-width="${day}"><path d="${IC[ic]}"/></svg>`
  : '';
```

### 2.3 Từ điển `IC` — 16 khoá GỐC (chép nguyên, không sửa)

```js
const IC = {
  home: 'M3 10.5 12 3l9 7.5V21H3z',
  db:   'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  eye:  'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ship: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M9 11h.01M15 11h.01',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  hand: 'M9 11V6a2 2 0 1 1 4 0v5m0-3a2 2 0 1 1 4 0v3m0-1a2 2 0 1 1 4 0v6a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-3a2 2 0 1 1 4 0',
  pie:  'M12 3v9h9a9 9 0 1 1-9-9zM15.5 3.5A9 9 0 0 1 20.5 8.5H15.5z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  award:'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  box:  'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  plan: 'M3 4h18v16H3zM3 9h18M8 4v16M13 12h5M13 16h3',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4',
  task: 'M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  warn: 'M12 3 2 20h20zM12 10v5M12 18h.01',
  chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gantt:'M3 5h9M3 10h14M3 15h6M3 20h11',
```

### 2.4 20 khoá MỚI cho Hệ thống Mua hàng

Vẽ tay theo đúng lưới 24×24, cùng phong cách nét mảnh, tận dụng thủ thuật chấm `h.01` của bản gốc.

```js
  /* ══ NGHIỆP VỤ MUA HÀNG ══════════════════════════════════════════ */

  /* Đề nghị mua hàng — bảng kẹp giấy có dấu cộng.
     Kẹp giấy = "phiếu đề xuất", dấu cộng = "tạo mới / xin thêm". */
  de_nghi: 'M9 3.5h6v3H9zM9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M12 11v6M9 14h6',

  /* Báo giá — thẻ giá (tag) có lỗ xâu dây.
     Hình tag đọc ra "giá" ngay, không lẫn với chứng từ khác. */
  bao_gia: 'M20.6 12.4 12 3.8H4.5v7.5l8.6 8.6a1.6 1.6 0 0 0 2.3 0l5.2-5.2a1.6 1.6 0 0 0 0-2.3zM8.2 8.2h.01',

  /* Đơn hàng — xe đẩy siêu thị. Hai bánh vẽ bằng cung tròn (arc). */
  don_hang: 'M2.5 4h2.3l2.4 11.3h9.9l2.1-8.1H6.2M10.3 19.5a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0M18.3 19.5a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0',

  /* Giao nhận — kiện hàng nhìn nghiêng, có đường gấp mặt trên.
     Khác hẳn ``box`` (thùng phẳng) nên hai trang không lẫn nhau. */
  giao_nhan: 'M3 8 12 3.5 21 8v8L12 20.5 3 16zM3 8l9 4.5 9-4.5M12 12.5v8',

  /* Đặt ngoài — thùng có mũi tên đi RA khỏi thùng.
     Nghĩa đen: "đưa việc ra bên thứ ba". */
  dat_ngoai: 'M13 3.5H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8M16.5 8 20.5 12l-4 4M10 12h10.5',

  /* Điều xe — xe tải thùng kín, hai bánh cung tròn. */
  dieu_xe: 'M2 6h12v10.5H2zM14 9.5h3.8l2.7 3.2v3.8H14M7.7 18.5a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0M18.7 18.5a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0',

  /* Thanh toán — thẻ/phiếu chi có dải từ và ô số. */
  thanh_toan: 'M2.5 5.5h19v13h-19zM2.5 9.8h19M6 14.6h4.5M15.5 14.6h3',

  /* Nhà cung cấp — cửa hàng có mái hiên và cửa ra vào. */
  ncc: 'M4 9.2h16V20.5H4zM2.8 9.2 4.5 4.5h15L21.2 9.2M9.3 20.5v-6.3h5.4v6.3',

  /* Giao việc — bảng liệt kê có ba dấu tích.
     Khác ``task`` (một dấu tích trong khung) — đây là NHIỀU việc. */
  check_list: 'M9.5 6h11M9.5 12h11M9.5 18h11M3.2 6l1.4 1.4L7.4 4.6M3.2 12l1.4 1.4L7.4 10.6M3.2 18l1.4 1.4L7.4 16.6',

  /* Tiện ích — ba thanh trượt (sliders). */
  tien_ich: 'M4 7h9.5M17.5 7H20M4 17h2.5M10.5 17H20M15.5 4.8v4.4M8.5 14.8v4.4',

  /* Quản trị — khiên có dấu tích. Quyền hạn = bảo vệ. */
  shield: 'M12 3.2l7.6 3v5.6c0 4.4-3.1 8.3-7.6 9.6-4.5-1.3-7.6-5.2-7.6-9.6V6.2zM9 11.8l2.1 2.1 4-4',

  /* ══ ĐIỀU KHIỂN GIAO DIỆN ════════════════════════════════════════ */

  bell:  'M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  menu:  'M3 6h18M3 12h18M3 18h18',
  dong:  'M18 6 6 18M6 6l12 12',
  dongbo:'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  tim:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5 16 16',
  them:  'M12 5v14M5 12h14',
  tai:   'M12 3.5v11.5M7.5 10.5 12 15l4.5-4.5M4 20.5h16',
  in:    'M7 8.5V3.2h10v5.3M7 17H5a2 2 0 0 1-2-2v-4.2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2M7 13.8h10V21H7z',
  chat:  'M21 11.6a8 8 0 0 1-8 8H8.4L3.5 22.5l1.3-4.3A8 8 0 1 1 21 11.6z',
};
```

### 2.5 Bảng kích thước theo vị trí — không chọn cỡ tuỳ hứng

| Vị trí | Ô bọc | Cỡ svg | Nét |
|---|---|---|---|
| Mục menu trái `.rail-i svg` | không có | 17px | 1.8 |
| Nút biểu tượng thanh trên `.ibtn` | 34×34, viền 1.5px | 17px | 2.0 |
| Nút có chữ `.btn svg` | không có | 14px | 2.2 |
| Thẻ truy cập nhanh `.mcard .ic` | 38×38, bo `--r`, nền `--blue-1` | 19px | 1.8 |
| Bước quy trình `.fstep .fico` | 34×34, bo 9px, nền `--blue-1` | 17px | 1.9 |
| Dòng thông báo `.ni .ic` | 30×30, bo `--r` | 16px | 1.9 |

---

## 3 · KHUÔN MỘT TRANG CHUẨN

### 3.1 Bốn hàm trợ giúp phải thêm vào `app.js` trước

```js
/* ── ĐẦU TRANG ─────────────────────────────────────────────────────
   Mọi trang mở đầu bằng đúng khối này. Ba tham số:
     ten  — tên trang, trùng khớp nhãn trên menu trái (bắt buộc)
     mota — MỘT dòng nói trang này để làm gì, hoặc số liệu tóm tắt.
            Đây là câu trả lời sẵn cho "màn hình này là cái gì" —
            không được bỏ, kể cả khi thấy hiển nhiên.
     nut  — chuỗi HTML các nút hành động, tự dạt sang phải và canh
            đáy với h1 nhờ .gr có flex:1. Không có thì để trống. */
const dauTrang = (ten, mota, nut = '') => `
  <div class="phead">
    <div class="gr"><h1>${API.thoat(ten)}</h1><p>${API.thoat(mota)}</p></div>
    ${nut ? `<div class="row wr">${nut}</div>` : ''}
  </div>`;

/* ── TRẠNG THÁI RỖNG CẤP TRANG ─────────────────────────────────────
   Dùng khi CẢ khối bảng không có gì để vẽ.
     t — nói THIẾU CÁI GÌ
     d — nói ĐI ĐÂU LÀM GÌ để có dữ liệu (nêu đích danh tên trang)
   Màn hình trắng là lúc người dùng tưởng hệ thống hỏng nhất.       */
const rong = (t, d) =>
  `<div class="rong"><b>${API.thoat(t)}</b>${d ? `<span>${API.thoat(d)}</span>` : ''}</div>`;

/* ── Ô SỐ LIỆU ─────────────────────────────────────────────────────
   Ba tầng cố định: .k nhãn HOA nhỏ · .v số to phông mono · .d chú
   thích. Màu vạch trên: '' xanh (bình thường) · 'r' đỏ (tin xấu,
   cần xử lý ngay) · 'k' đen (đã xong, trung tính).
   Truyền ``diToi`` thì ô bấm được, nhảy sang trang chi tiết.        */
const oSo = (nhan, gt, { mau = '', chu = '', diToi = '' } = {}) => `
  <div class="card stat ${mau}"${diToi
      ? ` style="cursor:pointer" onclick="APP.diToi('${diToi}')"` : ''}>
    <div class="k">${API.thoat(nhan)}</div>
    <div class="v">${gt}</div>
    ${chu ? `<div class="d">${API.thoat(chu)}</div>` : ''}
  </div>`;

/* ── TRẠNG THÁI RỖNG TRONG BẢNG ────────────────────────────────────
   Khi bảng ĐÃ có hàng tiêu đề và chỉ thiếu dòng dữ liệu thì KHÔNG
   thay cả bảng — giữ thead lại để người dùng vẫn thấy bảng này lẽ
   ra chứa những cột gì. ``cot`` phải khớp ĐÚNG số cột của thead.    */
const dongRong = (cot, loi) =>
  `<tr><td colspan="${cot}" class="empty">${API.thoat(loi)}</td></tr>`;
```

### 3.2 Trang mẫu đầy đủ — chép làm khuôn

Đây là **thứ tự khối bắt buộc**: đầu trang → thanh lọc → hàng ô số liệu → thẻ bảng → phân trang. Mắt đi từ trên xuống theo đúng thứ tự người ta cần: *trang này là gì → thu hẹp phạm vi → mấy con số quan trọng nhất → chi tiết từng dòng.*

```js
/* ══════════════════════════════════════════════════════════════════
   trang/mau_chuan.js — KHUÔN THAM CHIẾU. Mọi trang danh sách sao
   chép cấu trúc này rồi thay nội dung. Không phát minh bố cục mới.
   ══════════════════════════════════════════════════════════════════ */
const MAUCHUAN = (() => {
  let boLoc  = BOLOC.nho('mau_chuan');   // ① đọc bộ lọc đã nhớ TRƯỚC
  let soTrang = 1;

  async function ve(el){
    APP.veTrangThai(el, 'dang-tai');     // "Đang tải…" tại đúng chỗ nội dung

    let d;
    try {
      d = await API.get('/duong-dan?' + BOLOC.thanhChuoi(boLoc)
                        + `&so_trang=${soTrang}&moi_trang=50`);
    } catch (e) {
      APP.veTrangThai(el, 'loi', { loi: e.message, thuLai: () => ve(el) });
      return;
    }
    const ds = Array.isArray(d.danh_sach) ? d.danh_sach : [];

    el.innerHTML = `

    <!-- ① ĐẦU TRANG ─────────────────────────────────────────────────
         h1 trùng khớp nhãn menu. Câu mô tả nói trang để làm gì và
         kèm luôn con số tổng. Nút hành động cùng hàng với tiêu đề
         nên tìm một chỗ là thấy hết việc làm được trên trang. -->
    ${dauTrang('Đề nghị mua hàng',
               `Bộ phận gửi yêu cầu về đây · ${APP.dinhDang.so(d.tong)} phiếu`,
               `<button class="btn btn-o btn-sm" id="nutXuat">
                  ${icon('tai', 14, 2.2)} Xuất Excel</button>
                <button class="btn btn-b" id="nutTao">
                  ${icon('them', 14, 2.2)} Tạo đề nghị</button>`)}

    <!-- ② THANH LỌC ─────────────────────────────────────────────────
         LUÔN nằm ngay dưới đầu trang, ở mọi trang, không xê dịch.
         BOLOC.ve() tự dựng .loc-bar chuẩn — không tự chế .row. -->
    <div id="thanhLoc" class="mb5"></div>

    <!-- ③ HÀNG Ô SỐ LIỆU ────────────────────────────────────────────
         Bốn ô thì .g4, ba ô thì .g3. Ô mang tin xấu tô vạch đỏ (mau
         'r'), ô "đã xong" tô đen (mau 'k'). Ai chỉ cần nắm tình hình
         thì dừng lại ở hàng này, không đọc tiếp xuống bảng. -->
    <div class="grid g4 mb5">
      ${oSo('Chờ duyệt',   APP.dinhDang.so(d.dem.cho_duyet),
            { chu:'Trưởng bộ phận chưa ký', diToi:'de_nghi' })}
      ${oSo('Quá hạn',     APP.dinhDang.so(d.dem.qua_han),
            { mau:'r', chu:'Đã trễ kỳ hạn yêu cầu' })}
      ${oSo('Đang mua',    APP.dinhDang.so(d.dem.dang_mua))}
      ${oSo('Đã hoàn thành', APP.dinhDang.so(d.dem.xong), { mau:'k' })}
    </div>

    <!-- ④ THẺ BẢNG ──────────────────────────────────────────────────
         .card bọc ngoài · .card-h là đầu thẻ (LUÔN mở bằng <h3>, rồi
         <span class="sp"> đẩy, rồi pill tóm tắt hoặc nút phụ) ·
         KHÔNG bọc .card-b quanh bảng — bọc .tw để bảng rộng cuộn
         ngang TRONG thẻ chứ không đẩy tràn cả trang. -->
    <div class="card mb4">
      <div class="card-h">
        <h3>Danh sách đề nghị</h3>
        <span class="sp"></span>
        <span class="pill p-g">${APP.dinhDang.so(d.tong)} phiếu</span>
      </div>

      ${!ds.length && !BOLOC.dangLoc(boLoc)
        /* Rỗng THẬT (chưa có dữ liệu bao giờ) → thay cả bảng, nói rõ
           bước tiếp theo. */
        ? rong('Chưa có đề nghị mua hàng nào',
               'Bấm "Tạo đề nghị" ở góc phải trên để lập phiếu đầu tiên.')

        : `<div class="tw"><table class="tbl" style="min-width:980px">
        <thead><tr>
          <th style="width:120px">Số phiếu</th>
          <th>Tên hàng</th>
          <th style="width:90px">Bộ phận</th>
          <th class="r" style="width:70px">SL</th>
          <th class="c" style="width:100px">Kỳ hạn</th>
          <th style="width:150px">Nhà cung cấp</th>
          <th class="c" style="width:60px" title="Số ngày sớm/trễ, âm là trễ">SN</th>
          <th style="width:130px">Trạng thái</th>
          <th class="c" style="width:60px"></th>
        </tr></thead>
        <tbody>
          ${ds.length ? ds.map(r => `
            <tr style="cursor:pointer" data-id="${API.thoat(r.ID)}">
              <!-- Mã phiếu: .mono để cột mã thẳng hàng -->
              <td><b class="mono t-xs">${API.thoat(r.SO_PHIEU)}</b></td>
              <td>${API.thoat(r.TEN_HANG)}</td>
              <td class="t-xs">${API.thoat(r.BO_PHAN || '—')}</td>
              <!-- Số: .r canh phải + .num chữ số đều bề rộng -->
              <td class="r num">${APP.dinhDang.so(r.SO_LUONG)}</td>
              <td class="c num t-xs">${APP.dinhDang.ngay(r.KY_HAN)}</td>
              <td class="t-xs">${API.thoat(r.NCC || '—')}</td>
              <td class="c num ${r.SO_NGAY < 0 ? 'so-tre'
                                : r.SO_NGAY <= 2 ? 'so-sap-tre' : ''}">${
                    r.SO_NGAY == null ? '—' : r.SO_NGAY}</td>
              <td>${APP.pill(r.TRANG_THAI)}</td>
              <!-- Dòng bấm được thì PHẢI có tín hiệu, không để người
                   dùng thử mới biết -->
              <td class="c mute2 t-xs">mở →</td>
            </tr>`).join('')
            /* Rỗng VÌ LỌC → giữ nguyên thead, chỉ báo trong bảng.
               colspan 9 phải khớp đúng 9 cột ở trên. */
            : dongRong(9, 'Không phiếu nào khớp bộ lọc. '
                        + 'Thử bỏ bớt điều kiện, hoặc bấm "Bỏ hết lọc".')}
        </tbody></table></div>`}
    </div>

    <!-- ⑤ PHÂN TRANG — thiếu thì dòng thứ 51 trở đi không có đường mở tới -->
    <div id="phanTrang"></div>`;

    /* ── Gắn sự kiện SAU khi đã đổ HTML ────────────────────────── */
    BOLOC.ve(el.querySelector('#thanhLoc'), {
      man: 'mau_chuan',
      truong: ['tu_khoa', 'khoang_ngay', 'ma_bo_phan', 'trang_thai', 'chi_tre_han'],
      giaTri: boLoc,
      khiDoi: g => { boLoc = g; soTrang = 1; ve(el); },
    });
    APP.phanTrang(el.querySelector('#phanTrang'), d, t => { soTrang = t; ve(el); });
    el.querySelectorAll('tbody tr[data-id]').forEach(tr =>
      tr.onclick = () => moChiTiet(tr.dataset.id));
    el.querySelector('#nutTao').onclick  = () => moFormTao();
    el.querySelector('#nutXuat').onclick = e =>
      APP.taiTep('/de-nghi/xuat?' + BOLOC.thanhChuoi(boLoc), 'de-nghi.xlsx', e.target);
  }

  APP.dangKyTrang('mau_chuan', { ten: 'Trang mẫu', ic: 'de_nghi', ve });
  return { ve };
})();
```

### 3.3 Ba luật bọc bảng — chọn đúng khung

| Nhu cầu | Khung | Cách viết |
|---|---|---|
| Bảng rộng hơn màn hình, cần cuộn ngang | `.tw` | `<div class="tw"><table class="tbl" style="min-width:980px">` — `min-width` đặt **trên `<table>`**, không phải trên `.tw` |
| Bảng cần khống chế chiều cao lẫn bề rộng | `.tw` + style | `<div class="tw" style="max-height:380px">` |
| Chỉ cần cuộn dọc, cao cố định 330px | `.scroll` | `<div class="scroll"><table class="tbl">` |

**Không bao giờ** đặt `<table>` trần, và **không bao giờ** dùng `<div class="card-b" style="padding:0">` làm khung bảng (đang có 43 chỗ như vậy) — `.card-b` không có `overflow`, nên bảng rộng đẩy tràn cả trang và `th` sticky mất chỗ bám.

### 3.4 Ba trạng thái bắt buộc của mọi khối dữ liệu

```js
/* ĐANG TẢI — không spinner, không skeleton. Dùng lại chính .rong,
   chữ kết bằng dấu ba chấm. Nằm đúng chỗ nội dung sắp hiện nên
   trang không nhảy layout khi dữ liệu về. */
el.innerHTML = '<div class="rong">Đang tải…</div>';

/* Việc chạy lâu thì NÓI TRƯỚC là sẽ lâu */
el.innerHTML = '<div class="rong">Đang tổng hợp báo cáo, có thể mất một lúc…</div>';

/* LỖI — hộp .alert.rd, tiêu đề đậm + câu lỗi THẬT ở dòng dưới,
   kèm nút Thử lại. Không để màn hình trắng cho người dùng tự đoán. */
el.innerHTML = `<div class="alert rd">
  <div><b>Không tải được dữ liệu</b><span class="t-sm">${API.thoat(loi)}</span></div>
  <button class="btn btn-b btn-sm" data-thu-lai>Thử lại</button></div>`;

/* RỖNG — xem §3.1, hàm rong() và dongRong() */
```

---

## 4 · KHUÔN BIỂU ĐỒ

Hiện tại **toàn hệ thống không có một biểu đồ nào**. Trang Báo cáo (`trang/bao_cao.js`) chỉ có bảng số và một "dãy xu hướng" vẽ bằng ký tự khối `▁▂▃▄` — thứ đó không so sánh được bằng mắt, không in được, và đổi hình theo phông của máy.

Ba khuôn dưới đây **không dùng thư viện nào**, chỉ SVG thuần và `<div>`, nên vẽ lại tức thì cùng lúc với cả trang và in ra PDF vẫn sắc nét.

### 4.1 Biểu đồ tròn `banh()` — mỗi lát là một `<circle>`

```js
/* ── BIỂU ĐỒ TRÒN ───────────────────────────────────────────────────
   Nhận mảng [{ten, gt, mau}]. KHÔNG dùng <path arc>, KHÔNG dùng
   conic-gradient, KHÔNG dùng thư viện. Mỗi lát cắt là MỘT thẻ
   <circle> cùng tâm cùng bán kính, độ dài lát điều khiển bằng
   stroke-dasharray, vị trí lát bằng stroke-dashoffset.

   ``muc``     — [{ten:'Chờ duyệt', gt:12, mau:'var(--blue-2)'}, …]
   ``tenGiua`` — nhãn đơn vị đặt dưới con số tổng ở lõi vòng.        */
function banh(muc, tenGiua = 'PHIẾU'){
  const tong = muc.reduce((s, m) => s + m.gt, 0);
  if (!tong) return `<div class="rong" style="padding:var(--s5)">Chưa có dữ liệu</div>`;

  const R = 58, C = 2 * Math.PI * R, cx = 96, cy = 96;
  let goc = 0;
  const cung = [], nhan = [];

  /* Chỉ vẽ lát có giá trị > 0 — lát rỗng làm hỏng phép tính offset.
     Mỗi lát bị cắt ngắn `khe` = 2,5 đơn vị ở cuối (tối đa 1/3 chiều
     dài lát, để lát 1% không biến mất). Chỗ bị cắt để lộ vòng nền
     trắng vẽ sẵn bên dưới, thành ĐƯỜNG VIỀN TRẮNG mảnh giữa hai lát —
     mắt tách được hai lát kể cả khi màu chúng gần nhau. */
  muc.filter(m => m.gt).forEach(m => {
    const pct = m.gt / tong, daiLat = pct * C;
    const khe = Math.min(2.5, daiLat / 3);
    cung.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
      stroke="${m.mau}" stroke-width="26"
      stroke-dasharray="${(daiLat - khe).toFixed(2)} ${(C - daiLat + khe).toFixed(2)}"
      stroke-dashoffset="${(-goc * C).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"
      ><title>${API.thoat(m.ten)}: ${m.gt} (${Math.round(pct * 100)}%)</title></circle>`);
      /* <title> con = tooltip gốc của trình duyệt, không cần JS.
         rotate(-90) để lát đầu tiên bắt đầu ở vị trí 12 giờ. */

    /* Ghi số lên lát chỉ khi lát đủ rộng (>=7%). Nhỏ hơn thì chữ
       chồng lên nhau thành mớ rối. Toạ độ tính bằng lượng giác của
       góc GIỮA lát; pointer-events:none để chữ không chắn tooltip.
       Màu chữ theo độ sáng của lát — chuTrenNen() trả chữ mực khi nền
       có độ chói > 0,22, còn lại chữ trắng. Chữ trắng cố định như
       trước thì con số trên lát nhạt gần như biến mất (chữ trắng trên
       #C6CCE9 chỉ tương phản 1,59 lần, cần 4,5). */
    if (pct >= 0.07){
      const gG = (goc + pct / 2) * 2 * Math.PI - Math.PI / 2;
      nhan.push(`<text x="${(cx + Math.cos(gG) * R).toFixed(1)}"
        y="${(cy + Math.sin(gG) * R + 4).toFixed(1)}" text-anchor="middle"
        style="font:700 12px 'Roboto Mono';fill:${chuTrenNen(m.mau)};pointer-events:none">${m.gt}</text>`);
    }
    goc += pct;
  });

  return `<div class="pie-wrap">
    <svg class="pie" viewBox="0 0 192 192" width="176" height="176">
      <!-- Vòng nền trắng vẽ TRƯỚC các lát: chính nó lộ ra ở các khe,
           thành đường viền trắng ngăn cách hai lát cạnh nhau. -->
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
              stroke="#fff" stroke-width="26"/>
      ${cung.join('')}
      <!-- Khoét lõi trắng r=44 để ra hình VÀNH KHUYÊN, chừa chỗ đặt tổng -->
      <circle cx="${cx}" cy="${cy}" r="44" fill="#fff"/>
      <text x="${cx}" y="${cy - 2}" text-anchor="middle"
        style="font:700 27px 'Roboto Mono';fill:var(--ink)">${tong}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle"
        style="font:400 10px 'Roboto Condensed';fill:var(--ink-3);letter-spacing:.09em">${
        API.thoat(tenGiua)}</text>
      ${nhan.join('')}
    </svg>
    <!-- CHÚ GIẢI nằm BÊN PHẢI (không phải bên dưới): mắt đi ngang từ
         lát màu sang tên rất ngắn. Bốn cột: ô màu · tên · số · %.
         Cột % khoá cứng width:40px + canh phải để thẳng hàng tuyệt
         đối — đây là bảng số liệu trá hình, không chỉ là chú thích.
         Duyệt TOÀN BỘ muc, kể cả mục =0, để người dùng biết hạng mục
         đó tồn tại chứ không phải bị mất. -->
    <div class="pie-legend">${muc.map(m => `<div>
      <i style="background:${m.mau}"></i>
      <span style="flex:1">${API.thoat(m.ten)}</span>
      <b>${m.gt}</b>
      <span class="mute2" style="width:40px;text-align:right">${
        tong ? Math.round(m.gt / tong * 100) : 0}%</span></div>`).join('')}</div>
  </div>`;
}
```

**Bảng màu chuẩn cho biểu đồ Mua hàng.** Sửa 09/2026 theo `docs/12` mục 8 —
người dùng phản ánh *"các màu đang gần giống nhau nên khó phân biệt"*.

Bảng cũ là sáu sắc độ của cùng một màu xanh
(`#283A97 #4A5BB8 #7B87CE #A8B0E0 #D0D5F0 #E8EAF7`). Đo bằng công thức tương
phản WCAG thì hai lát **cạnh nhau** chỉ chênh **1,21 – 1,78 lần**; mắt cần
chừng **2,0** trở lên mới tách được hai mảng màu lớn đặt sát nhau.

Ba luật của bảng mới:

1. **Giãn độ sáng cho đều** — lấy bậc theo độ sáng L của HSL, không trộn
   tuyến tính trong RGB (trộn RGB làm các bậc giữa dồn cục — đúng lỗi cũ).
2. **Xen kẽ hai họ sắc** — xanh thương hiệu ↔ xám trung tính/đen. Hai lát
   cạnh nhau khác nhau cả độ sáng lẫn độ bão hoà, nên người mù màu vẫn đọc
   được.
3. **Đỏ không nằm trong bảng** — đỏ chỉ dành cho nghĩa xấu (quá hạn, không
   đạt, huỷ). Đỏ mà đem đi phân biệt hạng mục thì mất hết sức nặng.

Thêm hai luật ngầm: **không lấy màu nhạt hơn nền giấy trắng dưới 1,55 lần**
(bảng cũ có `#E8EAF7` chỉ hơn nền trắng 1,20 lần — lát đó nhìn như chỗ
trống), và **giữa hai lát luôn có khe trắng mảnh** (xem `banh()` bên trên).

```js
/* Cặp cạnh nhau thấp nhất 2,11 lần — bảng cũ 1,21 lần. */
const MAU_CHONG = [
  '#283A97',   // xanh thương hiệu       độ chói 0,057
  '#A8B0E0',   // xanh phấn sáng                 0,448
  '#0E1220',   // đen mực                        0,006
  '#8390D8',   // xanh nhạt                      0,297
  '#393E4C',   // than                           0,048
  '#C6CCE9',   // xanh phấn                      0,611
  '#59627A',   // xám đá                         0,123
  '#BFC3CF',   // xám sáng                       0,546
  '#5C6DCC',   // xanh vừa — màu dự phòng        0,176
];

/* Ý nghĩa nằm ở HỌ SẮC: xanh = còn trong luồng · xám = đã đóng hồ sơ
   · đỏ = bất thường. Cặp cạnh nhau thấp nhất 2,20 lần (cũ: 1,04). */
const MAU_TT = {
  chua_xu_ly : '#5C6DCC',      // xanh vừa   — mới vào, chưa ai động tới
  cho_duyet  : '#A8B0E0',      // xanh phấn  — đang chờ người khác
  dang_mua   : 'var(--blue)',  // xanh đậm   — đang chạy, việc chính
  hoan_thanh : '#BFC3CF',      // xám sáng   — xong, lùi về nền
  qua_han    : 'var(--red)',   // đỏ         — báo động
  huy        : 'var(--red-2)', // đỏ nhạt    — bất thường nhưng đã đóng
};

/* Mức độ ưu tiên — khoá cứng ba màu này ở MỌI chỗ hiển thị ưu tiên */
const MAU_UT = { 1:'var(--red)', 2:'var(--blue)', 3:'var(--blue-2)' };
```

**Đừng tự bốc `MAU_CHONG[i]` cho biểu đồ tròn.** Vòng tròn khép kín nên lát
cuối chạm lại lát đầu, và các lát đỏ chen vào giữa cũng cần được tránh. Gọi
`APP.dayMau(số lát)`, hoặc đơn giản là **để trống `mau`** rồi để `banh()` tự
chọn — chỉ khai `mau` cho những lát mang nghĩa riêng (đỏ cho trễ hạn). Thanh
xếp chồng thì lấy thẳng theo chỉ số được, vì hai đầu thanh không chạm nhau.

Đo trên màn Tổng quan đang chạy (7 lát tự động + 1 lát đỏ): cặp chạm nhau
tệ nhất **2,04 lần**.

**Dùng trong trang:**

```html
<div class="grid g2 mb5">
  <div class="card"><div class="card-h"><h3>Phiếu theo tình trạng</h3></div>
    <div class="card-b">${banh(mucTinhTrang, 'PHIẾU')}</div></div>
  <div class="card"><div class="card-h"><h3>Phiếu theo mức ưu tiên</h3></div>
    <div class="card-b">${banh(mucUuTien, 'PHIẾU')}</div></div>
</div>
```

### 4.2 Thanh xếp chồng `thanhChong()` — tỷ lệ ở trên, số ở dưới

```js
/* ── THANH XẾP CHỒNG ───────────────────────────────────────────────
   Lấy màu THẲNG theo thứ tự MAU_CHONG (xem 4.1): thanh là một đoạn
   thẳng, khúc cuối không chạm khúc đầu, nên chỉ cần các cặp kề nhau
   trong bảng phân biệt được — cặp kém nhất cũng đã 2,11 lần. Lấy
   thẳng theo chỉ số còn được thêm cái lợi: cùng một hạng mục ở vị trí
   thứ ba thì bảng nào cũng ra đúng màu đó. Lấy vòng khi quá 9 hạng mục.

   Giữa hai khúc có vạch trắng 2px (luật .chong>div+div): hai khúc có
   vạch ngăn thì mắt tách được ngay, kể cả khi màu chúng gần nhau.

   Cho CẢ HAI: thanh ở trên để đọc tỷ lệ bằng mắt, bảng số ở dưới để
   ghi biên bản — không bắt người dùng rê chuột.                     */

function thanhChong(obj, khiTrong, tienTo = ''){
  const ds = Object.entries(obj || {}).filter(([, v]) => v > 0);
  if (!ds.length) return `<span class="mute2 t-xs">${API.thoat(khiTrong)}</span>`;
  const tong = ds.reduce((a, [, v]) => a + v, 0);

  return `<div style="display:flex;height:16px;border-radius:3px;
                      overflow:hidden;margin-bottom:6px">
    ${ds.map(([k, v], i) => `<div
      title="${API.thoat(tienTo + k)}: ${v} (${Math.round(v / tong * 100)}%)"
      style="width:${v / tong * 100}%;background:${MAU_CHONG[i % MAU_CHONG.length]}"></div>`
    ).join('')}
  </div>
  ${ds.map(([k, v], i) => `<div class="row t-sm" style="gap:6px">
    <span style="width:9px;height:9px;border-radius:2px;flex:none;
                 background:${MAU_CHONG[i % MAU_CHONG.length]}"></span>
    <span>${API.thoat(tienTo + k)}</span><span class="sp"></span>
    <b class="mono">${v}</b>
    <span class="mute2 t-xs">${Math.round(v / tong * 100)}%</span></div>`).join('')}`;
}
```

### 4.3 Thanh tỷ lệ trong ô bảng — khuôn ba lớp, dùng lại khắp nơi

Không có lớp CSS riêng. Đây là khuôn viết inline, lặp y hệt ở mọi bảng để người dùng học một lần đọc được mọi chỗ: **rãnh xám luôn là 100%, phần tô luôn là phần đã dùng, con số luôn ở bên phải.**

```js
/* Chiều cao đổi theo ngữ cảnh: 6px trong ô bảng chật · 16px bảng
   thường · 22px hàng xếp hạng. Luôn kẹp Math.min(100,…) để không tràn. */
const thanhTyLe = (pt, { cao = 16, so = null } = {}) => `
  <div class="row" style="gap:7px">
    <div class="sp" style="height:${cao}px;background:var(--rule-2);
                           border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${Math.min(100, pt)}%;background:${
        /* NGƯỠNG BA BẬC — quy tắc lặp lại toàn hệ thống.
           Người xem không cần biết ngưỡng là bao nhiêu; họ chỉ cần
           thấy "xanh là ổn, xanh nhạt là sát trần, đỏ là vỡ". */
        pt > 100 ? 'var(--red)' : pt > 85 ? 'var(--blue-4)' : 'var(--blue)'
      }"></div></div>
    <span class="pill ${pt > 100 ? 'p-r' : pt > 50 ? 'p-b' : 'p-g'}"
      style="min-width:54px;justify-content:center">${so ?? pt + '%'}</span>
  </div>`;

/* Biến thể "tiến độ hoàn thành": 100% tô ĐEN (không phải xanh) để
   "xong hẳn" khác hẳn "gần xong". */
const thanhTienDo = (xong, tong) => `
  <div style="height:6px;background:var(--rule-2);border-radius:3px;overflow:hidden">
    <div style="height:100%;width:${tong ? xong / tong * 100 : 0}%;background:${
      xong >= tong ? 'var(--black)' : 'var(--blue)'}"></div></div>
  <span class="mono t-xs">${xong}/${tong}</span>`;
```

### 4.4 Biểu đồ cột đứng — cũng thuần `<div>`

```js
/* Khung flex align-items:flex-end nên các cột tự đứng trên cùng một
   đường nền. KHÔNG có trục toạ độ, KHÔNG có lưới ngang — ghi thẳng
   con số lên đầu mỗi cột thì người đọc lấy được giá trị chính xác mà
   không phải dóng mắt sang trục.                                    */
function cotDung(cacKy){                    // [{nhan, pt, phu}]
  const cao = Math.max(...cacKy.map(k => k.pt), 1);
  return `<div style="display:flex;align-items:flex-end;gap:var(--s4);height:190px">
    ${cacKy.map(k => {
      /* Math.max(100, cao) làm mốc trần: thang LUÔN tính tới ít nhất
         100%. Nếu tất cả đều thấp thì cột trông thấp thật, không bị
         phóng đại thành "đang bận".
         Sàn 3px để cột bằng 0 vẫn nhìn thấy được. */
      const h = Math.max(3, k.pt / Math.max(100, cao) * 160);
      const c = k.pt > 100 ? 'var(--red)' : k.pt > 85 ? 'var(--blue-4)' : 'var(--blue)';
      return `<div style="flex:1;display:flex;flex-direction:column;
                          align-items:center;gap:5px">
        <span class="mono" style="font-size:14px;font-weight:700;color:${c}">${k.pt}%</span>
        <div title="${API.thoat(k.nhan)}: ${k.pt}%"
          style="width:100%;height:${h}px;background:${c};
                 border-radius:3px 3px 0 0;transition:height .4s"></div>
        <span class="cond t-xs" style="font-weight:700">${API.thoat(k.nhan)}</span>
        ${k.phu ? `<span class="mute2" style="font-size:10px">${API.thoat(k.phu)}</span>` : ''}
      </div>`;}).join('')}
  </div>`;
}
```

**Luật chung cho mọi biểu đồ:** cuối mỗi `.card-b` chứa biểu đồ, thêm một dòng `<p class="mute2 t-xs mt3">` nói rõ **con số tính trên cơ sở nào**. Ví dụ: *"Tỷ lệ đúng hạn tính theo NGÀY YÊU CẦU của bộ phận, không phải ngày NCC cam kết."* Không có dòng này thì người xem diễn giải sai và không ai phát hiện ra.

---

## 5 · MENU TRÁI — 14 TRANG CHIA NHÓM

### 5.1 Bảng khai `NAV` — nguồn DUY NHẤT sinh ra menu và tiêu đề trang

Đặt trong `app.js`, **thay cho `TEN_TRANG` + `THU_TU_TRANG` phẳng hiện tại**.

```js
/* ══ BẢNG KHAI TRANG ══════════════════════════════════════════════
   Một bảng này sinh ra BA thứ: (1) menu trái, (2) tiêu đề trên thanh
   trên, (3) lưới "Truy cập nhanh" ở trang chủ. Tên trang chỉ khai
   MỘT LẦN nên nhãn menu, tiêu đề màn hình và nhãn thẻ luôn trùng
   khớp — không có hai cách gọi cho cùng một trang.

   Nhóm chia theo ĐẦU VIỆC người dùng đang nghĩ trong đầu, không phải
   theo module kỹ thuật. Người mua hàng nghĩ "tôi đang ở khâu nào của
   QT-MH-01", nên nhóm A xếp đúng thứ tự quy trình.                  */
const NAV = [
  { g:'Mua hàng', items:[
      { id:'de_nghi',    t:'Đề nghị mua hàng', ic:'de_nghi'    },
      { id:'cong_viec',  t:'Giao việc',        ic:'check_list' },
      { id:'bao_gia',    t:'Báo giá',          ic:'bao_gia'    },
      { id:'don_hang',   t:'Đơn hàng',         ic:'don_hang'   },
      { id:'giao_nhan',  t:'Giao nhận',        ic:'giao_nhan'  },
      { id:'thanh_toan', t:'Thanh toán',       ic:'thanh_toan' },
  ]},
  { g:'Gia công ngoài', items:[
      { id:'dat_ngoai',  t:'Đặt ngoài',        ic:'dat_ngoai'  },
      { id:'dieu_xe',    t:'Điều xe',          ic:'dieu_xe'    },
  ]},
  { g:'Dữ liệu & Báo cáo', items:[
      { id:'ncc',        t:'Nhà cung cấp',     ic:'ncc'        },
      { id:'danh_muc',   t:'Dữ liệu gốc',      ic:'db'         },
      { id:'bao_cao',    t:'Báo cáo',          ic:'pie'        },
  ]},
  { g:'Hệ thống', items:[
      { id:'tien_ich',   t:'Tiện ích',         ic:'tien_ich'   },
      { id:'quan_tri',   t:'Quản trị',         ic:'shield'     },
  ]},
];

/* "Tổng quan" đứng RIÊNG trên cùng, ngoài mọi nhóm — nó không thuộc
   khâu nào, nó là chỗ nhìn tất cả. Giữ đúng cách bản gốc làm. */
const TRANG_CHU = { id:'home', t:'Tổng quan', ic:'home' };

/* Tra nhãn cho tiêu đề thanh trên — thay TEN_TRANG cũ */
const nhanTrang = id => id === 'home' ? TRANG_CHU.t
  : (NAV.flatMap(g => g.items).find(x => x.id === id)?.t || id);
```

**Vì sao chia như vậy:**

- **Nhóm "Mua hàng" (6 mục)** xếp đúng trình tự QT-MH-01: đề nghị → giao việc → báo giá → đơn hàng → giao nhận → thanh toán. Người dùng đọc menu từ trên xuống là đọc lại quy trình; ai đang ở khâu nào thì bấm đúng chỗ đó.
- **Nhóm "Gia công ngoài" (2 mục)** tách hẳn vì đây là luồng song song, dùng chứng từ khác, người khác phụ trách. Gộp chung vào Mua hàng sẽ khiến 8 mục thành một khối không đọc được.
- **Nhóm "Dữ liệu & Báo cáo" (3 mục)** là thứ tra cứu, không phải thứ làm hằng ngày — đặt dưới để không cạnh tranh với luồng chính.
- **Nhóm "Hệ thống" (2 mục)** đặt cuối cùng, đúng nơi mắt tìm khi cần cấu hình.

### 5.2 Hàm dựng menu — thay `dungMenu()` hiện tại

```js
function dungMenu(){
  const hoSo = API.layHoSo();
  const nv = document.getElementById('railNav');
  if (!nv || !hoSo) return;
  nv.innerHTML = '';

  /* ① Trang chủ đứng riêng, chèn TRƯỚC mọi nhóm, không có nhãn nhóm */
  if (API.coQuyen('home', 'xem')){
    const h = document.createElement('a');
    h.className = 'rail-i';
    h.href = '#home';
    h.dataset.trang = 'home';
    h.innerHTML = `${icon(TRANG_CHU.ic)}<span>${TRANG_CHU.t}</span>`;
    nv.appendChild(h);
  }

  /* ② Từng nhóm. Nhóm nào KHÔNG còn mục nào được xem thì biến mất
     luôn cả nhãn — không để lại tiêu đề rỗng làm người ta tưởng
     hệ thống lỗi. Nhắc lại: ẩn nút KHÔNG phải phân quyền, máy chủ
     vẫn tự kiểm trên mọi endpoint. */
  const loc = g => g.items.filter(i => API.coQuyen(i.id, 'xem'));
  NAV.filter(g => loc(g).length).forEach(g => {
    const nhan = document.createElement('div');
    nhan.className = 'rail-g';
    nhan.innerHTML = `<span>${g.g}</span>`;
    nv.appendChild(nhan);

    loc(g).forEach(i => {
      const a = document.createElement('a');
      a.className = 'rail-i';
      a.href = '#' + i.id;                 // giữ liên kết sâu + nút Back
      a.dataset.trang = i.id;
      /* .rail-i chứa ĐÚNG hai phần tử: svg rồi span. svg có
         flex-shrink:0 nên nhãn dài không bóp méo biểu tượng. */
      a.innerHTML = `${icon(i.ic)}<span>${i.t}</span>`;
      nv.appendChild(a);
    });
  });

  /* ③ Thẻ người dùng ở thanh trên — .uchip + .av đã có sẵn CSS */
  const uc = document.getElementById('theNguoiDung');
  if (uc) uc.innerHTML = `
    <div class="av">${(hoSo.ho_va_ten || '?').trim().slice(-1).toUpperCase()}</div>
    <div><b>${API.thoat(hoSo.ho_va_ten)}</b><span>${API.thoat(hoSo.vai_tro || '')}</span></div>`;
}
```

### 5.3 Huy hiệu số trên mục menu (tuỳ chọn, CSS đã có sẵn)

`hd.css:75` đã định nghĩa `.rail-i .n` (huy hiệu đỏ đẩy sát mép phải). Dùng cho những mục có việc chờ — ví dụ `cong_viec` (việc chưa làm), `de_nghi` (phiếu chờ duyệt):

```js
/* Chỉ bật khi số KHÁC 0. Không bao giờ hiện số 0, để hễ thấy chấm
   đỏ là chắc chắn có thứ cần bấm vào — người dùng học được điều đó
   sau một lần và tin luôn. */
function datHuyHieu(idTrang, so){
  const a = document.querySelector(`#railNav .rail-i[data-trang="${idTrang}"]`);
  if (!a) return;
  a.querySelector('.n')?.remove();
  if (!so) return;
  const n = document.createElement('span');
  n.className = 'n';
  n.textContent = so > 99 ? '99+' : so;
  a.appendChild(n);
}
```

---

## 6 · DANH SÁCH VIỆC PHẢI SỬA THEO TỪNG TỆP

Xếp theo mức độ: **[N] nặng** — người dùng nhìn thấy hỏng hoặc mất chức năng · **[V] vừa** — lệch chuẩn, khó dùng · **[N2] nhẹ** — dọn dẹp.

---

### 6.1 `frontend/index.html` (254 dòng)

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **Dòng 10 — thiếu `Roboto Condensed`.** Toàn bộ nhãn, tiêu đề cột và thân bảng đang chạy sai phông. Thay link theo §1.4. **Làm việc này trước tất cả**, vì mọi phép căn chỉnh cột sau đó đều phụ thuộc vào nó. |
| 2 | **[N]** | **Dòng 128 — nút menu là ký tự `☰`**, dòng 133 — chuông là emoji `🔔`. Thay bằng `${icon('menu',19,2.2)}` và `${icon('bell',17,2)}`. Emoji không nhận `currentColor`, đổi hình theo hệ điều hành, và không in ra PDF. |
| 3 | **[N]** | **Thanh trên `.top` thiếu `<span class="sp">`.** Đang dùng `<div class="row" style="margin-left:auto">`. Media query `hd.css:516,526` ẩn `.sp` trên điện thoại — bố cục thanh trên trên điện thoại đang không được kiểm soát. Dựng lại đúng thứ tự: nút menu → `<b id="tieuDeTrang">` → `<span class="sp">` → nút chuông `.ibtn` có `<span class="n">` → thẻ người dùng `.uchip`. |
| 4 | **[N]** | **Chưa có `.uchip` / `.av`.** Đang là `<span class="t-sm mute2" id="tenNguoiDung">` in cả tên lẫn vai trò trên một dòng. CSS `hd.css:89-92` đã dựng sẵn thẻ người dùng có avatar tròn đỏ + tên + vai trò hai dòng. Thay bằng `<div class="uchip" id="theNguoiDung"></div>` và để `dungMenu()` đổ nội dung (§5.2). |
| 5 | **[V]** | **Dòng 133 — `.chuong .dem` là huy hiệu tự chế.** `hd.css:88` đã có `.ibtn .n` làm đúng việc đó (17px, viền trắng 2px tách khỏi biểu tượng). Đổi `class="dem"` thành `class="n"`, xoá luật `.chuong .dem` trong `hd-mua-hang.css:230-237`. |
| 6 | **[V]** | **Dòng 118 — `<div class="row sp">` bọc nội dung chân menu.** Chú thích ngay trong `hd.css:82-84` cảnh báo: `.sp` là ô đệm RỖNG, media query ẩn nó trên điện thoại → nội dung bọc trong đó biến mất sạch không báo lỗi. Sửa thành `<div class="row"><span class="mono t-xs">…</span><span class="sp"></span><a …>Đăng xuất</a></div>`. |
| 7 | **[V]** | Thanh trên thiếu **khối trạng thái đồng bộ** (`.dot-live` nhấp nháy + giờ đồng bộ gần nhất). Người dùng không có cách nào biết số trên màn hình còn tươi hay đã cũ. Thêm theo mẫu bản gốc `index.html:107-109`. |
| 8 | **[N2]** | Ba ô `.li-item` ở màn hình đăng nhập **không có `<svg>`** — chỉ có `<b>` và `<span>`. CSS `hd.css:280` đã dựng sẵn quy cách nét trắng 26px. Thêm ba icon: `de_nghi`, `dat_ngoai`, `dieu_xe`. |
| 9 | **[N2]** | Khối `.login-stat` đang dùng chữ (`"Theo từng mã hàng"`) làm `<b>`, trong khi CSS đặt `<b>` là Roboto Mono 27px — dành cho **con số**. Đổi thành số thật: số bộ phận, số bước quy trình, số ngày cam kết mặc định. |

---

### 6.2 `frontend/assets/app.js` (464 dòng)

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **Không có từ điển `IC`.** Thêm nguyên §2.3 + §2.4 và hàm `icon()` §2.2. Đây là điều kiện tiên quyết cho mọi việc còn lại. |
| 2 | **[N]** | **Menu trái là danh sách phẳng 14 mục, không nhóm, không biểu tượng.** Dòng 297-318 (`TEN_TRANG`, `THU_TU_TRANG`, `dungMenu`). Thay bằng `NAV` + `dungMenu()` mới ở §5.1-§5.2. Người dùng hiện phải đọc 14 dòng chữ giống hệt nhau để tìm trang. |
| 3 | **[N]** | **`veTrangThai(el,'trong')` dùng `.empty` cho trạng thái rỗng cấp trang.** `.empty` (`hd.css:152`) thiết kế cho `<td colspan>` trong bảng; cấp trang phải là `.rong` (`hd.css:266-267`) có `<b>` tiêu đề đậm 15px. Sửa hàm để sinh `<div class="rong"><b>…</b><span>…</span></div>`. Thêm hàm `dongRong(cot, loi)` cho trường hợp trong bảng. |
| 4 | **[N]** | **`veTrangThai(el,'dang-tai')` dùng `.spin` (vòng xoay).** Bản gốc không có spinner ở đâu cả — dùng lại chính `.rong` với chữ `"Đang tải…"`, đặt đúng chỗ nội dung sắp hiện nên trang không nhảy layout khi dữ liệu về. Sửa thành `<div class="rong">Đang tải…</div>`, xoá `.spin` và `@keyframes hd-quay` khỏi `hd-mua-hang.css`. |
| 5 | **[N]** | **`moModal()` dùng `<b>` làm tiêu đề hộp thoại** (dòng 73). `hd.css:172` chỉ tạo kiểu cho `.modal-h h3`. Đổi `<b>` → `<h3>`. Đồng thời nút đóng `×` → `${icon('dong',16,2)}`. |
| 6 | **[N]** | **`xacNhan({nguyHiem:true})` không bật viền đỏ hộp thoại.** Chỉ đổi lớp nút. `hd.css:168` có `.modal.rd{border-top-color:var(--red)}` — vạch màu ở mép trên là chỗ mắt chạm đầu tiên, nó cho biết "phải đọc kỹ" TRƯỚC khi kịp đọc tiêu đề. Thêm `if (nguyHiem) ov.querySelector('.modal').classList.add('rd')`. Đồng thời khi `nguyHiem` thì nhãn nút thoát phải là **"Huỷ"** (đang là "Thoát"), vì "Huỷ" ngầm nói có việc dở dang sẽ bị bỏ. |
| 7 | **[V]** | **`MAU_TRANG_THAI` dùng `p-vang` cho 12 trạng thái**, trong đó có `CHO_DUYET`, `CHO_KY_BU`, `CHO_CAP_MA`, `MOI`, `DANG_BAO_GIA`. Chờ duyệt là **bình thường**, không phải cảnh báo. Vàng phải để dành cho "sắp trễ / cần xác nhận". Sửa: `CHO_*` và `MOI` → `p-g` (xám trung tính); giữ `p-vang` cho `CANH_BAO`, `GIAO_MOT_PHAN`, và các trạng thái sắp-trễ. |
| 8 | **[V]** | **Thiếu bốn hàm trợ giúp dùng chung:** `dauTrang()`, `rong()`, `oSo()`, `dongRong()`. Thêm nguyên §3.1. Không có chúng thì 17 tệp trang sẽ tự chế 17 kiểu đầu trang khác nhau. |
| 9 | **[V]** | **Thiếu hàm biểu đồ:** `banh()`, `thanhChong()`, `thanhTyLe()`, `thanhTienDo()`, `cotDung()`. Thêm nguyên §4. |
| 10 | **[V]** | **`toast()` khác hẳn bản gốc.** Bản gốc: băng nổi giữa đáy màn hình, hai màu (xanh = xong, đỏ = hỏng), `z-index:250` để hiện đè lên hộp thoại, tự tan sau 3 giây, không nút đóng. Bản hiện tại: xếp chồng góc phải dưới, có nút `×`, 4 loại. Giữ được, nhưng **bắt buộc kiểm `z-index` cao hơn `.ov` (100)** — hiện `.toast-vung` là 10000, đạt. Chỉ cần rút còn ba loại `ok/loi/canh-bao` để khớp bảng màu hai sắc. |
| 11 | **[V]** | **`veTrangThai(el,'loi')` dùng `.alert` không có `.rd`.** Lỗi phải là hộp đỏ. Sửa thành `class="alert rd"`. |
| 12 | **[N2]** | `dangKyTrang()` chưa nhận trường `ic`. Thêm để mỗi trang tự khai biểu tượng, và `dungMenu()` đọc từ `NAV` (nguồn duy nhất) thay vì rải rác. |
| 13 | **[N2]** | `diToi()` không cuộn về đầu trang sau khi vẽ. Thêm `window.scrollTo(0,0)` ở cuối — người dùng đang cuộn giữa bảng dài, chuyển trang mà vẫn ở lưng chừng thì mất phương hướng. |

---

### 6.3 `frontend/assets/hd-mua-hang.css` (294 dòng)

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **Dòng 201, 203, 284 — năm mã màu ngoài bộ nhận diện**: `#075985`, `#BAE6FD`, `#92400E`, `#FDE68A`, `#B45309`. Thay theo bảng §1.2. |
| 2 | **[V]** | **Dòng 10-27 — khối chú thích còn chép nguyên ba mã hex đã bị loại** (`#16A34A`, `#F59E0B`, `#0EA5E9`). Chú thích tốt, nhưng để nguyên mã hex trong tệp là mời người sau chép lại. Viết lại chú thích bằng chữ, bỏ mã. |
| 3 | **[V]** | **Xoá `.spin` và `@keyframes hd-quay`** (dòng 34-40) sau khi sửa `veTrangThai` (§6.2 mục 4). |
| 4 | **[V]** | **Xoá `.chuong .dem`** (dòng 230-237) sau khi chuyển sang `.ibtn .n`. |
| 5 | **[V]** | **`.dong-canh-bao` (dòng 96-100) dùng `box-shadow:inset 4px 0` để vẽ vạch trái dòng bảng.** Bản gốc dùng `border-left:3px solid` trên `<td>` đầu tiên của hàng nhóm. `box-shadow` inset bị `overflow:hidden` của `.tw` cắt mất ở dòng đầu/cuối. Đổi sang `border-left`. |
| 6 | **[N2]** | Bổ sung luật cho biểu đồ mới nếu cần (chỉ khi §4 phát sinh lớp mới — hiện `.pie`, `.pie-wrap`, `.pie-legend` đã có đủ trong `hd.css:331-337`, **không cần thêm gì**). |
| 7 | **[N2]** | **`.so` (dòng 195) trùng tên với `.buoc-n` khái niệm "số".** Đổi tên thành `.canh-phai` để tránh nhầm với `.stat .v`. Việc này kéo theo sửa ở các trang — làm sau cùng, hoặc bỏ qua nếu ngại rủi ro. |

---

### 6.4 TẤT CẢ 17 tệp `frontend/assets/trang/*.js` — bốn việc lặp lại

Bốn việc dưới đây phải làm ở **mọi** tệp trang. Làm theo thứ tự tệp ở §6.5.

#### Việc A — **[N] Thêm đầu trang `.phead`** *(0/17 tệp đang có)*

Hiện tại mọi trang mở đầu bằng thanh tab hoặc thẳng vào thẻ. Người dùng không có tiêu đề trang, không có câu mô tả, và không có chỗ cố định để đặt nút hành động — nên nút "Tạo mới" nằm mỗi trang một chỗ.

```js
// TRƯỚC (don_hang.js:76)
el.innerHTML = `
  <div class="row sp mb3" style="align-items:center;gap:12px">
    ${thanhTab('tien_do')}
  </div>
  …

// SAU
el.innerHTML = `
  ${dauTrang('Đơn hàng',
             `Theo dõi tới từng mã hàng · ${APP.dinhDang.so(d.tong)} dòng đang chạy`,
             `<button class="btn btn-o btn-sm" id="nutXuat">
                ${icon('tai',14,2.2)} Xuất Excel</button>`)}
  <div class="tabs">${thanhTab('tien_do')}</div>
  …
```

#### Việc B — **[N] Bọc bảng trong `.tw`** *(44/65 bảng đang trần)*

```js
// TRƯỚC — 43 chỗ trên toàn hệ thống
<div class="card"><div class="card-b" style="padding:0"><table class="tbl">…

// SAU
<div class="card"><div class="tw"><table class="tbl" style="min-width:980px">…
```

`.card-b` không có `overflow` → bảng rộng đẩy tràn cả trang, và `th` sticky mất chỗ bám nên tiêu đề cột trôi mất khi cuộn tới dòng thứ 30.

#### Việc C — **[N] `.card-h` phải mở bằng `<h3>`** *(26/26 chỗ đang dùng `<b>`)*

```js
// TRƯỚC
<div class="card-h"><b>Tình trạng mã hàng</b>
  <span class="mute2 t-sm">1.240 dòng</span></div>

// SAU
<div class="card-h"><h3>Tình trạng mã hàng</h3>
  <span class="sp"></span>
  <span class="pill p-g">1.240 dòng</span></div>
```

Không chỉ là cỡ chữ: media query `hd.css:527` đặt `.card-h h3{flex:1 1 100%}` để tiêu đề xuống dòng riêng trên điện thoại. Dùng `<b>` thì luật đó không bao giờ chạy → đầu thẻ trên điện thoại bị bóp và nút bị đẩy khỏi khung.

#### Việc D — **[V] Thay emoji bằng `<svg>`**

Bảng thay thế đầy đủ:

| Emoji đang dùng | Ở đâu | Thay bằng |
|---|---|---|
| `🔴 🟠 🟢 🔵 ⚪` | `don_hang.js:14-18`, `bao_gia.js`, `tuong_tac.js` | `<span class="pill p-r/p-vang/p-b/p-g">` hoặc `<i>` ô màu 10×10 như `.pie-legend i` |
| `⚠` | `de_nghi.js`, `de_nghi_dt.js`, `bao_gia.js`, `vat_tu.js`, `tuong_tac.js` | `${icon('warn',14,2)}` |
| `→ ←` | 9 tệp | Giữ được nếu là chữ trong câu ("mở →"); nếu là **nút** thì `${icon('dat_ngoai')}` hoặc ký tự trong `<button>` có `aria-label` |
| `★` | `bao_gia.js` | `${icon('award',14,2)}` |
| `⚡` | `bao_gia.js` | `${icon('warn',14,2)}` + pill `p-r` "Khẩn" |
| `📄 💬 📎 👤 🏷 ✍ ✅ 🔒 🚫 🕑 ↩` | `tuong_tac.js`, `tien_ich.js` | `file` · `chat` · (giữ 📎 hoặc bỏ) · `hand` · `bao_gia` · `de_nghi` · `task` · `lock` · `warn` · `clock` · `dongbo` |
| `⭳ ⭱ ❌` | `nhap_lo.js`, `dat_ngoai.js`, `vat_tu.js` | `tai` · `tai` (xoay) · `dong` |

---

### 6.5 Việc riêng của từng tệp trang — xếp theo mức nặng

#### `trang/bao_cao.js` (409 dòng) — **[N] nặng nhất**

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **Trang chủ (`home`) không có gì của một trang chủ.** Nó chỉ là tab đầu tiên của Báo cáo. Bản gốc trang chủ có: dòng chào `.eyebrow` → `.phead` → **sơ đồ quy trình `.flow`** (5-6 bước bấm được, dạy người mới quy trình và làm luôn menu) → **lưới `.g4` thẻ `.mcard` Truy cập nhanh** → bảng "Hạng mục chờ xử lý". Dựng lại toàn bộ. `.flow`/`.fstep`/`.fico`/`.mcard`/`.ic` đều đã có CSS sẵn (`hd.css:199-215`), chỉ thiếu markup. |
| 2 | **[N]** | **Không có biểu đồ nào.** Dòng 118-124: 5 ô tình trạng dựng bằng `<button class="btn btn-o" style="flex-direction:column">` — nút bị bẻ thành ô số liệu. Thay bằng `${oSo(...)}` trong `.grid g4/g3`, cộng thêm hai biểu đồ tròn `${banh(...)}` trong `.grid g2` (theo tình trạng · theo mức ưu tiên). |
| 3 | **[N]** | **`daiXuHuong()` (dòng ~85) vẽ đường xu hướng bằng ký tự khối `▁▂▃▄▅▆▇█`.** Không so sánh được bằng mắt, phụ thuộc phông của máy, và trong PDF thành ô vuông. Thay bằng `cotDung()` §4.4 hoặc một sparkline SVG. |
| 4 | **[V]** | Dòng 128-146: hai bảng "Cần chú ý" và "Việc của tôi" đặt trong `.card-b` không có `.tw`. Áp việc B. |
| 5 | **[V]** | Dòng 66, 238: `<div class="card mb3"><div class="card-b"><div class="row loc-bar">` — thanh lọc tự chế, bọc thừa hai lớp. `.loc-bar` **tự nó đã là hộp trắng có viền** (`hd.css:251-256`). Bỏ `.card`/`.card-b`, gọi `BOLOC.ve()`. |
| 6 | **[N2]** | Dòng 234: `<span style="margin-left:auto">` → `<span class="sp">`. |

#### `trang/don_hang.js` (472 dòng) — **[N]**

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | Dòng 14-18 `CHAM` — năm emoji chấm màu. Đây là **màn hình dùng nhiều nhất cả hệ thống**. Thay bằng `.pill` theo bảng: `TRE`→`p-r` · `SAP_TRE`→`p-vang` · `DA_GIAO`→`p-b` · `DANG_GIAO`→`p-bs` · `CHUA_DAT`→`p-g`. |
| 2 | **[N]** | Dòng 188 `the()` sinh `<div class="stat">` **thiếu `card`**. `.stat` chỉ thêm padding + vạch trên; không có `.card` thì không có nền trắng, không viền, không bóng — ô số liệu trôi trên nền xám. Thay bằng `oSo()` §3.1. Cùng lỗi ở `thanh_toan.js:181`. |
| 3 | **[N]** | Dòng 78-90: thanh lọc tự chế `<div class="row loc-bar" style="gap:10px;flex-wrap:wrap">` với `<input class="input o-loc">` — `.o-loc` là **hộp bọc** (`flex-direction:column`, chứa `.label` + `.o-loc-in`), không phải lớp cho `<input>`. Kết quả: ô tìm không có nhãn, không có nút `×` bỏ lọc, không có gợi ý. Chuyển sang `BOLOC.ve()`. |
| 4 | **[N]** | Dòng 90-96: hàng ô số liệu dùng `<div class="row" style="gap:10px;flex-wrap:wrap">` thay vì `.grid.g4` → các ô không bằng nhau, không thẳng cột. |
| 5 | **[V]** | Việc A, B, C, D. |

#### `trang/giao_nhan.js` (1584 dòng) — **[N]** *(tệp lớn nhất)*

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **11 bảng trần + 8 chỗ `card-b padding:0`.** Áp việc B cho cả 11. Đây là tệp có nhiều bảng nhất — làm cẩn thận, đếm lại `colspan` của mỗi `dongRong`. |
| 2 | **[N]** | Dòng 118, 150: dùng `.mcard` làm **nút chọn PO trong hộp thoại**. `.mcard` là thẻ truy cập nhanh của trang chủ (có `::after` gradient chéo, nâng 3px khi hover, ô icon 38px) — dùng sai chỗ. Thay bằng `.card` thường hoặc `<button class="btn btn-o btn-blk">`. |
| 3 | **[V]** | 1584 dòng vượt xa trần 500 dòng ghi ở `docs/05 §1`. Tách thành `giao_nhan.js` (danh sách) + `giao_nhan_nhan.js` (màn hình nhận hàng) + `giao_nhan_iqc.js`. |
| 4 | **[V]** | Việc A, C, D. |

#### `trang/dat_ngoai.js` (1495 dòng) — **[N]**

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **12 bảng trần** — nhiều nhất hệ thống. Áp việc B. |
| 2 | **[V]** | 1495 dòng — tách tệp như trên. |
| 3 | **[V]** | Dòng có `#cac`, `#cdC` — đây là chuỗi trong biểu thức, không phải màu (kết quả quét dương tính giả). Kiểm lại rồi bỏ qua. |
| 4 | **[V]** | Việc A, C, D. |

#### `trang/bao_gia.js` (1102 dòng) — **[N]**

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | Bảng **so sánh báo giá** là màn hình quyết định quan trọng nhất của trang. Hiện dùng `.bang-so-sanh` (`hd-mua-hang.css:290`) — đúng hướng, nhưng bảng vẫn nằm trong `.card-b padding:0` (4 chỗ). Bọc `.tw` và giữ `.bang-so-sanh` cho phần `max-height`. |
| 2 | **[N]** | Nên có **biểu đồ so sánh giá**: dùng `thanhTyLe()` §4.3 trên mỗi dòng NCC, mốc 100% = giá thấp nhất. Quét dọc một cột là thấy ngay ai đắt hơn bao nhiêu, không phải nhẩm. |
| 3 | **[V]** | Emoji `★` (3 chỗ), `⚡` (2 chỗ), `⚠` (3 chỗ), `🟢` (2 chỗ) — áp việc D. |
| 4 | **[V]** | Việc A, B, C. |

#### `trang/vat_tu.js` (725 dòng) · `trang/nha_cung_cap.js` (582) · `trang/danh_muc.js` (507) · `trang/dieu_xe.js` (509)

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | Bảng trần: `dieu_xe` 4, `nha_cung_cap` 5, `danh_muc` 2, `vat_tu` 1. Áp việc B. |
| 2 | **[N]** | `danh_muc.js` là trang **Dữ liệu gốc** — bản gốc dùng `.tabs` có **số dòng ghi trong nhãn tab** (`"NCC · Nhà cung cấp (248)"`) để người dùng biết trước bảng nào rỗng mà không phải bấm thử. Kiểm và bổ sung. |
| 3 | **[V]** | Việc A, B, C, D. |

#### `trang/thanh_toan.js` (364) · `trang/de_nghi.js` (356) · `trang/tien_ich.js` (356) · `trang/xac_nhan_kt.js` (355)

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | `thanh_toan.js:181` — `.stat` thiếu `card` (như `don_hang.js`). |
| 2 | **[N]** | `de_nghi.js:253` — màu hex `#92400E` viết thẳng trong JS. Thay bằng `class="cb cb-tre"`. |
| 3 | **[V]** | Bảng trần: `thanh_toan` 4, `xac_nhan_kt` 3, `tien_ich` 2, `de_nghi` 2. Áp việc B. |
| 4 | **[V]** | Việc A, C, D. |

#### `trang/de_nghi_dt.js` (378) — màn hình nhập liệu

| # | Mức | Việc |
|---|---|---|
| 1 | **[V]** | Đây là **form**, không phải danh sách — không cần `.phead` đầy đủ, nhưng cần `<h1>` + câu mô tả một dòng ở đầu `.mobile-form`. |
| 2 | **[V]** | Kiểm khuôn `.field` → `<label class="label">` → ô nhập ở **mọi** ô. Ô số phải có thêm `.mono`. Ô bắt buộc: dấu `*` dán ngay sau nhãn. |
| 3 | **[V]** | **Gom lỗi thành MỘT thông báo liệt kê đủ**, đừng báo từng ô: `toast('Còn thiếu: ' + thieu.join(' · '), 'loi')`. Mỗi mục nói luôn **lý do cần**: `'Kỳ hạn yêu cầu — cần để xếp thứ tự mua'`. |
| 4 | **[V]** | Emoji `⚠` ×3, `←` ×2 — áp việc D. |

#### `trang/tuong_tac.js` (237) — nhiều emoji nhất

| # | Mức | Việc |
|---|---|---|
| 1 | **[N]** | **12 loại emoji khác nhau** làm biểu tượng loại thông báo. Toàn bộ thay bằng `${icon(...)}` trong ô bọc `.ni .ic` (30×30, `hd.css:178-179` đã có sẵn, kể cả biến thể `.ni.u .ic` nền đỏ cho việc chưa đọc). |
| 2 | **[V]** | Việc A, C. |

#### `trang/quan_tri.js` (336) · `trang/nhap_lo.js` (183) · `trang/combo.js` (144)

| # | Mức | Việc |
|---|---|---|
| 1 | **[V]** | `quan_tri.js`: 4 bảng trần. Áp việc B. |
| 2 | **[V]** | `nhap_lo.js`: dùng `.fstep` làm chỉ báo ba bước — đúng ý, và `hd.css:211-215` đã bổ sung `.fstep.on`. Kiểm lại: mỗi bước phải có `.no` (vòng tròn số) + `.fico` (ô icon) + `<b>` + `<span>`, hiện có thể thiếu `.fico`. |
| 3 | **[V]** | `nhap_lo.js`: luồng nhập lô phải theo ba nhịp **MỞ → KIỂM TRA → GHI**, và **nút Ghi chỉ được sinh ra sau khi kiểm tra xong**. Nhãn nút mang luôn con số: `"Ghi 42 dòng"`. Khi có dòng đáng ngờ thì tách hai nút: `.btn-g "Chỉ ghi 38 dòng không cần hỏi"` và `.btn-r "Đồng ý và ghi cả 42 dòng"`. |
| 4 | **[N2]** | `combo.js`: `→` ×2 — áp việc D. |

---

### 6.6 Thứ tự thi công đề nghị

| Đợt | Nội dung | Vì sao trước |
|---|---|---|
| **1** | `index.html` mục 1 (phông Condensed) | Mọi phép căn chỉnh cột sau đó phụ thuộc |
| **2** | `app.js` mục 1, 2, 8, 9 (`IC`, `NAV`, hàm trợ giúp, hàm biểu đồ) | 17 tệp trang đều gọi tới |
| **3** | `app.js` mục 3-7, 11-13 · `hd-mua-hang.css` toàn bộ | Sửa hạ tầng, không đụng trang |
| **4** | `index.html` mục 2-9 (thanh trên, `.uchip`, icon) | Nhìn thấy kết quả ngay, tạo đà |
| **5** | `trang/bao_cao.js` (trang chủ + biểu đồ) | Màn hình đầu tiên người dùng thấy |
| **6** | `trang/don_hang.js` | Màn hình dùng nhiều nhất |
| **7** | Việc A+B+C+D lần lượt cho 15 tệp còn lại | Việc lặp, có khuôn rồi thì nhanh |
| **8** | Tách `giao_nhan.js` và `dat_ngoai.js` cho dưới 500 dòng | Dọn dẹp cuối |

### 6.7 Nghiệm thu — bấm đúng những chỗ này

1. **Menu trái**: có 4 nhãn nhóm chữ hoa mờ; mỗi mục có biểu tượng nét mảnh 17px; mục đang mở có vạch đỏ bên trái.
2. **Mọi trang**: mở ra thấy `<h1>` + một câu mô tả; thanh lọc luôn ở vị trí thứ hai từ trên xuống.
3. **Kéo ngang bất kỳ bảng nào ở 375px**: bảng cuộn *trong khung của nó*, thanh điều hướng và tiêu đề đứng yên, trang **không** trôi ngang.
4. **Cuộn tới dòng 40 của một bảng dài**: tiêu đề cột vẫn dính trên đỉnh khung.
5. **Lọc ra 0 dòng**: hàng tiêu đề cột **vẫn còn**, chỉ có một dòng chữ giữa bảng chỉ cách gỡ lọc.
6. **Chưa có dữ liệu bao giờ**: cả khối bảng thay bằng `.rong` có tiêu đề đậm + câu chỉ đường nêu đích danh tên trang cần vào.
7. **Đặt hai màn hình cạnh nhau**: cùng một trạng thái nghiệp vụ phải ra cùng một màu pill ở mọi trang.
8. **Bấm Ctrl+P**: biểu đồ tròn và thanh tỷ lệ in ra sắc nét, không có ô vuông thay emoji.
9. **Bật "giảm chuyển động" trong cài đặt máy**: mọi hiệu ứng đứng yên, chức năng vẫn đủ (`hd.css:236` đã lo, chỉ cần không thêm animation nào ngoài đó).
10. **Đếm lại**: `grep -c '<svg' assets/trang/*.js` phải > 0 ở mọi tệp; `grep -c 'class="tw"'` phải ≈ số bảng; `grep -c 'phead'` phải ≥ 1 ở mọi tệp trang.
---

## 7 · ĐÃ THI CÔNG NHỮNG GÌ — đối chiếu với đặc tả trên

*Ghi ngày 2026-09-01, sau khi áp đặc tả vào mã thật. Phần trên là BẢN VẼ;
phần này là BẢN GHI HIỆN TRẠNG. Chỗ nào hai bên khác nhau thì phần này đúng.*

### 7.1 Tên hàm thực tế trong `app.js`

Đặc tả §3 và §4 đặt tên nháp cho các hàm. Tên **thật** khi đưa vào mã:

| Đặc tả gọi | Tên thật | Gọi từ trang bằng |
|---|---|---|
| `dauTrang()` | `dauTrang()` | `APP.dauTrang(ten, moTa, nutHTML)` |
| `rong()` | `rong()` | `APP.rong(tieuDe, huongDan)` |
| `oSo()` | `oSo()` | `APP.oSo(nhan, giaTri, {mau, chu, diToi})` |
| `dongRong()` | `dongRong()` | `APP.dongRong(soCot, loiNhan)` |
| `pie()` / `banh()` | **`banh()`** | `APP.banh(muc, tenGiua)` |
| `thanhChong()` | `thanhChong()` | `APP.thanhChong(doiTuong, khiTrong, tienTo)` |
| `thanhTyLe()` | `thanhTyLe()` | `APP.thanhTyLe(pt, {kieu, mucTieu, cao, so})` |
| `thanhTienDo()` | `thanhTienDo()` | `APP.thanhTienDo(xong, tong)` |
| `cotDung()` | `cotDung()` | `APP.cotDung(cacKy)` |
| — | `coSoTinh()` | `APP.coSoTinh(chuThich)` |
| `icon()` | `icon()` | `APP.icon(khoa, cx, day)` |

### 7.2 `thanhTyLe()` khác đặc tả — ba KIỂU chỉ số

Đặc tả §4.3 đề xuất một quy tắc màu duy nhất: *"trên 85% thì tô đậm cảnh
báo, trên 100% thì đỏ"*. **Quy tắc đó chỉ đúng cho một loại chỉ số** và đã
gây lỗi thật khi đưa lên màn hình chạy:

- *Chất lượng IQC 100%* — con số hoàn hảo — hiện nhãn cảnh báo đỏ.
- *Đề nghị bất khả thi 31%* — con số rất xấu — hiện màu xanh hiền lành.

Không có lỗi nào bật ra. Chỉ có người đọc hiểu **ngược** hai chỉ số quan
trọng nhất của COP-03. Vì vậy hàm thật nhận thêm tham số `kieu`:

```js
APP.thanhTyLe(pt, { kieu: 'nang_luc' })              // mặc định
APP.thanhTyLe(pt, { kieu: 'tot',  mucTieu: 80 })     // càng CAO càng tốt
APP.thanhTyLe(pt, { kieu: 'xau',  mucTieu: 15 })     // càng THẤP càng tốt
```

| `kieu` | Nghĩa | Thang màu | Ví dụ |
|---|---|---|---|
| `nang_luc` | mức chiếm dụng | <85 xanh · 85–100 xanh đậm · >100 đỏ | tải máy, hạn mức đã dùng |
| `tot` | càng cao càng tốt | ≥ mục tiêu xanh · dưới mục tiêu đỏ | giao đúng hạn, IQC đạt |
| `xau` | càng thấp càng tốt | ≤ mục tiêu xanh · trên mục tiêu đỏ | đề nghị bất khả thi, tỷ lệ lỗi |

**Bắt buộc khai `kieu`** khi chỉ số không phải loại chiếm dụng. Bỏ quên thì
màn hình vẫn chạy, vẫn đẹp, và vẫn nói ngược ý.

### 7.3 Từ điển `IC` — 34 khoá

Ngoài 16 khoá mượn từ hệ Kế hoạch sản xuất và 18 khoá vẽ riêng cho Mua hàng
(đặc tả §2.3, §2.4), đã bổ sung thêm bốn khoá phát sinh khi thay emoji:

| Khoá | Hình | Thay cho |
|---|---|---|
| `quet_ma` | bốn góc ngắm + vạch quét | `📷` trên nút QUÉT MÃ VẠCH |
| `quay_lai` | mũi tên trái | ký tự `←` trên các nút quay lại |
| `tick` | dấu tích | `✅` |
| `bolt` | tia chớp | `⚡` |

### 7.4 Lớp CSS bổ sung trong `hd-mua-hang.css`

| Lớp | Việc |
|---|---|
| `.bat-buoc` | dấu `*` đánh dấu ô bắt buộc nhập |
| `.o-xuong` | bọc màn hình dùng ngoài xưởng — ô nhập 48px, chữ 16px, nút 56px |
| `.cb.trong-o` | dòng cảnh báo vàng nằm trong ô bảng (gỡ thụt lề 29px của `.cb`) |
| `.uchip-ten` | khối chữ trong thẻ người dùng, cắt chữ trên màn hình hẹp |
| `.lien-ket` | liên kết trong văn bản |
| `.pie-legend .pie-pt`, `.chong*`, `.ty-*`, `.cot-*` | các phần của bộ biểu đồ |

### 7.5 Hai lỗi tìm ra khi xem màn hình chạy thật

Cả hai đều **không** lộ ra khi đọc mã, chỉ lộ khi mở trình duyệt:

1. **Thẻ người dùng tràn thanh trên ở 375px.** `hd.css:440` bó `.uchip` còn
   `max-width:30vw` nhưng không bảo phần chữ bên trong phải làm gì khi thiếu
   chỗ — tên xuống ba dòng, đẩy cao hơn thanh trên 58px nên dòng đầu bị cắt
   cụt. Sửa bằng `.uchip-ten` với `min-width:0` + `text-overflow:ellipsis`.
   *`min-width:0` là bắt buộc:* phần tử flex mặc định không co nhỏ hơn nội
   dung, nên thiếu đúng dòng đó là cả luật vô tác dụng mà không báo lỗi.

2. **Chọn phần tử theo vị trí con là sai.** Lần đầu em viết `.uchip>div` để
   nhắm khối chữ — nhưng con đầu tiên của `.uchip` là vòng tròn chữ cái
   (`.av`). Luật vừa không cắt được chữ vừa suýt giấu mất vòng tròn. Bài
   học: **chọn phần tử bằng LỚP, không bao giờ bằng vị trí con.**

### 7.6 Cách tự kiểm sau khi sửa giao diện

```bash
# 1. Không được có mã hex nào trong mã trang
grep -roE '#[0-9a-fA-F]{6}' frontend/assets/trang/ frontend/index.html

# 2. Cú pháp mọi tệp JS (máy Mac có sẵn jsc, không cần cài node)
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
for f in frontend/assets/*.js frontend/assets/trang/*.js; do
  $JSC -e "try{new Function(readFile('$f'))}catch(e){print('$f: '+e)}"
done

# 3. Bộ kiểm thử quét frontend theo từng cấp phân quyền
./.venv/bin/python -m pytest tests/test_giao_dien_theo_vai_tro.py \
                             tests/test_duong_dan_frontend.py -q
```

Cả ba lệnh phải sạch trước khi giao mã.
