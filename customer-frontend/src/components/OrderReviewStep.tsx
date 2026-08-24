import React, { useState } from 'react';
import { LocalOrderItem, CreateOrderRequest, CreateOrderItemRequest } from '../types';
import { createOrder, verifyPayment } from '../api';
import { ArrowLeft, CreditCard, Wallet, ShieldCheck, Check, Loader2, FileText, X, AlertCircle } from 'lucide-react';

interface Props {
  shopId: string;
  items: LocalOrderItem[];
  onBack: () => void;
  onOrderCompleted: (publicToken: string, orderNumber: string) => void;
}

export const OrderReviewStep: React.FC<Props> = ({
  shopId,
  items,
  onBack,
  onOrderCompleted,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'PAY_AT_SHOP'>('PAY_AT_SHOP');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const calculateOrderTotal = (): number => {
    return items.reduce((sum, item) => sum + (item.pricing?.totalPrice || 0), 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate valid uploaded documents exist
    const validItems = items.filter((item) => item.uploadedDocument && item.uploadedDocument.id);
    if (validItems.length === 0) {
      setErrorMessage('No uploaded documents found. Please re-upload your files before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItemsReq: CreateOrderItemRequest[] = validItems.map((item) => {
        const docId = item.uploadedDocument!.id;
        const pageRangeStr = (item.settings.pageRangeOption === 'ALL' || !item.settings.customPageRange?.trim())
          ? 'ALL'
          : item.settings.customPageRange.trim();

        return {
          documentId: docId,
          printType: item.settings.printType || 'PRINT',
          colorMode: item.settings.colorMode || 'BW',
          paperSize: item.settings.paperSize || 'A4',
          printSide: item.settings.printSide || 'SINGLE',
          pageRange: pageRangeStr,
          copies: item.settings.copies || 1,
        };
      });

      const firstItem = orderItemsReq[0];

      // Populate both multi-item list and top-level properties for maximum backend compatibility
      const orderReq: CreateOrderRequest = {
        shopId,
        paymentMethod,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '',
        items: orderItemsReq,

        // Top-level legacy fields compatibility
        documentId: firstItem.documentId,
        printType: firstItem.printType,
        colorMode: firstItem.colorMode,
        paperSize: firstItem.paperSize,
        printSide: firstItem.printSide,
        pageRange: firstItem.pageRange,
        copies: firstItem.copies,
      };

      const order = await createOrder(orderReq);

      if (paymentMethod === 'ONLINE') {
        setIsSubmitting(false);
        setShowPaymentModal(true);
        (window as any).__pendingOrder = order;
      } else {
        onOrderCompleted(order.publicToken, order.orderNumber);
      }
    } catch (err: any) {
      console.error('Order creation failed:', err);
      const apiMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit print order. Please try again.';
      setErrorMessage(apiMessage);
      setIsSubmitting(false);
    }
  };

  const handleSimulateOnlinePayment = async () => {
    const order = (window as any).__pendingOrder;
    if (!order) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await verifyPayment({
        orderId: order.id,
        paymentGateway: 'MOCK_UPI',
        transactionId: 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        amount: calculateOrderTotal(),
      });

      setShowPaymentModal(false);
      onOrderCompleted(order.publicToken, order.orderNumber);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Payment verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = calculateOrderTotal();

  return (
    <form onSubmit={handleSubmitOrder} className="space-y-8 pb-16">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6B6B] hover:text-[#111111] px-3 py-2 -ml-3 rounded-lg hover:bg-neutral-200/60 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to print options</span>
      </button>

      {/* Editorial Heading */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          Review & Payment
        </h2>
        <p className="text-base text-[#6B6B6B] mt-2 font-medium">
          Verify your {items.length} print file items and choose payment option before sending to shop counter.
        </p>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 rounded-lg transition-colors text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Container */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-6 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E2E2]">
          <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Order Items ({items.length})
          </span>
          <span className="text-xs font-bold text-[#6B6B6B]">Price</span>
        </div>

        {/* Item Rows */}
        <div className="space-y-4 divide-y divide-[#E2E2E2]">
          {items.map((item, idx) => {
            const fileName = item.uploadedDocument?.originalFileName || item.file?.name || `File ${idx + 1}`;
            const pageCount = item.pricing?.calculatedPages || item.uploadedDocument?.pageCount || 1;
            const price = item.pricing?.totalPrice || 0;

            return (
              <div key={item.localId} className={`flex items-start justify-between gap-4 ${idx > 0 ? 'pt-4' : ''}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-[#111111] truncate">{fileName}</p>
                    <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5 font-medium">
                      {item.settings.colorMode === 'BW' ? 'B&W' : 'Color'} · {item.settings.paperSize} · {item.settings.printSide === 'SINGLE' ? 'Single-sided' : 'Double-sided'}
                    </p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {pageCount} {pageCount === 1 ? 'page' : 'pages'} · {item.settings.copies} {item.settings.copies === 1 ? 'copy' : 'copies'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-extrabold text-[#111111]">₹{price.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Cost Row */}
        <div className="pt-5 border-t border-[#E2E2E2] flex items-center justify-between">
          <span className="text-base font-bold text-[#111111]">Total Order Amount</span>
          <span className="text-2xl font-extrabold text-[#111111]">₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Contact Info */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Your Info (Optional)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="input-field"
          />
          <input
            type="tel"
            placeholder="Mobile Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Payment Selection Options */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Payment Method</label>

        {/* Option 1: Pay at Shop Counter */}
        <div
          onClick={() => setPaymentMethod('PAY_AT_SHOP')}
          className={`selection-row min-h-[76px] ${paymentMethod === 'PAY_AT_SHOP' ? 'selection-row-active' : ''}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center border border-neutral-200 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-[#111111]">Pay at Shop Counter</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5 font-medium">Pay cash or UPI upon collecting prints</p>
            </div>
          </div>
          {paymentMethod === 'PAY_AT_SHOP' && <Check className="w-6 h-6 text-[#111111]" />}
        </div>

        {/* Option 2: Pay Online Now */}
        <div
          onClick={() => setPaymentMethod('ONLINE')}
          className={`selection-row min-h-[76px] ${paymentMethod === 'ONLINE' ? 'selection-row-active' : ''}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center border border-neutral-200 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-[#111111]">Pay Online Now</p>
              <p className="text-sm text-[#6B6B6B] mt-0.5 font-medium">Pay instantly via UPI or Card</p>
            </div>
          </div>
          {paymentMethod === 'ONLINE' && <Check className="w-6 h-6 text-[#111111]" />}
        </div>
      </div>

      {/* Primary Action Button (Solid Black 56px height) */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full h-14 text-base font-bold mt-4"
      >
        {isSubmitting ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : paymentMethod === 'ONLINE' ? (
          <span>Pay ₹{totalAmount.toFixed(2)}</span>
        ) : (
          <span>Send Order ({items.length} files)</span>
        )}
      </button>

      {/* Online UPI Payment Simulation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center space-y-5 border border-[#E2E2E2] shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowPaymentModal(false);
                const order = (window as any).__pendingOrder;
                if (order) {
                  onOrderCompleted(order.publicToken, order.orderNumber);
                }
              }}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center mx-auto border border-neutral-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111111]">Online Payment Gateway</h3>
              <p className="text-sm text-[#6B6B6B] mt-1">Pay ₹{totalAmount.toFixed(2)} to QuickPrint</p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-[#E2E2E2] text-left text-sm space-y-2">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>UPI VPA:</span>
                <span className="font-mono font-bold text-[#111111]">quickprint@upi</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Amount:</span>
                <span className="font-extrabold text-[#111111] text-base">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSimulateOnlinePayment}
                disabled={isSubmitting}
                className="btn-primary w-full h-14"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Approve Mock UPI Payment</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  const order = (window as any).__pendingOrder;
                  if (order) {
                    onOrderCompleted(order.publicToken, order.orderNumber);
                  }
                }}
                className="btn-secondary w-full h-14"
              >
                Pay at Counter Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
