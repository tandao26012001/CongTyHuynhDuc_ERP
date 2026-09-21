import { MaterialRequest, ApprovalTask, SupplierBid, IqcInspectionItem } from '../types';

export const INITIAL_REQUESTS: MaterialRequest[] = [
  {
    id: 'DN-2026-000123',
    date: '2026-08-27',
    department: 'Gia Công Chính Xác',
    lsxCode: 'MBC0326-018-CKCT',
    lsxItem: 'Trục truyền động máy ép #04',
    creator: 'Trần Văn Sáng',
    creatorRole: 'Kỹ thuật viên đứng máy',
    lineCount: 3,
    status: 'CHO_DUYET',
    statusText: 'Chờ duyệt',
    totalEstimatedPrice: 15650000,
    deadline: '2026-09-02 (17:00)',
    priority: 'CẤP 2: ƯU TIÊN SẢN XUẤT XƯỞNG',
    items: [
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
    ],
    attachments: [
      {
        name: 'chi-tiet-cot-truc.jpg',
        size: '1.2 MB',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'Ban-ve-truc-truyen-dong-rev02.pdf',
        size: '4.5 MB',
        type: 'pdf'
      }
    ],
    comments: [
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
  },
  {
    id: 'DN-2026-000124',
    date: '2026-08-22',
    department: 'Cơ Khí Chế Tạo',
    lsxCode: 'MBC0326-022',
    lsxItem: 'Khung hàn đế máy dập 150T',
    creator: 'Phạm Huyền Như',
    creatorRole: 'Tổ Mua Hàng',
    lineCount: 5,
    status: 'TRE_HAN',
    statusText: 'Trễ hạn',
    totalEstimatedPrice: 640000000,
    deadline: '2026-08-25',
    priority: 'CẢNH BÁO > 48 GIỜ'
  },
  {
    id: 'DN-2026-000120',
    date: '2026-08-26',
    department: 'Kho Vận & Đóng Gói',
    lsxCode: 'MBC0326-015',
    lsxItem: 'Vật tư đóng gói pallet xuất khẩu',
    creator: 'Nguyễn Thanh Tùng',
    creatorRole: 'Thủ kho chính',
    lineCount: 8,
    status: 'DA_XONG',
    statusText: 'Đã xong',
    totalEstimatedPrice: 45850000,
    deadline: '2026-08-30',
    priority: 'HOÀN THÀNH'
  },
  {
    id: 'DN-2026-000119',
    date: '2026-08-21',
    department: 'Gia Công Chính Xác',
    lsxCode: 'MBC0326-010',
    lsxItem: 'Trục vít me bi máy tiện CNC',
    creator: 'Trần Văn Sáng',
    creatorRole: 'Kỹ thuật viên đứng máy',
    lineCount: 2,
    status: 'BAT_KHA_THI',
    statusText: 'Bất khả thi',
    totalEstimatedPrice: 8300000,
    deadline: '2026-08-24',
    priority: 'HUỶ/CHUYỂN MÃ'
  },
  {
    id: 'DN-2026-000118',
    date: '2026-08-27',
    department: 'Kiểm Soát Chất Lượng',
    lsxCode: 'MBC0326-009',
    lsxItem: 'Dụng cụ đo panme & dưỡng ren',
    creator: 'Lê Quốc Cường',
    creatorRole: 'Kỹ sư QA/QC',
    lineCount: 1,
    status: 'CHO_DUYET',
    statusText: 'Chờ duyệt',
    totalEstimatedPrice: 3150000,
    deadline: '2026-09-03',
    priority: 'ƯU TIÊN 3'
  },
  {
    id: 'DN-2026-000117',
    date: '2026-08-25',
    department: 'Cơ Khí Chế Tạo',
    lsxCode: 'MBC0326-005',
    lsxItem: 'Thép tấm chịu nhiệt SS400 20mm',
    creator: 'Vũ Đức An',
    creatorRole: 'Quản đốc xưởng',
    lineCount: 12,
    status: 'DA_XONG',
    statusText: 'Đã xong',
    totalEstimatedPrice: 128920000,
    deadline: '2026-08-28',
    priority: 'HOÀN THÀNH'
  },
  {
    id: 'DN-2026-000115',
    date: '2026-08-23',
    department: 'Kho Vận & Đóng Gói',
    lsxCode: 'MBC0326-002',
    lsxItem: 'Màng PE quấn hàng & băng keo công nghiệp',
    creator: 'Phạm Huyền Như',
    creatorRole: 'Tổ Mua Hàng',
    lineCount: 4,
    status: 'CAN_DE_MAT',
    statusText: 'Cần để mắt',
    totalEstimatedPrice: 24500000,
    deadline: '2026-08-26',
    priority: 'CẦN THEO DÕI'
  }
];

export const INITIAL_APPROVAL_TASKS: ApprovalTask[] = [
  {
    id: 'task-1',
    docCode: 'DN-2026-000123',
    docType: 'Đề nghị vật tư xưởng',
    department: 'Gia Công Chính Xác',
    requester: 'Trần Văn Sáng',
    lineSummary: '3 dòng vật tư',
    totalValue: 15650000,
    isOverBudget: false,
    deadline: '02/09/2026',
    priorityTag: 'ƯU TIÊN 2: GẤP',
    urgentTag: '< 4H CÒN LẠI',
    status: 'pending'
  },
  {
    id: 'task-2',
    docCode: 'PO-2026-000156',
    docType: 'Đơn mua hàng (PO)',
    department: 'Thép Minh Ngọc (NCC)',
    requester: 'Hợp đồng khung 2026',
    lineSummary: '5 dòng phôi thép',
    totalValue: 640000000,
    isOverBudget: true,
    deadline: '05/09/2026',
    priorityTag: 'VƯỢT HẠN MỨC XƯỞNG',
    urgentTag: 'Cần TGĐ duyệt',
    status: 'pending'
  },
  {
    id: 'task-3',
    docCode: 'DN-2026-000125',
    docType: 'Đề nghị vật tư',
    department: 'Cơ khí chế tạo',
    requester: 'Phạm Huyền Như',
    lineSummary: '2 dòng vật tư',
    totalValue: 8300000,
    isOverBudget: false,
    deadline: '04/09/2026',
    priorityTag: 'DUYỆT LẠI SAU SỬA',
    status: 'supplement'
  },
  {
    id: 'task-4',
    docCode: 'DN-2026-000128',
    docType: 'Đề nghị vật tư',
    department: 'Kho Vận & Đóng Gói',
    requester: 'Lê Hoàng Nam',
    lineSummary: '4 dòng bao bì',
    totalValue: 24500000,
    isOverBudget: false,
    deadline: 'Hôm nay 17:00',
    priorityTag: 'BÌNH THƯỜNG',
    status: 'pending'
  }
];

export const INITIAL_SUPPLIER_BIDS: SupplierBid[] = [
  {
    supplierId: 'minh-ngoc',
    supplierName: 'CÔNG TY THÉP MINH NGỌC',
    quoteCode: 'BG-MN-9921',
    address: 'KCN Biên Hòa 2, Đồng Nai',
    isBestBidder: true,
    items: [
      { itemId: 'item-1', unitPrice: 24500, totalPrice: 85750000, tag: 'THẤP NHẤT' },
      { itemId: 'item-2', unitPrice: 345000, totalPrice: 6900000, tag: 'TỐT NHẤT' },
      { itemId: 'item-3', unitPrice: 920000, totalPrice: 9200000 }
    ],
    totalItemCost: 101850000,
    shippingCost: 0,
    shippingNote: 'Miễn phí vận chuyển (Đã gồm bốc dỡ vào kho)',
    leadTime: '3 ngày (Giao 13/04/2026)',
    leadTimeDays: 3,
    leadTimeTag: 'ĐÚNG HẠN LSX',
    leadTimeAlert: false,
    paymentTerms: 'Công nợ 30 ngày',
    paymentNote: 'Thanh toán sau nghiệm thu và hóa đơn VAT',
    paymentAlert: false,
    certificate: 'Đầy đủ CO/CQ từ nhà máy POSCO',
    certificateNote: 'Đã kiểm tra Mill Test hợp chuẩn JIS G4051',
    certificateAlert: false,
    finalEvaluationCost: 101850000,
    finalNote: 'TỔNG CHI PHÍ THẤP NHẤT TOÀN DIỆN'
  },
  {
    supplierId: 'phuong-nam',
    supplierName: 'CƠ KHÍ PHƯƠNG NAM',
    quoteCode: 'PN-RFQ-0401',
    address: 'Thủ Đức, TP. Hồ Chí Minh',
    isBestBidder: false,
    items: [
      { itemId: 'item-1', unitPrice: 26200, totalPrice: 91700000, diffNote: '(+6.9% so với Minh Ngọc)' },
      { itemId: 'item-2', unitPrice: 360000, totalPrice: 7200000 },
      { itemId: 'item-3', unitPrice: 890000, totalPrice: 8900000, tag: 'GIÁ RẺ HƠN' }
    ],
    totalItemCost: 107800000,
    shippingCost: 1200000,
    shippingNote: 'Giao đến cổng xưởng',
    leadTime: '4 ngày (Giao 14/04/2026)',
    leadTimeDays: 4,
    leadTimeTag: 'ĐÁP ỨNG ĐƯỢC',
    leadTimeAlert: false,
    paymentTerms: 'Công nợ 15 ngày',
    paymentNote: 'Ký nhận biên bản giao hàng',
    paymentAlert: false,
    certificate: 'Đầy đủ Mill Test nội địa',
    certificateNote: 'Chứng chỉ xuất xưởng đạt yêu cầu',
    certificateAlert: false,
    finalEvaluationCost: 109000000,
    finalNote: '(Chênh lệch +7.150.000 đ)'
  },
  {
    supplierId: 'viet-a',
    supplierName: 'KIM KHÍ VIỆT Á',
    quoteCode: 'VA-2026-88',
    address: 'Dĩ An, Bình Dương',
    warningTag: 'CHẬM TIẾN ĐỘ / THIẾU CO',
    isBestBidder: false,
    items: [
      { itemId: 'item-1', unitPrice: 25000, totalPrice: 87500000, diffNote: '(+2.0% so với Minh Ngọc)' },
      { itemId: 'item-2', unitPrice: 380000, totalPrice: 7600000 },
      { itemId: 'item-3', unitPrice: 950000, totalPrice: 9500000 }
    ],
    totalItemCost: 104600000,
    shippingCost: 850000,
    shippingNote: 'Giao đến cổng xưởng',
    leadTime: '8 ngày (Giao 18/04/2026)',
    leadTimeDays: 8,
    leadTimeTag: 'TRỄ 3 NGÀY SO VỚI LSX',
    leadTimeAlert: true,
    paymentTerms: 'Trả trước 50% - Còn lại trả ngay',
    paymentNote: 'Bất lợi dòng tiền doanh nghiệp',
    paymentAlert: true,
    certificate: 'CHƯA CÓ CO/CQ GỐC',
    certificateNote: 'Cam kết bổ sung sau 10 ngày (RỦI RO KỸ THUẬT)',
    certificateAlert: true,
    finalEvaluationCost: 105450000,
    finalNote: '(Rủi ro giao trễ + thiếu chứng chỉ)'
  }
];

export const INITIAL_IQC_ITEMS: IqcInspectionItem[] = [
  {
    stt: '01',
    name: 'Thép tròn đặc S45C phi 65 x 1200mm',
    sku: 'VT-CK-S45C-65',
    spec: 'Mác thép: C45 JIS G4051',
    standard: 'Tiêu chuẩn JIS G4051',
    poQty: 10,
    receivedQty: 10,
    unit: 'Cây (1200mm)',
    status: 'DAT',
    statusLabel: 'ĐẠT [✓]',
    measurement: 'Ø65.2mm (Dung sai cho phép ±0.3mm)',
    note: 'Bề mặt nhẵn bóng không rỗ nứt, đầu cắt vuông góc 90°.',
    photoCount: 2
  },
  {
    stt: '02',
    name: 'Dao phay ngón carbide 4 me D12mm (YG-1)',
    sku: 'DP-YG1-4F-D12',
    spec: 'Phủ TiAlN 45 HRC',
    standard: 'Tiêu chuẩn YG-1 Precision',
    poQty: 4,
    receivedQty: 3,
    unit: 'Chiếc',
    status: 'CANH_BAO_THIEU',
    statusLabel: 'ĐẠT [✓]',
    measurement: 'Đường kính cắt 12.01mm, độ nhám Ra 0.4',
    note: 'Ghi chú thiếu hàng: NCC Minh Ngọc cam kết giao bù 01 chiếc còn lại trong chiều nay (trước 17:00).',
    photoCount: 1
  }
];
