import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavigationTab } from '../types';
import { HoSo, layHangDoiKyThuatDatNgoai, PhieuDatNgoai, layThongBaoTag, docThongBaoTag, docThongBaoKyThuat, ThongBaoTag } from '../api/client';
import { HoSoTuongTacPanel } from './HoSoTuongTacPanel';

interface TopbarProps {
  activeTab: NavigationTab;
  currentUser: HoSo;
  onToggleMobileMenu: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onOpenRecord: (bang: string, id: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  currentUser,
  onToggleMobileMenu,
  onNavigate,
  onOpenRecord,
}) => {
  const [technicalQueue, setTechnicalQueue] = useState<PhieuDatNgoai[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tagNotifications, setTagNotifications] = useState<ThongBaoTag[]>([]);
  const [openedMessage, setOpenedMessage] = useState<ThongBaoTag | null>(null);
  const [notificationError, setNotificationError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => void layThongBaoTag().then((rows) => { if (active) { setTagNotifications(rows); setNotificationError(''); } })
      .catch(() => { if (active) setNotificationError('Không tải được thông báo trao đổi.'); });
    load();
    const timer = globalThis.setInterval(load, 15_000);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [currentUser.ma_tai_khoan]);
  const notificationCount = technicalQueue.filter((item) => !item.thong_bao_da_doc).length + tagNotifications.filter((item) => !item.da_doc).length;
  const [markingRead, setMarkingRead] = useState(false);
  async function markTagRead(item: ThongBaoTag) {
    if (item.da_doc) return;
    await docThongBaoTag(item.id);
    setTagNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, da_doc: true } : row));
  }
  async function markTechnicalRead(item: PhieuDatNgoai) {
    if (item.thong_bao_da_doc) return;
    await docThongBaoKyThuat(item.id, item.dau_yeu_cau || '');
    setTechnicalQueue((rows) => rows.map((row) => row.id === item.id && row.dau_yeu_cau === item.dau_yeu_cau ? { ...row, thong_bao_da_doc: true } : row));
  }
  async function markRead(action: () => Promise<unknown>) {
    setMarkingRead(true); setNotificationError('');
    try { await action(); }
    catch { setNotificationError('Không đánh dấu được thông báo đã đọc. Hãy thử lại.'); }
    finally { setMarkingRead(false); }
  }
  async function openTagNotification(item: ThongBaoTag) {
    setOpenedMessage(item); setShowNotifications(false);
    try {
      await markTagRead(item);
    } catch { setNotificationError('Không đánh dấu được thông báo đã đọc.'); }
  }
  const hasTechnicalPermission = (currentUser.quyen?.xac_nhan_kt as { xem?: boolean } | undefined)?.xem === true;
  useEffect(() => {
    let active = true;
    setTechnicalQueue([]);
    if (!hasTechnicalPermission) return;
    const load = () => void layHangDoiKyThuatDatNgoai().then((rows) => { if (active) setTechnicalQueue(rows); }).catch(() => { if (active) setTechnicalQueue([]); });
    load();
    const timer = globalThis.setInterval(load, 30_000);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [hasTechnicalPermission, currentUser.ma_tai_khoan]);
  const avatar = (currentUser.ho_va_ten || currentUser.ma_tai_khoan)
    .split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { main: 'HỆ THỐNG MUA HÀNG', sub: 'Tổng quan Mua hàng' };
      case 'requests':
        return { main: 'ĐỀ NGHỊ VẬT TƯ', sub: 'Danh sách phiếu Đề Nghị Vật Tư' };
      case 'create-request':
        return { main: 'ĐỀ NGHỊ VẬT TƯ', sub: 'Tạo phiếu Đề nghị Vật tư mới' };
      case 'request-detail':
        return { main: 'Chi tiết Đề nghị Vật tư', sub: 'DN-2026-000123' };
      case 'quotes':
        return { main: 'Báo giá & So sánh NCC', sub: 'Báo giá & So sánh NCC' };
      case 'orders':
        return { main: 'GIAO NHẬN', sub: 'Kho nhận hàng và kiểm tra IQC' };
      case 'my-tasks':
        return { main: 'Việc của tôi', sub: 'HÀNG ĐỢI PHÊ DUYỆT' };
      case 'company-data':
        return { main: 'QUẢN TRỊ', sub: 'Dữ liệu gốc' };
      case 'suppliers':
        return { main: 'QUẢN TRỊ', sub: 'Nhà cung cấp' };
      case 'utilities':
        return { main: 'QUẢN TRỊ', sub: 'Tiện ích' };
      case 'reports':
        return { main: 'ĐIỀU HÀNH', sub: 'Báo cáo' };
      case 'production-orders':
        return { main: 'SẢN XUẤT', sub: 'Lệnh sản xuất' };
      case 'purchase-orders':
        return { main: 'MUA HÀNG', sub: 'Đơn hàng' };
      case 'payments':
        return { main: 'MUA HÀNG', sub: 'Thanh toán' };
      case 'outsource':
        return { main: 'KINH DOANH', sub: 'Đặt ngoài' };
      default:
        return { main: 'Hệ Thống Mua Hàng', sub: 'Quản lý Sản xuất' };
    }
  };

  const title = getPageTitle();
  const subTitle = title.sub.charAt(0).toUpperCase() + title.sub.slice(1).toLocaleLowerCase('vi');

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[250px] h-[58px] z-30 bg-white border-b border-[#DCE1EC] flex items-center justify-between px-3 md:px-6 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Trigger */}
        <button
          aria-label="Mở menu"
          onClick={onToggleMobileMenu}
          className="p-1.5 text-[#0E1220] hover:bg-[#F4F6FA] rounded lg:hidden focus:outline-none"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Dynamic Titles */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-[15px] sm:text-[17px] font-bold text-[#0E1220] tracking-tight truncate uppercase">
            {title.main}
          </span>
          <span className="text-[#8A93AA] hidden sm:inline">/</span>
          <span className="hidden sm:inline-block font-condensed font-bold text-[12px] text-[#283A97] bg-[#EEF0F9] px-2 py-0.5 border border-[#C6CCE9] rounded truncate">
            {subTitle}
          </span>
        </div>
      </div>

      {/* Actions & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Live Sync Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF0F9] border border-[#C6CCE9] rounded text-[11px] text-[#283A97] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#283A97] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#283A97]"></span>
          </span>
          <span className="hidden md:inline font-bold">ĐỒNG BỘ: TRỰC TIẾP</span>
        </div>

        {/* Notifications */}
        <div className="relative">
        <button
          aria-label="Thông báo"
          onClick={() => setShowNotifications((open) => !open)}
          className="relative p-1.5 text-[#59627A] hover:bg-[#EEF0F9] hover:text-[#283A97] rounded-lg transition-colors"
          title="Thông báo hệ thống"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {notificationCount > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-[#EE202E] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">{notificationCount}</span>}
        </button>
        {showNotifications && <div className="absolute right-0 top-11 z-50 w-[min(90vw,360px)] bg-white border border-[#DCE1EC] rounded shadow-xl">
          <div className="p-3 border-b flex items-center justify-between gap-2 text-[12px]"><strong>THÔNG BÁO · {notificationCount} CHƯA ĐỌC</strong><button type="button" disabled={markingRead || notificationCount === 0} onClick={() => void markRead(async () => { await Promise.all([...tagNotifications.filter((item) => !item.da_doc).map(markTagRead), ...technicalQueue.filter((item) => !item.thong_bao_da_doc).map(markTechnicalRead)]); })} className="text-[#283A97] disabled:opacity-40">Đọc tất cả</button></div>
          {notificationError && <p role="alert" className="p-3 text-xs text-orange-700">{notificationError}</p>}
          {tagNotifications.length > 0 && <div className="max-h-64 overflow-y-auto">{tagNotifications.map((item) => <div key={item.id} className={`border-b p-3 ${item.da_doc ? '' : 'bg-[#EEF0F9]'}`}><button type="button" onClick={() => void openTagNotification(item)} className="w-full text-left"><strong className="block text-xs text-[#283A97]">{item.tieu_de}</strong><span className="mt-1 block text-xs text-[#59627A]">{item.noi_dung}</span><time className="mt-1 block text-[10px] text-[#59627A]">{new Date(item.thoi_diem).toLocaleString('vi-VN')}</time></button>{item.da_doc ? <span className="text-[11px] text-[#59627A]">Đã đọc</span> : <button type="button" disabled={markingRead} onClick={() => void markRead(() => markTagRead(item))} className="mt-2 text-[11px] text-[#283A97]">Đánh dấu đã đọc</button>}</div>)}</div>}
          {technicalQueue.length === 0 ? (tagNotifications.length === 0 && <p className="p-4 text-[12px] text-[#59627A]">Chưa có thông báo.</p>) : <div className="max-h-64 overflow-y-auto">{technicalQueue.map((item) => <div key={item.id} className={`border-b p-3 ${item.thong_bao_da_doc ? '' : 'bg-[#EEF0F9]'}`}><button type="button" onClick={() => { void markRead(() => markTechnicalRead(item)); setShowNotifications(false); onNavigate('my-tasks'); }} className="w-full text-left"><strong className="block font-mono text-[#283A97]">{item.id} · LSX {item.lenh_san_xuat}</strong><span className="block mt-1 text-[11px] text-[#59627A]">{item.noi_dung_ky_thuat || 'Chờ xác nhận kỹ thuật'} · {item.dong.length} mã hàng</span></button>{item.thong_bao_da_doc ? <span className="text-[11px] text-[#59627A]">Đã đọc</span> : <button type="button" disabled={markingRead} onClick={() => void markRead(() => markTechnicalRead(item))} className="mt-2 text-[11px] text-[#283A97]">Đánh dấu đã đọc</button>}</div>)}</div>}
          {technicalQueue.length > 0 && <button type="button" onClick={() => { setShowNotifications(false); onNavigate('my-tasks'); }} className="w-full p-3 text-center text-[12px] font-bold text-[#283A97]">MỞ VIỆC CỦA TÔI</button>}
        </div>}
        </div>

        <div className="h-6 w-[1px] bg-[#DCE1EC] hidden sm:block"></div>

        {/* Authenticated user */}
        <div
          className="flex items-center gap-2 p-1"
          title={`${currentUser.ma_tai_khoan} · ${currentUser.ma_bo_phan}`}
        >
            <div className="w-8 h-8 rounded-full bg-[#EEF0F9] text-[#283A97] border border-[#C6CCE9] flex items-center justify-center font-bold text-[12px] font-condensed">
              {avatar}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[13px] font-bold text-[#0E1220] leading-none">
                {currentUser.ho_va_ten || currentUser.ma_tai_khoan}
              </div>
              <div className="text-[11px] text-[#59627A] leading-tight mt-0.5">
                {currentUser.vai_tro || currentUser.ma_bo_phan}
        </div>
        </div>

        {openedMessage && createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tag-chat-title">
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded bg-white shadow-xl">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#DCE1EC] p-4">
                <h2 id="tag-chat-title" className="min-w-0 break-words font-bold">TRAO ĐỔI · {openedMessage.id_ban_ghi}</h2>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => { onOpenRecord(openedMessage.bang, openedMessage.id_ban_ghi); setOpenedMessage(null); }} className="min-h-10 rounded bg-[#283A97] px-3 text-sm font-bold text-white">CHUYỂN TỚI PHIẾU</button>
                  <button type="button" onClick={() => setOpenedMessage(null)} className="min-h-10 shrink-0 rounded border px-3">ĐÓNG</button>
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
                <HoSoTuongTacPanel key={`${openedMessage.bang}-${openedMessage.id_ban_ghi}`} loai={openedMessage.bang === 'DAT_NGOAI' ? 'dat-ngoai' : 'ncc'} id={openedMessage.id_ban_ghi} canEdit={(currentUser.quyen?.[openedMessage.bang === 'DAT_NGOAI' ? 'dat_ngoai' : 'ncc'] as { sua?: boolean } | undefined)?.sua === true || currentUser.vai_tro === 'ADMIN'} />
              </div>
            </div>
          </div>, document.body,
        )}
        </div>
      </div>
    </header>
  );
};
