import React, { useState } from "react";
import {
  downloadDocumentFile,
  updateItemPrintStatus,
  getDocumentPreviewUrl,
} from "../api";
import mammoth from "mammoth";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  FileText,
  User,
  Phone,
  Loader2,
  Check,
  Eye,
  FileWarning,
} from "lucide-react";

export const OrderDetailModal = ({
  order,
  onClose,
  onUpdateStatus,
  onUpdatePaymentStatus,
}) => {
  const [downloadingItemId, setDownloadingItemId] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [docxHtml, setDocxHtml] = useState(null);

  const items = order.items && order.items.length > 0 ? order.items : [];

  const handleDownloadItem = async (docId, fileName) => {
    if (!docId) return;
    try {
      setDownloadingItemId(docId);
      await downloadDocumentFile(docId, fileName);
    } catch (err) {
      console.error("Failed to download document:", err);
    } finally {
      setDownloadingItemId(null);
    }
  };

  const handleUpdateItemStatus = async (itemId, newStatus) => {
    try {
      setUpdatingItemId(itemId);
      await updateItemPrintStatus(order.id, itemId, newStatus);
      // Refresh parent state by calling onUpdateStatus with current status to trigger re-fetch
      onUpdateStatus(order.id, order.printStatus);
    } catch (err) {
      console.error("Failed to update item status:", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handlePreview = async (docId, fileName, contentType) => {
    if (!docId) return;
    try {
      setPreviewDocId(docId);
      setPreviewFileName(fileName);
      setPreviewType(contentType);
      setIsPreviewLoading(true);
      setPreviewError(false);
      setDocxHtml(null);
      const url = await getDocumentPreviewUrl(
        docId,
        contentType || "application/pdf",
      );
      setPreviewUrl(url);

      const isDocx =
        fileName.toLowerCase().endsWith(".docx") ||
        contentType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (isDocx) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } catch (docxErr) {
          console.error("Mammoth docx conversion failed:", docxErr);
          setPreviewError(true);
        }
      }
    } catch (err) {
      console.error("Failed to load preview:", err);
      setPreviewError(true);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDocId(null);
    setPreviewFileName("");
    setPreviewType("");
    setDocxHtml(null);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="chip-status-pending">New Order</span>;
      case "PRINTING":
        return (
          <span className="chip-status-printing">Printing In Progress</span>
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
                <h2 className="text-xl font-bold text-[#111111]">
                  {order.orderNumber}
                </h2>
                {getStatusChip(order.printStatus)}
              </div>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
                Submitted {new Date(order.createdAt).toLocaleString()} ·{" "}
                {items.length || 1} file {items.length === 1 ? "item" : "items"}
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
              <span className="text-xs font-bold text-[#6B6B6B]">
                Individual Settings & Actions
              </span>
            </div>

            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const doc = item.document;
                  const docId = doc?.id || "";
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
                            <p className="text-base font-bold text-[#111111] truncate">
                              {fileName}
                            </p>
                            <p className="text-xs text-[#6B6B6B] font-medium mt-0.5">
                              {item.calculatedPages || doc?.pageCount || 1}{" "}
                              pages · {item.copies} copies
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-extrabold text-[#111111]">
                            ₹
                            {item.itemPrice
                              ? item.itemPrice.toFixed(2)
                              : "0.00"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handlePreview(
                                docId,
                                fileName,
                                doc?.contentType || "application/pdf",
                              )
                            }
                            disabled={
                              previewDocId === docId && isPreviewLoading
                            }
                            className="btn-secondary-sm h-10 px-3.5 text-xs flex items-center gap-1.5"
                          >
                            {previewDocId === docId && isPreviewLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadItem(docId, fileName)}
                            disabled={isDownloading}
                            className="btn-secondary-sm h-10 px-3.5 text-xs flex items-center gap-1.5"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">
                            Color
                          </span>
                          <span className="font-bold text-[#111111]">
                            {item.colorMode === "BW"
                              ? "Black & White"
                              : "Full Color"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">
                            Paper / Side
                          </span>
                          <span className="font-bold text-[#111111]">
                            {item.paperSize} ·{" "}
                            {item.printSide === "DOUBLE" ? "Double" : "Single"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">
                            Page Range
                          </span>
                          <span className="font-bold text-[#111111]">
                            {item.pageRange || "ALL"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B6B6B] block font-bold uppercase">
                            Item Status
                          </span>
                          <span
                            className={`inline-block font-extrabold uppercase mt-0.5 ${
                              item.printStatus === "COMPLETED"
                                ? "text-emerald-700"
                                : item.printStatus === "PRINTING"
                                  ? "text-amber-700"
                                  : "text-neutral-800"
                            }`}
                          >
                            {item.printStatus}
                          </span>
                        </div>
                      </div>

                      {/* Item Quick Action Controls Removed for Auto Workflow */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {item.printStatus === "PENDING" && (
                          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                            <span>Waiting</span>
                          </span>
                        )}
                        {item.printStatus === "PRINTING" && (
                          <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            <span>Printing</span>
                          </span>
                        )}
                        {item.printStatus === "COMPLETED" && (
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
                    <p className="text-base font-bold text-[#111111]">
                      {order.document?.originalFileName || "Print Order"}
                    </p>
                    <span className="text-base font-extrabold text-[#111111]">
                      ₹{order.totalPrice.toFixed(2)}
                    </span>
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
                  <span>{order.customerName || "Walk-in Customer"}</span>
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
                      order.paymentStatus === "PAID" ? "PENDING" : "PAID",
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
                    order.paymentStatus === "PAID"
                      ? "chip-payment-paid"
                      : "chip-payment-pending"
                  }
                >
                  {order.paymentStatus === "PAID" ? "Paid" : "Pay at Counter"}
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
          {order.printStatus !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, "CANCELLED")}
              className="text-sm text-neutral-500 hover:text-rose-600 font-semibold"
            >
              Cancel Order
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {/* Manual print controls removed for automated workflow */}
            {order.printStatus === "PENDING" && (
              <div className="px-4 py-3 bg-neutral-100 rounded-lg text-sm text-neutral-600 font-medium">
                Waiting to Print
              </div>
            )}
            
            {order.printStatus === "PRINTING" && (
              <div className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing Automatically...
              </div>
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

      {/* Document Preview Overlay */}
      {previewDocId && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full max-h-[95vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E2E2] bg-neutral-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-base truncate max-w-md">
                    {previewFileName}
                  </h3>
                  <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">
                    {previewType || "Document Preview"}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-neutral-500 hover:text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-100 flex items-center justify-center overflow-hidden relative">
              {isPreviewLoading && !previewError && (
                <div className="flex flex-col items-center justify-center text-neutral-500 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                  <p className="font-medium">Loading document securely...</p>
                </div>
              )}

              {previewError && (
                <div className="flex flex-col items-center justify-center text-neutral-500 space-y-4 max-w-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
                    <X className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111111]">
                      Preview Failed
                    </h3>
                    <p className="text-sm mt-1 text-[#6B6B6B]">
                      The document could not be loaded for preview. Please
                      download it instead to view.
                    </p>
                  </div>
                  <button
                    onClick={closePreview}
                    className="btn-secondary mt-4 w-full"
                  >
                    Close Preview
                  </button>
                </div>
              )}

              {!isPreviewLoading &&
                !previewError &&
                previewUrl &&
                (() => {
                  const isImage = previewType.startsWith("image/");
                  const isPdf =
                    previewType === "application/pdf" ||
                    previewFileName.toLowerCase().endsWith(".pdf");
                  const isDocx =
                    previewFileName.toLowerCase().endsWith(".docx") ||
                    previewType ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                  const isUnsupported = !isImage && !isPdf && !isDocx;

                  if (isImage) {
                    return (
                      <div className="w-full h-full p-8 flex items-center justify-center bg-neutral-100 overflow-auto">
                        <img
                          src={previewUrl}
                          alt={previewFileName}
                          className="max-w-full max-h-full object-contain rounded shadow-sm"
                        />
                      </div>
                    );
                  }

                  if (isPdf) {
                    return (
                      <iframe
                        src={`${previewUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-full border-none bg-neutral-200"
                        title={previewFileName}
                      />
                    );
                  }

                  if (isDocx && docxHtml !== null) {
                    return (
                      <div className="w-full h-full overflow-y-auto bg-neutral-200/50 p-4 sm:p-8 flex justify-center">
                        <div
                          className="bg-white p-8 sm:p-12 shadow-md max-w-4xl w-full min-h-full docx-preview-container text-[#111111]"
                          dangerouslySetInnerHTML={{
                            __html: docxHtml || "<p>Empty document.</p>",
                          }}
                        />
                      </div>
                    );
                  }

                  if (isUnsupported || (isDocx && docxHtml === null)) {
                    return (
                      <div className="flex flex-col items-center justify-center text-neutral-500 space-y-4 max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                          <FileWarning className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#111111]">
                            Preview Not Available
                          </h3>
                          <p className="text-sm mt-1 text-[#6B6B6B]">
                            This file type (
                            {previewFileName.split(".").pop()?.toUpperCase() ||
                              "Unknown"}
                            ) cannot be securely previewed in the browser.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleDownloadItem(previewDocId, previewFileName)
                          }
                          className="btn-primary mt-4 w-full"
                        >
                          <Download className="w-5 h-5 mr-1" />
                          Download File to View
                        </button>
                      </div>
                    );
                  }

                  return null;
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
