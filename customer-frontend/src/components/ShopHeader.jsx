import React from "react";
import { Printer, MapPin } from "lucide-react";

export const ShopHeader = ({ shop }) => {
  return (
    <header className="bg-white border-b border-[#E2E2E2] py-4 sm:py-5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center font-bold shrink-0">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#111111] truncate leading-tight tracking-tight">
              {shop.name}
            </h1>
            <p className="text-[10px] sm:text-sm text-[#6B6B6B] flex items-center gap-1 mt-0.5 truncate font-medium">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-neutral-400" />
              <span>
                {shop.address || "Instant Print Counter · Print & Xerox"}
              </span>
            </p>
          </div>
        </div>

        <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 hidden sm:inline-block">
          Open Counter
        </span>
        <span className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 sm:hidden">
          Open
        </span>
      </div>
    </header>
  );
};
