import { useState, useEffect } from 'react';
import { NavigationTab, MaterialRequest } from './types';
import { INITIAL_REQUESTS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/Toast';
import { dangXuat, HoSo, layHoSo, layToken, PHIEN_HET_HAN_EVENT } from './api/client';

// Views
import { DashboardView } from './views/DashboardView';
import { RequestListView } from './views/RequestListView';
import { CreateRequestView } from './views/CreateRequestView';
import { RequestDetailView } from './views/RequestDetailView';
import { QuoteComparisonView } from './views/QuoteComparisonView';
import { MyTasksView } from './views/MyTasksView';
import { IqcReceiptView } from './views/IqcReceiptView';
import { LoginView } from './views/LoginView';
import { CatalogView } from './views/CatalogView';
import { ComingSoonView } from './views/ComingSoonView';
import { OutsourceView } from './views/OutsourceView';
import { SupplierManagementView } from './views/SupplierManagementView';
import { ReportsView } from './views/ReportsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [requests, setRequests] = useState<MaterialRequest[]>(INITIAL_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest>(INITIAL_REQUESTS[0]);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(4);
  const [currentUser, setCurrentUser] = useState<HoSo | null>(null);
  const [dangKiemTraPhien, setDangKiemTraPhien] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!layToken()) {
      setDangKiemTraPhien(false);
      return;
    }
    layHoSo()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setDangKiemTraPhien(false));
  }, []);

  useEffect(() => {
    const handleExpiredSession = (event: Event) => {
      setCurrentUser(null);
      setActiveTab('dashboard');
      const message = (event as CustomEvent<string>).detail;
      setToastMessage(message || 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.');
    };
    globalThis.addEventListener(PHIEN_HET_HAN_EVENT, handleExpiredSession);
    return () => globalThis.removeEventListener(PHIEN_HET_HAN_EVENT, handleExpiredSession);
  }, []);

  async function handleLogout() {
    await dangXuat();
    setCurrentUser(null);
    setActiveTab('dashboard');
  }

  useEffect(() => {
    if (!currentUser || currentUser.vai_tro.trim().toUpperCase() === 'ADMIN') return;
    const pageForTab: Partial<Record<NavigationTab, string>> = {
      dashboard: 'home', reports: 'bao_cao', 'production-orders': 'de_nghi',
      requests: 'de_nghi', 'create-request': 'de_nghi', 'request-detail': 'de_nghi',
      quotes: 'bao_gia', 'purchase-orders': 'don_hang', orders: 'giao_nhan',
      payments: 'thanh_toan', 'my-tasks': 'cong_viec', suppliers: 'ncc',
      utilities: 'tien_ich', outsource: 'dat_ngoai',
    };
    const access = (page: string) =>
      (currentUser.quyen?.[page] as { xem?: boolean } | undefined)?.xem === true;
    const activePage = pageForTab[activeTab];
    const activeAllowed = activeTab === 'company-data'
      ? access('danh_muc') || access('quan_tri')
      : !!activePage && access(activePage);
    if (activeAllowed) return;
    const nextTab: NavigationTab | undefined = [
      ['outsource', 'dat_ngoai'], ['requests', 'de_nghi'], ['quotes', 'bao_gia'],
      ['orders', 'giao_nhan'], ['dashboard', 'home'], ['my-tasks', 'cong_viec'],
      ['reports', 'bao_cao'], ['purchase-orders', 'don_hang'], ['payments', 'thanh_toan'],
      ['suppliers', 'ncc'], ['utilities', 'tien_ich'], ['company-data', 'danh_muc'],
    ].find(([, page]) => access(page))?.[0] as NavigationTab | undefined;
    if (nextTab) setActiveTab(nextTab);
  }, [currentUser, activeTab]);

  const handleCreateNewRequest = (newReq: MaterialRequest) => {
    setRequests((prev) => [newReq, ...prev]);
    setSelectedRequest(newReq);
  };

  const handleApproveRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'DA_XONG',
              statusText: 'Đã duyệt (Chờ mua hàng)'
            }
          : r
      )
    );
    setPendingTasksCount((prev) => Math.max(0, prev - 1));
  };

  if (/^\/dieu-xe(?:\/|$)/i.test(globalThis.location.pathname)) {
    return <main className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4"><section className="bg-white border border-[#DCE1EC] rounded p-6 max-w-lg"><h1 className="text-[20px] font-bold text-[#283A97]">Điều xe đã chuyển sang Hệ thống Kho vận</h1><p className="mt-3 text-[14px]">Các chuyến xe cũ vẫn được lưu để đối chiếu. Hãy mở Hệ thống Kho vận để thực hiện yêu cầu điều xe mới.</p><a href="/" className="inline-flex min-h-11 items-center mt-5 px-5 bg-[#283A97] text-white rounded font-bold">VỀ MUA HÀNG</a></section></main>;
  }

  if (dangKiemTraPhien) {
    return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-[#59627A]"><div className="flex items-center gap-3"><span className="w-5 h-5 border-2 border-[#C6CCE9] border-t-[#283A97] rounded-full animate-spin" /><span>Đang kiểm tra phiên đăng nhập…</span></div></div>;
  }

  if (!currentUser) {
    return <LoginView onAuthenticated={setCurrentUser} />;
  }

  const isAdmin = currentUser.vai_tro.trim().toUpperCase() === 'ADMIN';
  const canView = (page: string) => {
    if (isAdmin) return true;
    const permission = currentUser.quyen?.[page] as { xem?: boolean } | undefined;
    return permission?.xem === true;
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0E1220]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pendingTasksCount={pendingTasksCount}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        canManageCompanyData={isAdmin || canView('danh_muc') || canView('quan_tri')}
        visiblePages={{
          dashboard: canView('home'),
          reports: canView('bao_cao'),
          productionOrders: isAdmin || canView('de_nghi'),
          requests: canView('de_nghi'),
          quotes: canView('bao_gia'),
          orders: canView('don_hang'),
          deliveries: canView('giao_nhan'),
          payments: canView('thanh_toan'),
          tasks: canView('cong_viec'),
          suppliers: canView('ncc'),
          utilities: canView('tien_ich'),
          outsource: canView('dat_ngoai'),
        }}
      />

      {/* Topbar Navigation */}
      <Topbar
        activeTab={activeTab}
        currentUser={currentUser}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigate={(tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      {/* Main Content Area */}
      <main className="lg:pl-[250px] pt-[58px] min-h-screen flex flex-col">
        {/* View container */}
        <div className="p-3 sm:p-6 flex-1 max-w-[1550px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              requests={requests}
              currentUser={currentUser}
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              pendingTasksCount={pendingTasksCount}
              onDeleteRequests={(ids) => setRequests((current) => current.filter((request) => !ids.has(request.id)))}
            />
          )}

          {activeTab === 'quotes' && (
            <QuoteComparisonView onNotify={showNotification} />
          )}

          {activeTab === 'my-tasks' && (
            <MyTasksView
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNotify={showNotification}
              onTasksCountChange={setPendingTasksCount}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'orders' && (
            <IqcReceiptView onNotify={showNotification} />
          )}

          {activeTab === 'requests' && (
            <RequestListView
              requests={requests}
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectRequest={(req) => setSelectedRequest(req)}
              onNotify={showNotification}
              onDeleteRequests={(ids) => {
                setRequests((current) => current.filter((request) => !ids.has(request.id)));
                if (ids.has(selectedRequest.id)) {
                  const replacement = requests.find((request) => !ids.has(request.id));
                  if (replacement) setSelectedRequest(replacement);
                }
              }}
            />
          )}

          {activeTab === 'create-request' && (
            <CreateRequestView
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSubmitNewRequest={handleCreateNewRequest}
              onNotify={showNotification}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'request-detail' && (
            <RequestDetailView
              request={selectedRequest}
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onApproveRequest={handleApproveRequest}
              onNotify={showNotification}
              onUpdateRequest={(updated) => {
                setSelectedRequest(updated);
                setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
              }}
            />
          )}

          {activeTab === 'company-data' && <CatalogView currentUser={currentUser} onNotify={showNotification} />}

          {activeTab === 'suppliers' && <SupplierManagementView onNotify={showNotification} canEdit={isAdmin || ['TBP_MUA_HANG', 'NV_MUA_HANG'].includes(currentUser.vai_tro)} canApprove={isAdmin || currentUser.vai_tro === 'TBP_MUA_HANG'} canPropose={currentUser.vai_tro !== 'CHI_XEM'} />}
          {activeTab === 'utilities' && <ComingSoonView title="TIỆN ÍCH" description="Các tiện ích quản trị hệ thống đang được chuẩn bị." />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'purchase-orders' && <ComingSoonView title="ĐƠN HÀNG" description="Chức năng quản lý đơn đặt hàng đang được triển khai." />}
          {activeTab === 'payments' && <ComingSoonView title="THANH TOÁN" description="Chức năng theo dõi yêu cầu thanh toán đang được triển khai." />}
          {activeTab === 'outsource' && <OutsourceView onNotify={showNotification} currentUser={currentUser} />}
        </div>
      </main>

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
