# 03 — Mô hình dữ liệu

> PostgreSQL. Áp Mẫu 2 của giáo trình GĐ1 (bảng đầu + bảng chi tiết + lịch sử trạng thái).
> Mọi bảng giao dịch mang đủ **6 cột hệ thống** theo Hiến chương 1.2.

---

## 1. Nguyên tắc chung

### 1.1 Sáu cột hệ thống — bắt buộc trên MỌI bảng giao dịch

```sql
ID          VARCHAR(24)  PRIMARY KEY,   -- chuỗi có tiền tố, CẤM số tự tăng
NGAY_TAO    TIMESTAMPTZ  NOT NULL DEFAULT now(),
NGUOI_TAO   VARCHAR(20)  NOT NULL,      -- MA_NHAN_VIEN
NGAY_SUA    TIMESTAMPTZ,
NGUOI_SUA   VARCHAR(20),
PHIEN_BAN   INTEGER      NOT NULL DEFAULT 1   -- tăng mỗi lần ghi, dùng phát hiện 409
```

Sáu cột này **không thể bổ sung sau khi hệ thống đã chạy** vì dữ liệu cũ không có gì để điền.

### 1.2 Quy ước kiểu

| Loại | Kiểu Postgres | Ghi chú |
|---|---|---|
| Mã / khoá | `VARCHAR(n)` | không dấu, HOA |
| Tiền VND | `BIGINT` | **số nguyên đồng**, không thập phân |
| Số lượng | `NUMERIC(14,4)` | số lẻ theo `DON_VI_TINH.SO_LE` |
| Trọng lượng | `NUMERIC(14,4)` | kg |
| Tỷ lệ | `NUMERIC(5,2)` | thang 0–100 |
| Ngày | `DATE` | |
| Ngày giờ | `TIMESTAMPTZ` | `Asia/Ho_Chi_Minh` |
| Có/không | `BOOLEAN` | |
| Trạng thái | `VARCHAR(30)` | chuỗi mã không dấu |
| Văn bản dài | `TEXT` | |

### 1.3 Ba quy tắc không được vi phạm

1. **Nối bảng luôn bằng mã, không bao giờ bằng tên.**
2. **Không lưu sẵn `TONG_TIEN` ở bảng đầu** — tính lại khi đọc (giáo trình GĐ1 §2A.5).
3. **Không xoá cứng** — chuyển `TRANG_THAI = 'HUY'` kèm lý do.

### 1.4 Chụp giá trị (snapshot)

Mọi giá trị **ảnh hưởng tới tiền hoặc tới cam kết với khách** phải được chụp vào dòng chi tiết tại thời điểm lập: `TEN_HANG_CHUP`, `DVT_CHUP`, `DON_GIA`, `PHAN_LOAI_CHUP`. Chứng từ cũ không được đổi số khi danh mục thay đổi.

---

## 2. Sơ đồ quan hệ tổng quan

```
                   ┌─ đọc từ hệ Kế hoạch Sản xuất (chỉ đọc) ─┐
LENH_SAN_XUAT ─┬── LSX_DONG(MA_VACH, MA_HANG) ── CONG_DOAN
               └── MUC_DO_UU_TIEN ──────────────────────┐
                                                        │ quyết định SLA
DE_NGHI ─┬─ DE_NGHI_DONG ─┬─ VAT_TU (ID)   ◄────────────┘
  (đầu)  │    (chi tiết)  ├─ DOI_VAT_LIEU
         │                ├─ YEU_CAU_CAP_MA
         │                └─ (LENH_SAN_XUAT · MA_VACH · MA_CONG_DOAN)
         │
         ├─ YEU_CAU_BAO_GIA ─ YCBG_DONG
         ├─ BAO_GIA ─ BAO_GIA_DONG ─ NHA_CUNG_CAP
         ├─ DON_HANG ─ DON_HANG_DONG
         │     ├─ NHAN_HANG ─ NHAN_HANG_DONG ─ KET_QUA_IQC
         │     ├─ YEU_CAU_THANH_TOAN ─ DOT_THANH_TOAN
         │     └─ BAN_GIAO_CHUNG_TU ─ BGCT_DONG
         └─ CONG_VIEC (lệnh mua hàng / giao việc)

DAT_NGOAI ─ DAT_NGOAI_DONG        (luồng riêng, Kinh doanh lập)
DIEU_XE ─ DIEU_XE_DONG
DANH_GIA_NCC ─ NHA_CUNG_CAP

hệ thống:  LICH_SU_TRANG_THAI · NHAT_KY_THAY_DOI · THONG_BAO
           TRAO_DOI · TEP_DINH_KEM · SU_CO · THAM_SO_HE_THONG
```

---

## 3. NHÓM A — Danh mục hệ này quản lý

### A1. `VAT_TU` — quan trọng nhất

```sql
CREATE TABLE VAT_TU (
  ID              VARCHAR(20)  PRIMARY KEY,        -- VT-000001, BẤT BIẾN
  MA_VAT_TU       VARCHAR(40)  UNIQUE,             -- NULL được ở V1; NOT NULL ở V2
  TEN_HANG        VARCHAR(300) UNIQUE NOT NULL,    -- chủ thể quản lý ở V1
  TEN_KHONG_DAU   VARCHAR(300) NOT NULL,           -- sinh tự động, phục vụ tìm mờ
  DVT             VARCHAR(20)  NOT NULL REFERENCES DON_VI_TINH(DVT),
  MA_CHUNG_LOAI   VARCHAR(20)  REFERENCES CHUNG_LOAI(MA_CHUNG_LOAI),
  PHAN_LOAI       VARCHAR(20)  NOT NULL DEFAULT 'THONG_DUNG_SX',
                  -- THONG_DUNG_SX | THONG_DUNG_BTBD | CHUYEN_DUNG
  KHO             VARCHAR(10),                     -- TH | VT | TL | TP (suy từ mã)
  LOAI_PHOI       VARCHAR(4),                      -- NC LC TN TL PT PL
  ID_VT_GOC       VARCHAR(20)  REFERENCES VAT_TU(ID),   -- phôi lẻ trỏ về phôi gốc
  QUY_CACH        TEXT,
  KHOI_LUONG_RIENG NUMERIC(6,3),                   -- g/cm³, cho máy tính khối lượng
  NGUON_SO_HUU    VARCHAR(20)  NOT NULL DEFAULT 'KHO_VAN',
  TRANG_THAI      VARCHAR(20)  NOT NULL DEFAULT 'HOAT_DONG',  -- HOAT_DONG | NGUNG | DA_GOP
  ID_GOP_VE       VARCHAR(20)  REFERENCES VAT_TU(ID),   -- khi bản ghi bị gộp
  TEN_HANG_CU     TEXT,                            -- tên gốc lúc nạp dữ liệu cũ
  GHI_CHU         TEXT,
  -- 6 cột hệ thống
  NGAY_TAO TIMESTAMPTZ NOT NULL DEFAULT now(), NGUOI_TAO VARCHAR(20) NOT NULL,
  NGAY_SUA TIMESTAMPTZ, NGUOI_SUA VARCHAR(20), PHIEN_BAN INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_vattu_ten_kd  ON VAT_TU USING gin (TEN_KHONG_DAU gin_trgm_ops);
CREATE INDEX ix_vattu_ma      ON VAT_TU(MA_VAT_TU);
CREATE INDEX ix_vattu_chungloai ON VAT_TU(MA_CHUNG_LOAI);
```

> **Vì sao `ID` chứ không phải `MA_VAT_TU` làm khoá chính:** ở V1 mã còn `NULL` cho 96% bản ghi, và ở V2 việc gán mã + sửa tên sẽ làm đứt mọi chứng từ lịch sử nếu chúng trỏ theo mã hoặc theo tên. Mọi bảng giao dịch trỏ về `ID`.

### A2. `DON_VI_TINH`
```sql
DVT VARCHAR(20) PRIMARY KEY, TEN_DVT VARCHAR(60) NOT NULL,
SO_LE SMALLINT NOT NULL DEFAULT 0, TRANG_THAI VARCHAR(20) DEFAULT 'HOAT_DONG'
```
Nạp: `PCS` · `CAI` · `TAM` · `CAY` · `BO` · `CON` · `KG` · `MET` · `M2` · `BINH` · `CHAI` · `HOP` · `CUON` · `LIT` · `BỘ`…

### A3. `CHUNG_LOAI`
```sql
MA_CHUNG_LOAI VARCHAR(20) PRIMARY KEY, TEN VARCHAR(100) NOT NULL, THU_TU INTEGER
```
Gom 183 giá trị Excel về ~30: `SAT_THEP` `HHK` `INOX_304` `INOX_201` `DAO_CU` `OC_VIT` `NHUA` `AL` `AL_DH` `BAC_DAN` `BAN_LE` `KHI` `GO` `MICA` `LUOI` `LO_XO` `SON` `DIEN` `B_XE` `PK_AL` `PK_INOX` `PK_SAT` `CU` `INOX_303` `INOX_316` `INOX_430`…

### A4. `MUC_DICH_SU_DUNG`
```sql
MA VARCHAR(20) PRIMARY KEY, TEN VARCHAR(100) NOT NULL, THU_TU INTEGER
```
Tạm nạp từ Excel (13 mã), **chờ bảng chuẩn của anh Long**. Lưu ý `6.AMTGD2` và `13.AMTGD2` hiện trùng tên khác số.
`NVL` · `VTTH` · `CCDC` · `CPX` · `QLDN` · `AMTGD2` · `GCN` · `AMTGD1` · `TSCD` · `COMTRUA` · `TMCANTIN` · `SON`

### A5. `NHA_CUNG_CAP` — gộp 799 + 103

```sql
CREATE TABLE NHA_CUNG_CAP (
  ID              VARCHAR(20)  PRIMARY KEY,        -- NCC-00001
  MA_NCC          VARCHAR(40)  UNIQUE NOT NULL,    -- tên viết tắt: FUJI, COLSON, STD THIEN TAN
  TEN             VARCHAR(300) NOT NULL,           -- tên đầy đủ pháp nhân
  TEN_KHONG_DAU   VARCHAR(300) NOT NULL,
  MST             VARCHAR(20),
  DIA_CHI         TEXT,
  NGUOI_LIEN_HE   VARCHAR(120),
  SDT             VARCHAR(40), SDT_2 VARCHAR(40), FAX VARCHAR(40), EMAIL VARCHAR(120),
  MAT_HANG        TEXT,                            -- mô tả mặt hàng cung cấp
  -- cờ vai trò
  LA_NCC_MUA_HANG BOOLEAN NOT NULL DEFAULT false,
  LA_NCC_GIA_CONG BOOLEAN NOT NULL DEFAULT false,
  -- thuộc tính riêng vai trò mua hàng
  CO_HOA_DON      BOOLEAN,
  CONG_NO         TEXT,
  TIEN_MAT        TEXT,
  -- thuộc tính riêng vai trò gia công
  NGANH_NGHE      VARCHAR(60),                     -- SON_TINH_DIEN · XI_MA · NHIET_LUYEN · GIA_CONG_KHAC
  MA_LOAI_GIA_CONG VARCHAR(20) REFERENCES LOAI_GIA_CONG(MA),
  VUNG            VARCHAR(60),                     -- BH1 · BH3 · BD · BD1 · C11 · SAI_GON …
  SO_KM           NUMERIC(8,1),
  KY_HAN_QUY_DINH INTEGER,                         -- số ngày làm việc, ghi đè LOAI_GIA_CONG
  -- phê duyệt (BM03)
  DA_PHE_DUYET    BOOLEAN NOT NULL DEFAULT false,
  NGAY_PHE_DUYET  DATE,
  PHAN_LOAI_NCC   VARCHAR(20),                     -- A | B | C — kết quả đánh giá
  TRANG_THAI      VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG',
                  -- HOAT_DONG | CANH_BAO | TAM_NGUNG | LOAI_BO
  GHI_CHU         TEXT,
  NGAY_TAO TIMESTAMPTZ NOT NULL DEFAULT now(), NGUOI_TAO VARCHAR(20) NOT NULL,
  NGAY_SUA TIMESTAMPTZ, NGUOI_SUA VARCHAR(20), PHIEN_BAN INTEGER NOT NULL DEFAULT 1
);
```
> Một đơn vị vừa bán vật tư vừa nhận gia công chỉ có **một** bản ghi, bật cả hai cờ.

### A6. `KHACH_HANG` — bảng riêng
```sql
ID VARCHAR(20) PRIMARY KEY,            -- KH-00001
MA_KHACH_HANG VARCHAR(40) UNIQUE NOT NULL,   -- MBC, NOK, FKSK, TAKAKO, C&D…
TEN VARCHAR(300) NOT NULL, DIA_CHI TEXT,
NGUOI_LIEN_HE VARCHAR(120), SDT VARCHAR(40), EMAIL VARCHAR(120),
TRANG_THAI VARCHAR(20) DEFAULT 'HOAT_DONG'
+ 6 cột hệ thống
```
Dùng cho: đặt ngoài · điều xe giao hàng · bảng màu sơn theo khách.

### A7. `LOAI_GIA_CONG`
```sql
MA VARCHAR(20) PRIMARY KEY, TEN VARCHAR(100) NOT NULL,
SO_NGAY_CHUAN INTEGER NOT NULL,       -- ngày làm việc
MA_CONG_DOAN VARCHAR(20),             -- ánh xạ sang công đoạn của hệ Sản xuất
GHI_CHU TEXT
```
14 dòng — xem bảng chốt ở `02_CHUAN_HOA.md` §6.

### A8. `LICH_NGHI`
```sql
ID VARCHAR(20) PRIMARY KEY, NGAY_BAT_DAU DATE NOT NULL, NGAY_KET_THUC DATE NOT NULL,
MA VARCHAR(20) NOT NULL DEFAULT 'ALL',    -- 'ALL' hoặc MA_NHAN_VIEN
TEN VARCHAR(120), LOAI_NGHI VARCHAR(20) NOT NULL,  -- CHU_NHAT|NGHI_LE|NGHI_TET|NGHI_PHEP|KHAC
GHI_CHU TEXT + 6 cột hệ thống
```

### A9. `THAM_SO_HE_THONG`
```sql
MA VARCHAR(50) PRIMARY KEY, GIA_TRI TEXT NOT NULL,
KIEU VARCHAR(20), MO_TA TEXT, NHOM VARCHAR(40) + 4 cột audit
```
| `MA` | Giá trị mặc định | Mô tả |
|---|---|---|
| `GIO_CHOT_DNVT` | `13:30` | |
| `GIO_CHOT_GCN` | `15:00` | |
| `GIO_CHOT_DIEU_XE` | `15:45` | |
| `NGAY_TOI_THIEU_HANG_VE` | `5` | ngày làm việc |
| `NGUONG_THONG_DUNG_SX` | `500000000` | VND, trước VAT |
| `NGUONG_THONG_DUNG_BTBD` | `50000000` | VND, trước VAT |
| `VAT_SUAT` | `10` | % |
| `SO_BAO_GIA_TOI_THIEU` | `2` | |
| `CHE_DO_QT_NCC_PHE_DUYET` | `CANH_BAO` | `CANH_BAO` \| `CHAN` |
| `CHE_DO_QT_MA_VAT_TU` | `CANH_BAO` | |
| `CHE_DO_QT_LSX_DUY_NHAT` | `CANH_BAO` | |
| `CHE_DO_QT_XAC_NHAN_KT` | `CANH_BAO` | |
| `NGUONG_TRUNG_TEN` | `85` | % giống nhau thì cảnh báo |
| `CHU_KY_DANH_GIA_NCC_THANG` | `12` | |

### A10. `ANH_XA_TIEN_TO`
```sql
TIEN_TO_CU VARCHAR(20) PRIMARY KEY, MA_BO_PHAN VARCHAR(10) NOT NULL, GHI_CHU TEXT
```

### A11. `XE` và `TAI_XE`
```sql
XE:     MA_XE VARCHAR(20) PK, LOAI_XE VARCHAR(40) NOT NULL, BIEN_SO VARCHAR(20),
        NHOM_XE VARCHAR(40), TRANG_THAI VARCHAR(20)
TAI_XE: MA_NHAN_VIEN VARCHAR(20) PK, HO_VA_TEN VARCHAR(120), TRANG_THAI VARCHAR(20)
```
Loại xe: `XE_TAI_LON` · `XE_TAI_TRUNG` · `XE_TAI_NHO` · `XE_4_CHO` · `XE_ZACE` · `XE_MAY` · `XE_NGOAI` · `KHONG`
> **Phải sửa mâu thuẫn biển số** trước khi nạp: file MH ghi `60C-13810` là xe tải nhỏ, file GCN ghi là xe tải trung.

### A12. `VAT_LIEU_TINH_TOAN` — cho máy tính khối lượng
```sql
MA VARCHAR(20) PK, TEN VARCHAR(100), KHOI_LUONG_RIENG NUMERIC(6,3) NOT NULL,
DON_GIA_THAM_KHAO BIGINT, DON_VI_GIA VARCHAR(10) DEFAULT 'KG'
```
Nạp: thép 7,85 · inox 304 7,95 · inox 201 7,95 · nhôm 6061 2,7 · mica 1,41 · đồng C3604 8,8 · CAM 6,4 · nhựa POM 1,41

### A13. `MAU_SON_KHACH_HANG`
```sql
ID VARCHAR(20) PK, MA_KHACH_HANG VARCHAR(40) REFERENCES KHACH_HANG(MA_KHACH_HANG),
MA_MAU_KHACH VARCHAR(60) NOT NULL,     -- N9, 2.5G 6/3, 10GY6.5/3, Munsell GY75
MA_MAU_HD VARCHAR(60) NOT NULL,        -- 9029A, 6011, 15383AV
GHI_CHU TEXT + 6 cột hệ thống
```

---

## 4. NHÓM B — Danh mục đọc từ hệ khác

> V1: nạp bằng CSV hoặc nhập lô. V2: gọi API. Mọi truy cập qua `services/catalog_service.py`.
> Các bảng này **chỉ đọc** trong hệ Mua hàng — không có màn hình tạo/sửa.

### B1. `NHAN_VIEN` (Nhân sự sở hữu · 175 bản ghi có sẵn)
```sql
MA_NHAN_VIEN VARCHAR(20) PK,           -- 202302003
HO_VA_TEN VARCHAR(120) NOT NULL, MA_BO_PHAN VARCHAR(10), CHUC_VU VARCHAR(80),
NGAY_VAO_LAM DATE, TRANG_THAI VARCHAR(20), GHI_CHU TEXT
```

### B2. `BO_PHAN` (14 bản ghi có sẵn)
```sql
MA_BO_PHAN VARCHAR(10) PK, TEN VARCHAR(100), LOAI VARCHAR(20),  -- Sản xuất | Hỗ trợ
THU_TU INTEGER, TRANG_THAI VARCHAR(20)
```
`DH` Ban Quản Trị · `KD` Kinh Doanh · `KT` Kỹ Thuật · `VH` Vận Hành · `MH` Mua Hàng · `CX` Gia Công Chính Xác · `QC` Kiểm Soát Chất Lượng · `TD` Tự Động Hoá · `VT` Gia Công Vật Tư · `SO` Sơn · `KV` Kho Vận · `KC1` `KC2` `KC3` Gia Công Kết Cấu

### B3. `LENH_SAN_XUAT` (Kế hoạch Sản xuất sở hữu)
```sql
LENH_SAN_XUAT VARCHAR(60) PK,          -- MBC0326-018-CKCT
SO_PO VARCHAR(40), MA_KHACH_HANG VARCHAR(40),
KI_HAN_KHACH_HANG DATE, MUC_DO_UU_TIEN SMALLINT,   -- 1 | 2 | 3
NGAY_NHAN_LENH DATE, TRANG_THAI_DON VARCHAR(30), GHI_CHU TEXT
```

### B4. `LSX_DONG`
```sql
MA_VACH VARCHAR(40) PK,                -- 26073265907WO — mã lô, KHÔNG phải mã hàng
LENH_SAN_XUAT VARCHAR(60) NOT NULL REFERENCES LENH_SAN_XUAT,
MA_HANG VARCHAR(60) NOT NULL,          -- 2021-70-5318-01 — mã chi tiết, ổn định
TEN_HANG VARCHAR(300), SO_LUONG_PO NUMERIC(14,4), DVT VARCHAR(20)
```
Quan hệ: **1 `MA_HANG` → N `LENH_SAN_XUAT` → N `MA_VACH`**

### B5. `CONG_DOAN` (40 bản ghi có sẵn)
```sql
MA_CONG_DOAN VARCHAR(20) PK, TEN_CONG_DOAN VARCHAR(120), MO_TA TEXT, THU_TU INTEGER
```
`CD01`…`CD39` + `GCN` (Gia công ngoài)

---

## 5. NHÓM C — Tài khoản và phân quyền

### C1. `TAI_KHOAN`
```sql
MA_TAI_KHOAN  VARCHAR(60)  PRIMARY KEY,     -- tên đăng nhập tự đặt: nguyen.van.a
MA_NHAN_VIEN  VARCHAR(20)  NOT NULL REFERENCES NHAN_VIEN,   -- BẮT BUỘC khi đăng ký
HO_VA_TEN     VARCHAR(120) NOT NULL,
MA_BO_PHAN    VARCHAR(10)  NOT NULL REFERENCES BO_PHAN,
VAI_TRO       VARCHAR(40)  NOT NULL REFERENCES VAI_TRO(MA),
MAT_KHAU_HASH VARCHAR(120) NOT NULL,        -- bcrypt
TRANG_THAI    VARCHAR(20)  NOT NULL DEFAULT 'CHO_DUYET',  -- CHO_DUYET|HOAT_DONG|KHOA
LAN_DANG_NHAP_CUOI TIMESTAMPTZ, GHI_CHU TEXT + 6 cột hệ thống
```
Đăng nhập bằng `MA_TAI_KHOAN`, nhưng **mọi bảng giao dịch lưu `MA_NHAN_VIEN`**.

### C2. `VAI_TRO` và `PHAN_QUYEN`
```sql
VAI_TRO:    MA VARCHAR(40) PK, TEN VARCHAR(100), THU_TU INTEGER, MO_TA TEXT
PHAN_QUYEN: VAI_TRO VARCHAR(40), TRANG VARCHAR(40),
            DUOC_XEM BOOLEAN, DUOC_SUA BOOLEAN, DUOC_DUYET BOOLEAN,
            DUOC_XUAT BOOLEAN, PHAM_VI VARCHAR(20),   -- toan_bo | bo_phan | ca_nhan
            PRIMARY KEY (VAI_TRO, TRANG)
```
Chi tiết vai trò và ma trận: xem `06_PHAN_QUYEN.md`.

### C3. `PHIEN_DANG_NHAP`
```sql
TOKEN VARCHAR(64) PK, MA_TAI_KHOAN VARCHAR(60), TAO_LUC TIMESTAMPTZ,
HET_HAN TIMESTAMPTZ, IP VARCHAR(45), THIET_BI TEXT
```

---

## 6. NHÓM D — Luồng đề nghị

### D1. `DE_NGHI` (bảng đầu)

```sql
CREATE TABLE DE_NGHI (
  ID              VARCHAR(24) PRIMARY KEY,          -- DN-2026-000123
  LOAI            VARCHAR(20) NOT NULL,             -- MUA_HANG | GIA_CONG_NGOAI
  SO_PHIEU_CU     VARCHAR(60),                      -- CKCT-2301-01 (không unique)
  MA_BO_PHAN      VARCHAR(10) NOT NULL REFERENCES BO_PHAN,
  NGUOI_YEU_CAU   VARCHAR(20) NOT NULL REFERENCES NHAN_VIEN,
  THOI_DIEM_GUI   TIMESTAMPTZ NOT NULL,             -- thời điểm thật khi bấm gửi
  NGAY_HIEU_LUC   DATE NOT NULL,                    -- sau khi áp giờ chốt 13:30 / 15:00
  TRE_GIO_CHOT    BOOLEAN NOT NULL DEFAULT false,   -- để hiện nhãn "tính sang ngày mai"
  MUC_DO_UU_TIEN  SMALLINT,                         -- 1|2|3 — đọc từ LSX
  TINH_TRANG_YC   VARCHAR(30) DEFAULT 'BINH_THUONG',-- quản lý nội bộ Mua hàng
                  -- BINH_THUONG | HANG_KHAN_CAP | KHAN_CAP_NG | HANG_NG
  TRANG_THAI      VARCHAR(30) NOT NULL DEFAULT 'NHAP',
  LY_DO_TRA_LAI   TEXT,
  NGUOI_DUYET_BP  VARCHAR(20), NGAY_DUYET_BP TIMESTAMPTZ,
  DUYET_ONLINE    BOOLEAN DEFAULT false,            -- cần ký bù
  NGAY_KY_BU      DATE,
  NGUOI_MUA_HANG  VARCHAR(20) REFERENCES NHAN_VIEN, -- được phân công
  GHI_CHU         TEXT,
  NGAY_TAO TIMESTAMPTZ NOT NULL DEFAULT now(), NGUOI_TAO VARCHAR(20) NOT NULL,
  NGAY_SUA TIMESTAMPTZ, NGUOI_SUA VARCHAR(20), PHIEN_BAN INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_dn_trangthai ON DE_NGHI(TRANG_THAI);
CREATE INDEX ix_dn_bophan    ON DE_NGHI(MA_BO_PHAN, NGAY_HIEU_LUC DESC);
CREATE INDEX ix_dn_mua       ON DE_NGHI(NGUOI_MUA_HANG, TRANG_THAI);
```

### D2. `DE_NGHI_DONG` (bảng chi tiết)

```sql
CREATE TABLE DE_NGHI_DONG (
  ID                VARCHAR(24) PRIMARY KEY,        -- DND-2026-000456
  ID_DE_NGHI        VARCHAR(24) NOT NULL REFERENCES DE_NGHI ON DELETE RESTRICT,
  STT_DONG          SMALLINT NOT NULL,
  ID_SP_CU          VARCHAR(30),                    -- ID SP cũ: 11344-25
  -- mặt hàng: đề nghị gốc vs thực mua
  ID_VT_DE_NGHI     VARCHAR(20) REFERENCES VAT_TU(ID),
  ID_VT_DUYET_MUA   VARCHAR(20) REFERENCES VAT_TU(ID),   -- Kho vận CHỈ đọc cột này
  TEN_HANG_CHUP     VARCHAR(300) NOT NULL,          -- chụp lúc lập
  DVT_CHUP          VARCHAR(20)  NOT NULL,
  PHAN_LOAI_CHUP    VARCHAR(20)  NOT NULL,          -- quyết định ngưỡng duyệt
  QUY_CACH          TEXT,
  MA_CHUNG_LOAI     VARCHAR(20), MUC_DICH_SU_DUNG VARCHAR(20),
  SO_LUONG          NUMERIC(14,4) NOT NULL CHECK (SO_LUONG > 0),
  KY_HAN_YC         DATE NOT NULL,
  TRA_LOI_KY_HAN    DATE,                           -- kỳ hạn Mua hàng cam kết lại
  -- liên kết sản xuất
  LENH_SAN_XUAT     VARCHAR(60) REFERENCES LENH_SAN_XUAT,
  MA_VACH           VARCHAR(40) REFERENCES LSX_DONG,
  MA_CONG_DOAN      VARCHAR(20) REFERENCES CONG_DOAN,   -- BẮT BUỘC nếu LOAI=GIA_CONG_NGOAI
  NOI_DUNG_GIA_CONG TEXT,                           -- mô tả tự do, đi kèm công đoạn
  -- cờ nghiệp vụ
  BAT_KHA_THI       BOOLEAN NOT NULL DEFAULT false, -- kỳ hạn < thời gian chuẩn
  CAN_XAC_NHAN_KT   BOOLEAN NOT NULL DEFAULT false,
  TRANG_THAI_DONG   VARCHAR(30) NOT NULL DEFAULT 'NHAP',
  GHI_CHU           TEXT,
  NGAY_TAO TIMESTAMPTZ NOT NULL DEFAULT now(), NGUOI_TAO VARCHAR(20) NOT NULL,
  NGAY_SUA TIMESTAMPTZ, NGUOI_SUA VARCHAR(20), PHIEN_BAN INTEGER NOT NULL DEFAULT 1,
  UNIQUE (ID_DE_NGHI, STT_DONG)
);
CREATE INDEX ix_dnd_vt   ON DE_NGHI_DONG(ID_VT_DUYET_MUA);
CREATE INDEX ix_dnd_lsx  ON DE_NGHI_DONG(LENH_SAN_XUAT);
CREATE INDEX ix_dnd_mavach ON DE_NGHI_DONG(MA_VACH);
```

### D3. `DOI_VAT_LIEU`

Giữ nguyên vẹn *"đề nghị gốc → đổi sang gì → duyệt mua gì"* mà **không đụng tới danh mục vật tư**.

```sql
ID                VARCHAR(24) PK,                   -- DVL-2026-000024
ID_DE_NGHI_DONG   VARCHAR(24) NOT NULL REFERENCES DE_NGHI_DONG,
ID_VT_TU          VARCHAR(20) REFERENCES VAT_TU(ID),
ID_VT_SANG        VARCHAR(20) REFERENCES VAT_TU(ID),
TEN_TU            VARCHAR(300) NOT NULL,            -- chụp
TEN_SANG          VARCHAR(300) NOT NULL,            -- chụp
NOI_DUNG_YEU_CAU  TEXT NOT NULL,                    -- "SK5 -> SKS3"
LY_DO             TEXT,
NGUOI_YEU_CAU     VARCHAR(20) NOT NULL,
NGUOI_DUYET       VARCHAR(20), THOI_DIEM_DUYET TIMESTAMPTZ,
TRANG_THAI        VARCHAR(20) NOT NULL DEFAULT 'CHO_DUYET',  -- CHO_DUYET|DONG_Y|TU_CHOI
+ 6 cột hệ thống
```
Khi `DONG_Y`: ghi `DE_NGHI_DONG.ID_VT_DUYET_MUA = ID_VT_SANG` và cập nhật `TEN_HANG_CHUP`.

### D4. `YEU_CAU_HUY`
```sql
ID VARCHAR(24) PK, ID_DE_NGHI_DONG VARCHAR(24) NOT NULL REFERENCES DE_NGHI_DONG,
LY_DO TEXT NOT NULL, NGUOI_YEU_CAU VARCHAR(20) NOT NULL,
NGUOI_DUYET VARCHAR(20), THOI_DIEM_DUYET TIMESTAMPTZ,
TRANG_THAI VARCHAR(20) DEFAULT 'CHO_DUYET' + 6 cột hệ thống
```

### D5. `YEU_CAU_CAP_MA`
```sql
ID VARCHAR(24) PK, ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG,
TEN_DE_XUAT VARCHAR(300) NOT NULL, QUY_CACH TEXT, DVT_DE_XUAT VARCHAR(20),
MA_CHUNG_LOAI VARCHAR(20), GHI_CHU TEXT,
NGUOI_YEU_CAU VARCHAR(20) NOT NULL,
ID_VAT_TU_CAP VARCHAR(20) REFERENCES VAT_TU(ID),    -- điền khi Kho vận cấp xong
NGUOI_CAP VARCHAR(20), THOI_DIEM_CAP TIMESTAMPTZ,
TRANG_THAI VARCHAR(20) DEFAULT 'CHO_CAP' + 6 cột hệ thống
```

### D6. `DAT_NGOAI` và `DAT_NGOAI_DONG` — luồng riêng của Kinh doanh

```sql
DAT_NGOAI:
  ID VARCHAR(24) PK,                                -- DNG-2026-000045
  LENH_SAN_XUAT VARCHAR(60) NOT NULL REFERENCES LENH_SAN_XUAT,
  ID_NCC VARCHAR(20) REFERENCES NHA_CUNG_CAP,
  NGUOI_LAP VARCHAR(20) NOT NULL,                   -- thuộc bộ phận KD
  NGAY_LAP DATE NOT NULL, KY_HAN DATE,
  TRANG_THAI VARCHAR(30) NOT NULL DEFAULT 'NHAP',
      -- NHAP | CHO_DUYET | DA_DUYET | DANG_BAO_GIA | CHO_XAC_NHAN_KT
      -- | DA_DAT | DANG_LAM | DA_NHAN | HOAN_THANH | HUY
  NGUOI_DUYET VARCHAR(20),                          -- Trưởng BP Kinh doanh
  NGAY_DUYET TIMESTAMPTZ,
  GHI_CHU TEXT + 6 cột hệ thống

DAT_NGOAI_DONG:
  ID VARCHAR(24) PK, ID_DAT_NGOAI VARCHAR(24) NOT NULL REFERENCES DAT_NGOAI,
  STT_DONG SMALLINT, MA_VACH VARCHAR(40), MA_HANG VARCHAR(60),
  TEN_HANG_CHUP VARCHAR(300), DVT_CHUP VARCHAR(20),
  SO_LUONG NUMERIC(14,4), DON_GIA BIGINT,
  KY_HAN DATE, NGAY_NHAN DATE,
  TRANG_THAI_DONG VARCHAR(30), GHI_CHU TEXT + 6 cột hệ thống
```
**Không áp ngưỡng duyệt tiền.** Chỉ một cấp: Trưởng BP Kinh doanh. Hàng về nhập kho **bán thành phẩm** để kiểm QC.

---

## 7. NHÓM E — Báo giá và đơn hàng

### E1. `YEU_CAU_BAO_GIA` / `YCBG_DONG`
```sql
YEU_CAU_BAO_GIA:
  ID VARCHAR(24) PK,                                -- YCBG-2026-000078
  SO_PHIEU_CU VARCHAR(60),                          -- NIPPON-0107-02
  ID_NCC VARCHAR(20) NOT NULL REFERENCES NHA_CUNG_CAP,
  NGAY_GUI DATE, HAN_TRA_LOI DATE,
  TRANG_THAI VARCHAR(30) DEFAULT 'NHAP', GHI_CHU TEXT + 6 cột

YCBG_DONG:
  ID VARCHAR(24) PK, ID_YCBG VARCHAR(24) NOT NULL REFERENCES YEU_CAU_BAO_GIA,
  ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG,
  STT_DONG SMALLINT, TEN_HANG_CHUP VARCHAR(300), QUY_CACH TEXT,
  DVT_CHUP VARCHAR(20), SO_LUONG NUMERIC(14,4), KY_HAN_YC DATE, GHI_CHU TEXT
```

### E2. `BAO_GIA` / `BAO_GIA_DONG`
```sql
BAO_GIA:
  ID VARCHAR(24) PK,                                -- BG-2026-000210
  ID_YCBG VARCHAR(24) REFERENCES YEU_CAU_BAO_GIA,
  ID_NCC VARCHAR(20) NOT NULL REFERENCES NHA_CUNG_CAP,
  NGAY_BAO_GIA DATE, HIEU_LUC_DEN DATE,
  DIEU_KIEN_THANH_TOAN TEXT, THOI_GIAN_GIAO INTEGER,   -- ngày làm việc
  DUOC_CHON BOOLEAN DEFAULT false, LY_DO_CHON TEXT,
  MIEN_TRU_2_BAO_GIA BOOLEAN DEFAULT false,         -- độc quyền|hợp đồng|chỉ định
  LY_DO_MIEN_TRU TEXT,
  TRANG_THAI VARCHAR(30) DEFAULT 'NHAP' + 6 cột

BAO_GIA_DONG:
  ID VARCHAR(24) PK, ID_BAO_GIA VARCHAR(24) NOT NULL REFERENCES BAO_GIA,
  ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG,
  STT_DONG SMALLINT, TEN_HANG_CHUP VARCHAR(300), DVT_CHUP VARCHAR(20),
  SO_LUONG NUMERIC(14,4),
  DON_GIA_CO_SO BIGINT NOT NULL,                    -- VND
  DON_VI_GIA VARCHAR(10) NOT NULL DEFAULT 'PCS',    -- PCS | KG | MET | LIT
  TRONG_LUONG NUMERIC(14,4),                        -- bắt buộc nếu DON_VI_GIA ≠ PCS
  THOI_GIAN_GIAO INTEGER, GHI_CHU TEXT + 6 cột
```

### E3. `DON_HANG` / `DON_HANG_DONG` (PO)
```sql
DON_HANG:
  ID VARCHAR(24) PK,                                -- PO-2026-000156
  SO_PHIEU_CU VARCHAR(60),                          -- HDBH2607001 / KNHD-2601-019
  ID_NCC VARCHAR(20) NOT NULL REFERENCES NHA_CUNG_CAP,
  ID_BAO_GIA VARCHAR(24) REFERENCES BAO_GIA,
  LOAI VARCHAR(20) NOT NULL,                        -- MUA_HANG | GIA_CONG_NGOAI
  NGAY_DAT DATE NOT NULL, KY_HAN_GIAO DATE,
  DIEU_KIEN_THANH_TOAN TEXT,
  PHAN_LOAI_CAO_NHAT VARCHAR(20),                   -- suy từ các dòng, quyết định ngưỡng
  GIA_TRI_TRUOC_VAT BIGINT,                         -- tính lại khi đọc, chỉ cache để lọc
  CAP_DUYET_YEU_CAU VARCHAR(40),                    -- TBP_MUA_HANG | BAN_LANH_DAO
  TRANG_THAI VARCHAR(30) NOT NULL DEFAULT 'NHAP',
  NGUOI_KIEM_TRA VARCHAR(20), NGUOI_DUYET VARCHAR(20), NGAY_DUYET TIMESTAMPTZ,
  GHI_CHU TEXT + 6 cột

DON_HANG_DONG:
  ID VARCHAR(24) PK, ID_DON_HANG VARCHAR(24) NOT NULL REFERENCES DON_HANG,
  ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG,
  STT_DONG SMALLINT,
  ID_VAT_TU VARCHAR(20) REFERENCES VAT_TU(ID),
  TEN_HANG_CHUP VARCHAR(300) NOT NULL,
  TEN_NCC_GHI_TREN_CHUNG_TU VARCHAR(300),           -- tên NCC in trên hoá đơn, để đối chiếu
  DVT_CHUP VARCHAR(20) NOT NULL, QUY_CACH TEXT,
  SO_LUONG NUMERIC(14,4) NOT NULL,
  DON_GIA_CO_SO BIGINT NOT NULL, DON_VI_GIA VARCHAR(10) NOT NULL,
  TRONG_LUONG NUMERIC(14,4),
  PHAN_LOAI_CHUP VARCHAR(20), KY_HAN_GIAO DATE,
  SO_LUONG_DA_NHAN NUMERIC(14,4) DEFAULT 0,         -- cập nhật khi nhận hàng
  TRANG_THAI_DONG VARCHAR(30), GHI_CHU TEXT + 6 cột
```

> `THANH_TIEN` **không lưu**. Tính khi đọc:
> `THANH_TIEN = (DON_VI_GIA='PCS') ? DON_GIA_CO_SO*SO_LUONG : DON_GIA_CO_SO*TRONG_LUONG`

### E4. `CONG_VIEC` — Lệnh mua hàng / giao việc
```sql
ID VARCHAR(24) PK,                                  -- LMH-2026-000089
SO_PHIEU_CU VARCHAR(60),                            -- 024/052026/ĐN/MH
LOAI VARCHAR(30) NOT NULL,       -- XU_LY_DE_NGHI | LAY_BAO_GIA | THEO_DOI_GIAO | KHAC
NGUOI_GIAO VARCHAR(20) NOT NULL, NGUOI_NHAN VARCHAR(20) NOT NULL REFERENCES NHAN_VIEN,
NGAY_GIAO DATE NOT NULL, HAN_XU_LY DATE,
TIEU_DE VARCHAR(300), NOI_DUNG TEXT,
TRANG_THAI VARCHAR(30) DEFAULT 'MOI',   -- MOI | DANG_LAM | XONG | HUY
NGAY_HOAN_THANH TIMESTAMPTZ, PHAN_HOI TEXT + 6 cột

CONG_VIEC_DONG:
ID VARCHAR(24) PK, ID_CONG_VIEC VARCHAR(24) REFERENCES CONG_VIEC,
ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG, STT_DONG SMALLINT
```

---

## 8. NHÓM F — Giao nhận

### F1. `NHAN_HANG` / `NHAN_HANG_DONG`

Thay cho ô Excel `SỐ PGH NỘI BỘ = "12-539/01-022"` — **một lần giao là một bản ghi**.

```sql
NHAN_HANG:
  ID VARCHAR(24) PK,                                -- NH-2026-000341
  SO_PHIEU_CU VARCHAR(60),                          -- 06-510 (PGH nội bộ)
  ID_DON_HANG VARCHAR(24) REFERENCES DON_HANG,
  ID_NCC VARCHAR(20) REFERENCES NHA_CUNG_CAP,
  NGAY_NHAN DATE NOT NULL, LAN_GIAO SMALLINT NOT NULL DEFAULT 1,
  NGUOI_NHAN VARCHAR(20), MA_KHO VARCHAR(20),
  TRANG_THAI VARCHAR(30) DEFAULT 'DA_NHAN',
  NGAY_BAN_GIAO_CHUNG_TU DATE, GHI_CHU TEXT + 6 cột

NHAN_HANG_DONG:
  ID VARCHAR(24) PK, ID_NHAN_HANG VARCHAR(24) NOT NULL REFERENCES NHAN_HANG,
  ID_DON_HANG_DONG VARCHAR(24) REFERENCES DON_HANG_DONG,
  STT_DONG SMALLINT, ID_VAT_TU VARCHAR(20) REFERENCES VAT_TU(ID),
  TEN_HANG_CHUP VARCHAR(300), DVT_CHUP VARCHAR(20),
  SO_LUONG_NHAN NUMERIC(14,4) NOT NULL,
  SO_NGAY_SOM_TRE INTEGER,                          -- KY_HAN_YC − NGAY_NHAN, ngày làm việc
  GHI_CHU TEXT + 6 cột
```

### F2. `KET_QUA_IQC`
```sql
ID VARCHAR(24) PK,                                  -- IQC-2026-000122
ID_NHAN_HANG_DONG VARCHAR(24) NOT NULL REFERENCES NHAN_HANG_DONG,
NGUOI_KIEM VARCHAR(20) NOT NULL, NGAY_KIEM DATE NOT NULL,
SO_LUONG_KIEM NUMERIC(14,4), SO_LUONG_DAT NUMERIC(14,4), SO_LUONG_KHONG_DAT NUMERIC(14,4),
KET_LUAN VARCHAR(20) NOT NULL,                      -- DAT | KHONG_DAT | DAT_CO_DIEU_KIEN
LOI_PHAT_HIEN TEXT, HUONG_XU_LY TEXT,               -- DOI_TRA | KHIEU_NAI | CHAP_NHAN
GHI_CHU TEXT + 6 cột
```

### F3. `HANG_KHONG_PHU_HOP` (NCR)
```sql
ID VARCHAR(24) PK, ID_KET_QUA_IQC VARCHAR(24) REFERENCES KET_QUA_IQC,
ID_NCC VARCHAR(20) REFERENCES NHA_CUNG_CAP,
MO_TA TEXT NOT NULL, HUONG_XU_LY TEXT, KET_QUA VARCHAR(20),
NGUOI_GIAM_SAT VARCHAR(20), NGAY_DONG DATE,
TRANG_THAI VARCHAR(20) DEFAULT 'MO' + 6 cột
```
→ Đây là nguồn dữ liệu cho `QT-MH-01-BM08` Sổ theo dõi tình trạng NCC (hiện đang trống).

---

## 9. NHÓM G — Thanh toán

### G1. `YEU_CAU_THANH_TOAN` / `DOT_THANH_TOAN`

Thay hai cột cứng `THANH TOÁN LẦN 1` / `LẦN 2` của Excel bằng **N đợt**.

```sql
YEU_CAU_THANH_TOAN:
  ID VARCHAR(24) PK,                                -- YCTT-2026-000067
  ID_DON_HANG VARCHAR(24) REFERENCES DON_HANG,
  ID_NCC VARCHAR(20) NOT NULL REFERENCES NHA_CUNG_CAP,
  NGUOI_DE_NGHI VARCHAR(20) NOT NULL, NGAY_YEU_CAU DATE NOT NULL,
  LY_DO_THANH_TOAN VARCHAR(200),   -- "Nhà cc lẻ không cho công nợ"…
  HINH_THUC_THANH_TOAN VARCHAR(200),-- "Thanh toán 30% giá trị đơn hàng"…
  LY_DO_YEU_CAU VARCHAR(200),      -- "Thanh toán để lấy hàng về"…
  GIA_TRI_DON_HANG BIGINT, KY_HAN_THANH_TOAN DATE,
  TINH_TRANG_HANG VARCHAR(30),     -- HANG_CHUA_VE | HANG_DA_VE
  TRANG_THAI VARCHAR(20) DEFAULT 'CHUA_TT',   -- CHUA_TT | TT_MOT_PHAN | DA_TT
  NGUOI_LAP VARCHAR(20), NGUOI_DUYET VARCHAR(20), NGAY_DUYET TIMESTAMPTZ,
  GHI_CHU TEXT + 6 cột

DOT_THANH_TOAN:
  ID VARCHAR(24) PK, ID_YCTT VARCHAR(24) NOT NULL REFERENCES YEU_CAU_THANH_TOAN,
  DOT_SO SMALLINT NOT NULL, SO_TIEN BIGINT NOT NULL,
  NGAY_DU_KIEN DATE, NGAY_THUC_TE DATE,
  TRANG_THAI VARCHAR(20) DEFAULT 'CHUA_TT', GHI_CHU TEXT + 6 cột,
  UNIQUE (ID_YCTT, DOT_SO)
```

### G2. `BAN_GIAO_CHUNG_TU` / `BGCT_DONG`
```sql
BAN_GIAO_CHUNG_TU:
  ID VARCHAR(24) PK,                                -- BGCT-2026-000031
  NGAY_BAN_GIAO DATE NOT NULL,
  NGUOI_BAN_GIAO VARCHAR(20), NGUOI_NHAN VARCHAR(20),
  TRANG_THAI VARCHAR(20) DEFAULT 'DA_BAN_GIAO', GHI_CHU TEXT + 6 cột

BGCT_DONG:
  ID VARCHAR(24) PK, ID_BGCT VARCHAR(24) NOT NULL REFERENCES BAN_GIAO_CHUNG_TU,
  ID_NHAN_HANG VARCHAR(24) REFERENCES NHAN_HANG,
  ID_NCC VARCHAR(20), SO_PGH VARCHAR(60), NGAY_NHAN_HANG DATE, GHI_CHU TEXT
```

---

## 10. NHÓM H — Điều xe

**Một luồng duy nhất** thay cho 4 sheet rời rạc của hai file Excel.

```sql
DIEU_XE:
  ID VARCHAR(24) PK,                                -- DX-2026-000512
  SO_PHIEU_CU VARCHAR(60),                          -- GCN-0201-01 / MH-KYB-010726
  HANG_MUC VARCHAR(30) NOT NULL,
      -- DI_GCN | DI_LAY_HANG_GCN | MUA_HANG | GIAO_HANG | GIAO_CHUNG_TU | KHAC
  CHIEU VARCHAR(30) NOT NULL,
      -- DUA_HANG_DI | LAY_HANG_VE | DUA_DI_VA_LAY_VE
  KHAN VARCHAR(20) DEFAULT 'BINH_THUONG',           -- BINH_THUONG | GAP
  NGUOI_DE_NGHI VARCHAR(20) NOT NULL, MA_BO_PHAN VARCHAR(10),
  NGAY_LAP_PHIEU DATE NOT NULL, THOI_DIEM_GUI TIMESTAMPTZ,
  TRE_GIO_CHOT BOOLEAN DEFAULT false,               -- so với 15:45
  NGAY_DIEU_XE DATE NOT NULL,
  MA_XE VARCHAR(20) REFERENCES XE, TAI_XE VARCHAR(20) REFERENCES TAI_XE, PHU_XE VARCHAR(20),
  ID_DOI_TAC VARCHAR(20),                           -- NCC hoặc KH
  LOAI_DOI_TAC VARCHAR(10),                         -- NCC | KH
  DIA_CHI TEXT, KHU_VUC VARCHAR(60), VUNG VARCHAR(30), SO_KM NUMERIC(8,1),
  SO_CHUYEN SMALLINT DEFAULT 1, THOI_GIAN_TOI_NOI_PHUT INTEGER,
  SO_TIEN_THANH_TOAN BIGINT,                        -- lấy hàng trả tiền mặt
  TRANG_THAI VARCHAR(20) DEFAULT 'CHUA_XU_LY',      -- CHUA_XU_LY|DANG_XU_LY|HOAN_THANH
  GHI_CHU TEXT + 6 cột

DIEU_XE_DONG:
  ID VARCHAR(24) PK, ID_DIEU_XE VARCHAR(24) NOT NULL REFERENCES DIEU_XE,
  STT_DONG SMALLINT, NOI_DUNG TEXT, KICH_THUOC TEXT,
  SO_LUONG NUMERIC(14,4), DVT VARCHAR(20),
  ID_DE_NGHI_DONG VARCHAR(24) REFERENCES DE_NGHI_DONG, GHI_CHU TEXT
```

---

## 11. NHÓM I — Đánh giá nhà cung cấp

```sql
DANH_GIA_NCC:
  ID VARCHAR(24) PK,                                -- DGN-2026-000019
  ID_NCC VARCHAR(20) NOT NULL REFERENCES NHA_CUNG_CAP,
  LOAI VARCHAR(20) NOT NULL,                        -- BAN_DAU | DINH_KY
  KY_DANH_GIA VARCHAR(20),                          -- 2026 | 2026-Q1
  NGAY_DANH_GIA DATE NOT NULL, NGUOI_DANH_GIA VARCHAR(20) NOT NULL,
  -- 8 tiêu chí QT-MH-01 §7.5, thang 0–100
  DIEM_CHAT_LUONG NUMERIC(5,2), DIEM_GIAO_HANG NUMERIC(5,2),
  DIEM_GIA_CA NUMERIC(5,2), DIEM_THANH_TOAN NUMERIC(5,2),
  DIEM_DICH_VU NUMERIC(5,2), DIEM_TAM_VOC NUMERIC(5,2),
  DIEM_THOI_GIAN_HOP_TAC NUMERIC(5,2), DIEM_GIA_TRI_GIAO_DICH NUMERIC(5,2),
  DIEM_TONG NUMERIC(5,2), XEP_LOAI VARCHAR(10),     -- A | B | C
  -- số liệu tự động lấy từ hệ thống
  TY_LE_DUNG_HAN NUMERIC(5,2), TY_LE_IQC_DAT NUMERIC(5,2), SO_LAN_KHONG_PHU_HOP INTEGER,
  KET_LUAN VARCHAR(20),                             -- DAT|KHONG_DAT|CANH_BAO|TAM_NGUNG|LOAI_BO
  HANH_DONG_XU_LY TEXT, GHI_CHU TEXT + 6 cột
```

---

## 12. NHÓM J — Hệ thống

```sql
LICH_SU_TRANG_THAI:
  ID VARCHAR(24) PK, BANG VARCHAR(40) NOT NULL, ID_BAN_GHI VARCHAR(24) NOT NULL,
  TU_TRANG_THAI VARCHAR(30), SANG_TRANG_THAI VARCHAR(30) NOT NULL,
  NGUOI_THUC_HIEN VARCHAR(20) NOT NULL, THOI_DIEM TIMESTAMPTZ NOT NULL DEFAULT now(),
  GHI_CHU TEXT
  -- trả lời "chứng từ này nằm chờ duyệt bao lâu?" (giáo trình GĐ1 §2A.7)

NHAT_KY_THAY_DOI:                                   -- audit log, thay chữ ký giấy
  ID VARCHAR(24) PK, BANG VARCHAR(40), ID_BAN_GHI VARCHAR(24), COT VARCHAR(60),
  GIA_TRI_CU TEXT, GIA_TRI_MOI TEXT,
  NGUOI_SUA VARCHAR(20), THOI_DIEM TIMESTAMPTZ DEFAULT now(),
  IP VARCHAR(45), THIET_BI TEXT, HANH_DONG VARCHAR(20)   -- TAO|SUA|DUYET|HUY|XEM|XUAT

TRAO_DOI:                                           -- thay Zalo
  ID VARCHAR(24) PK, BANG VARCHAR(40) NOT NULL, ID_BAN_GHI VARCHAR(24) NOT NULL,
  NOI_DUNG TEXT NOT NULL, NGUOI_GUI VARCHAR(20) NOT NULL,
  THOI_DIEM TIMESTAMPTZ DEFAULT now(), ID_TRA_LOI_CHO VARCHAR(24)

TEP_DINH_KEM:
  ID VARCHAR(24) PK, BANG VARCHAR(40), ID_BAN_GHI VARCHAR(24),
  TEN_TEP VARCHAR(300), DUONG_DAN TEXT, KICH_THUOC BIGINT, LOAI_MIME VARCHAR(100),
  NGUOI_TAI_LEN VARCHAR(20), THOI_DIEM TIMESTAMPTZ DEFAULT now()

THONG_BAO:
  ID VARCHAR(24) PK, NGUOI_NHAN VARCHAR(20) NOT NULL, LOAI VARCHAR(40) NOT NULL,
  TIEU_DE VARCHAR(300), NOI_DUNG TEXT,
  BANG VARCHAR(40), ID_BAN_GHI VARCHAR(24),         -- để bấm vào là mở đúng phiếu
  DA_DOC BOOLEAN DEFAULT false, THOI_DIEM TIMESTAMPTZ DEFAULT now()

SU_CO:
  ID VARCHAR(24) PK,                                -- SC-2026-000008
  LOAI VARCHAR(40) NOT NULL, MUC_DO VARCHAR(20),
  BANG VARCHAR(40), ID_BAN_GHI VARCHAR(24),
  MO_TA TEXT NOT NULL, NGUOI_BAO VARCHAR(20), THOI_DIEM TIMESTAMPTZ DEFAULT now(),
  HUONG_XU_LY TEXT, NGUOI_XU_LY VARCHAR(20), NGAY_DONG DATE,
  TRANG_THAI VARCHAR(20) DEFAULT 'MO' + 6 cột

LICH_SU_GOP_VAT_TU:
  ID VARCHAR(24) PK, ID_VT_NGUON VARCHAR(20), ID_VT_DICH VARCHAR(20),
  SO_BAN_GHI_CHUYEN INTEGER, NGUOI_GOP VARCHAR(20), THOI_DIEM TIMESTAMPTZ, LY_DO TEXT
```

---

## 13. Trạng thái tổng hợp cấp mã hàng — thứ khớp mục tiêu tối thượng

**Không lưu thành cột.** Suy ra khi đọc, từ chứng từ mới nhất của mã hàng đó.

```sql
CREATE VIEW V_TINH_TRANG_MA_HANG AS
SELECT
  COALESCE(d.ID_VT_DUYET_MUA, d.ID_VT_DE_NGHI)  AS ID_VAT_TU,
  d.TEN_HANG_CHUP, d.LENH_SAN_XUAT, d.MA_VACH,
  CASE
    WHEN nh.ID IS NOT NULL AND nhd.SO_NGAY_SOM_TRE >= 0 THEN 'DA_GIAO_DUNG_HAN'
    WHEN nh.ID IS NOT NULL                              THEN 'DA_GIAO_TRE'
    WHEN dh.TRANG_THAI = 'DA_DUYET'                     THEN 'DANG_GIAO'
    WHEN dh.ID IS NOT NULL                              THEN 'DA_DAT_HANG'
    WHEN bg.ID IS NOT NULL                              THEN 'DANG_BAO_GIA'
    WHEN dn.TRANG_THAI = 'DA_DUYET'                     THEN 'DA_DUYET_DE_NGHI'
    WHEN dn.TRANG_THAI = 'CHO_XAC_NHAN_KT'              THEN 'DANG_XAC_NHAN_KY_THUAT'
    ELSE 'DANG_XAC_NHAN_DE_NGHI'
  END AS TINH_TRANG,
  d.KY_HAN_YC, dn.MUC_DO_UU_TIEN, dn.MA_BO_PHAN, dn.NGUOI_MUA_HANG
FROM DE_NGHI_DONG d
JOIN DE_NGHI dn ON dn.ID = d.ID_DE_NGHI
LEFT JOIN DON_HANG_DONG dhd ON dhd.ID_DE_NGHI_DONG = d.ID
LEFT JOIN DON_HANG dh       ON dh.ID = dhd.ID_DON_HANG
LEFT JOIN BAO_GIA_DONG bgd  ON bgd.ID_DE_NGHI_DONG = d.ID
LEFT JOIN BAO_GIA bg        ON bg.ID = bgd.ID_BAO_GIA
LEFT JOIN NHAN_HANG_DONG nhd ON nhd.ID_DON_HANG_DONG = dhd.ID
LEFT JOIN NHAN_HANG nh      ON nh.ID = nhd.ID_NHAN_HANG
WHERE dn.TRANG_THAI <> 'HUY';
```

Đây chính là nguồn cho màn hình **Tổng quan** với 7 ô trạng thái mà tài liệu Menu liệt kê.

---

## 14. Chỉ mục cần tạo

```sql
-- lọc và sắp xếp mặc định
CREATE INDEX ix_dn_ngay        ON DE_NGHI(NGAY_HIEU_LUC DESC);
CREATE INDEX ix_dh_ngay        ON DON_HANG(NGAY_DAT DESC);
CREATE INDEX ix_dh_ncc         ON DON_HANG(ID_NCC, TRANG_THAI);
CREATE INDEX ix_nh_ngay        ON NHAN_HANG(NGAY_NHAN DESC);
-- tìm kiếm mờ tên hàng (cần extension pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_vt_trgm        ON VAT_TU  USING gin (TEN_KHONG_DAU gin_trgm_ops);
CREATE INDEX ix_ncc_trgm       ON NHA_CUNG_CAP USING gin (TEN_KHONG_DAU gin_trgm_ops);
-- lịch sử và nhật ký
CREATE INDEX ix_lstt           ON LICH_SU_TRANG_THAI(BANG, ID_BAN_GHI, THOI_DIEM DESC);
CREATE INDEX ix_nktd           ON NHAT_KY_THAY_DOI(BANG, ID_BAN_GHI, THOI_DIEM DESC);
CREATE INDEX ix_tb_chuadoc     ON THONG_BAO(NGUOI_NHAN, DA_DOC, THOI_DIEM DESC);
CREATE INDEX ix_td             ON TRAO_DOI(BANG, ID_BAN_GHI, THOI_DIEM);
```

---

## 15. Sinh mã chứng từ

```python
# services/sinh_ma.py  — gọi TRONG cùng giao dịch với việc ghi bản ghi
def sinh_ma(conn, tien_to: str, nam: int) -> str:
    """DN-2026-000123. Dùng bảng đếm có khoá hàng để không trùng khi ghi đồng thời."""
    row = conn.execute("""
        INSERT INTO BO_DEM_CHUNG_TU (TIEN_TO, NAM, SO_HIEN_TAI) VALUES (%s,%s,1)
        ON CONFLICT (TIEN_TO, NAM)
        DO UPDATE SET SO_HIEN_TAI = BO_DEM_CHUNG_TU.SO_HIEN_TAI + 1
        RETURNING SO_HIEN_TAI
    """, (tien_to, nam)).fetchone()
    return f"{tien_to}-{nam}-{row[0]:06d}"
```
```sql
BO_DEM_CHUNG_TU: TIEN_TO VARCHAR(10), NAM SMALLINT, SO_HIEN_TAI INTEGER,
                 PRIMARY KEY (TIEN_TO, NAM)
```
