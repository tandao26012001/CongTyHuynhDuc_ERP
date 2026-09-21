import React from 'react';
import { HoSo } from '../api/client';
import { MaterialRequest, NavigationTab } from '../types';

interface DashboardViewProps {
  requests: MaterialRequest[];
  onNavigate: (tab: NavigationTab) => void;
  pendingTasksCount: number;
  currentUser: HoSo;
}

const modules: Array<{ title: string; sub: string; icon: string; badge: string; description: string; tags: string[]; action: string; tab: NavigationTab; critical?: boolean }> = [
  { title: 'MODULE 1: ĐỀ NGHỊ VẬT TƯ', sub: 'ĐNVT XƯỞNG & HẠN MỨC', icon: 'inventory_2', badge: '8 CHỜ GỬI', description: 'Tạo phiếu cấp tốc xưởng dưới 45 giây. Kiểm tra tồn kho an toàn, hạn mức ngân sách và phân định mức độ khẩn cấp.', tags: ['Tạo phiếu <45s', 'Hạn mức xưởng: 82%'], action: 'TẠO ĐNVT MỚI', tab: 'create-request' },
  { title: 'MODULE 2: BÁO GIÁ & CHỌN NCC', sub: 'RFQ & ĐÀM PHÁN ĐƠN GIÁ', icon: 'request_quote', badge: '6 RFQ ACTIVE', description: 'So sánh tự động 3 nhà cung cấp theo ma trận kỹ thuật CO/CQ, thời hạn thanh toán, chiết khấu và năng lực giao xưởng.', tags: ['So sánh 3 NCC', 'Thẩm định kỹ thuật'], action: 'SO SÁNH BÁO GIÁ', tab: 'quotes' },
  { title: 'MODULE 3: ĐƠN HÀNG (PO)', sub: 'TIẾN ĐỘ & CẢNH BÁO GIAO', icon: 'shopping_cart', badge: '47 TRỄ HẠN', description: 'Theo dõi vòng đời đơn hàng, tiến độ gia công tại nhà cung ứng ngoài. Kích hoạt còi báo động đỏ khi giao phôi chậm trễ.', tags: ['34 PO đang chạy', '14 Phôi chậm'], action: 'THEO DÕI TIẾN ĐỘ', tab: 'orders', critical: true },
  { title: 'MODULE 4: NHẬN HÀNG & IQC', sub: 'TIẾP NHẬN CỔNG & SCAN', icon: 'fact_check', badge: '4 XE TẠI CỔNG', description: 'Tiếp nhận xe giao hàng tại cổng bảo vệ, quét mã Barcode/QR lô vật tư, nghiệm thu kích thước mẫu và chụp ảnh lỗi hiện trường.', tags: ['Chụp ảnh hiện trường', 'CO/CQ Check'], action: 'QUÉT MÃ TIẾP NHẬN', tab: 'orders' },
  { title: 'MODULE 5: VIỆC CỦA TÔI', sub: 'HÀNG ĐỢI PHÊ DUYỆT CẤP TỐC', icon: 'assignment_ind', badge: '18 ĐỢI BẠN', description: 'Duyệt hàng loạt trên thiết bị máy tính bảng xưởng, ký số chứng thực điện tử và chuyển tiếp sang Phòng Mua hàng trong một thao tác.', tags: ['11 ĐNVT', '4 RFQ', '3 Nghiệm thu'], action: 'DUYỆT HÀNG LOẠT (18)', tab: 'my-tasks', critical: true },
  { title: 'MODULE 6: DỮ LIỆU GỐC & ĐỊNH MỨC', sub: 'MASTER DATA & BOM VẬT TƯ', icon: 'dataset', badge: '12.450 MÃ', description: 'Chuẩn hóa mã danh mục vật tư CNC, danh sách nhà cung ứng đã thẩm định CO/CQ và bảng định mức tiêu hao nguyên phụ liệu lệnh sản xuất.', tags: ['Định mức LSX', 'Danh bạ NCC'], action: 'TRA CỨU VẬT TƯ', tab: 'requests' }
];

const alerts = [
  ['THIẾU DAO CỤ SẢN XUẤT', '#ĐNVT-2024-0982', 'Máy Phay 5-Trục CNC-08', 'Mũi phay ngón hợp kim phi 12x75 đã cạn kho dự phòng. Đơn hàng gia công khuôn ép vỏ động cơ đang chờ phôi.', 'DUYỆT MUA HỎA TỐC'],
  ['TRỄ HẠN GIAO PHÔI THÉP', '#PO-2024-5412', 'Nhà cung cấp: Thép Minh Phú CNC', 'Phôi thép tròn SKD11 phi 180 quá hạn giao 3 ngày theo hợp đồng. Cảnh báo nguy cơ phạt vi phạm tiến độ bàn giao.', 'KHIẾU NẠI TIẾN ĐỘ'],
  ['LÔ HÀNG IQC KHÔNG ĐẠT', '#IQC-2024-0419', 'Kiểm tra Cổng số 1', 'Bu lông lục giác chìm 12.9 M16x80 có độ cứng không đạt chứng nhận CO/CQ. Yêu cầu lập biên bản hoàn trả ngay.', 'LẬP BIÊN BẢN TRẢ HÀNG']
];

export const DashboardView: React.FC<DashboardViewProps> = ({ requests, onNavigate, pendingTasksCount, currentUser }) => {
  const displayName = currentUser.ho_va_ten || currentUser.ma_tai_khoan;
  const metrics = [
    ['CHỜ PHÊ DUYỆT', pendingTasksCount, 'chứng từ', '7 phiếu khẩn < 2h', 'assignment_turned_in', false],
    ['TRỄ HẠN XỬ LÝ / GIAO', 47, 'báo động đỏ', 'Dừng dây chuyền tiện 03', 'warning', true],
    ['ĐANG GIAO HÀNG', 12, 'chuyến xe', '4 chuyến đang tới cổng bảo vệ', 'local_shipping', false],
    ['HOÀN TẤT THÁNG', '1.243', 'lô hàng', 'Đạt 98.2% định mức xưởng', 'verified', false]
  ];

  return (
    <div className="space-y-4 pb-12 text-[#0E1220]">
      <section className="bg-white border border-[#DCE1EC] shadow-sm px-4 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1"><span className="bg-[#EEF0F9] text-[#092081] font-condensed font-bold text-[10px] px-2 py-1 uppercase">Phân xưởng cơ khí chính số 2</span><span className="text-[11px] text-[#8A93AA] font-mono">Ca sản xuất: 01 (06:00 - 14:00)</span></div>
          <h1 className="text-[20px] font-bold tracking-tight">Xin chào, {displayName}</h1>
          <p className="text-[12px] text-[#59627A] mt-0.5">Hệ thống phát hiện <b className="text-[#EE202E]">47 đơn hàng/phiếu trễ hạn</b> và <b className="text-[#092081]">{pendingTasksCount} đầu việc</b> chờ bạn phê duyệt cấp tốc hôm nay.</p>
        </div>
        <div className="w-full xl:w-[48%]">
          <div className="flex h-9"><div className="flex-1 border border-[#DCE1EC] bg-[#F4F6FA] px-3 flex items-center gap-2 text-[#8A93AA] text-[12px]"><span className="material-symbols-outlined text-[18px]">search</span>Tìm nhanh module, số ĐNVT, PO-2024, mã phôi</div><button className="bg-[#092081] text-white px-4 font-condensed font-bold text-[11px] flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">filter_alt</span>LỌC</button></div>
          <div className="mt-1.5 text-[9px] font-condensed font-bold text-[#8A93AA] tracking-wider">TRA CỨU NHANH: <span className="text-[#092081] font-mono ml-2">#PO-8821 · #VT-SKD11 · #RFQ-CNC04</span></div>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map(([label, value, unit, note, icon, danger]) => <article key={String(label)} className={`bg-white border p-3 min-h-[86px] ${danger ? 'border-[#EE202E]' : 'border-[#DCE1EC]'}`}><div className={`flex justify-between text-[10px] font-condensed font-bold ${danger ? 'text-[#C4141F]' : 'text-[#59627A]'}`}><span>{String(label)}</span><span className="material-symbols-outlined text-[19px]">{String(icon)}</span></div><div className="flex items-end gap-2 mt-2"><b className={`font-mono text-[21px] leading-none ${danger ? 'text-[#EE202E]' : 'text-[#092081]'}`}>{String(value)}</b><span className="text-[10px] text-[#8A93AA]">{String(unit)}</span></div><div className={`font-mono text-[9px] mt-2 ${danger ? 'text-[#C4141F] font-bold' : 'text-[#59627A]'}`}>{String(note)}</div></article>)}
      </section>

      <section className="bg-white border border-[#DCE1EC] border-l-2 border-l-[#EE202E]">
        <header className="bg-[#FDECEE] px-3 py-2 border-b border-[#DCE1EC] flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#EE202E] text-[19px]">crisis_alert</span><h2 className="font-condensed font-bold text-[14px]">CẢNH BÁO KHẨN CẤP CẦN XỬ LÝ NGAY</h2><span className="bg-[#EE202E] text-white rounded-full px-2 py-0.5 text-[9px] font-bold">3 VỤ VIỆC CRITICAL</span></div><span className="text-[9px] text-[#59627A] font-condensed font-bold tracking-widest">CẬP NHẬT THEO THỜI GIAN THỰC TẠI PHÂN XƯỞNG</span></header>
        <div className="divide-y divide-[#EDF0F6]">{alerts.map(([badge, code, meta, text, action]) => <div key={code} className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="bg-[#EE202E] text-white rounded-full px-2 py-0.5 text-[9px] font-condensed font-bold">{badge}</span><b className="font-mono text-[11px]">{code}</b><span className="text-[10px] text-[#8A93AA]">· {meta}</span></div><p className="text-[11px] mt-1">{text}</p></div><div className="flex gap-2 shrink-0"><button className="bg-[#092081] text-white h-8 px-3 text-[10px] font-condensed font-bold">{action}</button><button className="border border-[#DCE1EC] h-8 px-3 text-[10px] font-condensed font-bold">XEM CHI TIẾT</button></div></div>)}</div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><h2 className="font-condensed font-bold text-[15px] flex items-center gap-2"><span className="material-symbols-outlined text-[#092081] text-[19px]">grid_view</span>DANH MỤC PHÂN HỆ NGHIỆP VỤ HỆ THỐNG</h2><span className="hidden sm:block text-[9px] text-[#8A93AA] font-condensed font-bold tracking-widest">CHỌN PHÂN HỆ ĐỂ ĐIỀU HÀNH CHI TIẾT</span></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{modules.map((module) => <article key={module.title} className={`bg-white border flex flex-col min-h-[215px] ${module.critical ? 'border-[#283A97]' : 'border-[#DCE1EC]'}`}><div className="p-3 border-b border-[#DCE1EC] flex items-start justify-between gap-3"><div className="flex gap-2"><span className={`w-8 h-8 flex items-center justify-center border ${module.critical ? 'bg-[#092081] text-white border-[#092081]' : 'bg-[#F4F6FA] text-[#092081] border-[#DCE1EC]'}`}><span className="material-symbols-outlined text-[19px]">{module.icon}</span></span><div><h3 className="font-condensed font-bold text-[13px] leading-tight">{module.title}</h3><p className="font-condensed font-bold text-[9px] text-[#59627A] mt-0.5">{module.sub}</p></div></div><span className={`rounded-full px-2 py-1 text-[9px] font-condensed font-bold text-center ${module.critical ? 'bg-[#EE202E] text-white' : 'bg-[#EEF0F9] text-[#092081]'}`}>{module.badge}</span></div><div className="p-3 flex-1"><p className="text-[11px] text-[#59627A] leading-relaxed">{module.description}</p><div className="flex flex-wrap gap-1 mt-3">{module.tags.map((tag) => <span key={tag} className="border border-[#DCE1EC] bg-[#F4F6FA] px-2 py-0.5 text-[9px] font-mono">{tag}</span>)}</div></div><footer className="p-3 bg-[#F4F6FA] border-t border-[#DCE1EC] flex items-center justify-between"><button onClick={() => onNavigate(module.tab)} className="h-8 bg-[#092081] text-white px-3 font-condensed font-bold text-[10px]">{module.action}</button><button onClick={() => onNavigate(module.tab)} className="text-[#092081] font-condensed font-bold text-[9px]">CHI TIẾT →</button></footer></article>)}</div>
      </section>

      <section className="bg-white border border-[#DCE1EC]">
        <header className="p-3 border-b border-[#DCE1EC] flex flex-wrap gap-3 items-center justify-between"><div><h2 className="font-condensed font-bold text-[14px]">MODULE 7: QUẢN TRỊ & NHẬT KÝ HỆ THỐNG</h2><p className="text-[9px] text-[#59627A] font-condensed font-bold">PHÂN QUYỀN VẬN HÀNH & AUDIT TRAIL</p></div><div className="flex gap-2"><span className="bg-[#EEF0F9] text-[#092081] rounded-full px-2 py-1 text-[9px] font-bold">AN TOÀN HỆ THỐNG</span><span className="bg-[#F4F6FA] rounded-full px-2 py-1 text-[9px] font-mono">AUDIT: 24/7</span></div></header>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCE1EC] text-[10px] text-[#59627A]"><div className="p-3"><b className="text-[#0E1220] block mb-1">PHÂN QUYỀN MA TRẬN</b>Kiểm soát thẩm quyền ký duyệt theo hạn mức giá trị từng xưởng, bảo vệ phân luồng nội bộ.</div><div className="p-3"><b className="text-[#0E1220] block mb-1">NHẬT KÝ KIỂM TOÁN (AUDIT)</b>Ghi lại 100% thay đổi đơn giá, số lượng đặt hàng, thời gian ký duyệt không thể xóa sửa.</div><div className="p-3"><b className="text-[#0E1220] block mb-1">SAO LƯU & DỰ PHÒNG</b>Đồng bộ tức thời dữ liệu đám mây với máy chủ điều hành nội bộ tại trạm xưởng.</div></div>
      </section>

      <section className="bg-white border border-[#DCE1EC] overflow-hidden">
        <header className="p-3 border-b border-[#DCE1EC] flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-condensed font-bold text-[14px]">HÀNG ĐỢI XỬ LÝ GẦN ĐÂY - PHÂN XƯỞNG CƠ KHÍ SỐ 2</h2><p className="text-[10px] text-[#8A93AA]">Danh sách chứng từ yêu cầu kiểm tra đối chiếu trước 15:00</p></div><div className="flex gap-2"><button className="border border-[#DCE1EC] h-8 px-3 text-[10px] font-bold">XUẤT BÁO CÁO</button><button className="bg-[#092081] text-white h-8 px-3 text-[10px] font-bold">LÀM MỚI</button></div></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#F4F6FA] text-[#59627A] text-[9px] font-condensed font-bold"><tr>{['MÃ CHỨNG TỪ','LOẠI NGHIỆP VỤ','MÔ TẢ CHI TIẾT VẬT TƯ','BỘ PHẬN YÊU CẦU','THỜI HẠN','TRẠNG THÁI','THAO TÁC'].map((heading) => <th key={heading} className="px-3 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#EDF0F6] text-[10px]">{requests.slice(0, 4).map((request: MaterialRequest) => { const danger = request.status === 'TRE_HAN' || request.status === 'BAT_KHA_THI'; return <tr key={request.id} className={`hover:bg-[#EEF0F9]/50 ${danger ? 'border-l-2 border-l-[#EE202E]' : ''}`}><td className={`px-3 py-3 font-mono font-bold ${danger ? 'text-[#C4141F]' : 'text-[#092081]'}`}>#{request.id}</td><td className="px-3 py-3 font-bold">Đề nghị vật tư</td><td className="px-3 py-3 max-w-[280px]">{request.lsxItem}</td><td className="px-3 py-3">{request.department}</td><td className={`px-3 py-3 font-mono ${danger ? 'text-[#EE202E] font-bold' : 'text-[#59627A]'}`}>{request.deadline}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-condensed font-bold text-[9px] ${danger ? 'bg-[#EE202E] text-white' : 'bg-[#EEF0F9] text-[#092081]'}`}>{request.statusText}</span></td><td className="px-3 py-3 text-right"><button onClick={() => onNavigate('request-detail')} className={`h-7 px-2 font-condensed font-bold text-[9px] ${danger ? 'bg-[#C4141F] text-white' : 'border border-[#DCE1EC]'}`}>{danger ? 'XỬ LÝ NGAY' : 'THEO DÕI'}</button></td></tr>; })}</tbody></table></div>
        <footer className="bg-[#F4F6FA] border-t border-[#DCE1EC] px-3 py-2 text-[10px] text-[#59627A]">Hiển thị {Math.min(4, requests.length)} trong tổng số {requests.length} chứng từ cần xử lý ca trực</footer>
      </section>
    </div>
  );
};
