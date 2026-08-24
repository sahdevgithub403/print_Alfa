import React from "react";
import { Cpu, Store, Mail, Shield, CheckCircle2 } from "lucide-react";

export const SettingsView = ({ user }) => {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Shop Information Section */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-6">
        <div className="border-b border-[#E2E2E2] pb-4">
          <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
            <Store className="w-5 h-5 text-[#111111]" />
            <span>Shop Information</span>
          </h2>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            Basic details about your print shop establishment
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Shop Name
            </label>
            <input
              type="text"
              readOnly
              value={user?.shopName || "QuickPrint Jamshedpur"}
              className="input-field bg-neutral-50 cursor-not-allowed text-base font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Shop Slug Identifier
            </label>
            <input
              type="text"
              readOnly
              value={user?.shopSlug || "quickprint"}
              className="input-field bg-neutral-50 cursor-not-allowed text-base font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Admin Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-4 top-4" />
              <input
                type="text"
                readOnly
                value={user?.email || "admin@quickprint.com"}
                className="input-field pl-11 bg-neutral-50 cursor-not-allowed text-base font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Account Role
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-neutral-400 absolute left-4 top-4" />
              <input
                type="text"
                readOnly
                value={user?.role || "SHOP_ADMIN"}
                className="input-field pl-11 bg-neutral-50 cursor-not-allowed text-base font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Local Print Agent Configuration */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-6">
        <div className="border-b border-[#E2E2E2] pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-[#111111]" />
              <span>Windows Print Agent Service</span>
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Automatic direct printing background agent connection
            </p>
          </div>

          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Agent Connected</span>
          </span>
        </div>

        <div className="bg-neutral-50 p-6 rounded-xl border border-[#E2E2E2] text-sm space-y-3">
          <div className="flex justify-between border-b border-neutral-200 pb-3">
            <span className="text-[#6B6B6B]">Service Status:</span>
            <span className="font-bold text-emerald-800">
              Online & Polling Queue
            </span>
          </div>
          <div className="flex justify-between border-b border-neutral-200 pb-3">
            <span className="text-[#6B6B6B]">Queue API Endpoint:</span>
            <span className="font-mono font-bold text-[#111111]">
              /api/print-agent/jobs
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Default Connected Printer:</span>
            <span className="font-bold text-[#111111]">
              HP LaserJet Pro M404n
            </span>
          </div>
        </div>

        <p className="text-sm text-[#6B6B6B]">
          When direct printing is active, incoming print requests marked as
          "Print Now" will automatically route to the shop's default thermal or
          LaserJet printer without prompting browser print windows.
        </p>
      </div>
    </div>
  );
};
