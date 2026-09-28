import React, { useEffect, useState } from 'react';
import { ApprovalTask, NavigationTab } from '../types';
import { INITIAL_APPROVAL_TASKS } from '../data/initialData';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox } from '../components/RowSelection';
import { HoSo, layHangDoiKyThuatDatNgoai, PhieuDatNgoai, xacNhanKyThuatDatNgoai } from '../api/client';

interface MyTasksViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onNotify: (msg: string) => void;
  onTasksCountChange?: (count: number) => void;
  currentUser: HoSo;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ onNavigate, onNotify, onTasksCountChange, currentUser }) => {
  const [tasks, setTasks] = useState<ApprovalTask[]>(INITIAL_APPROVAL_TASKS);
  const [technicalQueue, setTechnicalQueue] = useState<PhieuDatNgoai[]>([]);
  const [technicalError, setTechnicalError] = useState('');
  const [processingTechnical, setProcessingTechnical] = useState<string | null>(null);
  const technicalPermission = currentUser.quyen?.xac_nhan_kt as { xem?: boolean; sua?: boolean } | undefined;
  const canReviewTechnical = technicalPermission?.xem === true && technicalPermission.sua === true;

  async function loadTechnicalQueue() {
    if (!canReviewTechnical) return;
    try {
      setTechnicalQueue(await layHangDoiKyThuatDatNgoai());
      setTechnicalError('');
    } catch (reason) {
      setTechnicalError(reason instanceof Error ? reason.message : 'Không tải được hàng đợi kỹ thuật.');
    }
  }

  useEffect(() => {
    if (!canReviewTechnical) return;
    void loadTechnicalQueue();
    const timer = globalThis.setInterval(() => void loadTechnicalQueue(), 30_000);
    return () => globalThis.clearInterval(timer);
  }, [canReviewTechnical]);

  async function confirmOutsourceTechnical(request: PhieuDatNgoai) {
    setProcessingTechnical(request.id);
    try {
      await xacNhanKyThuatDatNgoai(request);
      await loadTechnicalQueue();
      onNotify(`Đã xác nhận kỹ thuật phiếu ${request.id}; phiếu đã được gỡ khỏi việc cần xử lý.`);
    } catch (reason) {
      onNotify(reason instanceof Error ? reason.message : 'Không xác nhận được phiếu.');
    } finally {
      setProcessingTechnical(null);
    }
  }
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'supplement' | 'history'>('pending');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal
  const [rejectingTask, setRejectingTask] = useState<ApprovalTask | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [quickReason, setQuickReason] = useState('');

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    if (activeSubTab === 'pending' && t.status !== 'pending') return false;
    if (activeSubTab === 'supplement' && t.status !== 'supplement') return false;
    if (activeSubTab === 'history' && t.status !== 'approved' && t.status !== 'rejected') return false;

    if (filterType !== 'ALL' && !t.docType.includes(filterType)) return false;
    if (filterDept !== 'ALL' && !t.department.includes(filterDept)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.docCode.toLowerCase().includes(q) ||
        t.requester.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.lineSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const supplementCount = tasks.filter((t) => t.status === 'supplement').length;
  const historyCount = tasks.filter((t) => t.status === 'approved' || t.status === 'rejected').length + 18;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const deleteTasks = (ids: Set<string>) => {
    if (!ids.size || !confirmDeleteRows(ids.size, 'công việc')) return;
    setTasks((current) => current.filter((task) => !ids.has(task.id)));
    setSelectedTaskIds((current) => current.filter((id) => !ids.has(id)));
    const removedPending = tasks.filter((task) => ids.has(task.id) && task.status === 'pending').length;
    onTasksCountChange?.(Math.max(0, pendingCount - removedPending));
    onNotify(`Đã xoá ${ids.size} công việc.`);
  };

  const handleApproveSingle = (task: ApprovalTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'approved' } : t))
    );
    setSelectedTaskIds((prev) => prev.filter((id) => id !== task.id));
    const nextCount = tasks.filter((t) => t.status === 'pending' && t.id !== task.id).length;
    onTasksCountChange?.(nextCount);
    onNotify(`Đã PHÊ DUYỆT chứng từ [${task.docCode}] thành công!`);
  };

  const handleForwardDirector = (task: ApprovalTask) => {
    onNotify(`Đã chuyển tiếp chứng từ giá trị lớn [${task.docCode}] (${task.totalValue.toLocaleString('vi-VN')} đ) lên Tổng Giám Đốc phê duyệt hạn mức.`);
  };

  const handleBatchApprove = () => {
    if (selectedTaskIds.length === 0) return;
    setTasks((prev) =>
      prev.map((t) => (selectedTaskIds.includes(t.id) ? { ...t, status: 'approved' } : t))
    );
    const count = selectedTaskIds.length;
    setSelectedTaskIds([]);
    const nextCount = tasks.filter((t) => t.status === 'pending' && !selectedTaskIds.includes(t.id)).length;
    onTasksCountChange?.(nextCount);
    onNotify(`Đã phê duyệt hàng loạt thành công ${count} chứng từ!`);
  };

  const handleOpenReject = (task: ApprovalTask) => {
    setRejectingTask(task);
    setRejectReason('');
    setQuickReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingTask) return;
    if (rejectReason.trim().length < 10) {
      alert('Vui lòng nhập lý do từ chối tối thiểu 10 ký tự để người tạo phiếu biết chỉnh sửa.');
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === rejectingTask.id ? { ...t, status: 'rejected' } : t))
    );
    onNotify(`Đã TỪ CHỐI chứng từ [${rejectingTask.docCode}] với lý do: "${rejectReason.trim()}"`);
    setRejectingTask(null);
  };

  const handleViewDetail = (task: ApprovalTask) => {
    if (task.docCode.startsWith('DN')) {
      onNavigate('request-detail');
    } else {
      onNavigate('quotes');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {canReviewTechnical && <section className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        <header className="p-4 bg-[#EEF0F9] border-b flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-bold text-[15px]">PHIẾU ĐẶT NGOÀI CHỜ KỸ THUẬT</h2><p className="text-[12px] text-[#59627A]">Hàng đợi chung cho tài khoản được cấp quyền xác nhận kỹ thuật.</p></div>
          <span className="pill p-info px-3 py-1">{technicalQueue.length} đang chờ</span>
        </header>
        {technicalError && <div role="alert" className="p-3 text-[12px] text-[#C4141F]">{technicalError}</div>}
        {technicalQueue.length === 0 ? <p className="p-5 text-[13px] text-[#59627A]">Không có phiếu nào đang chờ xác nhận kỹ thuật.</p> : <div className="divide-y">
          {technicalQueue.map((request) => <article key={request.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div><strong className="font-mono text-[#283A97]">{request.id}</strong><span className="mx-2 text-[#8A93AA]">·</span><span className="font-mono">LSX {request.lenh_san_xuat}</span><p className="mt-1 text-[12px] text-[#59627A]">{request.noi_dung_ky_thuat || 'Yêu cầu xác nhận kỹ thuật'} · {request.dong.length} mã hàng · Người lập: {request.nguoi_lap}</p></div>
            <button type="button" disabled={processingTechnical === request.id} onClick={() => void confirmOutsourceTechnical(request)} className="min-h-10 px-4 rounded bg-emerald-700 text-white font-bold disabled:opacity-50">{processingTechnical === request.id ? 'ĐANG XỬ LÝ…' : 'XÁC NHẬN KỸ THUẬT'}</button>
          </article>)}
        </div>}
      </section>}
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pending */}
        <div className="bg-white border border-[#DCE1EC] p-4 rounded shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[12px] font-condensed font-bold uppercase text-[#59627A]">
              CHỨNG TỪ CHỜ DUYỆT
            </div>
            <div className="text-[32px] font-bold font-mono text-[#0E1220] leading-none mt-1">
              {pendingCount}
            </div>
            <div className="text-[12px] text-[#59627A] mt-1">Thuộc thẩm quyền xưởng</div>
          </div>
          <div className="w-12 h-12 bg-[#EEF0F9] text-[#283A97] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">pending_actions</span>
          </div>
        </div>

        {/* Card 2: Urgency */}
        <div className="bg-white border-l-4 border-l-[#EE202E] border-y border-r border-[#DCE1EC] p-4 rounded shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[12px] font-condensed font-bold uppercase text-[#EE202E]">
              SẮP TRỄ HẠN (&lt; 4 GIỜ)
            </div>
            <div className="text-[32px] font-bold font-mono text-[#EE202E] leading-none mt-1">
              1
            </div>
            <div className="text-[12px] text-[#59627A] mt-1">Ưu tiên xử lý gấp ca 1</div>
          </div>
          <div className="w-12 h-12 bg-[#FDECEE] text-[#EE202E] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">alarm</span>
          </div>
        </div>

        {/* Card 3: Over Budget */}
        <div className="bg-white border border-[#DCE1EC] p-4 rounded shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[12px] font-condensed font-bold uppercase text-[#59627A]">
              VƯỢT HẠN MỨC DUYỆT XƯỞNG
            </div>
            <div className="text-[32px] font-bold font-mono text-[#283A97] leading-none mt-1">
              1
            </div>
            <div className="text-[12px] text-[#59627A] mt-1">&gt; 500.000.000 đ (Trình TGĐ)</div>
          </div>
          <div className="w-12 h-12 bg-[#EEF0F9] text-[#283A97] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">account_balance</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        {/* Sub-tabs Header */}
        <div className="border-b border-[#DCE1EC] bg-[#F4F6FA] flex flex-wrap items-center justify-between px-4 pt-3 gap-2">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveSubTab('pending')}
              className={`font-condensed font-bold text-[13px] uppercase px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'pending'
                  ? 'border-[#283A97] text-[#283A97] bg-white'
                  : 'border-transparent text-[#59627A] hover:text-[#0E1220]'
              }`}
            >
              <span>Chờ tôi duyệt</span>
              <span className="bg-[#EE202E] text-white font-mono text-[10.5px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('supplement')}
              className={`font-condensed font-bold text-[13px] uppercase px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'supplement'
                  ? 'border-[#283A97] text-[#283A97] bg-white'
                  : 'border-transparent text-[#59627A] hover:text-[#0E1220]'
              }`}
            >
              <span>Cần xử lý bổ sung</span>
              <span className="bg-[#8A93AA] text-white font-mono text-[10.5px] px-1.5 py-0.2 rounded-full font-bold">
                {supplementCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('history')}
              className={`font-condensed font-bold text-[13px] uppercase px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'history'
                  ? 'border-[#283A97] text-[#283A97] bg-white'
                  : 'border-transparent text-[#59627A] hover:text-[#0E1220]'
              }`}
            >
              <span>Đã duyệt gần đây</span>
              <span className="font-mono text-[11px] text-[#8A93AA]">({historyCount})</span>
            </button>
          </div>

          <div className="pb-2 text-[12px] text-[#59627A]">
            Hạn mức cá nhân: <strong className="text-[#0E1220] font-mono">500.000.000 VNĐ/chứng từ</strong>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 border-b border-[#DCE1EC] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-[34px] text-[12.5px] bg-white border border-[#DCE1EC] rounded px-2.5 text-[#0E1220] outline-none focus:border-[#283A97]"
            >
              <option value="ALL">Tất cả loại chứng từ</option>
              <option value="Đề nghị">Đề nghị vật tư xưởng (DN)</option>
              <option value="PO">Đơn mua hàng (PO)</option>
            </select>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-[34px] text-[12.5px] bg-white border border-[#DCE1EC] rounded px-2.5 text-[#0E1220] outline-none focus:border-[#283A97]"
            >
              <option value="ALL">Tất cả bộ phận</option>
              <option value="Gia Công">Gia Công Chính Xác</option>
              <option value="Cơ khí">Cơ Khí Chế Tạo</option>
              <option value="Kho Vận">Kho Vận &amp; Đóng Gói</option>
            </select>

            {/* Bulk Action Controls */}
            {selectedTaskIds.length > 0 && (
              <div className="flex items-center gap-2 pl-2 border-l border-[#DCE1EC]">
                <span className="text-[12px] text-[#283A97] font-bold">
                  Đã chọn {selectedTaskIds.length} mục:
                </span>
                <button
                  onClick={handleBatchApprove}
                  className="h-[32px] px-3 bg-[#283A97] text-white rounded font-condensed font-bold text-[11px] uppercase hover:bg-[#1E2C75] flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">done_all</span>
                  Duyệt đã chọn
                </button>
                <button
                  onClick={() => {
                    const r = prompt('Nhập lý do từ chối hàng loạt:');
                    if (r) {
                      setTasks((prev) =>
                        prev.map((t) =>
                          selectedTaskIds.includes(t.id) ? { ...t, status: 'rejected' } : t
                        )
                      );
                      setSelectedTaskIds([]);
                      onNotify(`Đã từ chối ${selectedTaskIds.length} chứng từ đã chọn.`);
                    }
                  }}
                  className="h-[32px] px-3 bg-white border border-[#EE202E] text-[#EE202E] rounded font-condensed font-bold text-[11px] uppercase hover:bg-[#FDECEE]"
                >
                  Từ chối đã chọn
                </button>
              </div>
            )}
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Tìm mã phiếu, người lập, số tiền..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[34px] pl-8 pr-3 text-[12.5px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[17px] text-[#8A93AA]">
              search
            </span>
          </div>
        </div>

        <div className="p-3 border-b border-[#DCE1EC]">
          <RowSelectionActions total={filteredTasks.length} selectedCount={filteredTasks.filter((task) => selectedTaskIds.includes(task.id)).length} allSelected={filteredTasks.length > 0 && filteredTasks.every((task) => selectedTaskIds.includes(task.id))} onToggleAll={() => setSelectedTaskIds(filteredTasks.every((task) => selectedTaskIds.includes(task.id)) ? [] : filteredTasks.map((task) => task.id))} onDeleteSelected={() => deleteTasks(new Set(selectedTaskIds))} onDeleteAll={() => deleteTasks(new Set(filteredTasks.map((task) => task.id)))} />
        </div>

        {/* Task Items Table for Desktop */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F6FA] border-b border-[#DCE1EC] font-condensed font-bold text-[11px] text-[#59627A] uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredTasks.length > 0 &&
                      selectedTaskIds.length === filteredTasks.length
                    }
                    className="cursor-pointer rounded border-[#DCE1EC] text-[#283A97] focus:ring-0"
                  />
                </th>
                <th className="p-3">MÃ CHỨNG TỪ &amp; LOẠI PHIẾU</th>
                <th className="p-3">BỘ PHẬN / NGƯỜI YÊU CẦU</th>
                <th className="p-3">TÓM TẮT HẠNG MỤC</th>
                <th className="p-3 text-right">GIÁ TRỊ QUY ĐỔI</th>
                <th className="p-3">HẠN DUYỆT &amp; CẤP ƯU TIÊN</th>
                <th className="p-3 text-right">THAO TÁC</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE1EC] text-[13px]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#59627A]">
                    <span className="material-symbols-outlined text-[36px] text-[#8A93AA] block mb-1">
                      checklist_rtl
                    </span>
                    Không có chứng từ nào trong danh sách này.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-[#EEF0F9]/30 transition-colors ${
                        task.isOverBudget
                          ? 'border-l-4 border-l-[#283A97] bg-[#EEF0F9]/20'
                          : task.urgentTag?.includes('< 4H')
                          ? 'border-l-4 border-l-[#EE202E] bg-[#FFFDFD]'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(task.id)}
                          className="cursor-pointer rounded border-[#DCE1EC] text-[#283A97] focus:ring-0"
                        />
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(task)}
                            className="font-mono font-bold text-[#283A97] hover:underline text-[13.5px]"
                          >
                            {task.docCode}
                          </button>
                          <button type="button" onClick={() => deleteTasks(new Set([task.id]))} aria-label={`Xoá công việc ${task.docCode}`} className="min-w-8 min-h-8 text-[#EE202E] hover:bg-[#FDECEE] rounded"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                          <span
                            className={`pill text-[10px] px-2 py-0.2 ${
                              task.docType.includes('PO')
                                ? 'bg-[#EEF0F9] text-[#283A97] border border-[#C6CCE9]'
                                : 'bg-[#F4F6FA] text-[#59627A]'
                            }`}
                          >
                            {task.docType}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#8A93AA] mt-0.5">
                          Tạo lúc 27/08/2026 09:12
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-[#0E1220]">{task.department}</div>
                        <div className="text-[12px] text-[#59627A] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          {task.requester}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-[#0E1220] font-medium">{task.lineSummary}</div>
                        <div className="text-[11.5px] text-[#8A93AA]">Thép S45C, dao phay ngón carbide...</div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-mono text-[14px] font-bold text-[#0E1220]">
                          {task.totalValue.toLocaleString('vi-VN')} đ
                        </div>
                        {task.isOverBudget && (
                          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-1.5 py-0.2 border border-[#C6CCE9]">
                            VƯỢT HẠN MỨC XƯỞNG
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1 font-mono text-[12px] text-[#0E1220]">
                          <span className="material-symbols-outlined text-[14px] text-[#59627A]">calendar_today</span>
                          {task.deadline}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`pill text-[10px] px-1.5 py-0.2 ${
                              task.urgentTag?.includes('< 4H')
                                ? 'bg-[#EE202E] text-white'
                                : 'bg-[#EEF0F9] text-[#283A97]'
                            }`}
                          >
                            {task.urgentTag || task.priorityTag}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {task.isOverBudget ? (
                            <button
                              onClick={() => handleForwardDirector(task)}
                              className="h-[32px] px-3 bg-[#EEF0F9] text-[#283A97] border border-[#283A97] rounded font-condensed font-bold text-[11.5px] uppercase hover:bg-[#283A97] hover:text-white transition-colors flex items-center gap-1"
                              title="Chuyển hồ sơ lên Tổng Giám Đốc ký duyệt"
                            >
                              <span className="material-symbols-outlined text-[16px]">forward</span>
                              Trình TGĐ
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveSingle(task)}
                              className="h-[32px] px-3.5 bg-[#283A97] text-white rounded font-condensed font-bold text-[11.5px] uppercase hover:bg-[#1E2C75] transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              Duyệt
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenReject(task)}
                            className="h-[32px] px-2.5 bg-white border border-[#DCE1EC] text-[#EE202E] hover:bg-[#FDECEE] rounded font-condensed font-bold text-[11.5px] uppercase transition-colors"
                            title="Từ chối hoặc yêu cầu sửa"
                          >
                            Từ chối
                          </button>

                          <button
                            onClick={() => handleViewDetail(task)}
                            className="h-[32px] w-[32px] text-[#59627A] hover:bg-[#F4F6FA] hover:text-[#0E1220] rounded flex items-center justify-center"
                            title="Xem chi tiết phiếu"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards Layout */}
        <div className="divide-y divide-[#DCE1EC] md:hidden">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <SelectionCheckbox checked={selectedTaskIds.includes(task.id)} onChange={() => handleToggleSelect(task.id)} label={`Chọn công việc ${task.docCode}`} />
                    <button
                      onClick={() => handleViewDetail(task)}
                      className="font-mono font-bold text-[#283A97] text-[14px]"
                    >
                      {task.docCode}
                    </button>
                    <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-2 py-0.2">
                      {task.docType}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">
                    {task.department} • {task.requester}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-[15px] text-[#0E1220]">
                    {task.totalValue.toLocaleString('vi-VN')} đ
                  </div>
                  {task.isOverBudget && (
                    <span className="pill bg-[#FDECEE] text-[#EE202E] text-[10px] px-1.5 py-0.2">
                      VƯỢT HẠN MỨC
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 bg-[#F4F6FA] rounded text-[12px] text-[#0E1220]">
                {task.lineSummary} (Hạn: {task.deadline})
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10.5px] px-2 py-0.5">
                  {task.urgentTag || task.priorityTag}
                </span>

                <div className="flex items-center gap-2">
                  {task.isOverBudget ? (
                    <button
                      onClick={() => handleForwardDirector(task)}
                      className="h-[34px] px-3 bg-[#EEF0F9] text-[#283A97] border border-[#283A97] rounded font-condensed font-bold text-[12px] uppercase"
                    >
                      Trình TGĐ
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproveSingle(task)}
                      className="h-[34px] px-4 bg-[#283A97] text-white rounded font-condensed font-bold text-[12px] uppercase"
                    >
                      Duyệt
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenReject(task)}
                    className="h-[34px] px-3 border border-[#DCE1EC] text-[#EE202E] rounded font-condensed font-bold text-[12px] uppercase"
                  >
                    Từ chối
                  </button>
                  <button type="button" onClick={() => deleteTasks(new Set([task.id]))} aria-label={`Xoá công việc ${task.docCode}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#F4F6FA] border-t border-[#DCE1EC] flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#59627A]">
          <div>Hiển thị {filteredTasks.length} chứng từ cần xử lý</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[#283A97] font-bold">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Chữ ký số nội bộ xưởng hợp lệ
            </span>
          </div>
        </div>
      </div>

      {/* REJECTION MODAL */}
      {rejectingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full border border-[#DCE1EC] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#DCE1EC] bg-[#FDECEE] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EE202E]">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
                <h3 className="text-[16px] font-bold uppercase font-condensed">
                  TỪ CHỐI CHỨNG TỪ {rejectingTask.docCode}
                </h3>
              </div>
              <button
                onClick={() => setRejectingTask(null)}
                className="text-[#59627A] hover:text-[#0E1220]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[13px] text-[#59627A]">
                Vui lòng cung cấp lý do cụ thể để người tạo phiếu (
                <strong className="text-[#0E1220]">{rejectingTask.requester}</strong>) nhận thông báo và tiến hành sửa đổi hoặc lập lại.
              </p>

              {/* Quick reason chips */}
              <div>
                <span className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1.5">
                  LÝ DO MẪU NHANH:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Vượt định mức tiêu hao ca sản xuất',
                    'Sai thông số kỹ thuật bản vẽ',
                    'Đề nghị đàm phán lại đơn giá NCC',
                    'Kho xưởng vẫn còn tồn mã tương đương'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setQuickReason(preset);
                        setRejectReason(preset);
                      }}
                      className={`text-[11.5px] px-2.5 py-1 rounded border transition-colors ${
                        quickReason === preset
                          ? 'bg-[#283A97] text-white border-[#283A97]'
                          : 'bg-[#F4F6FA] text-[#0E1220] border-[#DCE1EC] hover:bg-[#EEF0F9]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-condensed font-bold text-[12px] uppercase text-[#0E1220] mb-1">
                  NỘI DUNG LÝ DO TỪ CHỐI (BẮT BUỘC &gt;= 10 KÝ TỰ):
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Đề nghị kiểm tra lại số lượng thép tròn vì tồn kho khu B vẫn còn 4 cây..."
                  className="w-full text-[13px] p-3 border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
                />
                <div className="text-right text-[11px] text-[#8A93AA] mt-1 font-mono">
                  {rejectReason.length} / tối thiểu 10 ký tự
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F4F6FA] border-t border-[#DCE1EC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingTask(null)}
                className="h-[36px] px-4 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-white font-condensed font-bold text-[12px] uppercase"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="h-[36px] px-5 rounded bg-[#EE202E] hover:bg-[#C4141F] text-white font-condensed font-bold text-[12px] uppercase flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                XÁC NHẬN TỪ CHỐI PHIẾU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
