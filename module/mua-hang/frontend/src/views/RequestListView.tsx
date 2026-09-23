import React, { useState } from 'react';
import { MaterialRequest, NavigationTab } from '../types';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from '../components/RowSelection';

interface RequestListViewProps {
  requests: MaterialRequest[];
  onNavigate: (tab: NavigationTab) => void;
  onSelectRequest: (request: MaterialRequest) => void;
  onNotify: (msg: string) => void;
  onDeleteRequests: (ids: Set<string>) => void;
}

function dinhDangNgayHienThi(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export const RequestListView: React.FC<RequestListViewProps> = ({
  requests,
  onNavigate,
  onSelectRequest,
  onNotify,
  onDeleteRequests
}) => {
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-28');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = requests.filter((r) => {
    if (deptFilter !== 'ALL' && !r.department.includes(deptFilter)) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.lsxCode.toLowerCase().includes(q) ||
        r.lsxItem.toLowerCase().includes(q) ||
        r.creator.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const selection = useRowSelection(filtered.map((request) => request.id));

  function deleteRequests(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'đề nghị vật tư')) return;
    onDeleteRequests(ids);
    selection.clearSelection();
    onNotify(`Đã xoá ${ids.size} đề nghị vật tư.`);
  }

  const getStatusBadge = (status: MaterialRequest['status'], text: string) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10.5px] px-2 py-0.5 border border-[#C6CCE9]">
            {text}
          </span>
        );
      case 'TRE_HAN':
        return (
          <span className="pill bg-[#FDECEE] text-[#EE202E] text-[10.5px] px-2 py-0.5 border border-[#F9B9BE]">
            {text}
          </span>
        );
      case 'DA_XONG':
        return (
          <span className="pill bg-[#F4F6FA] text-[#0E1220] text-[10.5px] px-2 py-0.5 border border-[#DCE1EC]">
            {text}
          </span>
        );
      case 'BAT_KHA_THI':
        return (
          <span className="pill bg-[#000000] text-white text-[10.5px] px-2 py-0.5">
            {text}
          </span>
        );
      case 'CAN_DE_MAT':
        return (
          <span className="pill bg-[#FFFFFF] text-[#EE202E] text-[10.5px] px-2 py-0.5 border border-[#EE202E]">
            {text}
          </span>
        );
      default:
        return (
          <span className="pill bg-[#EDF0F6] text-[#59627A] text-[10.5px] px-2 py-0.5">
            {text}
          </span>
        );
    }
  };

  const handleClearFilter = () => {
    setStartDate('2026-08-01');
    setEndDate('2026-08-28');
    setDeptFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
    onNotify('Đã xóa tất cả bộ lọc tìm kiếm.');
  };

  const handleExportExcel = () => {
    onNotify('Đang trích xuất 1.243 dòng dữ liệu đề nghị vật tư ra file Excel (XLSX)...');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* FILTER CONTROL BAR */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
              TỪ NGÀY
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-[36px] px-2.5 font-mono text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            />
          </div>

          <div>
            <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
              ĐẾN NGÀY
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-[36px] px-2.5 font-mono text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            />
          </div>

          <div>
            <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
              BỘ PHẬN YÊU CẦU
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-[36px] px-2.5 text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            >
              <option value="ALL">Tất cả bộ phận</option>
              <option value="Gia Công">Gia Công Chính Xác</option>
              <option value="Cơ Khí">Cơ Khí Chế Tạo</option>
              <option value="Kho Vận">Kho Vận &amp; Đóng Gói</option>
              <option value="Kiểm Soát">Kiểm Soát Chất Lượng</option>
            </select>
          </div>

          <div>
            <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
              TRẠNG THÁI CHỨNG TỪ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-[36px] px-2.5 text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CHO_DUYET">Chờ duyệt</option>
              <option value="TRE_HAN">Trễ hạn</option>
              <option value="DA_XONG">Đã xong</option>
              <option value="BAT_KHA_THI">Bất khả thi</option>
              <option value="CAN_DE_MAT">Cần để mắt</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
              TÌM KIẾM NÂNG CAO
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Mã phiếu, LSX, tên vật tư..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[36px] pl-8 pr-2.5 text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[17px] text-[#8A93AA]">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-[#DCE1EC]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNotify('Đã áp dụng các tiêu chí lọc danh sách.')}
              className="h-[34px] px-4 bg-[#283A97] text-white rounded font-condensed font-bold text-[11.5px] uppercase hover:bg-[#1E2C75] flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt</span>
              LỌC DỮ LIỆU
            </button>

            <button
              onClick={handleClearFilter}
              className="h-[34px] px-3 border border-[#DCE1EC] text-[#59627A] hover:text-[#0E1220] rounded font-condensed font-bold text-[11.5px] uppercase"
            >
              XÓA LỌC
            </button>

            <button
              onClick={handleExportExcel}
              className="h-[34px] px-3 border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] rounded font-condensed font-bold text-[11.5px] uppercase flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">table_view</span>
              TẢI XUỐNG (EXCEL)
            </button>
          </div>

          <div>
            <button
              onClick={() => onNavigate('create-request')}
              className="h-[36px] px-4 bg-[#283A97] hover:bg-[#1E2C75] text-white rounded font-condensed font-bold text-[12px] uppercase flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              + TẠO ĐỀ NGHỊ MỚI
            </button>
          </div>
        </div>
      </div>

      {/* QUICK KPI STATS METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            TỔNG ĐỀ NGHỊ
          </span>
          <div className="text-[28px] font-bold font-mono text-[#0E1220] leading-none mt-1.5">
            1.243
          </div>
          <span className="text-[11.5px] text-[#59627A] mt-1 block">Tất cả các xưởng</span>
        </div>

        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
          <span className="font-condensed font-bold text-[11px] uppercase text-[#283A97] block">
            CHỜ DUYỆT
          </span>
          <div className="text-[28px] font-bold font-mono text-[#283A97] leading-none mt-1.5">
            18
          </div>
          <span className="text-[11.5px] text-[#59627A] mt-1 block">Cấp 1 &amp; Cấp 2</span>
        </div>

        <div className="bg-white border-l-4 border-l-[#EE202E] border-y border-r border-[#DCE1EC] rounded p-4 shadow-sm">
          <span className="font-condensed font-bold text-[11px] uppercase text-[#EE202E] block">
            TRỄ HẠN
          </span>
          <div className="text-[28px] font-bold font-mono text-[#EE202E] leading-none mt-1.5">
            47
          </div>
          <span className="text-[11.5px] text-[#59627A] mt-1 block">&gt; 48 giờ chưa xử lý</span>
        </div>

        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
          <span className="font-condensed font-bold text-[11px] uppercase text-[#0E1220] block">
            BẤT KHẢ THI
          </span>
          <div className="text-[28px] font-bold font-mono text-[#0E1220] leading-none mt-1.5">
            12
          </div>
          <span className="text-[11.5px] text-[#59627A] mt-1 block">Cần đổi mã hoặc NCC</span>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        <div className="p-3 border-b border-[#DCE1EC]"><RowSelectionActions total={filtered.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => deleteRequests(selection.selected)} onDeleteAll={() => deleteRequests(new Set(filtered.map((request) => request.id)))} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#F4F6FA] border-b border-[#DCE1EC] font-condensed font-bold text-[11px] text-[#59627A] uppercase tracking-wider">
                <th className="p-3 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả đề nghị" /></th>
                <th className="p-3 w-32">MÃ ĐỀ NGHỊ</th>
                <th className="p-3 w-28">NGÀY TẠO</th>
                <th className="p-3">BỘ PHẬN</th>
                <th className="p-3">LỆNH SX (LSX) &amp; MÃ HÀNG</th>
                <th className="p-3">NGƯỜI TẠO</th>
                <th className="p-3 text-center w-24">SỐ DÒNG</th>
                <th className="p-3">TRẠNG THÁI</th>
                <th className="p-3 text-right">GIÁ DỰ TOÁN</th>
                <th className="p-3 w-14" />
                {/* <th className="p-3 text-center w-24">THAO TÁC</th> */}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE1EC] text-[13px]">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => {
                    onSelectRequest(req);
                    onNavigate('request-detail');
                  }}
                  className={`hover:bg-[#EEF0F9]/40 cursor-pointer transition-colors ${
                    selection.selected.has(req.id) ? 'bg-[#EEF0F9]' : req.status === 'TRE_HAN'
                      ? 'bg-[#FFFDFD] border-l-4 border-l-[#EE202E]'
                      : req.id === 'DN-2026-000123'
                      ? 'bg-[#EEF0F9]/20'
                      : ''
                  }`}
                >
                  <td className="p-3 text-center" onClick={(event) => event.stopPropagation()}><SelectionCheckbox checked={selection.selected.has(req.id)} onChange={() => selection.toggle(req.id)} label={`Chọn đề nghị ${req.id}`} /></td>
                  <td className="p-3">
                    <span className="font-mono font-bold text-[#283A97] hover:underline">
                      {req.id}
                    </span>
                  </td>

                  <td className="p-3 font-mono text-[#59627A]">{dinhDangNgayHienThi(req.date)}</td>

                  <td className="p-3 font-bold text-[#0E1220]">{req.department}</td>

                  <td className="p-3">
                    <div className="font-mono text-[#0E1220] font-bold">{req.lsxCode}</div>
                    <div className="text-[11.5px] text-[#59627A]">{req.lsxItem}</div>
                  </td>

                  <td className="p-3">
                    <div className="text-[#0E1220]">{req.creator}</div>
                    <div className="text-[11px] text-[#8A93AA]">{req.creatorRole}</div>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-[#59627A]">
                    {req.lineCount}
                  </td>

                  <td className="p-3">{getStatusBadge(req.status, req.statusText)}</td>

                  <td className="p-3 text-right font-mono font-bold text-[#0E1220]">
                    {req.totalEstimatedPrice.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-1 text-center" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => deleteRequests(new Set([req.id]))} aria-label={`Xoá đề nghị ${req.id}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td>

                  {/* <td
                    className="p-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRequest(req);
                      onNavigate('request-detail');
                    }}
                  >
                    <button
                      className="p-1 text-[#59627A] hover:text-[#283A97] hover:bg-[#EEF0F9] rounded"
                      title="Xem chi tiết phiếu"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F4F6FA] border-t border-[#DCE1EC] flex items-center justify-between text-[12px] text-[#59627A]">
          <div>Hiển thị {filtered.length} trên 1.243 đề nghị vật tư</div>
          <div className="flex items-center gap-1">
            <span>Trang 1 / 125</span>
          </div>
        </div>
      </div>
    </div>
  );
};
