export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PrintStatus = 'PENDING' | 'PRINTING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface UploadedDocument {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  document: UploadedDocument;
  printType: string;
  colorMode: string;
  paperSize: string;
  printSide: string;
  pageRange: string;
  copies: number;
  calculatedPages: number;
  unitPrice: number;
  itemPrice: number;
  printStatus: PrintStatus;
  createdAt?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  publicToken: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  printStatus: PrintStatus;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;

  // Legacy single file properties for backwards compatibility
  document?: UploadedDocument;
  printType?: string;
  colorMode?: string;
  paperSize?: string;
  printSide?: string;
  pageRange?: string;
  copies?: number;
  calculatedPages?: number;
}

export interface ShopPricing {
  id: string;
  shopId: string;
  bwA4Single: number;
  bwA4Double: number;
  colorA4Single: number;
  colorA4Double: number;
  bwA3Single: number;
  bwA3Double: number;
  colorA3Single: number;
  colorA3Double: number;
}
