import { FormEvent, KeyboardEvent, useState } from 'react';
import { ApiError, dangKyTaiKhoan, dangNhap, HoSo, timNhanVienDangKy } from '../api/client';

interface LoginViewProps {
  onAuthenticated: (hoSo: HoSo) => void;
}

export function LoginView({ onAuthenticated }: LoginViewProps) {
  const [maTaiKhoan, setMaTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState('');
  const [moDangKy, setMoDangKy] = useState(false);
  const [thongBaoDangKy, setThongBaoDangKy] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setDangGui(true);
    setLoi('');
    try {
      const hoSo = await dangNhap(maTaiKhoan.trim(), matKhau);
      onAuthenticated(hoSo);
    } catch (error) {
      setLoi(error instanceof ApiError ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setDangGui(false);
    }
  }

  function theoDoiCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'));
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0E1220] flex flex-col justify-between">
      <main className="flex-grow flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="w-full max-w-[1100px] bg-white border border-[#DCE1EC] shadow-sm rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          <section className="lg:col-span-5 bg-[#EEF0F9]/60 border-b lg:border-b-0 lg:border-r border-[#DCE1EC] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#283A97] flex items-center justify-center rounded text-white shadow-sm">
                  <span className="material-symbols-outlined">precision_manufacturing</span>
                </div>
                <div>
                  <span className="font-condensed text-[11px] font-bold text-[#59627A] block uppercase tracking-wider">Công ty Huỳnh Đức</span>
                  <span className="text-[15px] font-bold text-[#092081] block leading-tight">HỆ THỐNG QUẢN TRỊ NỘI BỘ</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="font-condensed text-[12px] font-bold text-[#283A97] px-2 py-0.5 bg-[#EEF0F9] border border-[#C6CCE9] inline-block rounded tracking-wider">CỔNG ĐĂNG NHẬP TẬP TRUNG</span>
                <h1 className="text-[23px] leading-8 text-[#0E1220] font-bold">HỆ THỐNG MUA HÀNG &amp; QUẢN LÝ SẢN XUẤT</h1>
                <p className="text-[14px] leading-5 text-[#59627A]">Một tài khoản để truy cập các phân hệ nghiệp vụ được cấp quyền trong toàn công ty.</p>
              </div>
              <div className="rounded border border-[#DCE1EC] overflow-hidden relative shadow-sm h-48 sm:h-52 bg-[#F4F6FA] flex items-center justify-center">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#C6CCE9 1px, transparent 1px), linear-gradient(90deg, #C6CCE9 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <span className="material-symbols-outlined text-[#283A97] text-[92px] relative">factory</span>
                <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-1 rounded border border-[#DCE1EC] flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#283A97] animate-pulse" />
                  <span className="font-mono text-[11px] font-bold text-[#59627A]">CỔNG XÁC THỰC - ONLINE</span>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-[#EDF0F6] mt-6 lg:mt-0 grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-white rounded border border-[#DCE1EC]"><span className="font-condensed text-[11px] font-bold text-[#59627A] block">BẢO MẬT PHIÊN</span><span className="font-condensed text-[12px] font-bold text-[#283A97] flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined text-[16px]">verified_user</span>X-PHIEN</span></div>
              <div className="p-2.5 bg-white rounded border border-[#DCE1EC]"><span className="font-condensed text-[11px] font-bold text-[#59627A] block">TRẠNG THÁI API</span><span className="font-mono text-[13px] text-[#0E1220] font-semibold mt-0.5 block">PORT 8010</span></div>
            </div>
          </section>

          <section className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-white">
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3"><h2 className="text-[18px] leading-6 font-bold">Đăng Nhập Tài Khoản</h2><span className="font-condensed text-[11px] font-bold text-[#59627A] bg-[#F4F6FA] px-2.5 py-1 rounded border border-[#DCE1EC] flex items-center gap-1"><span className="material-symbols-outlined text-[#092081] text-[14px]">terminal</span>NỘI BỘ</span></div>
                <p className="text-[13px] leading-[18px] text-[#59627A] mt-1">Nhập tên tài khoản hoặc mã nhân viên đã được Quản trị phê duyệt.</p>
              </div>

              {(loi || capsLock) && <div role="alert" className="mb-6 p-3 bg-[#FDECEE] border-l-4 border-[#C4141F] border-y border-r border-[#DCE1EC] rounded flex items-start gap-3"><span className="material-symbols-outlined text-[#C4141F] mt-0.5">error</span><div><span className="font-condensed text-[12px] font-bold text-[#C4141F] block uppercase tracking-wide">{loi ? 'Lỗi xác thực người dùng' : 'Caps Lock đang bật'}</span><p className="text-[13px] text-[#0E1220] font-medium leading-snug">{loi || 'Hãy kiểm tra Caps Lock trước khi nhập mật khẩu.'}</p></div></div>}

              <form className="space-y-4" onSubmit={submit}>
                {thongBaoDangKy && <div role="status" className="p-3 bg-[#EAF7EF] border-l-4 border-[#18834B] text-sm text-[#17643D]">{thongBaoDangKy}</div>}
                <label className="block"><span className="block font-condensed text-[12px] font-bold text-[#59627A] mb-1 tracking-wide">TÊN ĐĂNG NHẬP / MÃ NHÂN VIÊN <b className="text-[#C4141F]">*</b></span><span className="relative block"><span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59627A] material-symbols-outlined text-[18px]">badge</span><input autoFocus autoComplete="username" className="w-full h-11 pl-10 pr-3 bg-white border border-[#DCE1EC] rounded text-[#0E1220] font-mono text-[13px] focus:outline-none focus:border-[#283A97] focus:ring-2 focus:ring-[#C6CCE9]" value={maTaiKhoan} onChange={(e) => setMaTaiKhoan(e.target.value)} placeholder="Tên tài khoản hoặc mã nhân viên" required /></span></label>
                <label className="block"><span className="block font-condensed text-[12px] font-bold text-[#59627A] mb-1 tracking-wide">MẬT KHẨU TRUY CẬP <b className="text-[#C4141F]">*</b></span><span className="relative block"><span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59627A] material-symbols-outlined text-[18px]">lock</span><input autoComplete="current-password" className="w-full h-11 pl-10 pr-11 bg-white border border-[#DCE1EC] rounded text-[#0E1220] focus:outline-none focus:border-[#283A97] focus:ring-2 focus:ring-[#C6CCE9]" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} onKeyUp={theoDoiCapsLock} onKeyDown={theoDoiCapsLock} placeholder="••••••••" required type={hienMatKhau ? 'text' : 'password'} /><button aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute inset-y-0 right-0 px-3 flex items-center text-[#59627A] hover:text-[#092081]" onClick={() => setHienMatKhau((v) => !v)} type="button"><span className="material-symbols-outlined text-[20px]">{hienMatKhau ? 'visibility_off' : 'visibility'}</span></button></span></label>
                <div className="flex items-center justify-between pt-1 gap-2 text-[13px]"><span className="flex items-center gap-2 text-[#59627A]"><span className="material-symbols-outlined text-[18px] text-[#283A97]">lock_clock</span>Phiên chỉ được lưu trong tab hiện tại</span><a className="text-[#092081] font-medium underline underline-offset-4 decoration-[#DCE1EC]" href="#ho-tro">Quên mật khẩu?</a></div>
                <div className="pt-3"><button className="w-full h-12 bg-[#283A97] hover:bg-[#1E2C75] disabled:bg-[#8A93AA] text-white rounded font-bold text-[16px] flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C6CCE9]" disabled={dangGui} type="submit"><span className="material-symbols-outlined">login</span><span>{dangGui ? 'ĐANG XÁC THỰC…' : 'ĐĂNG NHẬP HỆ THỐNG'}</span></button></div>
              </form>
              <div className="mt-4 text-center"><span className="text-sm text-[#59627A]">Chưa có tài khoản?</span>{' '}<button type="button" onClick={() => setMoDangKy(true)} className="text-sm font-bold text-[#283A97] underline underline-offset-4">Đăng ký ngay</button></div>
            </div>
            <div id="ho-tro" className="mt-8 pt-4 border-t border-[#EDF0F6] flex items-center gap-2 text-[#59627A] text-[13px]"><span className="material-symbols-outlined text-[18px]">support_agent</span><span>Quên mật khẩu hoặc tài khoản bị khóa: liên hệ Quản trị hệ thống.</span></div>
          </section>
        </div>
      </main>
      {moDangKy && <RegistrationDialog
        onClose={() => setMoDangKy(false)}
        onRegistered={(maTaiKhoan) => {
          setMaTaiKhoan(maTaiKhoan);
          setMatKhau('');
          setLoi('');
          setThongBaoDangKy('Đăng ký đã được gửi. Tài khoản đang chờ Quản trị viên duyệt; hãy đăng nhập bằng mật khẩu bạn vừa tạo sau khi được duyệt.');
          setMoDangKy(false);
        }}
      />}
      <footer className="bg-white border-t border-[#DCE1EC] px-4 py-3 sm:px-8"><div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[#59627A]"><strong className="font-condensed tracking-wider text-[#0E1220]">HỆ THỐNG QUẢN TRỊ SẢN XUẤT NỘI BỘ</strong><span className="font-mono flex items-center gap-2"><i className="w-2 h-2 rounded-full bg-[#283A97]" />CỔNG XÁC THỰC SẴN SÀNG</span></div></footer>
    </div>
  );
}

function RegistrationDialog({ onClose, onRegistered }: {
  onClose: () => void;
  onRegistered: (maTaiKhoan: string) => void;
}) {
  const [hoVaTen, setHoVaTen] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [nhanVien, setNhanVien] = useState<{ ma_nhan_vien: string; ho_va_ten: string } | null>(null);
  const [loi, setLoi] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  async function kiemTra(event: FormEvent) {
    event.preventDefault();
    setDangXuLy(true); setLoi(''); setNhanVien(null);
    try {
      setNhanVien(await timNhanVienDangKy(hoVaTen.trim()));
    } catch (reason) {
      setLoi(reason instanceof ApiError ? reason.message : 'Không kiểm tra được họ tên. Vui lòng thử lại.');
    } finally { setDangXuLy(false); }
  }

  async function dangKy() {
    if (!nhanVien) return;
    if (matKhau.length < 8 || matKhau.length > 128) {
      setLoi('Mật khẩu phải có từ 8 đến 128 ký tự.');
      return;
    }
    if (matKhau !== xacNhanMatKhau) {
      setLoi('Mật khẩu xác nhận chưa trùng khớp.');
      return;
    }
    setDangXuLy(true); setLoi('');
    try {
      const result = await dangKyTaiKhoan(nhanVien.ho_va_ten, matKhau);
      onRegistered(result.ma_tai_khoan);
    } catch (reason) {
      setLoi(reason instanceof ApiError ? reason.message : 'Không gửi được đăng ký. Vui lòng thử lại.');
    } finally { setDangXuLy(false); }
  }

  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="registration-title" className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-[#DCE1EC] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-5"><div><h2 id="registration-title" className="text-xl font-bold">Đăng ký tài khoản</h2><p className="mt-1 text-sm text-[#59627A]">Nhập đúng họ và tên trong hồ sơ nhân viên. Mã nhân viên sẽ được tự động đối chiếu.</p></div><button type="button" disabled={dangXuLy} onClick={onClose} aria-label="Đóng" className="min-w-10 min-h-10 text-2xl">×</button></div>
      {loi && <div role="alert" className="mb-4 p-3 bg-[#FDECEE] border-l-4 border-[#C4141F] text-sm text-[#C4141F]">{loi}</div>}
      <form onSubmit={kiemTra} className="space-y-4">
        <label className="block text-xs font-bold">HỌ VÀ TÊN ĐÚNG THEO HỒ SƠ NHÂN VIÊN *<input autoFocus autoComplete="name" required minLength={3} maxLength={120} value={hoVaTen} onChange={(event) => { setHoVaTen(event.target.value); setNhanVien(null); }} className="mt-1 w-full h-11 px-3 border rounded font-normal text-sm" placeholder="Ví dụ: Nguyễn Văn An" /></label>
        <button type="submit" disabled={dangXuLy || hoVaTen.trim().length < 3} className="w-full h-11 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-50">{dangXuLy ? 'ĐANG ĐỐI CHIẾU…' : 'KIỂM TRA HỌ VÀ TÊN'}</button>
      </form>
      {nhanVien && <div className="mt-4 p-4 bg-[#EAF7EF] border border-[#A7D8B9] rounded text-sm"><p className="font-bold text-[#17643D]">Đã xác nhận hồ sơ nhân viên</p><p className="mt-2">Họ và tên: <strong>{nhanVien.ho_va_ten}</strong></p><p>Mã nhân viên: <strong className="font-mono">{nhanVien.ma_nhan_vien}</strong></p><label className="mt-4 block text-xs font-bold">MẬT KHẨU *<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={matKhau} onChange={(event) => setMatKhau(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal text-sm" /><span className="mt-1 block font-normal text-[#59627A]">Ít nhất 8 ký tự; đây sẽ là mật khẩu đăng nhập sau khi duyệt.</span></label><label className="mt-3 block text-xs font-bold">XÁC NHẬN MẬT KHẨU *<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={xacNhanMatKhau} onChange={(event) => setXacNhanMatKhau(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal text-sm" /></label><button type="button" onClick={() => void dangKy()} disabled={dangXuLy || matKhau.length < 8 || matKhau !== xacNhanMatKhau} className="mt-4 w-full h-11 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{dangXuLy ? 'ĐANG GỬI…' : 'GỬI ĐĂNG KÝ'}</button></div>}
      <button type="button" disabled={dangXuLy} onClick={onClose} className="mt-4 w-full h-10 text-sm text-[#59627A]">Quay lại đăng nhập</button>
    </section>
  </div>;
}
