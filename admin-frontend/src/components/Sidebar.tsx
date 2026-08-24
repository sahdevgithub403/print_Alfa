import React, { useState } from 'react';
import { 
  Printer, 
  History, 
  DollarSign, 
  QrCode, 
  Settings, 
  LogOut, 
  Menu,
  X,
  RefreshCw,
  Store,
  ChevronRight
} from 'lucide-react';

export type NavTab = 'ORDERS' | 'HISTORY' | 'PRICING' | 'QR' | 'SETTINGS' | 'AGENT';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  user: any;
  onLogout: () => void;
  pendingCount: number;
  printingCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenQR: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  pendingCount,
  printingCount,
  isRefreshing,
  onRefresh,
  onOpenQR,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'ORDERS' as NavTab,
      label: 'Orders Queue',
      icon: Printer,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-[#111111] text-white',
    },
    {
      id: 'HISTORY' as NavTab,
      label: 'Order History',
      icon: History,
    },
    {
      id: 'PRICING' as NavTab,
      label: 'Pricing Rates',
      icon: DollarSign,
    },
    {
      id: 'SETTINGS' as NavTab,
      label: 'Shop Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-white border-b border-[#E2E2E2] px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center font-bold">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#111111] leading-tight">
              {user?.shopName || 'QuickPrint Jamshedpur'}
            </h1>
            <p className="text-xs text-[#6B6B6B] font-medium">Shop Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 text-neutral-600 hover:text-[#111111] rounded-xl hover:bg-neutral-100 border border-[#E2E2E2]"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 text-neutral-700 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 border border-[#E2E2E2]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full flex flex-col justify-between p-6 shadow-2xl space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E2E2]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#111111]">PrintAlfa</h2>
                    <p className="text-xs text-[#6B6B6B]">Admin Dashboard</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full min-h-[48px] px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-[#111111] text-white'
                          : 'text-[#6B6B6B] hover:text-[#111111] hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          isActive ? 'bg-white text-[#111111]' : 'bg-[#111111] text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Counter QR Button */}
              <button
                onClick={() => {
                  onOpenQR();
                  setMobileMenuOpen(false);
                }}
                className="btn-secondary w-full h-12 text-sm font-bold flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Counter QR Code</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#E2E2E2] space-y-3">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-[#E2E2E2]">
                <Store className="w-5 h-5 text-neutral-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111111] truncate">{user?.shopName || 'QuickPrint'}</p>
                  <p className="text-[11px] text-[#6B6B6B] truncate">{user?.email || 'admin@quickprint.com'}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full h-11 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Desktop Vertical Sidebar */}
      <aside className="hidden lg:flex w-64 lg:w-72 bg-white border-r border-[#E2E2E2] h-screen sticky top-0 flex-col justify-between p-6 shrink-0 z-20">
        <div className="space-y-8">
          {/* Brand Header */}
          <div className="flex items-center space-x-3.5 pb-2">
            <div className="w-11 h-11 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Printer className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-[#111111] truncate leading-tight tracking-tight">
                {user?.shopName || 'QuickPrint Jamshedpur'}
              </h1>
              <p className="text-xs text-[#6B6B6B] font-medium truncate">Shop Admin Portal</p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-3">
              Navigation
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-[#111111] text-white shadow-xs'
                        : 'text-[#6B6B6B] hover:text-[#111111] hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-[#111111]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        isActive ? 'bg-white text-[#111111]' : 'bg-[#111111] text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Counter QR Printable Trigger */}
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-3">
              Quick Actions
            </p>
            <button
              onClick={onOpenQR}
              className="btn-secondary w-full h-12 text-sm font-bold flex items-center justify-between px-4 border-[#E2E2E2]"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-neutral-700" />
                <span>Counter QR Code</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Footer Admin User Card & Logout */}
        <div className="pt-6 border-t border-[#E2E2E2] space-y-4">
          {/* Refresh Status Row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[#6B6B6B] font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Auto-sync active
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 rounded-lg transition-colors"
              title="Refresh queue now"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#111111]' : ''}`} />
            </button>
          </div>

          {/* User Shop Badge */}
          <div className="flex items-center gap-3 p-3 bg-neutral-100/70 rounded-xl border border-neutral-200/80">
            <div className="w-9 h-9 rounded-lg bg-[#111111] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
              {(user?.shopName || 'QP')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#111111] truncate">{user?.shopName || 'QuickPrint'}</p>
              <p className="text-[11px] text-[#6B6B6B] truncate">{user?.email || 'admin@quickprint.com'}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full h-11 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
