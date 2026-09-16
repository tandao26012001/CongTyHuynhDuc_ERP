import React from "react";
import { api, coPhien, setPhien } from "./api/client.js";
import DeNghi from "./DeNghi.jsx";

const NHAN_DANH_MUC = {
  "don-vi-tinh": "Đơn vị tính",
  "chung-loai": "Chủng loại",
  "bo-phan": "Bộ phận",
  "nhan-vien": "Nhân viên",
  "nha-cung-cap": "Nhà cung cấp",
};

function ThongBao({ loai = "loi", children }) {
  if (!children) return null;
  return <div className={`thong-bao ${loai}`}>{children}</div>;
}

function DangNhap({ onThanhCong }) {
  const [cheDo, setCheDo] = React.useState("dang-nhap");
  const [form, setForm] = React.useState({ ma_tai_khoan: "", ma_nhan_vien: "", mat_khau: "" });
  const [dangGui, setDangGui] = React.useState(false);
  const [loi, setLoi] = React.useState("");
  const [thanhCong, setThanhCong] = React.useState("");

  function doiTruong(event) {
    setForm((cu) => ({ ...cu, [event.target.name]: event.target.value }));
  }

  async function gui(event) {
    event.preventDefault();
    setDangGui(true);
    setLoi("");
    setThanhCong("");
    try {
      if (cheDo === "dang-ky") {
        await api("/api/v1/dang-ky", { method: "POST", body: form });
        setThanhCong("Đăng ký thành công. Tài khoản đang chờ quản trị duyệt.");
        setCheDo("dang-nhap");
      } else {
        const ketQua = await api("/api/v1/dang-nhap", {
          method: "POST",
          body: { ma_tai_khoan: form.ma_tai_khoan, mat_khau: form.mat_khau },
        });
        setPhien(ketQua.data.token);
        onThanhCong(ketQua.data.ho_so);
      }
    } catch (error) {
      setLoi(error.message);
    } finally {
      setDangGui(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand-mark">MH</div>
        <p className="eyebrow">Hệ thống nội bộ</p>
        <h1>Mua hàng &amp;<br />Gia công ngoài</h1>
        <p className="auth-copy">Tra cứu danh mục, vật tư và nhà cung cấp trên dữ liệu Supabase đã chuẩn hóa.</p>
      </section>
      <section className="auth-card">
        <div className="auth-tabs" role="tablist">
          <button type="button" className={cheDo === "dang-nhap" ? "active" : ""} onClick={() => setCheDo("dang-nhap")}>Đăng nhập</button>
          <button type="button" className={cheDo === "dang-ky" ? "active" : ""} onClick={() => setCheDo("dang-ky")}>Đăng ký</button>
        </div>
        <form onSubmit={gui}>
          <label>Tên đăng nhập
            <input name="ma_tai_khoan" value={form.ma_tai_khoan} onChange={doiTruong} autoComplete="username" required minLength={3} />
          </label>
          {cheDo === "dang-ky" && <label>Mã nhân viên
            <input name="ma_nhan_vien" value={form.ma_nhan_vien} onChange={doiTruong} placeholder="VD: NV000108" required />
          </label>}
          <label>Mật khẩu
            <input name="mat_khau" type="password" value={form.mat_khau} onChange={doiTruong} autoComplete={cheDo === "dang-nhap" ? "current-password" : "new-password"} required minLength={cheDo === "dang-ky" ? 8 : 1} />
          </label>
          <ThongBao>{loi}</ThongBao>
          <ThongBao loai="ok">{thanhCong}</ThongBao>
          <button className="primary full" disabled={dangGui}>{dangGui ? "Đang xử lý…" : cheDo === "dang-nhap" ? "Đăng nhập" : "Gửi đăng ký"}</button>
        </form>
        <p className="auth-note">Tài khoản đăng ký mới cần được quản trị phê duyệt trước khi đăng nhập.</p>
      </section>
    </main>
  );
}

function hienThi(value) {
  if (value === true) return "Có";
  if (value === false) return "Không";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function Bang({ rows, empty = "Không có dữ liệu phù hợp." }) {
  if (!rows?.length) return <div className="empty">{empty}</div>;
  const columns = Object.keys(rows[0]).filter((key) => key !== "diem");
  return <div className="table-wrap"><table>
    <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || row.ma || row.ma_vat_tu || row.ma_ncc || index}>
      {columns.map((column) => <td key={column}>{hienThi(row[column])}</td>)}
    </tr>)}</tbody>
  </table></div>;
}

function DanhMuc() {
  const [loai, setLoai] = React.useState("don-vi-tinh");
  const [duLieu, setDuLieu] = React.useState(null);
  const [trang, setTrang] = React.useState(1);
  const [loi, setLoi] = React.useState("");

  React.useEffect(() => {
    let huy = false;
    setDuLieu(null);
    setLoi("");
    api(`/api/v1/danh-muc/${loai}?trang=${trang}&kich_thuoc=20`)
      .then((result) => !huy && setDuLieu(result.data))
      .catch((error) => !huy && setLoi(error.message));
    return () => { huy = true; };
  }, [loai, trang]);

  const soTrang = duLieu ? Math.max(1, Math.ceil(duLieu.tong / duLieu.kich_thuoc)) : 1;
  return <section className="panel">
    <div className="panel-head">
      <div><p className="eyebrow">Dữ liệu dùng chung</p><h2>Danh mục</h2></div>
      <select value={loai} onChange={(event) => { setLoai(event.target.value); setTrang(1); }}>
        {Object.entries(NHAN_DANH_MUC).map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
      </select>
    </div>
    <ThongBao>{loi}</ThongBao>
    {!duLieu ? <div className="loading">Đang tải dữ liệu…</div> : <>
      <div className="result-meta"><strong>{duLieu.ten}</strong><span>{duLieu.tong} bản ghi</span></div>
      <Bang rows={duLieu.items} />
      <div className="pagination">
        <button disabled={trang <= 1} onClick={() => setTrang((x) => x - 1)}>← Trang trước</button>
        <span>Trang {trang} / {soTrang}</span>
        <button disabled={trang >= soTrang} onClick={() => setTrang((x) => x + 1)}>Trang sau →</button>
      </div>
    </>}
  </section>;
}

function TimKiem({ loai }) {
  const laVatTu = loai === "vat-tu";
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState(null);
  const [dangTai, setDangTai] = React.useState(false);
  const [loi, setLoi] = React.useState("");

  async function tim(event) {
    event.preventDefault();
    setLoi("");
    if (q.trim().length < 2) { setLoi("Nhập ít nhất 2 ký tự để tìm kiếm."); return; }
    setDangTai(true);
    try {
      const endpoint = laVatTu ? "/api/v1/vat-tu/tim" : "/api/v1/nha-cung-cap/tim";
      const result = await api(`${endpoint}?q=${encodeURIComponent(q.trim())}&gioi_han=30`);
      setRows(result.data);
    } catch (error) {
      setLoi(error.message);
    } finally {
      setDangTai(false);
    }
  }

  return <section className="panel">
    <div className="panel-head"><div>
      <p className="eyebrow">Tìm gần đúng, không phân biệt dấu</p>
      <h2>{laVatTu ? "Tra cứu vật tư" : "Tra cứu nhà cung cấp"}</h2>
    </div></div>
    <form className="search" onSubmit={tim}>
      <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={laVatTu ? "Nhập mã hoặc tên vật tư…" : "Nhập mã hoặc tên nhà cung cấp…"} autoFocus />
      <button className="primary" disabled={dangTai}>{dangTai ? "Đang tìm…" : "Tìm kiếm"}</button>
    </form>
    <ThongBao>{loi}</ThongBao>
    {rows === null ? <div className="empty">Nhập từ khóa để bắt đầu tra cứu.</div> : <>
      <div className="result-meta"><strong>Kết quả tìm kiếm</strong><span>{rows.length} kết quả</span></div>
      <Bang rows={rows} />
    </>}
  </section>;
}

function UngDung({ hoSo, onDangXuat }) {
  const [tab, setTab] = React.useState("de-nghi");
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark small">MH</span><span>Mua hàng</span></div>
      <nav>
        <button className={tab === "de-nghi" ? "active" : ""} onClick={() => setTab("de-nghi")}>Đề nghị</button>
        <button className={tab === "danh-muc" ? "active" : ""} onClick={() => setTab("danh-muc")}>Danh mục</button>
        <button className={tab === "vat-tu" ? "active" : ""} onClick={() => setTab("vat-tu")}>Vật tư</button>
        <button className={tab === "nha-cung-cap" ? "active" : ""} onClick={() => setTab("nha-cung-cap")}>Nhà cung cấp</button>
      </nav>
      <a className="docs-link" href="/docs" target="_blank" rel="noreferrer">Mở Swagger ↗</a>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <div><span className="status-dot" />Supabase · mua_hang</div>
        <div className="user"><span><strong>{hoSo.ho_va_ten || hoSo.ma_tai_khoan}</strong><small>{hoSo.vai_tro}</small></span><button onClick={onDangXuat}>Đăng xuất</button></div>
      </header>
      <div className="content">
        {tab === "de-nghi" && <DeNghi hoSo={hoSo} />}
        {tab === "danh-muc" && <DanhMuc />}
        {tab === "vat-tu" && <TimKiem loai="vat-tu" />}
        {tab === "nha-cung-cap" && <TimKiem loai="nha-cung-cap" />}
      </div>
    </main>
  </div>;
}

export default function App() {
  const [hoSo, setHoSo] = React.useState(null);
  const [dangKhoiTao, setDangKhoiTao] = React.useState(coPhien());

  React.useEffect(() => {
    if (!coPhien()) return;
    api("/api/v1/toi").then((result) => setHoSo(result.data)).catch(() => setPhien("")).finally(() => setDangKhoiTao(false));
  }, []);

  async function dangXuat() {
    try { await api("/api/v1/dang-xuat", { method: "POST" }); } catch (_) { /* Luôn xóa phiên phía trình duyệt. */ }
    setPhien("");
    setHoSo(null);
  }

  if (dangKhoiTao) return <div className="splash"><div className="brand-mark">MH</div><p>Đang kiểm tra phiên…</p></div>;
  return hoSo ? <UngDung hoSo={hoSo} onDangXuat={dangXuat} /> : <DangNhap onThanhCong={setHoSo} />;
}
