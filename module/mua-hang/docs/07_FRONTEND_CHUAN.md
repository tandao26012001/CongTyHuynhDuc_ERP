# 07 — Chuẩn giao diện

> Đọc file này **trước khi viết bất kỳ màn hình nào**.
> Bộ giao diện lấy nguyên từ hệ Kế hoạch Sản xuất (`frontend/assets/hd.css`) — đừng vẽ lại.

---

## 1. Nhận diện bắt buộc (Hiến chương Ch.3)

### 1.1 Token CSS — copy nguyên từ `hd.css`

```css
:root{
  /* thương hiệu */
  --blue:#283A97;  --blue-7:#1E2C75; --blue-4:#4A5CB8; --blue-2:#C6CCE9; --blue-1:#EEF0F9;
  --red:#EE202E;   --red-7:#C4141F;  --red-2:#F9B9BE;  --red-1:#FDECEE;
  --black:#000;    --white:#fff;
  /* nền và chữ */
  --paper:#F4F6FA; --rule:#DCE1EC;   --rule-2:#EDF0F6;
  --ink:#0E1220;   --ink-2:#59627A;  --ink-3:#8A93AA;
  /* nhịp */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px;
  --r:5px; --r-lg:9px;
  --sh1:0 1px 2px rgba(14,18,32,.06);
  --sh2:0 3px 10px -2px rgba(14,18,32,.12);
  --sh3:0 16px 40px -10px rgba(14,18,32,.28);
  --rail:250px; --top:58px;
  /* Ba tên gọi theo NGHĨA NGHIỆP VỤ. Chúng KHÔNG phải màu mới — chỉ là
     bí danh trỏ về thang xanh/đỏ ở trên. Xem §1.3 để hiểu vì sao. */
  --ok:var(--blue);     --ok-1:var(--blue-1);
  --info:var(--blue-4); --info-1:var(--blue-1);
  --warn:var(--red);    --warn-1:var(--red-1);
}
```

> **SỬA NGÀY 2026-09-01.** Bản trước của mục này khai `--ok:#16A34A`
> (xanh lá), `--warn:#F59E0B` (hổ phách), `--info:#0EA5E9` (xanh da trời)
> kèm chú dẫn *"BỔ SUNG theo Hiến chương 3.1"*. Chú dẫn đó **sai**: mở
> `00_AI_RULES.md` §3.1 ra thì đó là mục nói về cơ sở dữ liệu, không hề nói
> về màu. Mục nói về màu là dòng 93, và nó chỉ cho phép **hai** màu.
>
> Hậu quả của ba màu thừa: một màn hình có thể hiện cùng lúc xanh dương,
> xanh lá, hổ phách và xanh da trời — mắt không còn biết đâu là chỗ cần chú
> ý, vì cái gì cũng có màu. Đã gỡ khỏi `hd-mua-hang.css` ngày 2026-09-01.

### 1.2 Chữ — BA họ phông, không phải một

Rất dễ sai ở đây, và sai thì không có lỗi nào hiện ra:

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Condensed:wght@400;700&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

| Họ phông | Dùng ở đâu |
|---|---|
| **Roboto** | Chữ thân bài, tiêu đề, nút |
| **Roboto Condensed** | Nhãn ô nhập · tiêu đề cột bảng · **toàn bộ thân bảng** · nhãn trạng thái · tên nhóm menu · vòng tròn chữ cái |
| **Roboto Mono** | **Mọi con số** người dùng phải so theo cột dọc: số lượng, tiền, phần trăm, ngày, mã phiếu |

> **SỰ CỐ ĐÃ XẢY RA.** `frontend/index.html` từng chỉ nạp Roboto và Roboto
> Mono, thiếu **Roboto Condensed** — trong khi `hd.css` gọi họ này ở chín
> chỗ trọng yếu. Trình duyệt lặng lẽ thay bằng Roboto thường: không lỗi,
> không cảnh báo, chỉ là mọi nhãn và mọi bảng rộng hơn thiết kế 8–12%, cột
> bảng bị dồn, chữ HOA giãn `.07em` trông thưa và nhoè. Đây chính là cảm
> giác *"font chữ và font size xài lộn xộn"* mà người dùng phản ánh. Sửa
> ngày 2026-09-01.

#### Thang cỡ chữ — chỉ SÁU bậc, không có bậc thứ bảy

| Vai trò | Phông | Cỡ | Lấy bằng |
|---|---|---|---|
| Tiêu đề trang | Roboto 700 | 23 px | `<h1>` |
| Tiêu đề khối | Roboto 700 | 18 px | `<h2>` |
| Tiêu đề thẻ | Roboto 700 | 15 px | `<h3>` |
| Chữ thân | Roboto 400 | 14 px | mặc định của `body` |
| Chữ phụ | Roboto 400 | 13 px | `.t-sm` |
| Chữ nhỏ nhất | Roboto 400 | 12 px | `.t-xs` |

Nhãn chuyên dụng (đều là Roboto Condensed 700, chữ HOA):
`.eyebrow` 11px · `.label` 12px · `.stat .k` 11px · `.tbl th` 11px · `.pill` 11.5px

> **CẤM gõ `font-size` vào thuộc tính `style`.** Cần cỡ nào thì dùng lớp ở
> trên. Ngoại lệ duy nhất: màn hình dùng ngoài xưởng phải có chữ ≥16px và
> vùng chạm ≥48px (F05 §4.1) — dùng lớp `.o-xuong` bọc màn hình đó, đừng gõ
> số vào từng chỗ.

> **SỬA NGÀY 2026-09-01.** Bảng cỡ chữ ở bản trước ghi *"Tiêu đề trang
> 24–28px · Nội dung 16px tối thiểu"*. Những con số đó **không khớp** với
> `hd.css` (h1 là 23px, thân bài là 14px). Ai làm theo tài liệu sẽ tạo ra
> màn hình lệch cỡ so với phần còn lại của hệ thống — mà lệch từng chút một
> ở nhiều màn hình thì cộng lại thành cảm giác rời rạc.

### 1.3 Quy tắc màu — chỗ dễ sai nhất

Chỉ có **hai** màu, cộng thang trung tính. Hết.

| Ý nghĩa | Màu | Dùng cho |
|---|---|---|
| Hành động chính | `--blue` `#283A97` | Nút chính · liên kết · tiêu đề · thanh điều hướng |
| Hành động phụ | `--blue-4` `#4A5CB8` | Nút phụ · viền được chọn · lớp thứ hai của biểu đồ |
| **Nguy hiểm / Lỗi** | `--red` `#EE202E` | **Chỉ** xoá · huỷ · quá hạn · thông báo lỗi · logo |

**Phân biệt mức độ bằng ĐỘ ĐẬM, không bằng sắc màu:**

| Mức | Cách thể hiện | Nhãn |
|---|---|---|
| Bình thường | xanh nhạt trên nền nhạt | `.p-b` / `.p-ok` |
| Đã xong | đen | `.p-k` |
| Cần để mắt | đỏ VIỀN, nền trắng | `.p-ro` / `.p-warn` |
| Đã hỏng | đỏ ĐẶC, chữ trắng | `.p-r` |
| Trung tính | xám | `.p-g` / `.p-info` |

Ngoại lệ **duy nhất** được cấp phép: bộ vàng cảnh báo tiến độ, đã có sẵn
trong `hd.css` và **chỉ dùng qua lớp** `.p-vang` / `.cb-tre`, tuyệt đối
không gõ lại mã hex. Nghĩa của vàng: *"chưa sai nhưng phải nhìn"*.

> **CẤM** dùng `--red` cho nút "Lưu", "Tìm kiếm", "Xác nhận", "Gửi". Người
> dùng sẽ do dự khi bấm và không phân biệt được với nút xoá.

> **CẤM** viết mã hex vào mã nguồn. Luôn dùng biến. Có một phép kiểm nhanh:
> ```bash
> grep -roE '#[0-9a-fA-F]{6}' frontend/assets/trang/ frontend/index.html
> ```
> Lệnh này phải không trả về gì.

### 1.4 Logo

Góc trên bên trái thanh điều hướng, và chính giữa màn hình đăng nhập. Không kéo méo tỷ lệ, không đổi màu. Khoảng trống quanh logo ≥ chiều cao chữ "H" trong logo.

---

## 2. Chín chức năng tối thiểu (Hiến chương 3.2 [B])

| # | Chức năng | Ở đâu trong hệ này |
|---|---|---|
| 1 | Màn hình đăng nhập | Có logo · tên đầy đủ Công ty · lỗi tiếng Việt |
| 2 | Màn hình dữ liệu gốc | Trang `danh_muc` — chỉ đọc với danh mục không sở hữu |
| 3 | Quản lý người dùng và phân quyền | Trang `quan_tri` |
| 4 | Nhật ký thay đổi | Trang `quan_tri` → tab Nhật ký (ai sửa gì, lúc nào, cũ → mới) |
| 5 | Bộ lọc chuẩn | Thanh lọc trên mọi danh sách: thời gian · bộ phận · trạng thái · mã hàng/mã vạch |
| 6 | Xuất dữ liệu | Nút "Tải xuống" trên mọi danh sách, **có kiểm soát quyền** |
| 7 | **Ba trạng thái giao diện** | Đang tải · Lỗi · Không có dữ liệu — **ở MỌI màn hình** |
| 8 | Hiển thị phiên bản | Chân thanh điều hướng trái |
| 9 | Thông báo và việc cần làm | Chuông trên thanh trên + trang `cong_viec` → Việc của tôi |

---

## 3. Ba trạng thái — mẫu chuẩn dùng lại

```js
// assets/app.js
function veTrangThai(el, trangThai, {loi, thuLai, trong} = {}) {
  if (trangThai === 'dang-tai') {
    el.innerHTML = `<div class="empty"><div class="spin"></div>
      <p class="mute2">Đang tải dữ liệu…</p></div>`;
  } else if (trangThai === 'loi') {
    el.innerHTML = `<div class="alert rd"><div>
      <b>Không tải được dữ liệu</b><span class="t-sm">${loi || ''}</span></div>
      <button class="btn btn-r btn-sm" onclick="(${thuLai})()">Thử lại</button></div>`;
  } else if (trangThai === 'trong') {
    el.innerHTML = `<div class="empty">
      <p><b>${trong?.tieuDe || 'Chưa có dữ liệu'}</b></p>
      <p class="mute2 t-sm">${trong?.moTa || ''}</p>
      ${trong?.nut || ''}</div>`;
  }
}
```

**Trạng thái rỗng phải nói người dùng làm gì tiếp theo**, không chỉ nói "không có dữ liệu":

| Sai | Đúng |
|---|---|
| "Không có dữ liệu" | "Chưa có đề nghị nào trong khoảng thời gian này. **[Tạo đề nghị mới]**" |
| "Empty" | "Bạn chưa được giao việc nào. Việc mới sẽ hiện ở đây kèm thông báo." |

---

## 4. Bố cục ứng dụng

```
┌────────────┬──────────────────────────────────────────────────┐
│  rail      │  top: [☰] Tiêu đề trang     [🔔 3] [đồng bộ] [👤] │
│  250px     ├──────────────────────────────────────────────────┤
│            │  loc-bar: [Từ ngày][Đến ngày][Bộ phận][Trạng thái]│
│  logo      │           [Tìm mã hàng…]     [Lọc] [Tải xuống]    │
│  ─────     ├──────────────────────────────────────────────────┤
│  Tổng quan │                                                   │
│  Đề nghị   │  nội dung: bảng / thẻ / biểu đồ                   │
│  Báo giá   │                                                   │
│  Đơn hàng  │                                                   │
│  …         │                                                   │
│  ─────     │                                                   │
│  v1.0 Thoát│                                                   │
└────────────┴──────────────────────────────────────────────────┘
```

- Menu trái dựng **động** từ `GET /api/v1/toi` → chỉ hiện trang có `xem: true`.
- Dưới 860 px: rail thu lại, mở bằng nút `☰` (`hd.css` đã có `.nut-menu` và `@media(max-width:860px)`).
- Thanh trên luôn có: chuông thông báo (số chưa đọc) · chỉ báo đồng bộ · tên người dùng.

---

## 5. Ba mẫu màn hình dùng lại cho mọi chức năng

### 5.1 Mẫu DANH SÁCH

```
┌ loc-bar ────────────────────────────────────────────────────┐
│ [Từ ngày] [Đến ngày] [Bộ phận ▾] [Trạng thái ▾] [Tìm…]      │
│                                    [Lọc] [Xoá lọc] [Tải xuống]│
└──────────────────────────────────────────────────────────────┘
┌ thẻ số liệu (tuỳ màn hình) ──────────────────────────────────┐
│ [Tổng 1.243] [Chờ duyệt 18] [Trễ hạn 47] [Bất khả thi 12]   │
└──────────────────────────────────────────────────────────────┘
┌ tbl ─────────────────────────────────────────────────────────┐
│ Mã ▾ │ Ngày │ Bộ phận │ Người YC │ Số dòng │ Trạng thái │ ⋯  │
│ …                                                             │
└──────────────────────────────────────────────────────────────┘
   50 dòng/trang · [◀ 1 2 3 ▶] · sắp xếp mặc định: mới nhất trước
```

**Cột chuẩn trên mọi danh sách chứng từ** (checklist F7):
`Mã chứng từ` · `Ngày lập` · `Đối tác / Bộ phận` · `Người tạo` · `Trạng thái` · `Tổng tiền` (nếu có quyền)

**Bộ lọc tối thiểu** (checklist F8): Từ ngày – Đến ngày · Trạng thái · Bộ phận · Mã NCC / Mã hàng / Mã vạch

- Trạng thái hiển thị bằng `.pill` có màu ngữ nghĩa, **không** chỉ bằng chữ.
- Dòng có cờ cảnh báo (trễ hạn, bất khả thi) có **vạch màu bên trái**, đọc được khi lướt nhanh.
- Bấm dòng → mở chi tiết. Không dùng nút "Xem" riêng cho từng dòng.

### 5.2 Mẫu CHỨNG TỪ ĐẦU + CHI TIẾT

```
┌ phần đầu ───────────────────────────────────────────────────┐
│ DN-2026-000123          [pill: CHỜ DUYỆT]      [In] [⋯]     │
│ Bộ phận: Gia Công Chính Xác    Người YC: Trần Văn Sáng      │
│ Ngày hiệu lực: 2026-08-27  ⓘ gửi sau 13:30 → tính sang mai  │
│ Ưu tiên: 2   Tình trạng: Bình thường                        │
└──────────────────────────────────────────────────────────────┘
┌ bảng chi tiết ──────────────────────────────────────────────┐
│ # │ Mã VT │ Tên hàng │ ĐVT │ SL │ Kỳ hạn │ LSX │ Ghi chú │✕ │
│ 1 │ …                                                        │
│ [+ Thêm dòng]                                    Tổng: 3 dòng│
└──────────────────────────────────────────────────────────────┘
┌ thanh hành động (dính đáy) ─────────────────────────────────┐
│ [Lưu nháp]              [Gửi duyệt]   [Trả lại]   [Huỷ]      │
└──────────────────────────────────────────────────────────────┘
┌ trao đổi ───────────────────────────────────────────────────┐
│ 💬 3 trao đổi · 2 tệp đính kèm                    [Mở ▾]     │
└──────────────────────────────────────────────────────────────┘
```

**Quy tắc bảng chi tiết:**
- Thêm dòng bằng **một phím** (Enter ở dòng cuối, hoặc nút `+`).
- Ô mã vật tư là **combobox tìm mờ**: gõ 2 ký tự → gợi ý; chọn xong tự điền tên hàng, ĐVT, chủng loại.
- Không có kết quả → nút **"Chưa có mã? Gửi yêu cầu cấp mã"** ngay trong dropdown.
- Ô số tự canh phải, `font-variant-numeric: tabular-nums`.
- Tổng tiền tính lại **ở frontend để hiển thị tức thì**, nhưng số lưu là số **backend trả về** (tránh lệch làm tròn).
- Xoá dòng → hỏi xác nhận nếu dòng đã có dữ liệu.

### 5.3 Mẫu HÀNG ĐỢI DUYỆT

```
┌────────────────────────────────────────────────────────────┐
│ ☐ │ DN-2026-000123 │ CX │ 3 dòng │ 12.400.000đ │ [Xem][✓][✕]│
│ ☐ │ PO-2026-000156 │ MH │ 5 dòng │ 640.000.000đ ⚠ vượt hạn │
└────────────────────────────────────────────────────────────┘
  [☑ Chọn tất cả]        [Duyệt đã chọn]  [Từ chối đã chọn]
```
- Duyệt hàng loạt cho chứng từ **cùng loại và cùng cấp duyệt**.
- Từ chối **bắt buộc** nhập lý do — hộp thoại có ô lý do, không cho để trống.
- Chứng từ vượt hạn mức hiện nhãn cảnh báo `⚠ Cần Ban lãnh đạo duyệt`.

---

## 6. Giao diện cho môi trường xưởng

Áp dụng cho: **tạo đề nghị vật tư** · **nhận hàng** · **IQC** · **xác nhận điều xe**

| Yêu cầu | Chi tiết |
|---|---|
| Vùng bấm | **≥ 44 × 44 px** |
| Cỡ chữ | **≥ 16 px** |
| Quét mã vạch | Ô nhập tự nhận đầu vào máy quét (kết thúc bằng Enter), ưu tiên hơn gõ tay |
| Số bước | **Tối đa 3 bước** cho nghiệp vụ thường xuyên |
| Độ tương phản | Đủ đọc dưới ánh sáng xưởng — không dùng chữ xám nhạt trên nền trắng |
| Găng tay / tay bẩn | Nút to, khoảng cách giữa các nút ≥ 8 px, không có thao tác kéo-thả |

---

## 7. Giao diện điện thoại — quyết định sống còn của dự án

> Đối thủ thật của app là **Zalo**, không phải Excel. Người gửi đề nghị vật tư đang đứng ở xưởng với cái điện thoại trong túi. Nếu tạo phiếu trên app chậm hơn gõ Zalo thì họ sẽ gõ Zalo.

**Mục tiêu đo được: tạo xong một ĐNVT 3 dòng trên điện thoại dưới 45 giây.**

Ba màn hình **bắt buộc** chạy tốt trên điện thoại:

| Màn hình | Vì sao |
|---|---|
| **Tạo đề nghị vật tư / GCN** | Điểm vào của toàn bộ hệ thống |
| **Việc của tôi** | Người duyệt cần duyệt được khi đang đi lại |
| **Chi tiết chứng từ + trao đổi** | Thay chỗ hỏi-đáp mà Zalo đang gánh |

### 7.1 Thiết kế form ĐNVT trên điện thoại

```
┌─────────────────────────┐
│ ← Đề nghị vật tư        │
├─────────────────────────┤
│ Lệnh sản xuất           │
│ [🔍 quét / gõ mã vạch ] │   ← quét xong tự điền LSX, mã hàng, ưu tiên
│ MBC0326-018-CKCT · Ưu tiên 2│
│                         │
│ Kỳ hạn cần   [27/08/26 ]│   ← mặc định = hôm nay + 5 ngày làm việc
│ ⚠ Sớm hơn 5 ngày chuẩn  │   ← cảnh báo bất khả thi, không chặn
├─────────────────────────┤
│ Dòng 1                ✕ │
│ [🔍 tìm tên hàng…     ] │   ← gõ 2 ký tự là gợi ý
│ SL [  10 ] ĐVT [PCS ▾]  │
│ [ghi chú…             ] │
│                         │
│      [ + Thêm dòng ]    │
├─────────────────────────┤
│ 📎 Ảnh / bản vẽ  (0)    │
├─────────────────────────┤
│ [    GỬI DUYỆT    ]     │   ← nút to, dính đáy màn hình
└─────────────────────────┘
```

**Bảy quyết định thiết kế để đạt 45 giây:**
1. Quét mã vạch LSX là **hành động đầu tiên** — điền được 4 trường cùng lúc.
2. Kỳ hạn **điền sẵn** = hôm nay + 5 ngày làm việc.
3. Ô tìm tên hàng là ô **được focus tự động** khi thêm dòng.
4. Số lượng mặc định `1`.
5. ĐVT tự điền theo vật tư đã chọn.
6. **Không** bắt chọn bộ phận, người yêu cầu, ngày lập — suy từ tài khoản và thời điểm.
7. Nút gửi **luôn thấy được**, dính đáy màn hình.

### 7.2 Chụp ảnh

Nút đính kèm mở thẳng camera trên điện thoại (`<input type="file" accept="image/*" capture="environment">`). Ảnh nén xuống ≤ 1600 px trước khi tải lên.

---

## 8. Thông báo — vũ khí để thắng Zalo

Zalo thắng nhờ **chuông báo**. Một app im lặng là một app chết.

### 8.1 Sự kiện phải gửi thông báo

| Sự kiện | Gửi cho |
|---|---|
| Có chứng từ chờ tôi duyệt | Người duyệt |
| Phiếu của tôi bị trả lại | Người tạo |
| Phiếu của tôi đã được duyệt | Người tạo |
| Đơn hàng của tôi sắp trễ (≤2 ngày) / đã trễ | Người mua hàng + người yêu cầu |
| Có trao đổi mới trên phiếu của tôi | Mọi người liên quan phiếu |
| Tôi được giao việc mới | Người nhận việc |
| Yêu cầu cấp mã vật tư mới | Kho vận |
| Yêu cầu đổi vật liệu chờ duyệt | Kỹ thuật + người yêu cầu |
| IQC kết luận không đạt | Mua hàng + người yêu cầu |
| Nhắc ký bù (duyệt online hôm qua) | Người duyệt |

### 8.2 Hiển thị

- Chuông trên thanh trên với **số chưa đọc**, cập nhật khi đồng bộ.
- Bấm chuông → danh sách; bấm một thông báo → **mở thẳng đúng phiếu**, đánh dấu đã đọc.
- Trang "Việc của tôi" là danh sách hành động, không phải danh sách thông báo — hai thứ khác nhau.

### 8.3 Ngoài trình duyệt

V1: trong app. V2: cân nhắc Zalo OA hoặc email cho các thông báo quan trọng (trễ hạn, chờ duyệt quá 1 ngày). Ghi vào kế hoạch, đừng bỏ quên.

---

## 9. Trao đổi trên chứng từ — thay chỗ Zalo đang gánh

Mỗi phiếu **và mỗi dòng** có luồng bình luận riêng.

```
┌ Trao đổi (3) ───────────────────────────────────────┐
│ 🧑 Trần Văn Sáng · 27/08 09:12                      │
│    Hàng này cần gấp cho lệnh MBC0326-018            │
│ 🧑 Phạm Huyền Như · 27/08 10:04                     │
│    NCC báo hết hàng, đang tìm nguồn khác            │
│    📎 bao-gia-thay-the.pdf                          │
├──────────────────────────────────────────────────────┤
│ [Viết trao đổi…                          ] [📎] [Gửi]│
└──────────────────────────────────────────────────────┘
```

- Gửi xong → thông báo cho mọi người liên quan phiếu.
- Có đính kèm ảnh và file.
- **Không** cho sửa/xoá bình luận đã gửi — vì nó là bằng chứng trao đổi thay Zalo.

> Trong file Excel hiện tại, những nội dung này đang bị chôn trong cột GHI CHÚ: *"29/12 BP XN lấy 6 li trễ do gom xe SG"*, *"hết hàng chưa tìm được chờ chỉ đạo anh Huỳnh"*, *"11-12 chờ ckct xn 15-12 xn tiếp, chờ phản hồi"*.

---

## 10. Tầng gọi API

Dùng lại `api.js` của hệ Kế hoạch Sản xuất, **sửa hai chỗ**:

```js
const GOC = '/api/v1';        // ① thêm phiên bản

// ② bóc vỏ chuẩn {ok, data, error, ma_loi}
async function goi(duong, tuyChon = {}) {
  const r = await fetch(GOC + duong, {...});
  const du = await r.json();
  if (r.status === 401) { /* buộc đăng nhập lại */ }
  if (r.status === 403) { toast(du.error, true); }
  if (r.status === 409) { hienXungDot(du.error); }
  if (!du.ok) throw Object.assign(new Error(du.error), {maLoi: du.ma_loi});
  return du.data;                // service chỉ nhận `data`, không phải cả vỏ
}
```

Giữ nguyên các phần đã tốt: token trong `sessionStorage` · header `X-Phien` · băng `.xung-dot` · chỉ báo đang tải toàn cục · tự đồng bộ định kỳ.

**Thêm:** header `X-Idempotency-Key` (UUID sinh khi mở form) cho mọi `POST` thay đổi dữ liệu.

---

## 11. Xử lý xung đột 409 phía người dùng

```
┌──────────────────────────────────────────────────┐
│ ⚠ Dữ liệu vừa được người khác cập nhật           │
│   Ms. Ngọc đã sửa phiếu này lúc 10:32.           │
│   [Xem thay đổi]  [Tải lại và nhập lại]          │
└──────────────────────────────────────────────────┘
```

**Không** tự động tải lại đè lên những gì người dùng đang gõ. Giữ nguyên nội dung họ nhập, cho họ chọn.

---

## 12. Bảo vệ dữ liệu chưa lưu

- Lưu nháp vào bộ nhớ trang mỗi 10 giây khi form đang có thay đổi.
- Rời trang khi còn thay đổi chưa lưu → hỏi xác nhận.
- Mất mạng khi bấm lưu → giữ nguyên form, hiện "Không gửi được, kiểm tra kết nối rồi thử lại", nút "Thử lại" gửi lại đúng dữ liệu cũ với cùng `X-Idempotency-Key`.

---

## 13. Danh sách class dùng lại từ `hd.css`

```
nút          btn · btn-r · btn-b · btn-g · btn-o · btn-or · btn-blk · btn-lg · btn-sm · ibtn
biểu mẫu     field · label · input · select · chk · cb
bảng         tbl · tw · scroll · loc-bar · o-loc · o-loc-in · o-xoa
hộp thoại    modal · modal-h · modal-b · modal-f · ov · man-mo
thông báo    alert · notif · ni · empty · muted · mute2 · toast
điều hướng   rail · rail-h · rail-n · rail-i · rail-f · rail-g · top · nut-menu · tab · tabs
trạng thái   pill · p-b · p-g · p-k · p-r · p-ro · p-vang · p-bs · uchip
bố cục       app · main · content · card · card-h · card-b · grid · g2 · g3 · g4 · row · sp
số liệu      stat · mcard · pie · pie-legend · ring · cap · cap-f · cap-l · cap-t · cap-v
đồng bộ      xung-dot · tai-lai · dot-live · fade
chữ          mono · t-sm · t-xs · eyebrow · mb2 · mb3 · mt2 · rong
luồng        flow · fstep · buoc · buoc-h · buoc-n · breaker
```

**Thiếu và cần bổ sung cho hệ này:**

| Class mới | Dùng cho |
|---|---|
| `.combo` `.combo-list` `.combo-item` | Ô tìm mờ mã vật tư / NCC |
| `.dong-canh-bao` | Vạch màu bên trái dòng bảng có cờ cảnh báo |
| `.trao-doi` `.td-item` `.td-nhap` | Luồng bình luận trên chứng từ |
| `.dinh-kem` `.dk-item` | Danh sách tệp đính kèm |
| `.bar-hanh-dong` | Thanh hành động dính đáy trên điện thoại |
| `.mobile-form` | Bố cục một cột cho màn hình < 640 px |

Đặt trong `hd-mua-hang.css` **riêng**, nạp sau `hd.css`. Không sửa `hd.css` — để hai hệ còn dùng chung được.

---

## 14. Bảng kiểm trước khi coi một màn hình là xong

- [ ] Đủ **ba trạng thái**: đang tải · lỗi · không có dữ liệu
- [ ] Trạng thái rỗng **nói người dùng làm gì tiếp**
- [ ] Bộ lọc chuẩn: thời gian · bộ phận · trạng thái · mã hàng
- [ ] Nút "Tải xuống" có kiểm tra quyền
- [ ] Cột số canh phải, `tabular-nums`, tiền có dấu phân cách nghìn
- [ ] Trạng thái hiển thị bằng `.pill` có màu, không chỉ chữ
- [ ] Thông báo lỗi tiếng Việt, nói rõ phải làm gì
- [ ] Chạy được ở 375 px (nếu là màn hình xưởng hoặc màn hình chính)
- [ ] Vùng bấm ≥ 44 px nếu dùng ở xưởng
- [ ] Không dùng `--red` cho nút hành động thường
- [ ] Phím `Tab` đi đúng thứ tự, có viền focus nhìn thấy được
- [ ] Xử lý 409 không làm mất dữ liệu người dùng đang gõ
- [ ] Không gọi API trong vòng lặp render (N+1 ở frontend)
