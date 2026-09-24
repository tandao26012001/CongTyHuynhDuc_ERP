import React from 'react';
import { NavigationTab } from '../types';
import { HoSo } from '../api/client';

interface TopbarProps {
  activeTab: NavigationTab;
  currentUser: HoSo;
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  currentUser,
  onToggleMobileMenu
}) => {
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
        <button
          aria-label="Thông báo"
          onClick={() => alert('Thông báo mới: Có 1 đề nghị vật tư sắp đến hạn xử lý (<4h)!')}
          className="relative p-1.5 text-[#59627A] hover:bg-[#EEF0F9] hover:text-[#283A97] rounded-lg transition-colors"
          title="Thông báo hệ thống"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#EE202E] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
            3
          </span>
        </button>

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
        </div>
      </div>
    </header>
  );
};
