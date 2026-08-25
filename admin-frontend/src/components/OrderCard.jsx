import React, { useState } from "react";
import { downloadDocumentFile } from "../api";
import {
  Printer,
  Download,
  CheckCircle2,
  FileText,
  Loader2,
  ChevronRight,
  Files,
  UserSquare2,
} from "lucide-react";

export const OrderCard = ({
  order,
  onUpdateStatus,
  onUpdatePaymentStatus,
  onSelectOrder,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const items = order.items && order.items.length > 0 ? order.items : [];
  const itemCount = items.length;

  const firstDoc = items[0]?.document || order.document;
  const docId = firstDoc?.id || "";
  const primaryDocName = firstDoc?.originalFileName || "Document.pdf";
  const firstDocType = items[0]?.printType || order.printType;
  const isPassportPhoto = firstDocType === "PASSPORT_PHOTO";

  const totalCalculatedPages =
    items.length > 0
      ? items.reduce(
          (sum, item) =>
            sum + (item.calculatedPages || item.document?.pageCount || 1),
          0,
        )
      : order.document?.pageCount || order.calculatedPages || 1;

  const handleDownloadFirst = async (e) => {
    e.stopPropagation();
    if (!docId) return;
    try {
      setIsDownloading(true);
      await downloadDocumentFile(docId, primaryDocName);
    } catch (err) {
      console.error("Failed to download document:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="chip-status-pending">New</span>;
      case "PRINTING":
        return (
          <span className="chip-status-printing">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Printing
          </span>
        );
      case "COMPLETED":
        return <span className="chip-status-completed">Completed</span>;
      case "CANCELLED":
        return <span className="chip-status-cancelled">Cancelled</span>;
      default:
        return <span className="chip-status-pending">{status}</span>;
    }
  };

  return (
    <div
      onClick={() => onSelectOrder(order)}
      className="py-6 px-5 hover:bg-neutral-100/60 transition-colors border-b border-[#E2E2E2] cursor-pointer select-none space-y-3"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Column: Multi-File Info & Specs */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E2E2] text-[#111111] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            {isPassportPhoto ? (
              <UserSquare2 className="w-6 h-6 text-brand-600" />
            ) : itemCount > 1 ? (
              <Files className="w-6 h-6 text-neutral-800" />
            ) : (
              <FileText className="w-6 h-6 text-neutral-800" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h3
                className="text-lg font-bold text-[#111111] truncate"
                title={primaryDocName}
              >
                {primaryDocName}
                {itemCount > 1 && (
                  <span className="ml-2 text-xs font-extrabold bg-neutral-200 text-[#111111] px-2 py-0.5 rounded-full inline-block">
                    +{itemCount - 1} more{" "}
                    {itemCount - 1 === 1 ? "file" : "files"}
                  </span>
                )}
              </h3>
              <span className="text-xs font-mono font-bold text-[#6B6B6B]">
                {order.orderNumber}
              </span>
            </div>

            {/* Editorial specs row */}
            <p className="text-base text-[#6B6B6B] font-medium">
              <strong className="text-[#111111] font-semibold">
                {itemCount || 1} {itemCount === 1 ? "file" : "files"}
              </strong>{" "}
              ·{" "}
              <strong className="text-[#111111] font-semibold">
                {totalCalculatedPages}{" "}
                {totalCalculatedPages === 1 ? "total page" : "total pages"}
              </strong>
              {order.customerName && (
                <span className="ml-2 text-neutral-500">
                  ({order.customerName})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Column: Status Badges, Price & Action Buttons */}
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-2.5">
            {/* Status Chip */}
            {getStatusChip(order.printStatus)}

            {/* Payment Chip */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdatePaymentStatus(
                  order.id,
                  order.paymentStatus === "PAID" ? "PENDING" : "PAID",
                );
              }}
              className={
                order.paymentStatus === "PAID"
                  ? "chip-payment-paid"
                  : "chip-payment-pending"
              }
              title="Click to toggle payment status"
            >
              {order.paymentStatus === "PAID" ? "Paid Online" : "Pay at Shop"}
            </button>

            {/* Price Tag */}
            <span className="text-lg font-extrabold text-[#111111] ml-1">
              ₹{order.totalPrice.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {docId && (
              <button
                type="button"
                onClick={handleDownloadFirst}
                disabled={isDownloading}
                className="w-11 h-11 text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-white border border-[#E2E2E2] flex items-center justify-center transition-colors bg-white/70"
                title="Download primary file"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
            )}

            {order.printStatus === "PENDING" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, "PRINTING");
                }}
                className="btn-primary-sm min-h-[44px] h-11 text-sm px-5"
              >
                <Printer className="w-4 h-4" />
                <span>Print All</span>
              </button>
            )}

            {order.printStatus === "PRINTING" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, "COMPLETED");
                }}
                className="btn-primary-sm min-h-[44px] h-11 text-sm px-5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete</span>
              </button>
            )}

            {order.printStatus === "COMPLETED" && (
              <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Done</span>
              </span>
            )}

            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
