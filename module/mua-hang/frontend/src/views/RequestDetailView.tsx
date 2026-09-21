import React, { useState } from 'react';
import { MaterialRequest, RequestComment, NavigationTab } from '../types';

interface RequestDetailViewProps {
  request: MaterialRequest;
  onNavigate: (tab: NavigationTab) => void;
  onApproveRequest: (id: string) => void;
  onNotify: (msg: string) => void;
}

export const RequestDetailView: React.FC<RequestDetailViewProps> = ({
  request,
  onNavigate,
  onApproveRequest,
  onNotify
}) => {
  const [comments, setComments] = useState<RequestComment[]>(
    request.comments || [
      {
        id: 'c1',
        author: 'Trần Văn Sáng',
        role: 'NV Kỹ thuật xưởng',
        avatar: 'TS',
        time: '27/08 09:12',
        content: 'Hàng thép S45C phi 65 này cần gấp để tiện trục truyền động cho máy ép #04 chạy ca 2. Nhờ bộ phận Mua hàng ưu tiên hỏi sớm.'
      },
      {
        id: 'c2',
        author: 'Phạm Huyền Như',
        role: 'Tổ Mua Hàng',
        avatar: 'HN',
        time: '27/08 10:04',
        content: 'Đã liên hệ NCC Thép Miền Trung, lô này có sẵn hàng giao trước thứ Sáu. Đang đợi báo giá chính thức kèm chứng chỉ xuất xứ.',
        attachment: { name: 'bao-gia-so-bo.pdf', size: '480 KB' }
      },
      {
        id: 'c3',
        author: 'Vũ Đức An',
        role: 'Quản đốc Xưởng',
        avatar: 'ĐA',
        time: '27/08 10:20',
        content: 'Xưởng đã duyệt nhu cầu, đề nghị Mua hàng chốt giao hàng đúng 02/09 để kịp lắp ráp.',
        isHighlight: true
      }
    ]
  );

  const [newComment, setNewComment] = useState('');

  const items = request.items || [
    {
      id: '1',
      code: 'VT-CK-00412',
      name: 'Thép tròn đặc S45C phi 65 x 1200mm',
      spec: 'Tiêu chuẩn JIS G4051, nhiệt luyện đạt độ cứng yêu cầu',
      unit: 'Cây (1200mm)',
      quantity: 10,
      stockQty: 0,
      unitPrice: 1240000,
      note: 'Yêu cầu CO/CQ thép chính phẩm Hòa Phát'
    },
    {
      id: '2',
      code: 'VT-DAO-0018',
      name: 'Dao phay ngón carbide 4 me D12mm (YG-1)',
      spec: 'Phủ TiAlN chuyên phay tinh rãnh then',
      unit: 'Chiếc',
      quantity: 4,
      stockQty: 2,
      unitPrice: 350000,
      note: 'Gia công rãnh then trục'
    },
    {
      id: '3',
      code: 'VT-DAU-0005',
      name: 'Dầu tưới nguội làm mát pha nước Castrol Alusol',
      spec: 'Dung dịch gia công cơ khí chính xác chống rỉ',
      unit: 'Can 18L',
      quantity: 1,
      stockQty: 0,
      unitPrice: 1850000,
      note: 'Cấp bổ sung máy phay CNC #02'
    }
  ];

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(request.id);
    onNotify(`Đã sao chép mã phiếu [${request.id}] vào clipboard!`);
  };

  const handlePrint = () => {
    onNotify(`Đang chuẩn bị lệnh in mẫu chứng từ [${request.id}] theo chuẩn ISO-9001...`);
    window.print?.();
  };

  const handleExportPDF = () => {
    onNotify(`Đang kết xuất tệp PDF chứng từ ký số điện tử [${request.id}]...`);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const commentItem: RequestComment = {
      id: 'c-' + Date.now(),
      author: 'Vũ Đức An',
      role: 'Quản đốc xưởng',
      avatar: 'ĐA',
      time: 'Vừa xong',
      content: newComment.trim()
    };
    setComments((prev) => [...prev, commentItem]);
    setNewComment('');
    onNotify('Đã gửi ý kiến trao đổi về chứng từ.');
  };

  const handleApprove = () => {
    const confirmed = window.confirm(
      `XÁC NHẬN PHÊ DUYỆT:\n\nBạn có chắc chắn duyệt đề nghị vật tư [${request.id}] với tổng giá trị ${total.toLocaleString('vi-VN')} VNĐ cho xưởng Gia công chính xác không?`
    );
    if (confirmed) {
      onApproveRequest(request.id);
      onNotify(`THÀNH CÔNG: Đã phê duyệt Đề nghị vật tư [${request.id}]! Hệ thống đã chuyển tiếp RFQ cho Phòng Mua hàng.`);
    }
  };

  const handleReturn = () => {
    const reason = prompt('Nhập nội dung yêu cầu xưởng chỉnh sửa bổ sung:');
    if (reason) {
      onNotify(`Đã gửi yêu cầu chỉnh sửa lại phiếu [${request.id}] cho kỹ thuật viên.`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Breadcrumb & Header Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-condensed font-bold uppercase tracking-wider text-[#59627A]">
          <button
            onClick={() => onNavigate('requests')}
            className="hover:text-[#283A97] flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Đề nghị vật tư
          </button>
          <span>/</span>
          <span className="text-[#0E1220] font-mono font-bold bg-white px-2 py-0.5 border border-[#DCE1EC] rounded">
            {request.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="h-[34px] px-3 bg-white border border-[#DCE1EC] hover:bg-[#EEF0F9] text-[#0E1220] rounded text-[12px] font-condensed font-bold uppercase flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            Sao chép mã
          </button>
          <button
            onClick={handlePrint}
            className="h-[34px] px-3 bg-white border border-[#DCE1EC] hover:bg-[#EEF0F9] text-[#0E1220] rounded text-[12px] font-condensed font-bold uppercase flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            In phiếu
          </button>
          <button
            onClick={handleExportPDF}
            className="h-[34px] px-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[#283A97] rounded text-[12px] font-condensed font-bold uppercase flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Tải PDF
          </button>
        </div>
      </div>

      {/* Main Title & Status Badges */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-0.5 border border-[#C6CCE9]">
              CHỜ DUYỆT CẤP 1 (QUẢN ĐỐC)
            </span>
            <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-0.5 border border-[#C6CCE9]">
              {request.priority}
            </span>
          </div>
          <h1 className="text-[20px] font-bold text-[#0E1220]">
            Chi tiết Đề nghị Vật tư #{request.id}
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[12px] text-[#59627A] block">Tổng giá trị dự toán:</span>
          <span className="font-mono text-[20px] font-bold text-[#283A97]">
            {total.toLocaleString('vi-VN')} VNĐ
          </span>
        </div>
      </div>

      {/* Header Info Grid */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-[13px]">
        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            BỘ PHẬN ĐỀ NGHỊ
          </span>
          <span className="font-bold text-[#0E1220] block mt-0.5">{request.department}</span>
          <span className="text-[11.5px] text-[#59627A]">Phân xưởng sản xuất 2</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            NGƯỜI YÊU CẦU
          </span>
          <span className="font-bold text-[#0E1220] block mt-0.5">{request.creator}</span>
          <span className="text-[11.5px] text-[#59627A]">{request.creatorRole}</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            LỆNH SẢN XUẤT (LSX)
          </span>
          <span className="font-mono font-bold text-[#283A97] block mt-0.5">{request.lsxCode}</span>
          <span className="text-[11.5px] text-[#59627A]">{request.lsxItem}</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            THỜI ĐIỂM TẠO PHIẾU
          </span>
          <span className="font-mono text-[#0E1220] block mt-0.5">{request.date} 09:12</span>
          <span className="text-[11.5px] text-[#4557b2] font-bold">Đã lưu trữ hệ thống</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            KỲ HẠN CẦN VẬT TƯ
          </span>
          <span className="font-mono font-bold text-[#EE202E] block mt-0.5">{request.deadline}</span>
          <span className="text-[11.5px] text-[#EE202E] flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[13px]">alarm</span>
            Ưu tiên xử lý nhanh
          </span>
        </div>
      </div>

      {/* LINE ITEMS TABLE */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#DCE1EC] bg-[#F4F6FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">format_list_bulleted</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              DANH MỤC VẬT TƯ ĐỀ NGHỊ ({items.length} MÃ VẬT TƯ)
            </h2>
          </div>
          <span className="font-mono text-[12px] text-[#59627A]">
            Tỷ giá hạch toán: 1.00 VNĐ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#F4F6FA] border-b border-[#DCE1EC] font-condensed font-bold text-[11px] text-[#59627A] uppercase tracking-wider">
                <th className="p-3 w-10 text-center">STT</th>
                <th className="p-3">MÃ &amp; TÊN VẬT TƯ / QUY CÁCH KỸ THUẬT</th>
                <th className="p-3 w-28 text-center">ĐƠN VỊ TÍNH</th>
                <th className="p-3 w-28 text-center">SỐ LƯỢNG</th>
                <th className="p-3 w-28 text-center">TỒN KHO</th>
                <th className="p-3 w-36 text-right">ĐƠN GIÁ DỰ KIẾN</th>
                <th className="p-3 w-40 text-right">THÀNH TIỀN DỰ TOÁN</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE1EC] text-[13px]">
              {items.map((item, idx) => {
                const sub = item.quantity * item.unitPrice;
                return (
                  <tr key={item.id} className="hover:bg-[#EEF0F9]/30 transition-colors">
                    <td className="p-3 text-center font-mono font-bold text-[#59627A]">{idx + 1}</td>

                    <td className="p-3">
                      <div className="font-bold text-[#0E1220]">{item.name}</div>
                      <div className="font-mono text-[11.5px] text-[#59627A]">{item.code}</div>
                      <div className="text-[12px] text-[#59627A] mt-0.5">{item.spec}</div>
                      {item.note && (
                        <div className="text-[11.5px] text-[#283A97] italic mt-0.5">
                          * Ghi chú xưởng: {item.note}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono text-[#59627A]">{item.unit}</td>

                    <td className="p-3 text-center font-mono font-bold text-[14px] text-[#0E1220]">
                      {item.quantity}
                    </td>

                    <td className="p-3 text-center font-mono text-[12px]">
                      <span
                        className={`pill px-2 py-0.2 ${
                          item.stockQty === 0
                            ? 'bg-[#FDECEE] text-[#EE202E]'
                            : 'bg-[#EEF0F9] text-[#283A97]'
                        }`}
                      >
                        {item.stockQty} {item.unit}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono text-[#59627A]">
                      {item.unitPrice.toLocaleString('vi-VN')} đ
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-[#0E1220] text-[14px]">
                      {sub.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                );
              })}

              {/* Total Summary Row */}
              <tr className="bg-[#F4F6FA] font-bold border-t-2 border-[#DCE1EC]">
                <td colSpan={6} className="p-3 text-right font-condensed uppercase text-[#0E1220]">
                  TỔNG CỘNG GIÁ TRỊ VẬT TƯ (TẠM TÍNH):
                </td>
                <td className="p-3 text-right font-mono text-[16px] text-[#283A97]">
                  {total.toLocaleString('vi-VN')} VNĐ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ATTACHMENTS & PHOTOS */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">attach_file</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              TỆP ĐÍNH KÈM &amp; ẢNH HIỆN TRẠNG (2 TỆP)
            </h2>
          </div>
          <span className="text-[12px] text-[#59627A]">Tất cả tệp đã qua quét mã an toàn</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* File 1 */}
          <div className="p-3 border border-[#DCE1EC] rounded bg-[#F4F6FA] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80"
                alt="chi-tiet-cot-truc.jpg"
                className="w-12 h-12 object-cover rounded border border-[#DCE1EC] shrink-0"
              />
              <div className="truncate">
                <span className="font-bold text-[#0E1220] block truncate text-[13px]">
                  chi-tiet-cot-truc.jpg
                </span>
                <span className="text-[11.5px] text-[#59627A] font-mono">1.2 MB • Ảnh chụp phôi tại máy</span>
              </div>
            </div>
            <button
              onClick={() => onNotify('Đang tải hình ảnh phôi chi tiết...')}
              className="p-1.5 text-[#283A97] hover:bg-white rounded"
              title="Tải tệp"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>

          {/* File 2 */}
          <div className="p-3 border border-[#DCE1EC] rounded bg-[#F4F6FA] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 bg-white rounded border border-[#DCE1EC] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#EE202E] text-[26px]">picture_as_pdf</span>
              </div>
              <div className="truncate">
                <span className="font-bold text-[#0E1220] block truncate text-[13px]">
                  Ban-ve-truc-truyen-dong-rev02.pdf
                </span>
                <span className="text-[11.5px] text-[#59627A] font-mono">4.5 MB • Bản vẽ chế tạo ký duyệt</span>
              </div>
            </div>
            <button
              onClick={() => onNotify('Đang tải file bản vẽ kỹ thuật CAD/PDF...')}
              className="p-1.5 text-[#283A97] hover:bg-white rounded"
              title="Tải tệp"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
        </div>
      </div>

      {/* AUDIT TRAIL / COMMENT STREAM */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">forum</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              TRAO ĐỔI VỀ CHỨNG TỪ &amp; TIẾN TRÌNH XỬ LÝ
            </h2>
          </div>
          <span className="font-mono text-[12px] text-[#59627A]">({comments.length} phản hồi)</span>
        </div>

        {/* Comment list */}
        <div className="space-y-3">
          {comments.map((cm) => (
            <div
              key={cm.id}
              className={`p-3 rounded border text-[13px] ${
                cm.isHighlight
                  ? 'bg-[#EEF0F9] border-[#C6CCE9]'
                  : 'bg-[#F4F6FA] border-[#DCE1EC]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#283A97] text-white text-[11px] font-bold flex items-center justify-center font-condensed">
                    {cm.avatar}
                  </div>
                  <span className="font-bold text-[#0E1220]">{cm.author}</span>
                  <span className="text-[11px] text-[#59627A]">• {cm.role}</span>
                </div>
                <span className="font-mono text-[11px] text-[#8A93AA]">{cm.time}</span>
              </div>

              <p className="text-[#0E1220] leading-relaxed pl-8">{cm.content}</p>

              {cm.attachment && (
                <div className="ml-8 mt-2 inline-flex items-center gap-2 p-1.5 bg-white border border-[#DCE1EC] rounded text-[11.5px]">
                  <span className="material-symbols-outlined text-[#EE202E] text-[16px]">attachment</span>
                  <span className="font-mono font-bold text-[#283A97]">{cm.attachment.name}</span>
                  <span className="text-[#8A93AA]">({cm.attachment.size})</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New comment input */}
        <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t border-[#EDF0F6]">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Nhập nội dung trao đổi, chỉ đạo kỹ thuật..."
            className="flex-1 h-[38px] px-3 text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
          />
          <button
            type="submit"
            className="h-[38px] px-4 bg-[#283A97] text-white rounded font-condensed font-bold text-[12px] uppercase hover:bg-[#1E2C75] flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Gửi phản hồi
          </button>
        </form>
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-[250px] z-40 bg-white border-t-2 border-[#DCE1EC] px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-1">
            MÃ PHIẾU: {request.id}
          </span>
          <span className="font-mono font-bold text-[14px] text-[#0E1220] hidden sm:inline">
            Tổng dự toán: {total.toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleReturn}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-[#59627A]">replay</span>
            <span>TRẢ LẠI / SỬA</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn hủy phiếu đề nghị vật tư [${request.id}]?`)) {
                onNotify(`Đã hủy phiếu đề nghị vật tư [${request.id}].`);
                onNavigate('requests');
              }
            }}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#EE202E] hover:bg-[#FDECEE] font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>HỦY PHIẾU</span>
          </button>

          <button
            onClick={handleApprove}
            className="h-[38px] px-6 rounded bg-[#283A97] hover:bg-[#1E2C75] active:scale-[0.98] text-white font-condensed font-bold text-[12px] uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[19px]">check_circle</span>
            <span>DUYỆT ĐỀ NGHỊ (CẤP 1)</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
