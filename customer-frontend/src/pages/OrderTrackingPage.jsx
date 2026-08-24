import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrderByToken } from "../api";
import {
  CheckCircle2,
  Printer,
  ArrowLeft,
  RefreshCw,
  FileText,
} from "lucide-react";

export const OrderTrackingPage = () => {
  const { publicToken } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(() => {
      fetchOrderDetails(true);
    }, 4000); // 4s polling

    return () => clearInterval(interval);
  }, [publicToken]);

  const fetchOrderDetails = async (isBackground = false) => {
    if (!publicToken) return;
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await getOrderByToken(publicToken);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStepStatus = (stepName) => {
    if (!order) return "PENDING";
    const status = order.printStatus;

    if (status === "CANCELLED") return "CANCELLED";

    if (stepName === "RECEIVED") return "COMPLETED";

    if (stepName === "PRINTING") {
      if (status === "PRINTING" || status === "COMPLETED") return "COMPLETED";
      return "CURRENT";
    }

    if (stepName === "READY") {
      if (status === "COMPLETED") return "COMPLETED";
      return "PENDING";
    }

    return "PENDING";
  };

  const itemsList = order?.items && order.items.length > 0 ? order.items : [];

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111111] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E2E2] py-4 sm:py-5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6B6B] hover:text-[#111111] px-3 py-2 -ml-3 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>New Print</span>
          </button>
          <button
            onClick={() => fetchOrderDetails(false)}
            disabled={isRefreshing}
            className="p-2 text-[#6B6B6B] hover:text-[#111111] rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin text-[#111111]" : ""}`}
            />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-5 sm:px-6 py-10 space-y-8">
        {/* Order Identifier */}
        <div className="text-center space-y-2">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-neutral-200 text-[#111111] uppercase tracking-wider">
            Live Print Token
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#111111] tracking-tight">
            #{order?.orderNumber || "---"}
          </h1>
          <p className="text-base text-[#6B6B6B] font-medium">
            Keep this screen open while waiting at the shop counter.
          </p>
        </div>

        {/* Live Timeline Component */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-[#E2E2E2] space-y-6 sm:space-y-8 shadow-2xs">
          <div className="space-y-6 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#E2E2E2]">
            {/* Step 1: Received */}
            <div className="flex items-start gap-5 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-sm shrink-0 border-4 border-white shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-[#111111]">
                  Order Received
                </h3>
                <p className="text-sm text-[#6B6B6B] mt-0.5">
                  Sent directly to shop queue
                </p>
              </div>
            </div>

            {/* Step 2: Printing */}
            <div className="flex items-start gap-5 relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-4 border-white shadow-xs ${
                  getStepStatus("PRINTING") === "COMPLETED"
                    ? "bg-[#111111] text-white"
                    : getStepStatus("PRINTING") === "CURRENT"
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-neutral-200 text-neutral-500"
                }`}
              >
                <Printer className="w-5 h-5" />
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-[#111111]">
                  Printing Files
                </h3>
                <p className="text-sm text-[#6B6B6B] mt-0.5">
                  {order?.printStatus === "PRINTING"
                    ? "Operator is currently printing your files"
                    : "Waiting in printer queue"}
                </p>
              </div>
            </div>

            {/* Step 3: Ready */}
            <div className="flex items-start gap-5 relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-4 border-white shadow-xs ${
                  getStepStatus("READY") === "COMPLETED"
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-[#111111]">
                  Ready for Pickup
                </h3>
                <p className="text-sm text-[#6B6B6B] mt-0.5">
                  Collect prints at shop counter
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details & Items Card */}
        {order && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E2E2E2] space-y-4 sm:space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E2E2E2]">
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Order Items ({itemsList.length || 1})
              </span>
              <span className="text-xs font-bold text-[#6B6B6B]">Status</span>
            </div>

            <div className="space-y-4 divide-y divide-[#E2E2E2]">
              {itemsList.length > 0 ? (
                itemsList.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-3 sm:gap-4 ${idx > 0 ? "pt-3 sm:pt-4" : ""}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200 mt-0.5">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-[#111111] truncate">
                          {item.document?.originalFileName || `File ${idx + 1}`}
                        </p>
                        <p className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 font-medium">
                          {item.colorMode === "BW" ? "B&W" : "Color"} ·{" "}
                          {item.paperSize} · {item.copies}{" "}
                          {item.copies === 1 ? "copy" : "copies"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-extrabold uppercase ${
                          item.printStatus === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.printStatus === "PRINTING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {item.printStatus}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B6B6B] text-sm font-medium">
                    {order.document?.originalFileName || "Print Order"}
                  </span>
                  <span className="font-bold text-[#111111] text-base">
                    ₹{order.totalPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E2E2E2]">
              <span className="text-[#6B6B6B] text-sm font-medium">
                Total Amount
              </span>
              <span className="text-xl font-extrabold text-[#111111]">
                ₹{order.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
