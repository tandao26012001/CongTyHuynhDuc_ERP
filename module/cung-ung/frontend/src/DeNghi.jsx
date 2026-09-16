import React from "react";
import { api, apiBlob, apiUpload } from "./api/client.js";

function congNgayLamViec(soNgay) {
  const d = new Date();
  let dem = 0;
  while (dem < soNgay) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) dem += 1; }
  return d.toISOString().slice(0, 10);
}
const dongMoi = (kyHan = congNgayLamViec(5)) => ({
  idTam: crypto.randomUUID(), id_vat_tu: null, ten_hang: "", dvt: "", so_luong: 1,
  ky_han_yc: kyHan, lenh_san_xuat: "", ma_vach: "", ma_cong_doan: "",
  noi_dung_gia_cong: "", yeu_cau_ky_thuat: "", ghi_chu: "", ketQua: [], canhBao: null,
});
const nhanTrangThai = {
  NHAP: "Nháp", CHO_DUYET: "Chờ duyệt", DA_DUYET: "Đã duyệt", TRA_LAI: "Trả lại",
  CHO_KY_BU: "Chờ ký bù", HUY: "Hủy",
};

function TrangThai({ value }) { return <span className={`pill status-${value}`}>{nhanTrangThai[value] || value}</span>; }
function Bao({ children, loai = "loi" }) { return children ? <div className={`dn-bao ${loai}`}>{children}</div> : null; }

function BoLoc({ loc, setLoc, taiLai, taoMoi }) {
  return <>
    <div className="dn-tabs">
      <button className={!loc.cua_toi ? "active" : ""} onClick={() => setLoc((x) => ({ ...x, cua_toi: false }))}>Tất cả</button>
      <button className={loc.cua_toi ? "active" : ""} onClick={() => setLoc((x) => ({ ...x, cua_toi: true }))}>Của tôi</button>
      <button onClick={() => setLoc((x) => ({ ...x, trang_thai: "CHO_DUYET" }))}>Chờ duyệt</button>
      <button className="primary dn-tao" onClick={taoMoi}>+ Tạo đề nghị</button>
    </div>
    <div className="dn-filters">
      <input type="date" value={loc.tu_ngay} onChange={(e) => setLoc({ ...loc, tu_ngay: e.target.value })} />
      <input type="date" value={loc.den_ngay} onChange={(e) => setLoc({ ...loc, den_ngay: e.target.value })} />
      <select value={loc.trang_thai} onChange={(e) => setLoc({ ...loc, trang_thai: e.target.value })}>
        <option value="">Mọi trạng thái</option>{Object.entries(nhanTrangThai).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={loc.loai} onChange={(e) => setLoc({ ...loc, loai: e.target.value })}>
        <option value="">Mọi loại</option><option value="MUA_HANG">Mua hàng</option><option value="GIA_CONG_NGOAI">Gia công ngoài</option>
      </select>
      <input className="dn-search" placeholder="Mã, tên hàng, mã vạch, LSX…" value={loc.tu_khoa} onChange={(e) => setLoc({ ...loc, tu_khoa: e.target.value })} />
      <label className="dn-check"><input type="checkbox" checked={loc.chi_tre_han} onChange={(e) => setLoc({ ...loc, chi_tre_han: e.target.checked })} /> Trễ hạn</label>
      <label className="dn-check"><input type="checkbox" checked={loc.chi_bat_kha_thi} onChange={(e) => setLoc({ ...loc, chi_bat_kha_thi: e.target.checked })} /> Bất khả thi</label>
      <button className="primary" onClick={taiLai}>Lọc</button>
    </div>
  </>;
}

function DanhSach({ data, moChiTiet }) {
  if (!data?.items?.length) return <div className="empty">Không có đề nghị phù hợp.</div>;
  return <div className="table-wrap"><table className="dn-table"><thead><tr>
    <th>Mã</th><th>Ngày HL</th><th>Bộ phận</th><th>Người yêu cầu</th><th>Dòng</th><th>Trạng thái</th><th>Cảnh báo</th>
  </tr></thead><tbody>{data.items.map((r) => <tr key={r.id} onClick={() => moChiTiet(r.id)}>
    <td><strong>{r.id}</strong></td><td>{r.ngay_hieu_luc}</td><td>{r.ten_bo_phan || r.ma_bo_phan}</td>
    <td>{r.ten_nguoi_yeu_cau || r.nguoi_yeu_cau}</td><td>{r.so_dong}</td><td><TrangThai value={r.trang_thai} /></td>
    <td>{r.co_bat_kha_thi ? "⚠ BKT" : r.tre_gio_chot ? "Sau giờ chốt" : ""}</td>
  </tr>)}</tbody></table></div>;
}

function DongNhap({ dong, index, loai, capNhat, xoa }) {
  const timer = React.useRef();
  async function tim(value) {
    capNhat({ ten_hang: value, id_vat_tu: null });
    clearTimeout(timer.current);
    if (value.trim().length < 2) return capNhat({ ketQua: [] });
    timer.current = setTimeout(async () => {
      try { const r = await api(`/api/v1/vat-tu/tim?q=${encodeURIComponent(value)}&gioi_han=20`); capNhat({ ketQua: r.data }); } catch (_) { capNhat({ ketQua: [] }); }
    }, 250);
  }
  async function soi(kyHan) {
    capNhat({ ky_han_yc: kyHan });
    if (!kyHan) return;
    const qs = new URLSearchParams({ loai, ky_han_yc: kyHan });
    try { const r = await api(`/api/v1/de-nghi/soi-ky-han?${qs}`); capNhat({ canhBao: r.data }); } catch (_) { /* backend sẽ kiểm tra khi lưu */ }
  }
  return <article className="dn-line">
    <div className="dn-line-title"><strong>Dòng {index + 1}</strong><button className="icon-btn" onClick={xoa} aria-label="Xóa dòng">×</button></div>
    <div className="dn-grid">
      <label className="span-2">Tên/mã vật tư<input autoFocus={index > 0} value={dong.ten_hang} onChange={(e) => tim(e.target.value)} placeholder="Gõ ít nhất 2 ký tự…" />
        {!!dong.ketQua.length && <div className="dn-suggest">{dong.ketQua.map((v) => <button key={v.id} onClick={() => capNhat({ id_vat_tu: v.id, ten_hang: v.ten_hang, dvt: v.dvt, ketQua: [] })}><b>{v.ma_vat_tu}</b> {v.ten_hang} · {v.dvt}</button>)}</div>}
      </label>
      <label>Số lượng<input type="number" min="0.0001" step="any" value={dong.so_luong} onChange={(e) => capNhat({ so_luong: Number(e.target.value) })} /></label>
      <label>ĐVT<input value={dong.dvt} onChange={(e) => capNhat({ dvt: e.target.value.toUpperCase() })} /></label>
      <label>Kỳ hạn<input type="date" value={dong.ky_han_yc} onChange={(e) => soi(e.target.value)} /></label>
      <label>LSX<input value={dong.lenh_san_xuat} onChange={(e) => capNhat({ lenh_san_xuat: e.target.value })} /></label>
      {loai === "GIA_CONG_NGOAI" && <>
        <label>Công đoạn<input value={dong.ma_cong_doan} onChange={(e) => capNhat({ ma_cong_doan: e.target.value })} /></label>
        <label className="span-2">Nội dung gia công<input value={dong.noi_dung_gia_cong} onChange={(e) => capNhat({ noi_dung_gia_cong: e.target.value })} /></label>
        <label className="span-2">Yêu cầu kỹ thuật<input value={dong.yeu_cau_ky_thuat} onChange={(e) => capNhat({ yeu_cau_ky_thuat: e.target.value })} /></label>
      </>}
    </div>
    {dong.canhBao?.bat_kha_thi && <Bao loai="canh-bao">⚠ {dong.canhBao.thong_diep}</Bao>}
  </article>;
}

function QuetLsx({ onMa }) {
  const [dangQuet, setDangQuet] = React.useState(false); const [ma, setMa] = React.useState(""); const videoRef = React.useRef(); const streamRef = React.useRef();
  function dung() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setDangQuet(false); }
  React.useEffect(() => dung, []);
  async function batDau() {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) return document.getElementById("lsx-manual")?.focus();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); streamRef.current = stream; setDangQuet(true);
      setTimeout(async () => {
        const video = videoRef.current; if (!video) return; video.srcObject = stream; await video.play(); const detector = new window.BarcodeDetector();
        const lap = async () => { if (!streamRef.current) return; const codes = await detector.detect(video).catch(() => []); if (codes[0]?.rawValue) { setMa(codes[0].rawValue); onMa(codes[0].rawValue); dung(); return; } requestAnimationFrame(lap); }; lap();
      }, 0);
    } catch (_) { dung(); }
  }
  return <div className="dn-scan"><button type="button" className="primary" onClick={batDau}>📷 Quét mã vạch LSX</button><span>hoặc</span><input id="lsx-manual" value={ma} placeholder="Gõ mã LSX" onChange={(e) => { setMa(e.target.value); onMa(e.target.value); }} />{dangQuet && <video ref={videoRef} className="dn-video" muted playsInline />}</div>;
}

function TaoDeNghi({ dongLai, moSauTao, initial = null }) {
  const [loai, setLoai] = React.useState(initial?.de_nghi.loai || "MUA_HANG");
  const [ghiChu, setGhiChu] = React.useState(initial?.de_nghi.ghi_chu || "");
  const [dong, setDong] = React.useState(initial ? initial.dong.map((d) => ({ ...dongMoi(String(d.ky_han_yc)), ...d, idTam: crypto.randomUUID(), id_vat_tu: d.id_vt_de_nghi, ten_hang: d.ten_hang_chup, dvt: d.dvt_chup, ketQua: [], canhBao: null })) : [dongMoi()]);
  const [loi, setLoi] = React.useState("");
  const [dangLuu, setDangLuu] = React.useState(false);
  const [thongTinLsx, setThongTinLsx] = React.useState(null);
  const fileRef = React.useRef();
  React.useEffect(() => { if (!initial) api("/api/v1/de-nghi/mac-dinh-tao").then((r) => setDong([dongMoi(r.data.ky_han_yc)])).catch(() => {}); }, [initial]);
  function capNhat(i, patch) { setDong((ds) => ds.map((d, j) => j === i ? { ...d, ...patch } : d)); }
  async function nhanLsx(ma) {
    setDong((ds) => ds.map((d) => ({ ...d, lenh_san_xuat: ma })));
    if (!ma) return setThongTinLsx(null);
    try { const r = await api(`/api/v1/de-nghi/quet-lsx?ma=${encodeURIComponent(ma)}`); setThongTinLsx(r.data); } catch (_) { setThongTinLsx(null); }
  }
  async function luu(gui) {
    setDangLuu(true); setLoi("");
    try {
      const payload = { loai, ghi_chu: ghiChu || null, dong: dong.map(({ idTam, ketQua, canhBao, ...d }) => ({ ...d, lenh_san_xuat: d.lenh_san_xuat || null })) };
      const r = initial
        ? await api(`/api/v1/de-nghi/${initial.de_nghi.id}`, { method: "PUT", body: { ...payload, phien_ban: initial.de_nghi.phien_ban } })
        : await api("/api/v1/de-nghi", { method: "POST", body: payload, headers: { "X-Idempotency-Key": crypto.randomUUID() } });
      const ma = r.data.id;
      if (fileRef.current?.files?.[0]) await apiUpload(`/api/v1/de-nghi/${ma}/dinh-kem`, fileRef.current.files[0]);
      if (gui) { const kq = await api(`/api/v1/de-nghi/${ma}/gui`, { method: "POST", body: { phien_ban: r.data.phien_ban } }); if (kq.data.canh_bao?.length) alert(kq.data.canh_bao.join("\n")); }
      moSauTao(ma);
    } catch (e) { setLoi(e.message); } finally { setDangLuu(false); }
  }
  return <section className="panel dn-editor">
    <div className="panel-head"><div><p className="eyebrow">F01</p><h2>{initial ? `Sửa ${initial.de_nghi.id}` : "Tạo đề nghị"}</h2></div><button onClick={dongLai}>Đóng</button></div>
    <div className="dn-kind"><button className={loai === "MUA_HANG" ? "active" : ""} onClick={() => setLoai("MUA_HANG")}>Mua hàng</button><button className={loai === "GIA_CONG_NGOAI" ? "active" : ""} onClick={() => setLoai("GIA_CONG_NGOAI")}>Gia công ngoài</button></div>
    <QuetLsx onMa={nhanLsx} />{thongTinLsx && <Bao loai="ok">{thongTinLsx.lenh_san_xuat} · Mã hàng {thongTinLsx.ma_hang || "—"} · Ưu tiên {thongTinLsx.muc_do_uu_tien || "—"}</Bao>}
    {dong.map((d, i) => <DongNhap key={d.idTam} dong={d} index={i} loai={loai} capNhat={(p) => capNhat(i, p)} xoa={() => setDong((ds) => ds.length === 1 ? ds : ds.filter((_, j) => j !== i))} />)}
    <button className="dn-add" onClick={() => setDong((ds) => [...ds, dongMoi(ds[0]?.ky_han_yc)])}>+ Thêm dòng</button>
    <label>Ghi chú / lý do nếu không có LSX<textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>
    <label>Ảnh / bản vẽ<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>
    <Bao>{loi}</Bao>
    <div className="dn-sticky"><button disabled={dangLuu} onClick={() => luu(false)}>Lưu nháp</button><button className="primary" disabled={dangLuu} onClick={() => luu(true)}>{dangLuu ? "Đang gửi…" : "Gửi duyệt"}</button></div>
  </section>;
}

function ChiTiet({ id, hoSo, dongLai, taiLai, onSua }) {
  const [data, setData] = React.useState(null); const [loi, setLoi] = React.useState(""); const [noiDung, setNoiDung] = React.useState("");
  React.useEffect(() => { api(`/api/v1/de-nghi/${id}`).then((r) => setData(r.data)).catch((e) => setLoi(e.message)); }, [id]);
  async function thaoTac(action, extra = {}) {
    try { const r = await api(`/api/v1/de-nghi/${id}/${action}`, { method: "POST", body: { phien_ban: data.de_nghi.phien_ban, ...extra } }); setData((x) => ({ ...x, de_nghi: r.data })); taiLai(); } catch (e) { setLoi(e.message); }
  }
  async function inPdf() { const blob = await apiBlob(`/api/v1/de-nghi/${id}/in`); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${id}.pdf`; a.click(); URL.revokeObjectURL(a.href); }
  async function taiTep(t) { const blob = await apiBlob(t.url_tai); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = t.ten_tep; a.click(); URL.revokeObjectURL(a.href); }
  async function guiTraoDoi() { try { await api(`/api/v1/de-nghi/${id}/trao-doi`, { method: "POST", body: { noi_dung: noiDung } }); setNoiDung(""); const r = await api(`/api/v1/de-nghi/${id}`); setData(r.data); } catch (e) { setLoi(e.message); } }
  if (loi && !data) return <section className="panel"><Bao>{loi}</Bao><button onClick={dongLai}>Quay lại</button></section>;
  if (!data) return <section className="panel"><div className="loading">Đang tải chi tiết…</div></section>;
  const dn = data.de_nghi; const coDuyet = ["TBP_YEU_CAU", "BAN_LANH_DAO", "TBP_MUA_HANG", "QUAN_TRI_NGHIEP_VU"].includes(hoSo.vai_tro);
  return <section className="panel dn-detail">
    <div className="panel-head"><div><button className="back" onClick={dongLai}>← Danh sách</button><h2>{id}</h2></div><div><TrangThai value={dn.trang_thai} /> <button onClick={inPdf}>In PDF</button></div></div>
    <Bao>{loi}</Bao>{dn.can_bld_duyet && <Bao loai="canh-bao">Không có LSX: {dn.nguoi_duyet_bp ? "đang chờ Ban lãnh đạo duyệt" : "cần Trưởng bộ phận và Ban lãnh đạo duyệt"}.</Bao>}
    <div className="dn-summary"><div><span>Bộ phận</span><b>{dn.ten_bo_phan || dn.ma_bo_phan}</b></div><div><span>Người yêu cầu</span><b>{dn.ten_nguoi_yeu_cau || dn.nguoi_yeu_cau}</b></div><div><span>Ngày hiệu lực</span><b>{dn.ngay_hieu_luc}</b></div><div><span>Loại</span><b>{dn.loai}</b></div></div>
    <div className="table-wrap"><table><thead><tr><th>#</th><th>Tên hàng</th><th>ĐVT</th><th>SL</th><th>Kỳ hạn</th><th>Dự kiến</th><th>LSX</th></tr></thead><tbody>{data.dong.map((d) => <tr key={d.id}><td>{d.stt_dong}</td><td>{d.ten_hang_chup}{d.trang_thai_dong === "CHO_CAP_MA" && " ⚠ chưa có mã"}</td><td>{d.dvt_chup}</td><td>{d.so_luong}</td><td>{d.ky_han_yc}</td><td className={d.bat_kha_thi ? "danger" : ""}>{d.ngay_du_kien_ve}</td><td>{d.lenh_san_xuat || "—"}</td></tr>)}</tbody></table></div>
    <div className="dn-actions">{["NHAP", "TRA_LAI"].includes(dn.trang_thai) && <><button onClick={() => onSua(data)}>Sửa</button><button className="primary" onClick={() => thaoTac("gui")}>Gửi duyệt</button></>}{dn.trang_thai === "CHO_DUYET" && coDuyet && <><button className="primary" onClick={() => thaoTac("duyet")}>Duyệt</button><button onClick={() => { const ly = prompt("Lý do trả lại"); if (ly) thaoTac("tra-lai", { ly_do: ly }); }}>Trả lại</button></>} {dn.trang_thai !== "HUY" && <button onClick={() => { const ly = prompt("Lý do hủy"); if (ly) thaoTac("huy", { ly_do: ly }); }}>Hủy</button>}</div>
    <h3>Đính kèm</h3>{data.dinh_kem.length ? data.dinh_kem.map((t) => <div key={t.id}><button onClick={() => taiTep(t)}>↓ {t.ten_tep}</button></div>) : <div className="muted">Chưa có tệp.</div>}
    <h3>Trao đổi</h3><div className="dn-chat">{data.trao_doi.map((t) => <div key={t.id}><b>{t.ten_nguoi_gui || t.nguoi_gui}</b><p>{t.noi_dung}</p></div>)}</div><div className="dn-comment"><input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder="Nhập trao đổi…" /><button onClick={guiTraoDoi}>Gửi</button></div>
  </section>;
}

export default function DeNghi({ hoSo }) {
  const [data, setData] = React.useState(null); const [loi, setLoi] = React.useState(""); const [man, setMan] = React.useState("list"); const [id, setId] = React.useState(null); const [editData, setEditData] = React.useState(null);
  const [loc, setLoc] = React.useState({ tu_ngay: "", den_ngay: "", trang_thai: "", loai: "", tu_khoa: "", chi_tre_han: false, chi_bat_kha_thi: false, cua_toi: false });
  const taiLai = React.useCallback(async () => { setLoi(""); try { const q = new URLSearchParams(); Object.entries(loc).forEach(([k, v]) => { if (v && k !== "cua_toi") q.set(k, v); }); if (loc.cua_toi) q.set("nguoi_yeu_cau", hoSo.ma_nhan_vien); const r = await api(`/api/v1/de-nghi?${q}`); setData(r.data); } catch (e) { setLoi(e.message); } }, [loc, hoSo.ma_nhan_vien]);
  React.useEffect(() => { taiLai(); }, [taiLai]);
  const mo = (ma) => { setId(ma); setMan("detail"); };
  if (man === "create") return <TaoDeNghi dongLai={() => setMan("list")} moSauTao={mo} />;
  if (man === "edit") return <TaoDeNghi initial={editData} dongLai={() => setMan("detail")} moSauTao={mo} />;
  if (man === "detail") return <ChiTiet id={id} hoSo={hoSo} dongLai={() => setMan("list")} taiLai={taiLai} onSua={(x) => { setEditData(x); setMan("edit"); }} />;
  const tk = data?.thong_ke || {};
  return <section className="panel dn-page"><div className="panel-head"><div><p className="eyebrow">F01</p><h2>Đề nghị vật tư &amp; gia công ngoài</h2></div></div>
    <BoLoc loc={loc} setLoc={setLoc} taiLai={taiLai} taoMoi={() => setMan("create")} /><Bao>{loi}</Bao>
    <div className="dn-stats">{[["Tổng", tk.tong], ["Chờ duyệt", tk.cho_duyet], ["Trả lại", tk.tra_lai], ["Chờ cấp mã", tk.cho_cap_ma], ["Bất khả thi", tk.bat_kha_thi]].map(([n, v]) => <div key={n}><span>{n}</span><strong>{v || 0}</strong></div>)}</div>
    {!data ? <div className="loading">Đang tải đề nghị…</div> : <DanhSach data={data} moChiTiet={mo} />}
  </section>;
}
