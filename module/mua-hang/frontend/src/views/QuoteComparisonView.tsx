import React, { useState } from 'react';
import { SupplierBid } from '../types';
import { INITIAL_SUPPLIER_BIDS } from '../data/initialData';

interface QuoteComparisonViewProps {
  onNotify: (msg: string) => void;
}

export const QuoteComparisonView: React.FC<QuoteComparisonViewProps> = ({ onNotify }) => {
  const [bids, setBids] = useState<SupplierBid[]>(INITIAL_SUPPLIER_BIDS);
  const [selectedSupplierId, setSelectedSupplierId] = useState('minh-ngoc');
  const [filterOption, setFilterOption] = useState('all');

  // Form states for quick quote adjustment
  const [editSupplier, setEditSupplier] = useState('minh-ngoc');
  const [editDate, setEditDate] = useState('2026-04-08');
  const [editLeadDays, setEditLeadDays] = useState(3);
  const [p1, setP1] = useState('24.500');
  const [p2, setP2] = useState('345.000');
  const [p3, setP3] = useState('920.000');

  // Attached PDF files
  const attachedFiles = [
    {
      name: 'BaoGia_ThepMinhNgoc_9921.pdf',
      size: '1.8 MB',
      note: 'Đã đối chiếu dấu đỏ'
    },
    {
      name: 'CoKhiPhuongNam_BG_RFQ0401.pdf',
      size: '2.4 MB',
      note: 'Có bảng Mill test đính kèm'
    },
    {
      name: 'VietA_Metal_Quote_Rev0.pdf',
      size: '940 KB',
      note: 'Bản nháp qua email'
    }
  ];

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const num1 = parseFloat(p1.replace(/\./g, '')) || 0;
    const num2 = parseFloat(p2.replace(/\./g, '')) || 0;
    const num3 = parseFloat(p3.replace(/\./g, '')) || 0;

    const total1 = num1 * 3500;
    const total2 = num2 * 20;
    const total3 = num3 * 10;
    const totalGoods = total1 + total2 + total3;

    setBids((prev) =>
      prev.map((b) => {
        if (b.supplierId === editSupplier) {
          return {
            ...b,
            leadTimeDays: editLeadDays,
            leadTime: `${editLeadDays} ngày`,
            items: [
              { ...b.items[0], unitPrice: num1, totalPrice: total1 },
              { ...b.items[1], unitPrice: num2, totalPrice: total2 },
              { ...b.items[2], unitPrice: num3, totalPrice: total3 }
            ],
            totalItemCost: totalGoods,
            finalEvaluationCost: totalGoods + b.shippingCost
          };
        }
        return b;
      })
    );
    onNotify('Đã cập nhật đơn giá và tính lại ma trận so sánh thành công!');
  };

  const handleExport = () => {
    onNotify('Đang xuất báo cáo so sánh bảng giá RFQ-2026-0089 định dạng Excel & PDF...');
  };

  const handleNegotiate = () => {
    const target = prompt('Nhập tên nhà cung cấp bạn muốn gửi thư đàm phán lại:', 'Kim khí Việt Á');
    if (target) {
      onNotify(`Đã gửi yêu cầu đàm phán lại đơn giá và lead-time tới NCC [${target}] qua email.`);
    }
  };

  const handleApprove = () => {
    const selectedSupplier = bids.find((b) => b.supplierId === selectedSupplierId);
    const confirmed = window.confirm(
      `XÁC NHẬN TRÌNH DUYỆT:\n\nBạn có chắc chắn muốn chốt chọn [${selectedSupplier?.supplierName}] với tổng giá trị quy đổi ${selectedSupplier?.finalEvaluationCost.toLocaleString('vi-VN')} đ cho Lệnh sản xuất MBC0326-018 không?`
    );
    if (confirmed) {
      onNotify(`THÀNH CÔNG: Hồ sơ so sánh báo giá đã được chuyển lên Ban Giám Đốc phê duyệt lựa chọn [${selectedSupplier?.supplierName}].`);
    }
  };

  const formatVND = (val: number) => val.toLocaleString('vi-VN') + ' đ';

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-[12px] font-condensed font-bold uppercase tracking-wider text-[#59627A]">
        <span className="hover:text-[#283A97] flex items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-[15px]">request_quote</span>
          Báo giá
        </span>
        <span>/</span>
        <span className="hover:text-[#283A97] cursor-pointer">Yêu cầu báo giá</span>
        <span>/</span>
        <span className="text-[#0E1220] font-bold font-mono text-[12px] bg-white px-2 py-0.5 border border-[#DCE1EC] rounded">
          RFQ-2026-0089: So sánh báo giá Thép tròn S45C phi 65x1200mm &amp; Dao phay ngón (Lệnh sản xuất MBC0326-018)
        </span>
      </div>

      {/* RFQ Summary Bento Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Scope Card */}
        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div className="border-b border-[#DCE1EC] pb-3 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-0.5 border border-[#C6CCE9]">
                  RFQ SẢN XUẤT
                </span>
                <span className="text-[12px] text-[#59627A]">
                  Mã LSX: <span className="font-mono text-[#0E1220] font-bold">MBC0326-018</span>
                </span>
              </div>
              <h1 className="text-[18px] font-bold text-[#0E1220] leading-snug">
                Thép tròn S45C phi 65x1200mm &amp; Bộ dao phay ngón carbide D12-D20
              </h1>
            </div>
            <div className="flex items-center gap-1 text-[#59627A] shrink-0">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span className="font-mono text-[11px]">BAR: 89347890</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-[12px]">
            <div>
              <span className="text-[#59627A] block font-condensed font-bold text-[11px] uppercase">
                ĐỊA ĐIỂM GIAO:
              </span>
              <span className="font-bold text-[#0E1220] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                Kho Vật tư Xưởng 2
              </span>
            </div>
            <div>
              <span className="text-[#59627A] block font-condensed font-bold text-[11px] uppercase">
                BỘ PHẬN YÊU CẦU:
              </span>
              <span className="font-bold text-[#0E1220]">Xưởng Cơ khí Chính xác</span>
            </div>
            <div>
              <span className="text-[#59627A] block font-condensed font-bold text-[11px] uppercase">
                TIẾN ĐỘ LSX:
              </span>
              <span className="font-bold text-[#EE202E] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Cần trước 15/04/2026
              </span>
            </div>
          </div>
        </div>

        {/* Deadline & Status */}
        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
            <span className="font-condensed font-bold text-[12px] uppercase text-[#59627A]">
              TRẠNG THÁI GÓI THẦU
            </span>
            <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2 py-0.5 border border-[#DCE1EC] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#283A97] animate-ping"></span>
              ĐANG SO SÁNH / CHỜ CHỌN
            </span>
          </div>

          <div className="py-3">
            <div className="text-[12px] text-[#59627A]">KỲ HẠN ĐÓNG BÁO GIÁ:</div>
            <div className="text-[16px] font-bold text-[#0E1220] font-mono flex items-center gap-2 mt-0.5">
              <span className="material-symbols-outlined text-[20px] text-[#630009]">timer</span>
              17:30 - 10/04/2026
            </div>
            <p className="text-[12px] text-[#EE202E] mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Còn 2 ngày để hoàn tất lựa chọn thầu
            </p>
          </div>

          <div className="text-[12px] text-[#8A93AA] border-t border-[#EDF0F6] pt-2">
            Phụ trách: <strong className="text-[#0E1220]">Phạm Huyền Như</strong>
          </div>
        </div>

        {/* Participating Suppliers */}
        <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
            <span className="font-condensed font-bold text-[12px] uppercase text-[#59627A]">
              NHÀ CUNG CẤP THAM GIA
            </span>
            <span className="font-mono font-bold text-[#283A97] text-[12px] bg-[#EEF0F9] px-2 py-0.5 rounded">
              03/03 ĐÃ GỬI
            </span>
          </div>

          <div className="space-y-1.5 py-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-[#0E1220] font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#4557b2]">check_circle</span>
                Thép Minh Ngọc
              </span>
              <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-2 py-0.5">TỐI ƯU</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-[#0E1220] font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#4557b2]">check_circle</span>
                Cơ khí Phương Nam
              </span>
              <span className="pill bg-[#F4F6FA] text-[#59627A] text-[10px] px-2 py-0.5">ĐỦ HS</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-[#0E1220] font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#EE202E]">error</span>
                Kim khí Việt Á
              </span>
              <span className="pill bg-[#FDECEE] text-[#EE202E] border border-[#F9B9BE] text-[10px] px-2 py-0.5">
                CẢNH BÁO
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#EDF0F6] text-right">
            <a
              href="#quick-update-form"
              className="text-[#283A97] hover:underline text-[12px] font-bold inline-flex items-center gap-1"
            >
              Chỉnh sửa báo giá &amp; file PDF
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>

      {/* MATRIX COMPARISON TABLE */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-[#DCE1EC] bg-[#F4F6FA]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#283A97]">balance</span>
            <div>
              <h2 className="text-[15px] font-bold text-[#0E1220] leading-tight uppercase font-condensed">
                MA TRẬN SO SÁNH ĐƠN GIÁ &amp; NĂNG LỰC NHÀ CUNG CẤP
              </h2>
              <p className="text-[12px] text-[#59627A]">
                Đơn vị tiền tệ: VNĐ (Việt Nam Đồng). Tỷ giá hạch toán nội bộ 1.00.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A]">
              LỌC SO SÁNH:
            </span>
            <select
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
              className="h-[34px] text-[13px] bg-white border border-[#DCE1EC] rounded px-2.5 py-1 text-[#0E1220] focus:border-[#283A97] focus:ring-0 outline-none"
            >
              <option value="all">Tất cả 03 Nhà Cung Cấp</option>
              <option value="cocq">Chỉ hiển thị NCC hợp lệ CO/CQ</option>
              <option value="price">Theo thứ tự giá tăng dần</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[#F4F6FA] border-b border-[#DCE1EC] font-condensed font-bold text-[11px] text-[#59627A] uppercase tracking-wider">
                <th className="p-3 w-[260px] sticky left-0 bg-[#F4F6FA] z-10 border-r border-[#DCE1EC]">
                  TIÊU CHÍ SO SÁNH &amp; DANH MỤC VẬT TƯ
                </th>
                <th className="p-3 w-[110px] text-center border-r border-[#DCE1EC]">ĐVT / S.LƯỢNG</th>

                {/* Supplier 1: Minh Ngọc */}
                <th
                  onClick={() => setSelectedSupplierId('minh-ngoc')}
                  className={`p-3 w-[280px] cursor-pointer transition-colors relative ${
                    selectedSupplierId === 'minh-ngoc'
                      ? 'bg-[#EEF0F9]/80 border-r-2 border-l-2 border-[#283A97]'
                      : 'border-r border-[#DCE1EC] hover:bg-[#F4F6FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="pill bg-[#283A97] text-white text-[10px] px-2 py-0.5">
                      LỰA CHỌN TỐI ƯU #1
                    </span>
                    <span className="font-mono text-[11px] text-[#283A97] font-bold">BG-MN-9921</span>
                  </div>
                  <div className="text-[15px] font-bold text-[#283A97] font-condensed">
                    CÔNG TY THÉP MINH NGỌC
                  </div>
                  <div className="text-[12px] text-[#59627A] font-normal">KCN Biên Hòa 2, Đồng Nai</div>
                </th>

                {/* Supplier 2: Phương Nam */}
                <th
                  onClick={() => setSelectedSupplierId('phuong-nam')}
                  className={`p-3 w-[260px] cursor-pointer transition-colors ${
                    selectedSupplierId === 'phuong-nam'
                      ? 'bg-[#EEF0F9]/80 border-r-2 border-l-2 border-[#283A97]'
                      : 'border-r border-[#DCE1EC] hover:bg-[#F4F6FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="pill bg-[#F4F6FA] text-[#59627A] text-[10px] px-2 py-0.5 border border-[#DCE1EC]">
                      ĐỀ XUẤT #2
                    </span>
                    <span className="font-mono text-[11px] text-[#59627A]">PN-RFQ-0401</span>
                  </div>
                  <div className="text-[15px] font-bold text-[#0E1220] font-condensed">
                    CƠ KHÍ PHƯƠNG NAM
                  </div>
                  <div className="text-[12px] text-[#59627A] font-normal">Thủ Đức, TP. Hồ Chí Minh</div>
                </th>

                {/* Supplier 3: Việt Á */}
                <th
                  onClick={() => setSelectedSupplierId('viet-a')}
                  className={`p-3 w-[260px] cursor-pointer transition-colors ${
                    selectedSupplierId === 'viet-a'
                      ? 'bg-[#EEF0F9]/80 border-r-2 border-l-2 border-[#283A97]'
                      : 'border-r border-[#DCE1EC] hover:bg-[#F4F6FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="pill bg-[#FDECEE] text-[#EE202E] text-[10px] px-2 py-0.5 border border-[#F9B9BE]">
                      CHẬM TIẾN ĐỘ / THIẾU CO
                    </span>
                    <span className="font-mono text-[11px] text-[#EE202E] font-bold">VA-2026-88</span>
                  </div>
                  <div className="text-[15px] font-bold text-[#EE202E] font-condensed">
                    KIM KHÍ VIỆT Á
                  </div>
                  <div className="text-[12px] text-[#59627A] font-normal">Dĩ An, Bình Dương</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE1EC] text-[13px] font-condensed">
              {/* Category Header 1 */}
              <tr className="bg-[#F4F6FA] font-bold">
                <td className="py-2 px-3 text-[#283A97] tracking-wider uppercase" colSpan={5}>
                  I. ĐƠN GIÁ CHI TIẾT TỪNG DANH MỤC VẬT TƯ (CHƯA VAT)
                </td>
              </tr>

              {/* Item 1 */}
              <tr className="hover:bg-[#EEF0F9]/30 transition-colors">
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">1. Thép tròn S45C cán nóng</div>
                  <div className="text-[12px] text-[#59627A] font-mono">Quy cách: Ø65 x 1200mm | Dung sai h9</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Mã vật tư: <span className="font-mono">VT-S45C-065</span></div>
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">3.500</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Kg (Cây)</div>
                </td>
                {/* Minh Ngọc */}
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-[#283A97] font-bold">
                      {bids[0].items[0].unitPrice.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-1.5 py-0.2">THẤP NHẤT</span>
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">
                    Thành tiền: <strong className="text-[#0E1220]">{formatVND(bids[0].items[0].totalPrice)}</strong>
                  </div>
                </td>
                {/* Phương Nam */}
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[1].items[0].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[1].items[0].totalPrice)}</div>
                  <div className="text-[11px] text-[#8A93AA]">{bids[1].items[0].diffNote}</div>
                </td>
                {/* Việt Á */}
                <td className="p-3 font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[2].items[0].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[2].items[0].totalPrice)}</div>
                  <div className="text-[11px] text-[#8A93AA]">{bids[2].items[0].diffNote}</div>
                </td>
              </tr>

              {/* Item 2 */}
              <tr className="hover:bg-[#EEF0F9]/30 transition-colors">
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">2. Dao phay ngón Carbide 4 me cắt</div>
                  <div className="text-[12px] text-[#59627A] font-mono">Model: 4FL-D12x30x75-TiAlN Coating</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Mã vật tư: <span className="font-mono">CC-EM-D12</span></div>
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">20</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Cái (Hộp)</div>
                </td>
                {/* Minh Ngọc */}
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-[#283A97] font-bold">
                      {bids[0].items[1].unitPrice.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-1.5 py-0.2">TỐT NHẤT</span>
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">
                    Thành tiền: <strong className="text-[#0E1220]">{formatVND(bids[0].items[1].totalPrice)}</strong>
                  </div>
                </td>
                {/* Phương Nam */}
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[1].items[1].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[1].items[1].totalPrice)}</div>
                </td>
                {/* Việt Á */}
                <td className="p-3 font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[2].items[1].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[2].items[1].totalPrice)}</div>
                </td>
              </tr>

              {/* Item 3 */}
              <tr className="hover:bg-[#EEF0F9]/30 transition-colors">
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">3. Dao phay ngón thô Carbide D20</div>
                  <div className="text-[12px] text-[#59627A] font-mono">Model: ROUGH-D20x45x100-AlCrN</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Mã vật tư: <span className="font-mono">CC-EM-D20R</span></div>
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">10</div>
                  <div className="text-[11.5px] text-[#8A93AA]">Cái (Hộp)</div>
                </td>
                {/* Minh Ngọc */}
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97] font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[0].items[2].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">
                    Thành tiền: <strong className="text-[#0E1220]">{formatVND(bids[0].items[2].totalPrice)}</strong>
                  </div>
                </td>
                {/* Phương Nam */}
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-[#283A97] font-bold">
                      {bids[1].items[2].unitPrice.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-1.5 py-0.2">GIÁ RẺ HƠN</span>
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[1].items[2].totalPrice)}</div>
                </td>
                {/* Việt Á */}
                <td className="p-3 font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">
                    {bids[2].items[2].unitPrice.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-0.5">Thành tiền: {formatVND(bids[2].items[2].totalPrice)}</div>
                </td>
              </tr>

              {/* Category Header 2 */}
              <tr className="bg-[#F4F6FA] font-bold">
                <td className="py-2 px-3 text-[#283A97] tracking-wider uppercase" colSpan={5}>
                  II. TỔNG HỢP CHI PHÍ &amp; ĐIỀU KIỆN THƯƠNG MẠI
                </td>
              </tr>

              {/* Total Item Cost */}
              <tr className="bg-[#F4F6FA]/40 font-bold">
                <td className="p-3 sticky left-0 bg-[#F4F6FA] z-10 border-r border-[#DCE1EC] text-[#0E1220]">
                  TỔNG GIÁ TRỊ VẬT TƯ (TRƯỚC VAT)
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC] font-mono">-</td>
                <td className="p-3 bg-[#EEF0F9]/50 border-r-2 border-l-2 border-[#283A97] font-mono text-[15px] text-[#283A97] font-bold">
                  {formatVND(bids[0].totalItemCost)}
                </td>
                <td className="p-3 border-r border-[#DCE1EC] font-mono text-[15px] text-[#0E1220]">
                  {formatVND(bids[1].totalItemCost)}
                </td>
                <td className="p-3 border-r border-[#DCE1EC] font-mono text-[15px] text-[#0E1220]">
                  {formatVND(bids[2].totalItemCost)}
                </td>
              </tr>

              {/* Shipping */}
              <tr>
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC] text-[#0E1220]">
                  CƯỚC VẬN CHUYỂN VỀ KHO XƯỞNG 2
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC] text-[#8A93AA]">Chuyến xe tải</td>
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97] font-mono">
                  <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2 py-0.5">
                    MIỄN PHÍ VẬN CHUYỂN
                  </span>
                  <div className="text-[11px] text-[#8A93AA] mt-0.5">Đã gồm bốc dỡ vào kho</div>
                </td>
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="text-[#0E1220] font-bold">{formatVND(bids[1].shippingCost)}</div>
                  <div className="text-[11px] text-[#8A93AA]">Giao đến cổng xưởng</div>
                </td>
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="text-[#0E1220] font-bold">{formatVND(bids[2].shippingCost)}</div>
                  <div className="text-[11px] text-[#8A93AA]">Giao đến cổng xưởng</div>
                </td>
              </tr>

              {/* Lead Time */}
              <tr>
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC] text-[#0E1220]">
                  THỜI GIAN GIAO HÀNG (LEAD-TIME)
                  <div className="text-[12px] text-[#59627A]">Yêu cầu xưởng: Giao trước 15/04/2026</div>
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC] text-[#8A93AA]">Ngày</td>
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97] font-mono">
                  <div className="text-[15px] text-[#283A97] font-bold">{bids[0].leadTime}</div>
                  <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-1.5 py-0.2">
                    {bids[0].leadTimeTag}
                  </span>
                </td>
                <td className="p-3 border-r border-[#DCE1EC] font-mono">
                  <div className="text-[15px] text-[#0E1220] font-bold">{bids[1].leadTime}</div>
                  <span className="pill bg-[#F4F6FA] text-[#59627A] text-[10px] px-1.5 py-0.2">
                    {bids[1].leadTimeTag}
                  </span>
                </td>
                <td className="p-3 bg-[#FDECEE] border-l-2 border-[#EE202E] font-mono">
                  <div className="text-[15px] text-[#EE202E] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {bids[2].leadTime}
                  </div>
                  <span className="pill bg-[#8d0011] text-white text-[10px] px-1.5 py-0.2">
                    {bids[2].leadTimeTag}
                  </span>
                </td>
              </tr>

              {/* Payment Terms */}
              <tr>
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC] text-[#0E1220]">
                  ĐIỀU KHOẢN THANH TOÁN (PAYMENT TERMS)
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC] text-[#8A93AA]">Công nợ</td>
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97]">
                  <div className="font-bold text-[#0E1220]">{bids[0].paymentTerms}</div>
                  <div className="text-[12px] text-[#59627A]">{bids[0].paymentNote}</div>
                </td>
                <td className="p-3 border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#0E1220]">{bids[1].paymentTerms}</div>
                  <div className="text-[12px] text-[#59627A]">{bids[1].paymentNote}</div>
                </td>
                <td className="p-3 border-r border-[#DCE1EC]">
                  <div className="font-bold text-[#EE202E]">{bids[2].paymentTerms}</div>
                  <div className="text-[12px] text-[#8A93AA]">{bids[2].paymentNote}</div>
                </td>
              </tr>

              {/* CO/CQ */}
              <tr>
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#DCE1EC] text-[#0E1220]">
                  CHỨNG CHỈ CHẤT LƯỢNG (CO/CQ, MILL TEST)
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC] text-[#8A93AA]">Tiêu chuẩn</td>
                <td className="p-3 bg-[#EEF0F9]/30 border-r-2 border-l-2 border-[#283A97]">
                  <div className="flex items-center gap-1 text-[#283A97] font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    {bids[0].certificate}
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-1">{bids[0].certificateNote}</div>
                </td>
                <td className="p-3 border-r border-[#DCE1EC]">
                  <div className="flex items-center gap-1 text-[#0E1220] font-bold">
                    <span className="material-symbols-outlined text-[16px] text-[#4557b2]">check_circle</span>
                    {bids[1].certificate}
                  </div>
                  <div className="text-[12px] text-[#59627A] mt-1">{bids[1].certificateNote}</div>
                </td>
                <td className="p-3 bg-[#FDECEE] border-l-2 border-[#EE202E]">
                  <div className="flex items-center gap-1 text-[#EE202E] font-bold">
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    {bids[2].certificate}
                  </div>
                  <div className="text-[12px] text-[#EE202E] mt-1">{bids[2].certificateNote}</div>
                </td>
              </tr>

              {/* Final Totals */}
              <tr className="bg-[#F4F6FA] font-bold border-t-2 border-[#DCE1EC]">
                <td className="p-3 sticky left-0 bg-[#F4F6FA] z-10 border-r border-[#DCE1EC] text-[#283A97]">
                  TỔNG GIÁ TRỊ QUY ĐỔI (ĐÃ GỒM SHIP &amp; ĐIỀU KIỆN)
                </td>
                <td className="p-3 text-center border-r border-[#DCE1EC]">-</td>
                {/* Minh Ngọc Final */}
                <td className="p-3 bg-[#EEF0F9] border-r-2 border-l-2 border-[#283A97] font-mono text-[18px] text-[#283A97] font-bold">
                  {formatVND(bids[0].finalEvaluationCost)}
                  <span className="block text-[12px] font-bold text-[#4557b2]">
                    {bids[0].finalNote}
                  </span>
                </td>
                {/* Phương Nam Final */}
                <td className="p-3 border-r border-[#DCE1EC] font-mono text-[15px] text-[#0E1220]">
                  {formatVND(bids[1].finalEvaluationCost)}
                  <span className="block text-[12px] text-[#59627A] font-normal">
                    {bids[1].finalNote}
                  </span>
                </td>
                {/* Việt Á Final */}
                <td className="p-3 border-r border-[#DCE1EC] font-mono text-[15px] text-[#0E1220]">
                  {formatVND(bids[2].finalEvaluationCost)}
                  <span className="block text-[12px] text-[#EE202E] font-bold">
                    {bids[2].finalNote}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-3 bg-white border-t border-[#DCE1EC] flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#59627A]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#EEF0F9] border border-[#283A97] rounded-sm"></span>
              Cột bôi đậm viền xanh: Nhà cung cấp đề xuất trúng thầu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#FDECEE] border border-[#EE202E] rounded-sm"></span>
              Vùng cảnh báo đỏ: Điều khoản không đạt yêu cầu kỹ thuật hoặc tiến độ
            </span>
          </div>
          <div>
            <span>Ngày lập ma trận: <strong className="font-mono">08/04/2026 14:15</strong></span>
          </div>
        </div>
      </div>

      {/* QUICK PRICE UPDATE & PDF STORAGE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="quick-update-form">
        {/* Quick Edit Form */}
        <div className="bg-white border border-[#DCE1EC] rounded p-5 shadow-sm lg:col-span-2">
          <div className="border-b border-[#DCE1EC] pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#283A97] text-[20px]">edit_note</span>
              <h3 className="text-[15px] font-bold text-[#0E1220] uppercase font-condensed">
                CẬP NHẬT NHANH ĐƠN GIÁ BÁO GIÁ NHÀ CUNG CẤP
              </h3>
            </div>
            <span className="text-[12px] text-[#59627A]">Hỗ trợ nhập trực tiếp từ bản giấy / email</span>
          </div>

          <form onSubmit={handleSavePrice} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-condensed font-bold text-[12px] uppercase text-[#59627A] mb-1">
                  CHỌN NHÀ CUNG CẤP
                </label>
                <select
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full h-[38px] text-[13px] bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                >
                  <option value="minh-ngoc">Thép Minh Ngọc (BG-MN-9921)</option>
                  <option value="phuong-nam">Cơ khí Phương Nam (PN-RFQ-0401)</option>
                  <option value="viet-a">Kim khí Việt Á (VA-2026-88)</option>
                </select>
              </div>

              <div>
                <label className="block font-condensed font-bold text-[12px] uppercase text-[#59627A] mb-1">
                  NGÀY HIỆU LỰC BÁO GIÁ
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full h-[38px] text-[13px] font-mono bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                />
              </div>

              <div>
                <label className="block font-condensed font-bold text-[12px] uppercase text-[#59627A] mb-1">
                  THỜI GIAN GIAO HÀNG (SỐ NGÀY)
                </label>
                <input
                  type="number"
                  value={editLeadDays}
                  onChange={(e) => setEditLeadDays(parseInt(e.target.value) || 1)}
                  className="w-full h-[38px] text-[13px] font-mono bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-[#F4F6FA] rounded border border-[#DCE1EC] space-y-3">
              <div className="font-condensed font-bold text-[12px] uppercase text-[#0E1220] flex items-center justify-between">
                <span>ĐIỀU CHỈNH ĐƠN GIÁ THEO DANH MỤC (VNĐ)</span>
                <span className="text-[12px] text-[#8A93AA] font-normal">Tự động tính lại tổng sau khi đổi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[12px] text-[#0E1220] truncate mb-1">
                    1. Thép S45C Ø65x1200mm (Đ/kg)
                  </span>
                  <input
                    type="text"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    className="w-full h-[36px] font-mono text-[13px] bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                  />
                </div>
                <div>
                  <span className="block text-[12px] text-[#0E1220] truncate mb-1">
                    2. Dao phay ngón D12 (Đ/cái)
                  </span>
                  <input
                    type="text"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    className="w-full h-[36px] font-mono text-[13px] bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                  />
                </div>
                <div>
                  <span className="block text-[12px] text-[#0E1220] truncate mb-1">
                    3. Dao phay thô D20 (Đ/cái)
                  </span>
                  <input
                    type="text"
                    value={p3}
                    onChange={(e) => setP3(e.target.value)}
                    className="w-full h-[36px] font-mono text-[13px] bg-white border border-[#DCE1EC] rounded px-3 text-[#0E1220] focus:border-[#283A97] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setP1('24.500');
                  setP2('345.000');
                  setP3('920.000');
                }}
                className="h-[36px] px-4 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] font-condensed font-bold text-[12px] uppercase transition-colors"
              >
                HỦY THAY ĐỔI
              </button>
              <button
                type="submit"
                className="h-[36px] px-5 rounded bg-[#283A97] hover:bg-[#1E2C75] text-white font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                LƯU &amp; CẬP NHẬT MA TRẬN
              </button>
            </div>
          </form>
        </div>

        {/* Attached PDF Files */}
        <div className="bg-white border border-[#DCE1EC] rounded p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-[#DCE1EC] pb-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#283A97] text-[20px]">attach_file</span>
                <h3 className="text-[15px] font-bold text-[#0E1220] uppercase font-condensed">
                  BẢN GỐC BÁO GIÁ NCC
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#8A93AA]">PDF / SCAN</span>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() => onNotify('Đã mở hộp thoại tải tệp PDF báo giá đóng dấu đỏ...')}
              className="border-2 border-dashed border-[#DCE1EC] hover:border-[#283A97] rounded p-4 text-center cursor-pointer bg-[#F4F6FA]/50 hover:bg-[#EEF0F9]/30 transition-colors mb-3"
            >
              <span className="material-symbols-outlined text-[28px] text-[#59627A] mb-1">cloud_upload</span>
              <div className="text-[13px] text-[#0E1220] font-medium">Kéo thả file PDF báo giá hoặc click để tải lên</div>
              <div className="text-[11px] text-[#8A93AA] mt-0.5">Dung lượng tối đa 15MB (.pdf, .scan, .zip)</div>
            </div>

            {/* Attached Files List */}
            <div className="space-y-2">
              {attachedFiles.map((f) => (
                <div key={f.name} className="p-2 border border-[#DCE1EC] rounded bg-white flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-[#EE202E] text-[20px]">picture_as_pdf</span>
                    <div className="truncate">
                      <span className="font-bold text-[#0E1220] block truncate">{f.name}</span>
                      <span className="text-[#8A93AA] text-[11px] font-mono">{f.size} • {f.note}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNotify(`Đang tải file ${f.name}...`)}
                    className="text-[#283A97] hover:text-[#1E2C75] p-1"
                    title="Tải xuống"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#DCE1EC] text-[12px] text-[#8A93AA] flex items-center justify-between">
            <span>Tổng số: 03 tệp đính kèm</span>
            <span className="text-[#4557b2] font-bold">Trạng thái: Đầy đủ chữ ký</span>
          </div>
        </div>
      </div>

      {/* DEPARTMENT REVIEW & APPROVAL ASSESSMENTS */}
      <div className="bg-white border border-[#DCE1EC] rounded p-5 shadow-sm">
        <div className="border-b border-[#DCE1EC] pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[22px]">rate_review</span>
            <div>
              <h3 className="text-[15px] font-bold text-[#0E1220] uppercase font-condensed">
                Ý KIẾN ĐÁNH GIÁ &amp; ĐỀ XUẤT CHỌN THẦU CỦA PHÒNG MUA HÀNG
              </h3>
              <p className="text-[12px] text-[#59627A]">
                Căn cứ theo quy định mua hàng tập trung và tiến độ Lệnh sản xuất MBC0326-018
              </p>
            </div>
          </div>
          <div>
            <span className="pill bg-[#EEF0F9] text-[#283A97] border border-[#C6CCE9] text-[11px] px-2.5 py-1">
              ĐỀ XUẤT: CHỌN CÔNG TY THÉP MINH NGỌC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Specialist */}
          <div className="bg-[#F4F6FA] p-3.5 rounded border border-[#DCE1EC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-condensed font-bold text-[12px] uppercase text-[#0E1220]">
                  1. ĐÁNH GIÁ CHUYÊN VIÊN MUA HÀNG
                </span>
                <span className="font-mono text-[11px] text-[#59627A]">08/04/2026</span>
              </div>
              <p className="text-[13px] text-[#0E1220] leading-relaxed mb-2">
                "Thép Minh Ngọc đưa ra mức giá tốt nhất cho danh mục thép cán nóng S45C (chiếm 84% tỷ trọng đơn hàng). Đồng thời cam kết miễn phí vận chuyển tận kho và thời gian giao hàng 3 ngày, bảo đảm không làm đình trệ công đoạn tiện phay của xưởng."
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDF0F6] flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#EEF0F9] text-[#283A97] text-[11px] flex items-center justify-center font-bold">
                HN
              </div>
              <span className="text-[12px] text-[#0E1220] font-medium">
                Phạm Huyền Như (Chuyên viên Mua hàng)
              </span>
            </div>
          </div>

          {/* 2. QA/QC Confirmation */}
          <div className="bg-[#F4F6FA] p-3.5 rounded border border-[#DCE1EC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-condensed font-bold text-[12px] uppercase text-[#0E1220]">
                  2. XÁC NHẬN KỸ THUẬT &amp; QA/QC
                </span>
                <span className="font-mono text-[11px] text-[#59627A]">08/04/2026</span>
              </div>
              <p className="text-[13px] text-[#0E1220] leading-relaxed mb-2">
                "Xác nhận phôi thép POSCO của NCC Minh Ngọc có độ đồng đều cấu trúc tế vi và độ cứng đạt chuẩn gia công chi tiết trục chính. Không chấp nhận chào hàng từ Kim khí Việt Á do không cam kết kịp chứng chỉ CO/CQ trước khi xuất xưởng."
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDF0F6] flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#EEF0F9] text-[#283A97] text-[11px] flex items-center justify-center font-bold">
                TV
              </div>
              <span className="text-[12px] text-[#0E1220] font-medium">
                Trần Vũ Tuấn (Kỹ sư Trưởng QA Xưởng 2)
              </span>
            </div>
          </div>

          {/* 3. Head of Procurement */}
          <div className="bg-[#EEF0F9]/40 p-3.5 rounded border border-[#C6CCE9] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-condensed font-bold text-[12px] uppercase text-[#283A97]">
                  3. KẾT LUẬN TRƯỞNG PHÒNG MUA HÀNG
                </span>
                <span className="font-mono text-[11px] text-[#283A97] font-bold">CHỜ PHÊ DUYỆT</span>
              </div>
              <p className="text-[13px] text-[#0E1220] leading-relaxed mb-2">
                "Thống nhất đề xuất chọn thầu <strong className="text-[#283A97] font-bold">CÔNG TY THÉP MINH NGỌC</strong> với tổng giá trị <strong>101.850.000 VNĐ</strong> (chưa VAT). Đề nghị làm hợp đồng nguyên tắc công nợ 30 ngày, điều khoản phạt 1%/ngày nếu giao trễ sau ngày 13/04/2026."
              </p>
            </div>
            <div className="pt-2 border-t border-[#EDF0F6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#283A97] text-white text-[11px] flex items-center justify-center font-bold">
                  QL
                </div>
                <span className="text-[12px] text-[#0E1220] font-bold">
                  Nguyễn Quốc Long (TP. Cung ứng)
                </span>
              </div>
              <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-2 py-0.5 border border-[#283A97]">
                ĐỒNG THUẬN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM OPERATIONAL ACTION BAR */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-[250px] z-40 bg-white border-t-2 border-[#DCE1EC] px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="pill bg-[#EEF0F9] text-[#283A97] border border-[#C6CCE9] text-[11px] px-2.5 py-1">
              LỰA CHỌN: {selectedSupplierId === 'minh-ngoc' ? 'MINH NGỌC' : selectedSupplierId === 'phuong-nam' ? 'PHƯƠNG NAM' : 'VIỆT Á'}
            </span>
            <span className="font-mono text-[16px] font-bold text-[#0E1220]">
              {formatVND(bids.find((b) => b.supplierId === selectedSupplierId)?.finalEvaluationCost || 101850000)}
            </span>
          </div>
          <div className="text-[12px] text-[#8A93AA] hidden md:inline">
            (Tiết kiệm 7.150.000 đ so với NCC cao nhất)
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleExport}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#EEF0F9] hover:text-[#283A97] font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span className="hidden sm:inline">XUẤT BẢNG SO SÁNH (EXCEL/PDF)</span>
            <span className="sm:hidden">XUẤT FILE</span>
          </button>

          <button
            onClick={handleNegotiate}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-[#59627A]">history_edu</span>
            <span>YÊU CẦU ĐÀM PHÁN LẠI</span>
          </button>

          <button
            onClick={handleApprove}
            className="h-[38px] px-5 rounded bg-[#283A97] hover:bg-[#1E2C75] active:scale-[0.98] text-white font-condensed font-bold text-[12px] uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[19px]">task_alt</span>
            <span>TRÌNH DUYỆT CHỌN NCC ({selectedSupplierId === 'minh-ngoc' ? 'THÉP MINH NGỌC' : selectedSupplierId === 'phuong-nam' ? 'CƠ KHÍ PHƯƠNG NAM' : 'KIM KHÍ VIỆT Á'})</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
