import React from 'react';
import { Shop } from '../types';
import { Printer, MapPin } from 'lucide-react';

interface Props {
  shop: Shop;
}

export const ShopHeader: React.FC<Props> = ({ shop }) => {
  return (
    <header className="bg-white border-b border-[#E2E2E2] py-5 px-6 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center font-bold shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] truncate leading-tight tracking-tight">
              {shop.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6B6B] flex items-center gap-1 mt-0.5 truncate font-medium">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
              <span>{shop.address || 'Instant Print Counter · Print & Xerox'}</span>
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
          Open Counter
        </span>
      </div>
    </header>
  );
};
