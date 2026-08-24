import React, { useState } from 'react';
import { AdminOrder, OrderItem } from '../types';
import { downloadDocumentFile, updateItemPrintStatus } from '../api';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  FileText, 
  User, 
  Phone, 
  Loader2,
  Clock,
  Check
} from 'lucide-react';

interface OrderDetailModalProps {
  order: AdminOrder;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdatePaymentStatus: (orderId: string, status: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onUpdatePaymentStatus,
}) => {
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const items: OrderItem[] = order.items && order.items.length > 0 ? order.items : [];

  const handleDownloadItem = async (docId: string, fileName: string) => {
    if (!docId) return;
    try {
      setDownloadingItemId(docId);
      await downloadDocumentFile(docId, fileName);
    } catch (err) {
      console.error('Failed to download document:', err);
    } finally {
      setDownloadingItemId(null);
    }
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      setUpdatingItemId(itemId);
      await updateItemPrintStatus(order.id, itemId, newStatus);
      // Refresh parent state by calling onUpdateStatus with current status to trigger re-fetch
      onUpdateStatus(order.id, order.printStatus);
    } catch (err) {
      console.error('Failed to update item status:', err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="chip-status-pending">New Order</span>;
      case 'PRINTING':
        return <span className="chip-status-printing">Printing In Progress</span>;
      case 'COMPLETED':
        return <span className="chip-status-completed">Completed</span>;
      case 'CANCELLED':
        return <span className="chip-status-cancelled">Cancelled</span>;
      default:
        return <span className="chip-status-pending">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E2E2] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-[#E2E2E2] flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center font-bold border border-neutral-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#111111]">{order.orderNumber}</h2>
                {getStatusChip(order.printStatus)}
              </div>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
                Submitted {new Date(order.createdAt).toLocaleString()} · {items.length || 1} file {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-8 overflow-y-auto space-y-8 flex-1 text-base">
          {/* Order Items Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Order Items ({items.length || 1})
              </h3>
              <span className="text-xs font-bold text-[#6B6B6B]">Individual Settings & Actions</span>
            </div>

            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const doc = item.document;
                  const docId = doc?.id || '';
                  const fileName = doc?.originalFileName || `File ${idx + 1}`;
                  const isDownloading = downloadingItemId === docId;
                  const isUpdating = updatingItemId === item.id;

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-2xl p-5 border border-[#E2E2E2] space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E2E2]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-neutral-100 text-[#111111] font-bold text-xs flex items-center justify-center border border-neutral-200">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-[#111111] truncate">{fileName}</p>
                            <p className="text-xs text-[#6B6B6B] font-medium mt-0.5">
                              {item.calculatedPages || doc?.pageCount || 1} pages · {item.copies} copies
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-extrabold text-[#111111]">
                            ₹{item.itemPrice ? item.itemPrice.toFixed(2) : '0.00'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDownloadItem(docId, fileName)}
                            disabled={isDownloading}
                            className="btn-secondary-sm h-10 px-3.5 text-xs flex items-center gap-1.5"
                          >
                            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">Color</span>
                          <span className="font-bold text-[#111111]">{item.colorMode === 'BW' ? 'Black & White' : 'Full Color'}</span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">Paper / Side</span>
                          <span className="font-bold text-[#111111]">{item.paperSize} · {item.printSide === 'DOUBLE' ? 'Double' : 'Single'}</span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">Page Range</span>
                          <span className="font-bold text-[#111111]">{item.pageRange || 'ALL'}</span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">Item Status</span>
                          <span className={`inline-block font-extrabold uppercase mt-0.5 ${
                            item.printStatus === 'COMPLETED' ? 'text-emerald-700' :
                            item.printStatus === 'PRINTING' ? 'text-amber-700' : 'text-neutral-800'
                          }`}>
                            {item.printStatus}
                          </span>
                        </div>
                      </div>

                      {/* Item Quick Action Controls */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {item.printStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateItemStatus(item.id, 'PRINTING')}
                            disabled={isUpdating}
                            className="btn-primary-sm h-9 text-xs px-4"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                            <span>Start Printing Item</span>
                          </button>
                        )}

                        {item.printStatus === 'PRINTING' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateItemStatus(item.id, 'COMPLETED')}
                            disabled={isUpdating}
                            className="btn-primary-sm h-9 text-xs px-4"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Mark Item Ready</span>
                          </button>
                        )}

                        {item.printStatus === 'COMPLETED' && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Item Ready</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Legacy Single File Fallback */
                <div className="bg-white rounded-2xl p-5 border border-[#E2E2E2] space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-[#111111]">{order.document?.originalFileName || 'Print Order'}</p>
                    <span className="text-base font-extrabold text-[#111111]">₹{order.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Payment Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E2E2] space-y-3">
              <h4 className="font-bold text-[#111111] uppercase tracking-wider text-xs">
                Customer Info
              </h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2.5 text-[#111111] font-semibold">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span>{order.customerName || 'Walk-in Customer'}</span>
                </p>
                {order.customerPhone && (
                  <p className="flex items-center gap-2.5 text-[#6B6B6B]">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <span>{order.customerPhone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E2E2] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#111111] uppercase tracking-wider text-xs">
                  Payment Status
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePaymentStatus(
                      order.id,
                      order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID'
                    )
                  }
                  className="text-xs text-neutral-600 hover:text-[#111111] font-semibold underline"
                >
                  Toggle Status
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={
                    order.paymentStatus === 'PAID'
                      ? 'chip-payment-paid'
                      : 'chip-payment-pending'
                  }
                >
                  {order.paymentStatus === 'PAID' ? 'Paid' : 'Pay at Counter'}
                </span>
                <span className="text-2xl font-extrabold text-[#111111]">
                  ₹{order.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-8 py-5 border-t border-[#E2E2E2] bg-neutral-50 flex items-center justify-between gap-4">
          {order.printStatus !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
              className="text-sm text-neutral-500 hover:text-rose-600 font-semibold"
            >
              Cancel Order
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {order.printStatus === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(order.id, 'PRINTING');
                  onClose();
                }}
                className="btn-primary min-h-[52px]"
              >
                <Printer className="w-5 h-5" />
                <span>Start Printing All</span>
              </button>
            )}

            {order.printStatus === 'PRINTING' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(order.id, 'COMPLETED');
                  onClose();
                }}
                className="btn-primary min-h-[52px]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Mark Order Completed</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary min-h-[52px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
