import React, { useEffect, useState } from 'react';
import { ShopPricing } from '../types';
import { getShopPricing, updateShopPricing } from '../api';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';

export const PricingSettings: React.FC = () => {
  const [pricing, setPricing] = useState<ShopPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const data = await getShopPricing();
      setPricing(data);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ShopPricing, value: string) => {
    if (!pricing) return;
    const numValue = parseFloat(value) || 0;
    setPricing({ ...pricing, [field]: numValue });
    setHasChanges(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricing) return;
    setSaving(true);
    setSuccessMsg(false);
    try {
      const updated = await updateShopPricing(pricing);
      setPricing(updated);
      setSuccessMsg(true);
      setHasChanges(false);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-6 max-w-4xl">
        <div className="h-8 w-64 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-neutral-50 rounded-xl animate-pulse" />
          <div className="h-64 bg-neutral-50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!pricing) return null;

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2E2] pb-6">
        <div>
          <h2 className="text-xl font-bold text-[#111111]">Printing Rates</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            Configure per-page rates for automated price calculation on customer orders.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !hasChanges}
          className="btn-primary min-h-[52px]"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Save Changes</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pricing rates saved successfully.</span>
        </div>
      )}

      {/* Grid of rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section 1: A4 Paper Rates */}
        <div className="space-y-5 bg-neutral-50/70 p-6 rounded-2xl border border-[#E2E2E2]">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            A4 Paper Rates
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">B&W Single Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="0.5"
                  value={pricing.bwA4Single}
                  onChange={(e) => handleFieldChange('bwA4Single', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">B&W Double Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="0.5"
                  value={pricing.bwA4Double}
                  onChange={(e) => handleFieldChange('bwA4Double', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">Color Single Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.colorA4Single}
                  onChange={(e) => handleFieldChange('colorA4Single', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">Color Double Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.colorA4Double}
                  onChange={(e) => handleFieldChange('colorA4Double', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: A3 Paper Rates */}
        <div className="space-y-5 bg-neutral-50/70 p-6 rounded-2xl border border-[#E2E2E2]">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            A3 Paper Rates
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">B&W Single Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.bwA3Single}
                  onChange={(e) => handleFieldChange('bwA3Single', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">B&W Double Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.bwA3Double}
                  onChange={(e) => handleFieldChange('bwA3Double', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">Color Single Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.colorA3Single}
                  onChange={(e) => handleFieldChange('colorA3Single', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-[#111111]">Color Double Side</label>
              <div className="relative w-36">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-neutral-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={pricing.colorA3Double}
                  onChange={(e) => handleFieldChange('colorA3Double', e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-white border border-[#E2E2E2] rounded-xl text-base font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
