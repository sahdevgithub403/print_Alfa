import React, { useEffect, useState } from "react";
import {
  getAdminOrders,
  updateOrderPrintStatus,
  updateOrderPaymentStatus,
  sendHeartbeat,
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
import { printClient } from "../services/printClient";
import { Activity } from "lucide-react";

export const AdminDashboardPage = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("ORDERS");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [clientState, setClientState] = useState(printClient.getState());
  const notifiedOrders = React.useRef(new Set());
  const ordersRef = React.useRef([]); // To access current orders in callbacks

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Initialize Print Client
    const unsubscribeClient = printClient.subscribe(setClientState);

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 30000); // 30s fallback polling
    
    // Heartbeat ping every 10 seconds to maintain single-device active session
    const heartbeatInterval = setInterval(async () => {
      try {
        await sendHeartbeat();
      } catch (err) {
        console.error("Heartbeat failed", err);
      }
    }, 10000);

    const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8085";
    let baseUrl = API_URL;
    if (baseUrl.endsWith("/api")) {
      baseUrl = baseUrl.slice(0, -4);
    }
    // Default to absolute backend URL to prevent Vite proxy 404s
    if (!baseUrl || baseUrl.startsWith("/")) {
      baseUrl = "http://localhost:8085";
    }
    const wsUrl = `${baseUrl}/ws-admin`;

    const token = localStorage.getItem("admin_jwt_token");
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
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

              // Instantly trigger physical print worker on new print requests
              if (event.type === "NEW_PRINT_REQUEST" || event.type === "ORDER_CREATED") {
                const order = event.order;
                if (order && !notifiedOrders.current.has(order.id)) {
                  notifiedOrders.current.add(order.id);
                  if (window.electronAPI?.showOrderNotification) {
                    window.electronAPI.showOrderNotification(order);
                  } else {
                    console.log("New print request received. Check order queue.");
                  }
                }
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

    let unsubscribeIpc = null;
    if (window.electronAPI?.onOrderActionResult) {
      window.electronAPI.onOrderActionResult(async ({ orderId, action }) => {
        console.log(`Received action ${action} for order ${orderId}`);
        if (action === 'ACCEPT_AND_PRINT') {
          try {
            await updateOrderPrintStatus(orderId, 'PRINTING');
            fetchOrders(true);
            
            // We need the full order object to print
            const fullOrder = ordersRef.current.find(o => o.id === orderId) || { id: orderId, orderNumber: "Unknown" };
            
            await printClient.executePrintJob(fullOrder);
            await updateOrderPrintStatus(orderId, 'COMPLETED');
            fetchOrders(true);
          } catch (e) {
            console.error("Failed to print order:", e);
            await updateOrderPrintStatus(orderId, 'FAILED');
            fetchOrders(true);
          }
        } else if (action === 'DECLINE') {
          try {
            await updateOrderPrintStatus(orderId, 'CANCELLED');
            fetchOrders(true);
          } catch (e) {
            console.error("Failed to decline order:", e);
          }
        }
      });
    }

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
      stompClient.deactivate();
      unsubscribeClient();
    };
  }, [user]);

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAdminOrders();
      setOrders(data || []);
      ordersRef.current = data || [];
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

  // Today's Overview & Revenue (Monitoring)
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const todayReceived = todayOrders.length;
  const todayPrinted = todayOrders.filter(o => o.printStatus === "COMPLETED").length;
  const todayDeclined = todayOrders.filter(o => o.printStatus === "DECLINED" || o.printStatus === "CANCELLED").length;
  const todayFailed = todayOrders.filter(o => o.printStatus === "FAILED").length;

  const revenueTotal = todayOrders.filter(o => o.printStatus === "COMPLETED").reduce((sum, o) => sum + o.totalPrice, 0);
  const revenueOnline = todayOrders.filter(o => o.printStatus === "COMPLETED" && o.paymentStatus === "PAID").reduce((sum, o) => sum + o.totalPrice, 0);
  const revenuePending = todayOrders.filter(o => o.printStatus === "COMPLETED" && o.paymentStatus !== "PAID").reduce((sum, o) => sum + o.totalPrice, 0);

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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
                      {activeTab === "HISTORY" ? "Order History" : "Orders Queue"}
                    </h1>
                    
                  </div>
                  <p className="text-base text-[#6B6B6B] mt-1 font-medium">
                    {activeTab === "HISTORY"
                      ? "Archived completed and cancelled print requests"
                      : "Real-time customer print requests & counter queue"}
                  </p>
                </div>

                {/* Search Bar (52px height) */}
                <div className="relative w-full md:w-80">
                  <Search className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search file, order #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field input-with-icon text-sm"
                  />
                </div>
              </div>

              {/* Business Overview & Monitoring Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Today's Overview */}
                <div className="bg-white rounded-2xl border border-[#E2E2E2] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider">Today's Overview</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Received</p>
                      <p className="text-2xl font-extrabold text-[#111111]">{todayReceived}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Printed</p>
                      <p className="text-2xl font-extrabold text-blue-600">{todayPrinted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Declined</p>
                      <p className="text-2xl font-extrabold text-neutral-600">{todayDeclined}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Failed</p>
                      <p className="text-2xl font-extrabold text-rose-600">{todayFailed}</p>
                    </div>
                  </div>
                </div>

                {/* Revenue Summary */}
                <div className="bg-white rounded-2xl border border-[#E2E2E2] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#6B6B6B] uppercase tracking-wider">Revenue Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Total</p>
                      <p className="text-2xl font-extrabold text-emerald-600">₹{revenueTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Online</p>
                      <p className="text-2xl font-extrabold text-[#111111]">₹{revenueOnline.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] font-semibold mb-1">Pay at Shop</p>
                      <p className="text-2xl font-extrabold text-[#111111]">₹{revenuePending.toFixed(2)}</p>
                    </div>
                  </div>
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
          shopName={user?.shopName || ""}
          shopSlug={user?.shopSlug || ""}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};
