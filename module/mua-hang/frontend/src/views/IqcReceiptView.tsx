import React, { useState } from 'react';
import { IqcInspectionItem } from '../types';
import { INITIAL_IQC_ITEMS } from '../data/initialData';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from '../components/RowSelection';

interface IqcReceiptViewProps {
  onNotify: (msg: string) => void;
}

export const IqcReceiptView: React.FC<IqcReceiptViewProps> = ({ onNotify }) => {
  const [poSearch, setPoSearch] = useState('PO-2026-000156');
  const [items, setItems] = useState<IqcInspectionItem[]>(INITIAL_IQC_ITEMS);
  const [verdict, setVerdict] = useState<'cond_accept' | 'full_accept' | 'reject'>('cond_accept');
  const [inspectorNotes, setInspectorNotes] = useState(
    'Lô thép S45C đúng mác POSCO nhập khẩu, đo kích thước đạt chuẩn dung sai h9. Riêng mã dao phay ngón D12 thực nhận 03 chiếc (thiếu 01 chiếc so với PO-2026-00156). Nhà cung cấp Minh Ngọc đã xác nhận bằng văn bản sẽ giao bù vào 16:30 chiều nay.'
  );

  // Photos
  const [photos, setPhotos] = useState([
    {
      id: 1,
      caption: 'Bó thép tròn đặc tại bàn kiểm xưởng (Đầy đủ tem mác POSCO)',
      url: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 2,
      caption: 'Hộp dao phay ngón carbide 4 me D12mm (Kiểm đếm: 03 chiếc)',
      url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 3,
      caption: 'Phiếu giao hàng & kết quả kiểm tra test cứng đạt 48 HRC',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'
    }
  ]);
  const itemSelection = useRowSelection(items.map((item) => item.sku));
  const photoSelection = useRowSelection(photos.map((photo) => String(photo.id)));

  function deleteItems(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'dòng kiểm nhận')) return;
    setItems((current) => current.filter((item) => !ids.has(item.sku)));
    itemSelection.clearSelection();
  }

  function deletePhotos(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'ảnh kiểm tra')) return;
    setPhotos((current) => current.filter((photo) => !ids.has(String(photo.id))));
    photoSelection.clearSelection();
  }

  const handleAdjustQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const newQty = Math.max(0, item.receivedQty + delta);
          const isShort = newQty < item.poQty;
          return {
            ...item,
            receivedQty: newQty,
            status: isShort ? 'CANH_BAO_THIEU' : 'DAT'
          };
        }
        return item;
      })
    );
  };

  const handleSimulateScan = () => {
    onNotify('Đang kích hoạt camera quét mã vạch phiếu giao hàng... Đã đọc: PO-2026-00156');
  };

  const handleSimulateWeigh = () => {
    onNotify('Cân điện tử bàn cân xưởng 2: 4.250 kg (Khối lượng thép đạt chuẩn tỷ trọng tiêu chuẩn).');
  };

  const handlePrintLabels = () => {
    onNotify('Đang kết nối máy in tem mã vạch công nghiệp Zebra ZT410... In 13 tem QR định danh phụ tùng.');
  };

  const handleSaveDraft = () => {
    onNotify('Đã lưu nháp biên bản kiểm tra IQC [BB-IQC-2026-0828] thành công.');
  };

  const handleConfirmStore = () => {
    const confirmed = window.confirm(
      'XÁC NHẬN NHẬP KHO & KÝ BIÊN BẢN IQC:\n\n- Đơn mua hàng: PO-2026-00156\n- Kết luận: ' +
        (verdict === 'full_accept'
          ? 'Đạt chuẩn 100%'
          : verdict === 'cond_accept'
          ? 'Đạt có điều kiện (Giao thiếu 1 dao phay)'
          : 'Từ chối nhận hàng') +
        '\n\nBạn có muốn ký số xác nhận và gửi thông báo nhập kho ERP?'
    );
    if (confirmed) {
      onNotify('THÀNH CÔNG: Đã tạo phiếu Nhập kho thành phẩm, cập nhật tồn kho tức thì và gửi thông báo cho Quản đốc.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Banner */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-0.5 border border-[#C6CCE9]">
              QUY TRÌNH IQC XƯỞNG
            </span>
            <span className="text-[12px] text-[#59627A]">
              Mã biên bản: <strong className="font-mono text-[#0E1220]">BB-IQC-2026-0828</strong>
            </span>
          </div>
          <h1 className="text-[18px] font-bold text-[#0E1220]">
            Nhận hàng xưởng &amp; Kiểm tra chất lượng (IQC / Kho nhận hàng)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-1">
            BÀN KIỂM SỐ 02 - KHU A
          </span>
          <span className="text-[12px] text-[#59627A] font-mono">
            Kỹ thuật viên: <strong className="text-[#0E1220]">Lê Hoàng Nam</strong>
          </span>
        </div>
      </div>

      {/* BLOCK 1: BARCODE & SCALE INTEGRATION */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#283A97] text-[20px]">qr_code_scanner</span>
          <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
            KHỐI 1: QUÉT MÃ VẠCH TIẾP NHẬN NHANH TẠI BÀN KIỂM
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="block font-condensed font-bold text-[11.5px] uppercase text-[#59627A] mb-1">
              NHẬP MÃ ĐƠN MUA HÀNG (PO) HOẶC SỐ VẬN ĐƠN
            </label>
            <div className="relative">
              <input
                type="text"
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                placeholder="Nhập hoặc quét mã PO..."
                className="w-full h-[38px] pl-3 pr-24 font-mono text-[13.5px] font-bold text-[#283A97] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
              />
              <button
                type="button"
                onClick={() => onNotify(`Đã tải lại thông tin cho đơn hàng [${poSearch}]`)}
                className="absolute right-1 top-1 bottom-1 px-3 bg-[#283A97] text-white rounded font-condensed font-bold text-[11px] uppercase hover:bg-[#1E2C75]"
              >
                TÌM ĐƠN
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={handleSimulateScan}
              className="w-full h-[38px] px-3 bg-white border border-[#283A97] text-[#283A97] rounded font-condensed font-bold text-[12px] uppercase hover:bg-[#EEF0F9] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              BẬT CAMERA QUÉT MÃ
            </button>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={handleSimulateWeigh}
              className="w-full h-[38px] px-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[#283A97] rounded font-condensed font-bold text-[12px] uppercase hover:bg-[#283A97] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">scale</span>
              ĐỌC CÂN 4.2 TẤN (TỰ ĐỘNG)
            </button>
          </div>
        </div>
      </div>

      {/* BLOCK 2: DELIVERY & CARRIER INFO */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">local_shipping</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 2: THÔNG TIN GIAO HÀNG TẠI CỔNG BẢO VỆ &amp; KHO TIẾP NHẬN
            </h2>
          </div>
          <span className="font-mono text-[11.5px] text-[#4557b2] font-bold">
            TRẠNG THÁI: XE ĐÃ VÀO BÃI CÂN
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
          <div>
            <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
              NHÀ CUNG CẤP (NCC)
            </span>
            <span className="font-bold text-[#0E1220] block mt-0.5">CÔNG TY THÉP MINH NGỌC</span>
            <span className="text-[11.5px] text-[#59627A]">Hợp đồng khung số HĐ-2026/TMN</span>
          </div>

          <div>
            <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
              BIỂN SỐ XE VẬN CHUYỂN
            </span>
            <span className="font-mono font-bold text-[#283A97] text-[14px] block mt-0.5">
              29C-882.14 (Xe tải 5 tấn)
            </span>
            <span className="text-[11.5px] text-[#59627A]">Tải xế: Nguyễn Văn Hưng</span>
          </div>

          <div>
            <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
              SỐ PHIẾU GIAO HÀNG NCC
            </span>
            <span className="font-mono font-bold text-[#0E1220] block mt-0.5">BB-20260828-09</span>
            <span className="text-[11.5px] text-[#59627A]">Kèm chứng nhận xuất xưởng (CO)</span>
          </div>

          <div>
            <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
              THỜI ĐIỂM TIẾP NHẬN
            </span>
            <span className="font-mono text-[#0E1220] block mt-0.5">08:35 - 28/08/2026</span>
            <span className="text-[11.5px] text-[#4557b2] font-bold">Đúng giờ theo lịch hẹn</span>
          </div>
        </div>
      </div>

      {/* BLOCK 3: IQC CHECKLIST TABLE */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#DCE1EC] bg-[#F4F6FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">fact_check</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 3: DANH SÁCH VẬT TƯ KIỂM NHẬN &amp; CHẤT LƯỢNG IQC THỰC TẾ
            </h2>
          </div>
          <span className="text-[12px] text-[#59627A]">
            Dung sai cho phép theo tiêu chuẩn nghiệm thu xưởng
          </span>
        </div>

        <div className="p-3 border-b border-[#DCE1EC]">
          <RowSelectionActions total={items.length} selectedCount={itemSelection.selectedCount} allSelected={itemSelection.allSelected} onToggleAll={itemSelection.toggleAll} onDeleteSelected={() => deleteItems(itemSelection.selected)} onDeleteAll={() => deleteItems(new Set(items.map((item) => item.sku)))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#F4F6FA] border-b border-[#DCE1EC] font-condensed font-bold text-[11px] text-[#59627A] uppercase tracking-wider">
                <th className="p-3 w-10 text-center"><SelectionCheckbox checked={itemSelection.allSelected} onChange={itemSelection.toggleAll} label="Chọn tất cả dòng kiểm nhận" /></th>
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3">TÊN VẬT TƯ / MÃ SKU / TIÊU CHUẨN</th>
                <th className="p-3 w-28 text-center">S.LƯỢNG TRÊN PO</th>
                <th className="p-3 w-36 text-center">THỰC NHẬN</th>
                <th className="p-3 w-28 text-center">ĐƠN VỊ TÍNH</th>
                <th className="p-3 w-36">KẾT QUẢ ĐO KIỂM KỸ THUẬT</th>
                <th className="p-3">TÌNH TRẠNG &amp; GHI CHÚ</th>
                <th className="p-3 w-14" />
              </tr>
            </thead>

            <tbody className="divide-y divide-[#DCE1EC] text-[13px]">
              {items.map((item, idx) => {
                const isShort = item.receivedQty < item.poQty;
                return (
                  <tr
                    key={item.sku}
                    className={`transition-colors ${
                      itemSelection.selected.has(item.sku) ? 'bg-[#EEF0F9]' : isShort
                        ? 'bg-[#FFFDFD] border-l-4 border-l-[#EE202E]'
                        : 'hover:bg-[#EEF0F9]/30'
                    }`}
                  >
                    <td className="p-3 text-center"><SelectionCheckbox checked={itemSelection.selected.has(item.sku)} onChange={() => itemSelection.toggle(item.sku)} label={`Chọn dòng ${item.name}`} /></td>
                    <td className="p-3 text-center font-mono font-bold text-[#59627A]">
                      {item.stt}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-[#0E1220]">{item.name}</div>
                      <div className="text-[12px] text-[#59627A] font-mono">
                        Mã SKU: {item.sku} • {item.spec}
                      </div>
                      <div className="text-[11.5px] text-[#283A97]">{item.standard}</div>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-[14px] text-[#0E1220]">
                      {item.poQty}
                    </td>

                    <td className="p-3 text-center">
                      <div className="inline-flex items-center border border-[#DCE1EC] rounded bg-white shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleAdjustQty(idx, -1)}
                          className="w-7 h-7 flex items-center justify-center text-[#59627A] hover:bg-[#F4F6FA] text-[14px]"
                        >
                          -
                        </button>
                        <span
                          className={`w-10 text-center font-mono font-bold text-[14px] ${
                            isShort ? 'text-[#EE202E]' : 'text-[#0E1220]'
                          }`}
                        >
                          {item.receivedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustQty(idx, 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#59627A] hover:bg-[#F4F6FA] text-[14px]"
                        >
                          +
                        </button>
                      </div>

                      {isShort && (
                        <div className="text-[10.5px] font-condensed font-bold text-[#EE202E] mt-1 uppercase">
                          THIẾU {item.poQty - item.receivedQty} CÁI!
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono text-[#59627A]">{item.unit}</td>

                    <td className="p-3">
                      <div className="font-mono text-[12px] text-[#0E1220]">{item.measurement}</div>
                      <span className="pill bg-[#EEF0F9] text-[#283A97] text-[10px] px-2 py-0.2 mt-0.5">
                        {item.statusLabel}
                      </span>
                    </td>

                    <td className="p-3">
                      <p className="text-[12px] text-[#59627A] leading-relaxed">{item.note}</p>
                    </td>
                    <td className="p-2 text-center"><button type="button" onClick={() => deleteItems(new Set([item.sku]))} aria-label={`Xóa dòng ${item.name}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCK 4: INSPECTION PHOTOS & DOCUMENTS */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">photo_library</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 4: ẢNH HIỆN TRẠNG HÀNG HÓA &amp; PHIẾU CO/CQ THỰC TẾ TẠI BÀN KIỂM
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              const cap = prompt('Nhập chú thích ảnh mới:');
              if (cap) {
                setPhotos((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    caption: cap,
                    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                  }
                ]);
                onNotify('Đã thêm 1 ảnh kiểm tra thực tế.');
              }
            }}
            className="text-[12px] text-[#283A97] hover:underline font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
            Chụp / Tải thêm ảnh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3"><RowSelectionActions total={photos.length} selectedCount={photoSelection.selectedCount} allSelected={photoSelection.allSelected} onToggleAll={photoSelection.toggleAll} onDeleteSelected={() => deletePhotos(photoSelection.selected)} onDeleteAll={() => deletePhotos(new Set(photos.map((photo) => String(photo.id))))} /></div>
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="border border-[#DCE1EC] rounded overflow-hidden bg-[#F4F6FA] group hover:border-[#283A97] transition-all"
            >
              <div className="h-40 overflow-hidden relative">
                <label className="absolute z-10 top-2 left-2 w-10 h-10 bg-white/95 rounded flex items-center justify-center shadow cursor-pointer"><SelectionCheckbox checked={photoSelection.selected.has(String(photo.id))} onChange={() => photoSelection.toggle(String(photo.id))} label={`Chọn ảnh ${photo.caption}`} /></label>
                <img
                  src={photo.url}
                  alt={photo.caption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                  IQC LIVE
                </div>
              </div>
              <div className="p-2.5 text-[12px] text-[#0E1220] font-medium leading-snug">
                <div className="flex items-start justify-between gap-2"><span>{photo.caption}</span><button type="button" onClick={() => deletePhotos(new Set([String(photo.id)]))} aria-label={`Xóa ảnh ${photo.caption}`} className="min-w-10 min-h-10 text-[#EE202E] shrink-0"><span className="material-symbols-outlined">delete</span></button></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCK 5: FINAL IQC VERDICT & CONCLUSION */}
      <div className="bg-white border border-[#DCE1EC] rounded p-5 shadow-sm space-y-4">
        <div className="border-b border-[#DCE1EC] pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[22px]">gavel</span>
            <h2 className="font-condensed font-bold text-[15px] uppercase text-[#0E1220]">
              KHỐI 5: KẾT LUẬN KIỂM TRA CHẤT LƯỢNG (IQC FINAL VERDICT)
            </h2>
          </div>
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2 py-0.5 border border-[#C6CCE9]">
            THẨM QUYỀN KHO VẬN &amp; QA
          </span>
        </div>

        {/* 3 Verdict Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            className={`p-3.5 border rounded cursor-pointer transition-all flex items-start gap-3 ${
              verdict === 'full_accept'
                ? 'border-[#283A97] bg-[#EEF0F9]/50 shadow-xs ring-1 ring-[#283A97]'
                : 'border-[#DCE1EC] bg-white hover:bg-[#F4F6FA]'
            }`}
          >
            <input
              type="radio"
              name="iqc_verdict"
              checked={verdict === 'full_accept'}
              onChange={() => setVerdict('full_accept')}
              className="mt-1 text-[#283A97] focus:ring-0"
            />
            <div>
              <div className="font-condensed font-bold text-[13px] uppercase text-[#0E1220]">
                1. ĐẠT CHUẨN 100%
              </div>
              <p className="text-[11.5px] text-[#59627A] mt-0.5">
                Nhập kho toàn bộ số lượng, hoàn tất thủ tục thanh toán PO.
              </p>
            </div>
          </label>

          <label
            className={`p-3.5 border rounded cursor-pointer transition-all flex items-start gap-3 ${
              verdict === 'cond_accept'
                ? 'border-[#EE202E] bg-[#FDECEE]/60 shadow-xs ring-1 ring-[#EE202E]'
                : 'border-[#DCE1EC] bg-white hover:bg-[#F4F6FA]'
            }`}
          >
            <input
              type="radio"
              name="iqc_verdict"
              checked={verdict === 'cond_accept'}
              onChange={() => setVerdict('cond_accept')}
              className="mt-1 text-[#EE202E] focus:ring-0"
            />
            <div>
              <div className="font-condensed font-bold text-[13px] uppercase text-[#EE202E] flex items-center gap-1">
                <span>2. ĐẠT CÓ ĐIỀU KIỆN (GIAO THIẾU)</span>
                <span className="pill bg-[#EE202E] text-white text-[9px] px-1.5 py-0.2">ĐANG CHỌN</span>
              </div>
              <p className="text-[11.5px] text-[#59627A] mt-0.5">
                Nhập kho phần đạt (10 cây thép + 3 dao phay), lập biên bản giữ nợ 1 dao phay giao bù trong ngày.
              </p>
            </div>
          </label>

          <label
            className={`p-3.5 border rounded cursor-pointer transition-all flex items-start gap-3 ${
              verdict === 'reject'
                ? 'border-[#EE202E] bg-[#FDECEE] shadow-xs ring-1 ring-[#EE202E]'
                : 'border-[#DCE1EC] bg-white hover:bg-[#F4F6FA]'
            }`}
          >
            <input
              type="radio"
              name="iqc_verdict"
              checked={verdict === 'reject'}
              onChange={() => setVerdict('reject')}
              className="mt-1 text-[#EE202E] focus:ring-0"
            />
            <div>
              <div className="font-condensed font-bold text-[13px] uppercase text-[#EE202E]">
                3. TỪ CHỐI NHẬN HÀNG (TRẢ HÀNG)
              </div>
              <p className="text-[11.5px] text-[#59627A] mt-0.5">
                Hàng lỗi sai quy cách, lập biên bản trả lại xe tải ngay lập tức.
              </p>
            </div>
          </label>
        </div>

        {/* Note area */}
        <div>
          <label className="block font-condensed font-bold text-[12px] uppercase text-[#59627A] mb-1">
            Ý KIẾN ĐÁNH GIÁ CỦA KỸ SƯ KIỂM TRA CHẤT LƯỢNG (IQC NOTES):
          </label>
          <textarea
            rows={3}
            value={inspectorNotes}
            onChange={(e) => setInspectorNotes(e.target.value)}
            className="w-full p-3 text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97] font-mono"
          />
        </div>
      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-[250px] z-40 bg-white border-t-2 border-[#DCE1EC] px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-1">
            KHO TIẾP NHẬN: KHO 02
          </span>
          <span className="text-[12px] text-[#59627A] hidden sm:inline">
            Tổng cộng: 2 dòng vật tư kiểm nhận
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handlePrintLabels}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#EEF0F9] hover:text-[#283A97] font-condensed font-bold text-[12px] uppercase transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>IN TEM MÃ VẠCH (BARCODE)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="h-[38px] px-3.5 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] font-condensed font-bold text-[12px] uppercase transition-colors"
          >
            LƯU BIÊN BẢN TẠM
          </button>

          <button
            type="button"
            onClick={handleConfirmStore}
            className="h-[38px] px-5 rounded bg-[#283A97] hover:bg-[#1E2C75] text-white font-condensed font-bold text-[12px] uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[19px]">done_all</span>
            <span>XÁC NHẬN NHẬP KHO &amp; KÝ BIÊN BẢN IQC</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
