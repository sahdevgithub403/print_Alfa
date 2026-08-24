import React, { useEffect, useState } from "react";
import {
  getAdminOrders,
  updateOrderPrintStatus,
  updateOrderPaymentStatus,
} from "../api";
import { Sidebar } from "../components/Sidebar";
import { OrderCard } from "../components/OrderCard";
import { OrderDetailModal } from "../components/OrderDetailModal";
import { PricingSettings } from "../components/PricingSettings";
import { QRCodeModal } from "../components/QRCodeModal";
import { SettingsView } from "../components/SettingsView";
import { Inbox, AlertTriangle, Search } from "lucide-react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export const AdminDashboardPage = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("ORDERS");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 30000); // 30s fallback polling

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
    const baseUrl = API_BASE_URL.replace("/api", "");
    const wsUrl = `${baseUrl}/ws-admin`;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = (frame) => {
      console.log("Connected: " + frame);
      const shopId = user?.shopId;
      if (shopId) {
        stompClient.subscribe(
          `/topic/admin/shop/${shopId}/orders`,
          (message) => {
            if (message.body) {
              const event = JSON.parse(message.body);
              console.log("Received real-time event:", event);
              // Re-fetch orders silently to update the list
              fetchOrders(true);

              // Trigger Windows Notification via Electron
              if (window.electronAPI && event.type === "NEW_PRINT_REQUEST") {
                const orderNum = event.order?.orderNumber || "New Request";
                const customerName =
                  event.order?.customerName || "Walk-in Customer";
                const itemsCount = event.order?.items?.length || 1;
                window.electronAPI.showNotification(
                  `New Print Request: ${orderNum}`,
                  `${customerName} sent ${itemsCount} document(s).`,
                );
              }
            }
          },
        );
      }
    };

    stompClient.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };

    stompClient.activate();

    return () => {
      clearInterval(interval);
      stompClient.deactivate();
    };
  }, [user]);

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAdminOrders();
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      if (!isBackground) {
        setError(
          "Unable to load shop orders. Please check backend connection.",
        );
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderPrintStatus(orderId, newStatus);
      fetchOrders(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      await updateOrderPaymentStatus(orderId, newPaymentStatus);
      fetchOrders(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats Counters
  const pendingCount = orders.filter((o) => o.printStatus === "PENDING").length;
  const printingCount = orders.filter(
    (o) => o.printStatus === "PRINTING",
  ).length;
  const completedCount = orders.filter(
    (o) => o.printStatus === "COMPLETED",
  ).length;

  // Filtered orders logic
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "HISTORY") {
      if (
        order.printStatus !== "COMPLETED" &&
        order.printStatus !== "CANCELLED"
      )
        return false;
    } else if (statusFilter !== "ALL") {
      if (order.printStatus !== statusFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filename = (order.document?.originalFileName || "").toLowerCase();
      const orderNum = (order.orderNumber || "").toLowerCase();
      const customer = (order.customerName || "").toLowerCase();
      const phone = (order.customerPhone || "").toLowerCase();
      return (
        filename.includes(q) ||
        orderNum.includes(q) ||
        customer.includes(q) ||
        phone.includes(q)
      );
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111111] flex flex-col lg:flex-row">
      {/* Left Desktop Vertical Sidebar / Mobile Top & Drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === "QR") setShowQRModal(true);
        }}
        user={user}
        onLogout={onLogout}
        pendingCount={pendingCount}
        printingCount={printingCount}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchOrders(false)}
        onOpenQR={() => setShowQRModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-8 py-10 space-y-8">
          {/* ORDERS & HISTORY TAB VIEWS */}
          {(activeTab === "ORDERS" || activeTab === "HISTORY") && (
            <div className="space-y-8">
              {/* Editorial Title & Controls Row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2E2E2] pb-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
                    {activeTab === "HISTORY" ? "Order History" : "Orders Queue"}
                  </h1>
                  <p className="text-base text-[#6B6B6B] mt-1 font-medium">
                    {activeTab === "HISTORY"
                      ? "Archived completed and cancelled print requests"
                      : "Real-time customer print requests & counter queue"}
                  </p>
                </div>

                {/* Search Bar (52px height) */}
                <div className="relative w-full md:w-80">
                  <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search file, order #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-12 h-12 text-sm"
                  />
                </div>
              </div>

              {/* Status Filter Pill Row (Spacious & Clean) */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      statusFilter === "ALL"
                        ? "bg-[#111111] text-white"
                        : "text-[#6B6B6B] hover:text-[#111111] bg-white border border-[#E2E2E2]"
                    }`}
                  >
                    All ({orders.length})
                  </button>

                  <button
                    onClick={() => setStatusFilter("PENDING")}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      statusFilter === "PENDING"
                        ? "bg-[#111111] text-white"
                        : "text-[#6B6B6B] hover:text-[#111111] bg-white border border-[#E2E2E2]"
                    }`}
                  >
                    <span>New Orders</span>
                    {pendingCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          statusFilter === "PENDING"
                            ? "bg-white text-[#111111]"
                            : "bg-neutral-200 text-neutral-800"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setStatusFilter("PRINTING")}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      statusFilter === "PRINTING"
                        ? "bg-[#111111] text-white"
                        : "text-[#6B6B6B] hover:text-[#111111] bg-white border border-[#E2E2E2]"
                    }`}
                  >
                    <span>Printing</span>
                    {printingCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          statusFilter === "PRINTING"
                            ? "bg-white text-[#111111]"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {printingCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setStatusFilter("COMPLETED")}
                    className={`min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      statusFilter === "COMPLETED"
                        ? "bg-[#111111] text-white"
                        : "text-[#6B6B6B] hover:text-[#111111] bg-[#ffffff] border border-[#E2E2E2]"
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                <div className="text-sm text-[#6B6B6B] font-semibold">
                  Showing{" "}
                  <span className="font-extrabold text-[#111111]">
                    {filteredOrders.length}
                  </span>{" "}
                  print jobs
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => fetchOrders(false)}
                    className="btn-secondary-sm"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {/* STRUCTURED ORDER LIST CONTAINER */}
              {loading ? (
                <div className="divide-y divide-[#E2E2E2] bg-white border border-[#E2E2E2] rounded-2xl p-6 space-y-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="py-4 space-y-3 animate-pulse">
                      <div className="h-5 bg-neutral-100 rounded w-1/3" />
                      <div className="h-4 bg-neutral-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-2xl border border-[#E2E2E2] p-16 text-center space-y-4 my-6">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto border border-neutral-200">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111111]">
                      No print orders found
                    </h3>
                    <p className="text-sm text-[#6B6B6B] mt-1 max-w-md mx-auto">
                      {searchQuery
                        ? `No orders matching "${searchQuery}".`
                        : statusFilter !== "ALL"
                          ? `No orders currently marked as "${statusFilter}".`
                          : "New print requests will appear here in real-time as customers scan your QR code."}
                    </p>
                  </div>
                </div>
              ) : (
                /* Editorial Structured Order List */
                <div className="bg-white rounded-2xl border border-[#E2E2E2] divide-y divide-[#E2E2E2] overflow-hidden shadow-2xs">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdatePaymentStatus={handleUpdatePaymentStatus}
                      onSelectOrder={(ord) => setSelectedOrder(ord)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRICING RATES TAB */}
          {activeTab === "PRICING" && <PricingSettings />}

          {/* SETTINGS TAB */}
          {activeTab === "SETTINGS" && <SettingsView user={user} />}
        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />
      )}

      {/* QR Code Printable Modal */}
      {showQRModal && (
        <QRCodeModal
          shopName={user?.shopName || "QuickPrint Jamshedpur"}
          shopSlug={user?.shopSlug || "quickprint"}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};
