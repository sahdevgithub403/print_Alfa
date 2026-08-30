import React from "react";
import { Menu, Search, RefreshCw, QrCode } from "lucide-react";

export const TopHeader = ({
  activeTab,
  onOpenMobileSidebar,
  isRefreshing,
  onRefresh,
  searchQuery,
  setSearchQuery,
  onOpenQR,
}) => {
  const getTabTitle = (tab) => {
    switch (tab) {
      case "ORDERS":
        return "Orders Queue";
      case "HISTORY":
        return "Order History";
      case "PRICING":
        return "Print Pricing Rates";
      case "QR":
        return "Shop Counter QR Code";
      case "SETTINGS":
        return "Shop Settings";
      case "CLIENT":
        return "PrintAlfa Print Client";
      default:
        return "Admin Dashboard";
    }
  };

  return (
    <header className="bg-white border-b border-[#E2E2E2] px-6 py-4 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & View Title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              {getTabTitle(activeTab)}
            </h1>
            <p className="text-sm text-[#6B6B6B] hidden sm:block mt-0.5">
              Real-time print job processing & shop management
            </p>
          </div>
        </div>

        {/* Right: Global Search & Refresh & QR Quick Action */}
        <div className="flex items-center space-x-3">
          {/* Search bar */}
          {(activeTab === "ORDERS" || activeTab === "HISTORY") && (
            <div className="relative w-44 sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search file, order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-sm text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
              />
            </div>
          )}

          {/* Refresh Button (44px target) */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-11 h-11 text-neutral-600 hover:text-[#111111] rounded-xl hover:bg-neutral-100 transition-colors flex items-center justify-center border border-[#E2E2E2]"
            title="Refresh Orders"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin text-neutral-900" : ""}`}
            />
          </button>

          {/* QR Poster Solid Black Primary Button */}
          <button onClick={onOpenQR} className="btn-primary-sm min-h-[44px]">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Counter QR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
