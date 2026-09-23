import { useState, useEffect } from 'react';
import { NavigationTab, MaterialRequest } from './types';
import { INITIAL_REQUESTS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/Toast';
import { dangXuat, HoSo, layHoSo, layToken } from './api/client';

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

  async function handleLogout() {
    await dangXuat();
    setCurrentUser(null);
    setActiveTab('dashboard');
  }

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
        canManageCompanyData={isAdmin || canView('danh_muc')}
        visiblePages={{
          dashboard: canView('home'),
          reports: canView('bao_cao'),
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

          {activeTab === 'company-data' && <CatalogView onNotify={showNotification} />}

          {activeTab === 'suppliers' && <ComingSoonView title="NHÀ CUNG CẤP" description="Màn hình quản lý nhà cung cấp sẽ được triển khai tại khu vực Quản trị." />}
          {activeTab === 'utilities' && <ComingSoonView title="TIỆN ÍCH" description="Các tiện ích quản trị hệ thống đang được chuẩn bị." />}
          {activeTab === 'reports' && <ComingSoonView title="BÁO CÁO" description="Báo cáo điều hành sẽ được tính trực tiếp từ dữ liệu giao dịch." />}
          {activeTab === 'purchase-orders' && <ComingSoonView title="ĐƠN HÀNG" description="Chức năng quản lý đơn đặt hàng đang được triển khai." />}
          {activeTab === 'payments' && <ComingSoonView title="THANH TOÁN" description="Chức năng theo dõi yêu cầu thanh toán đang được triển khai." />}
          {activeTab === 'outsource' && <ComingSoonView title="ĐẶT NGOÀI" description="Chức năng Gia công ngoài sẽ được triển khai theo quy trình riêng." />}
        </div>
      </main>

      {/* Global Toast Notification */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
