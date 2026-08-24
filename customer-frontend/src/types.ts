export type PrintType = 'PRINT' | 'XEROX';
export type ColorMode = 'BW' | 'COLOR';
export type PaperSize = 'A4' | 'A3';
export type PrintSide = 'SINGLE' | 'DOUBLE';
export type PaymentMethod = 'ONLINE' | 'PAY_AT_SHOP';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PrintStatus = 'PENDING' | 'PRINTING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface Shop {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface UploadedDocument {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: string;
}

export interface PrintSpecifications {
  printType: PrintType;
  colorMode: ColorMode;
  paperSize: PaperSize;
  printSide: PrintSide;
  pageRangeOption: 'ALL' | 'CUSTOM';
  customPageRange: string;
  copies: number;
}

export interface PricingResponse {
  totalDocumentPages: number;
  calculatedPages: number;
  copies: number;
  unitPricePerPage: number;
  totalPrice: number;
  breakdown: string;
}

export interface CreateOrderItemRequest {
  documentId: string;
  printType?: PrintType;
  colorMode: ColorMode;
  paperSize: PaperSize;
  printSide: PrintSide;
  pageRange: string;
  copies: number;
}

export interface CreateOrderRequest {
  shopId: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  items: CreateOrderItemRequest[];
  
  // Legacy single file properties for compatibility
  documentId?: string;
  printType?: PrintType;
  colorMode?: ColorMode;
  paperSize?: PaperSize;
  printSide?: PrintSide;
  pageRange?: string;
  copies?: number;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  document: UploadedDocument;
  printType: PrintType;
  colorMode: ColorMode;
  paperSize: PaperSize;
  printSide: PrintSide;
  pageRange: string;
  copies: number;
  calculatedPages: number;
  unitPrice: number;
  itemPrice: number;
  printStatus: PrintStatus;
  createdAt?: string;
}

export interface PrintOrder {
  id: string;
  orderNumber: string;
  publicToken: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  printStatus: PrintStatus;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  updatedAt: string;

  // Legacy properties for backwards compatibility
  document?: UploadedDocument;
  printType?: PrintType;
  colorMode?: ColorMode;
  paperSize?: PaperSize;
  printSide?: PrintSide;
  pageRange?: string;
  copies?: number;
  calculatedPages?: number;
}

export interface LocalOrderItem {
  localId: string;
  file?: File;
  uploadedDocument?: UploadedDocument;
  uploadStatus: 'UPLOADING' | 'COMPLETE' | 'FAILED';
  uploadProgress?: number;
  error?: string;
  settings: PrintSpecifications;
  pricing?: PricingResponse;
  isCalculatingPrice?: boolean;
}
