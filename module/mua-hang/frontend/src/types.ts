export type NavigationTab = 'dashboard' | 'reports' | 'requests' | 'create-request' | 'request-detail' | 'quotes' | 'purchase-orders' | 'orders' | 'payments' | 'my-tasks' | 'company-data' | 'suppliers' | 'utilities' | 'outsource';

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  stockQty: number;
  unitPrice: number;
  note?: string;
  catalogStatus?: 'CHUA_KIEM_TRA' | 'DA_CO_MA' | 'VT_MOI_CHO_CAP_MA';
  inventoryStatus?: 'CON_HANG' | 'HET_HANG' | 'CHUA_CO_DU_LIEU';
  deadline?: string;
  productionOrder?: string;
  productionOrderDate?: string;
  barcode?: string;
  purpose?: string;
}

export interface MaterialRequest {
  id: string; // e.g. DN-2026-000123
  date: string;
  department: string;
  lsxCode: string;
  lsxItem: string;
  creator: string;
  creatorRole: string;
  lineCount: number;
  status: 'CHO_DUYET' | 'TRE_HAN' | 'DA_XONG' | 'BAT_KHA_THI' | 'CAN_DE_MAT';
  statusText: string;
  totalEstimatedPrice: number;
  deadline: string;
  priority: string;
  items?: MaterialItem[];
  attachments?: { name: string; size: string; type: 'image' | 'pdf'; url?: string }[];
  comments?: RequestComment[];
}

export interface RequestComment {
  id: string;
  author: string;
  role: string;
  avatar: string;
  time: string;
  content: string;
  attachment?: { name: string; size: string };
  isHighlight?: boolean;
}

export interface ApprovalTask {
  id: string;
  docCode: string; // DN-2026-000123 or PO-2026-00156
  docType: 'Đề nghị vật tư xưởng' | 'Đơn mua hàng (PO)' | 'Đề nghị vật tư';
  department: string;
  requester: string;
  lineSummary: string;
  totalValue: number;
  isOverBudget?: boolean;
  deadline: string;
  priorityTag: string;
  urgentTag?: string;
  status: 'pending' | 'supplement' | 'approved' | 'rejected';
}

export interface SupplierBid {
  supplierId: string;
  supplierName: string;
  quoteCode: string;
  address: string;
  isBestBidder?: boolean;
  warningTag?: string;
  items: {
    itemId: string;
    unitPrice: number;
    totalPrice: number;
    tag?: string;
    diffNote?: string;
  }[];
  totalItemCost: number;
  shippingCost: number;
  shippingNote: string;
  leadTime: string;
  leadTimeDays: number;
  leadTimeTag: string;
  leadTimeAlert?: boolean;
  paymentTerms: string;
  paymentNote: string;
  paymentAlert?: boolean;
  certificate: string;
  certificateNote: string;
  certificateAlert?: boolean;
  finalEvaluationCost: number;
  finalNote: string;
}

export interface IqcInspectionItem {
  stt: string;
  name: string;
  sku: string;
  spec: string;
  standard: string;
  poQty: number;
  receivedQty: number;
  unit: string;
  status: 'DAT' | 'CANH_BAO_THIEU';
  statusLabel: string;
  measurement: string;
  note: string;
  photoCount: number;
}
