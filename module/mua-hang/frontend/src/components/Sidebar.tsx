import React from 'react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingTasksCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  canManageCompanyData: boolean;
  visiblePages: Record<string, boolean>;
}

interface MenuItem {
  tab: NavigationTab;
  label: string;
  icon: string;
  visible: boolean;
  badge?: number;
  activeTabs?: NavigationTab[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, onSelectTab, pendingTasksCount, isOpenMobile,
  onCloseMobile, onLogout, canManageCompanyData, visiblePages
}) => {
  const groups: Array<{ label: string; items: MenuItem[] }> = [
    {
      label: 'QUẢN TRỊ',
      items: [
        { tab: 'company-data', label: 'Dữ liệu gốc', icon: 'database', visible: canManageCompanyData },
        { tab: 'suppliers', label: 'Nhà cung cấp', icon: 'storefront', visible: visiblePages.suppliers },
        { tab: 'utilities', label: 'Tiện ích', icon: 'tune', visible: visiblePages.utilities },
      ],
    },
    {
      label: 'ĐIỀU HÀNH',
      items: [
        { tab: 'dashboard', label: 'Tổng quan', icon: 'home', visible: visiblePages.dashboard },
        { tab: 'my-tasks', label: 'Giao việc', icon: 'checklist', visible: visiblePages.tasks, badge: pendingTasksCount },
        { tab: 'reports', label: 'Báo cáo', icon: 'pie_chart', visible: visiblePages.reports },
      ],
    },
    {
      label: 'MUA HÀNG',
      items: [
        { tab: 'requests', label: 'Đề nghị mua hàng', icon: 'assignment_add', visible: visiblePages.requests, activeTabs: ['requests', 'create-request', 'request-detail'] },
        { tab: 'quotes', label: 'Báo giá', icon: 'sell', visible: visiblePages.quotes },
        { tab: 'purchase-orders', label: 'Đơn hàng', icon: 'shopping_cart', visible: visiblePages.orders },
        { tab: 'orders', label: 'Giao nhận', icon: 'inventory_2', visible: visiblePages.deliveries },
        { tab: 'payments', label: 'Thanh toán', icon: 'credit_card', visible: visiblePages.payments },
      ],
    },
    {
      label: 'GIA CÔNG NGOÀI',
      items: [
        { tab: 'outsource', label: 'Đặt ngoài', icon: 'logout', visible: visiblePages.outsource },
      ],
    },
  ];

  return <>
    {isOpenMobile && <div className="fixed inset-0 bg-black/45 z-40 lg:hidden" onClick={onCloseMobile} />}
    <aside id="side-navigation" className={`fixed top-0 left-0 h-screen w-[250px] z-50 bg-[#283A97] text-white border-r border-[#4A5CB8] shadow-sm flex flex-col transition-transform duration-200 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <header className="shrink-0 min-h-[72px] px-5 border-b border-[#4A5CB8] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 border border-white/60 text-white flex items-center justify-center rotate-45 shrink-0"><span className="material-symbols-outlined text-[21px] -rotate-45">factory</span></div>
          <div className="min-w-0"><div className="text-[15px] font-bold leading-tight">Mua hàng</div><div className="font-condensed text-[11px] font-bold tracking-[0.2em] text-[#C6CCE9] whitespace-nowrap">&amp; GIA CÔNG NGOÀI</div></div>
        </div>
        <button aria-label="Đóng menu" onClick={onCloseMobile} className="lg:hidden min-w-11 min-h-11 flex items-center justify-center text-white"><span className="material-symbols-outlined">close</span></button>
      </header>

      <nav className="flex-1 min-h-0 overflow-y-auto py-3">
        {groups.map((group) => {
          const items = group.items.filter((item) => item.visible);
          if (!items.length) return null;
          return <section key={group.label} className="mb-3">
            <h2 className="px-5 py-2 font-condensed text-[11px] font-bold tracking-[0.18em] text-[#C6CCE9]">{group.label}</h2>
            {items.map((item) => {
              const selected = (item.activeTabs || [item.tab]).includes(activeTab);
              return <button key={item.tab} onClick={() => { onSelectTab(item.tab); onCloseMobile(); }} className={`w-full min-h-11 px-5 border-l-4 flex items-center gap-3 text-left font-condensed text-[15px] transition-colors ${selected ? 'bg-[#1E2C75] border-[#EE202E] text-white font-bold' : 'border-transparent text-[#EEF0F9] hover:bg-[#1E2C75]/60'}`}>
                <span className="material-symbols-outlined text-[20px] text-[#C6CCE9]">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <span className="min-w-5 h-5 px-1 rounded-full bg-[#EE202E] text-white text-[11px] font-mono font-bold flex items-center justify-center">{item.badge}</span>}
              </button>;
            })}
          </section>;
        })}
      </nav>

      <footer className="shrink-0 p-4 border-t border-[#4A5CB8]">
        <div className="mb-2 px-1 flex items-center justify-between font-mono text-[11px] text-[#C6CCE9]"><span>Phiên bản v1.0</span><span className="w-2 h-2 rounded-full bg-white ring-2 ring-[#4A5CB8]" /></div>
        <button onClick={onLogout} className="w-full min-h-11 px-3 flex items-center gap-2 font-condensed text-[12px] font-bold uppercase text-white border border-white/25 hover:bg-[#1E2C75] rounded"><span className="material-symbols-outlined text-[18px]">logout</span><span>Đăng xuất</span></button>
      </footer>
    </aside>
  </>;
};
