import React, { useEffect, useState } from 'react';
import { LocalOrderItem, PrintSpecifications, PricingResponse } from '../types';
import { calculatePrice } from '../api';
import { ArrowLeft, ArrowRight, Check, Edit2, Minus, Plus, Loader2, FileText, Sliders, X } from 'lucide-react';

interface Props {
  shopId: string;
  items: LocalOrderItem[];
  onItemsChange: (items: LocalOrderItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PrintOptionsStep: React.FC<Props> = ({
  shopId,
  items,
  onItemsChange,
  onBack,
  onContinue,
}) => {
  const [editingItem, setEditingItem] = useState<LocalOrderItem | null>(null);
  const [editingSpecs, setEditingSpecs] = useState<PrintSpecifications | null>(null);
  const [editingPrice, setEditingPrice] = useState<PricingResponse | null>(null);
  const [isCalculatingEditPrice, setIsCalculatingEditPrice] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Default global settings bar
  const [defaultSpecs, setDefaultSpecs] = useState<PrintSpecifications>({
    printType: 'PRINT',
    colorMode: 'BW',
    paperSize: 'A4',
    printSide: 'SINGLE',
    pageRangeOption: 'ALL',
    customPageRange: '',
    copies: 1,
  });

  useEffect(() => {
    // Initial pricing calculation for all items if needed
    calculateAllPrices(items);
  }, []);

  const calculateItemPrice = async (item: LocalOrderItem, specs: PrintSpecifications): Promise<PricingResponse | null> => {
    if (!item.uploadedDocument) return null;
    try {
      const pageRangeStr = specs.pageRangeOption === 'ALL' ? 'ALL' : specs.customPageRange;
      const res = await calculatePrice({
        shopId,
        documentId: item.uploadedDocument.id,
        printType: specs.printType,
        colorMode: specs.colorMode,
        paperSize: specs.paperSize,
        printSide: specs.printSide,
        pageRange: pageRangeStr,
        copies: specs.copies,
      });
      return res;
    } catch (err) {
      console.error('Failed to calculate price for item:', item.localId, err);
      return null;
    }
  };

  const calculateAllPrices = async (targetItems: LocalOrderItem[]) => {
    const updated = [...targetItems];
    for (const item of updated) {
      if (item.uploadedDocument) {
        item.isCalculatingPrice = true;
      }
    }
    onItemsChange([...updated]);

    for (const item of updated) {
      if (item.uploadedDocument) {
        const pricingRes = await calculateItemPrice(item, item.settings);
        if (pricingRes) {
          item.pricing = pricingRes;
        }
        item.isCalculatingPrice = false;
      }
    }
    onItemsChange([...updated]);
  };

  const handleApplyToAll = async () => {
    const updated = items.map((item) => ({
      ...item,
      settings: { ...defaultSpecs },
      isCalculatingPrice: true,
    }));
    onItemsChange(updated);

    for (const item of updated) {
      if (item.uploadedDocument) {
        const pricingRes = await calculateItemPrice(item, item.settings);
        if (pricingRes) {
          item.pricing = pricingRes;
        }
        item.isCalculatingPrice = false;
      }
    }
    onItemsChange([...updated]);
  };

  const openEditModal = (item: LocalOrderItem) => {
    setEditingItem(item);
    setEditingSpecs({ ...item.settings });
    setEditingPrice(item.pricing || null);
    setRangeError(null);
  };

  useEffect(() => {
    if (!editingItem || !editingSpecs) return;
    fetchEditPrice(editingItem, editingSpecs);
  }, [editingSpecs]);

  const fetchEditPrice = async (item: LocalOrderItem, specs: PrintSpecifications) => {
    setIsCalculatingEditPrice(true);
    setRangeError(null);

    if (specs.pageRangeOption === 'CUSTOM' && specs.customPageRange.trim()) {
      const pageCount = item.uploadedDocument?.pageCount || 1;
      const valid = validatePageRange(specs.customPageRange, pageCount);
      if (!valid.isValid) {
        setRangeError(valid.message);
        setIsCalculatingEditPrice(false);
        return;
      }
    }

    const priceRes = await calculateItemPrice(item, specs);
    if (priceRes) {
      setEditingPrice(priceRes);
    }
    setIsCalculatingEditPrice(false);
  };

  const validatePageRange = (rangeStr: string, totalPages: number): { isValid: boolean; message: string } => {
    try {
      const parts = rangeStr.split(',');
      for (const part of parts) {
        const p = part.trim();
        if (p.includes('-')) {
          const [startStr, endStr] = p.split('-');
          const start = parseInt(startStr.trim());
          const end = parseInt(endStr.trim());
          if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
            return { isValid: false, message: `Page range must be between 1 and ${totalPages}` };
          }
        } else if (p) {
          const num = parseInt(p);
          if (isNaN(num) || num < 1 || num > totalPages) {
            return { isValid: false, message: `Page number ${num} exceeds document total of ${totalPages}` };
          }
        }
      }
      return { isValid: true, message: '' };
    } catch {
      return { isValid: false, message: 'Invalid page range format' };
    }
  };

  const saveEditChanges = () => {
    if (!editingItem || !editingSpecs || rangeError) return;
    const updated = items.map((item) => {
      if (item.localId === editingItem.localId) {
        return {
          ...item,
          settings: { ...editingSpecs },
          pricing: editingPrice || item.pricing,
        };
      }
      return item;
    });
    onItemsChange(updated);
    setEditingItem(null);
    setEditingSpecs(null);
  };

  const calculateOrderTotal = (): number => {
    return items.reduce((sum, item) => sum + (item.pricing?.totalPrice || 0), 0);
  };

  const isAnyCalculating = items.some((i) => i.isCalculatingPrice);

  return (
    <div className="space-y-8 pb-32">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6B6B] hover:text-[#111111] px-3 py-2 -ml-3 rounded-lg hover:bg-neutral-200/60 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Change files</span>
      </button>

      {/* Title */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          Print Specifications
        </h2>
        <p className="text-base text-[#6B6B6B] mt-2 font-medium">
          Set default options for all files or customize individual file settings.
        </p>
      </div>

      {/* Default Print Settings Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E2E2] space-y-5 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E2E2]">
          <div className="flex items-center gap-2.5 text-[#111111]">
            <Sliders className="w-5 h-5 text-[#111111]" />
            <span className="text-base font-extrabold">Default Print Settings</span>
          </div>
          <button
            type="button"
            onClick={handleApplyToAll}
            className="btn-primary h-11 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Apply to All Files
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Color Mode */}
          <div>
            <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1.5">Color</label>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, colorMode: 'BW' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.colorMode === 'BW' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                B&W
              </button>
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, colorMode: 'COLOR' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.colorMode === 'COLOR' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                Color
              </button>
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1.5">Paper</label>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, paperSize: 'A4' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.paperSize === 'A4' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, paperSize: 'A3' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.paperSize === 'A3' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                A3
              </button>
            </div>
          </div>

          {/* Print Side */}
          <div>
            <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1.5">Sides</label>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, printSide: 'SINGLE' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.printSide === 'SINGLE' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, printSide: 'DOUBLE' })}
                className={`h-9 text-xs font-bold rounded-lg transition-all ${
                  defaultSpecs.printSide === 'DOUBLE' ? 'bg-[#111111] text-white' : 'text-[#111111]'
                }`}
              >
                Double
              </button>
            </div>
          </div>

          {/* Copies */}
          <div>
            <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1.5">Copies</label>
            <div className="flex items-center justify-between bg-neutral-100 p-1 rounded-xl border border-neutral-200 h-11 px-2">
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, copies: Math.max(1, defaultSpecs.copies - 1) })}
                className="w-7 h-7 bg-white text-[#111111] rounded-md font-bold text-sm border border-neutral-300 flex items-center justify-center"
              >
                -
              </button>
              <span className="font-extrabold text-sm text-[#111111]">{defaultSpecs.copies}</span>
              <button
                type="button"
                onClick={() => setDefaultSpecs({ ...defaultSpecs, copies: defaultSpecs.copies + 1 })}
                className="w-7 h-7 bg-white text-[#111111] rounded-md font-bold text-sm border border-neutral-300 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Individual File Settings List */}
      <div className="space-y-4">
        <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
          Print Files ({items.length})
        </span>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const doc = item.uploadedDocument;
            const fileName = doc?.originalFileName || item.file?.name || `File ${idx + 1}`;
            const pageCount = doc?.pageCount || 1;
            const price = item.pricing?.totalPrice;

            return (
              <div
                key={item.localId}
                className="bg-white rounded-2xl p-5 border border-[#E2E2E2] flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200 font-extrabold text-base">
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-bold text-[#111111] truncate">{fileName}</p>
                    <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5 font-medium">
                      <span className="font-semibold text-[#111111]">
                        {item.settings.colorMode === 'BW' ? 'B&W' : 'Color'} · {item.settings.paperSize} · {item.settings.printSide === 'SINGLE' ? 'Single-sided' : 'Double-sided'}
                      </span>
                      <span> · {pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                      <span> · {item.settings.copies} {item.settings.copies === 1 ? 'copy' : 'copies'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#111111] block">
                      {item.isCalculatingPrice ? (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      ) : (
                        `₹${price !== undefined ? price.toFixed(2) : '0.00'}`
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="btn-secondary h-11 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit File Settings Drawer / Modal */}
      {editingItem && editingSpecs && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-[#E2E2E2] shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E2E2]">
              <div>
                <h3 className="text-xl font-extrabold text-[#111111]">Customize Print File</h3>
                <p className="text-sm font-medium text-[#6B6B6B] truncate max-w-xs mt-0.5">
                  {editingItem.uploadedDocument?.originalFileName || editingItem.file?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Color Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Color Output</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setEditingSpecs({ ...editingSpecs, colorMode: 'BW' })}
                  className={`selection-row min-h-[56px] ${editingSpecs.colorMode === 'BW' ? 'selection-row-active' : ''}`}
                >
                  <span className="text-sm font-bold text-[#111111]">Black & White</span>
                  {editingSpecs.colorMode === 'BW' && <Check className="w-5 h-5 text-[#111111]" />}
                </div>
                <div
                  onClick={() => setEditingSpecs({ ...editingSpecs, colorMode: 'COLOR' })}
                  className={`selection-row min-h-[56px] ${editingSpecs.colorMode === 'COLOR' ? 'selection-row-active' : ''}`}
                >
                  <span className="text-sm font-bold text-[#111111]">Full Color</span>
                  {editingSpecs.colorMode === 'COLOR' && <Check className="w-5 h-5 text-[#111111]" />}
                </div>
              </div>
            </div>

            {/* Paper Size & Sides */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Paper Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSpecs({ ...editingSpecs, paperSize: 'A4' })}
                    className={`h-11 rounded-xl border text-sm font-bold ${
                      editingSpecs.paperSize === 'A4' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E2E2E2]'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSpecs({ ...editingSpecs, paperSize: 'A3' })}
                    className={`h-11 rounded-xl border text-sm font-bold ${
                      editingSpecs.paperSize === 'A3' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E2E2E2]'
                    }`}
                  >
                    A3
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Sides</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSpecs({ ...editingSpecs, printSide: 'SINGLE' })}
                    className={`h-11 rounded-xl border text-sm font-bold ${
                      editingSpecs.printSide === 'SINGLE' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E2E2E2]'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSpecs({ ...editingSpecs, printSide: 'DOUBLE' })}
                    className={`h-11 rounded-xl border text-sm font-bold ${
                      editingSpecs.printSide === 'DOUBLE' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white border-[#E2E2E2]'
                    }`}
                  >
                    Double
                  </button>
                </div>
              </div>
            </div>

            {/* Page Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Page Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setEditingSpecs({ ...editingSpecs, pageRangeOption: 'ALL', customPageRange: '' })}
                  className={`selection-row min-h-[56px] ${editingSpecs.pageRangeOption === 'ALL' ? 'selection-row-active' : ''}`}
                >
                  <span className="text-sm font-bold text-[#111111]">All ({editingItem.uploadedDocument?.pageCount} pgs)</span>
                  {editingSpecs.pageRangeOption === 'ALL' && <Check className="w-5 h-5 text-[#111111]" />}
                </div>
                <div
                  onClick={() => setEditingSpecs({ ...editingSpecs, pageRangeOption: 'CUSTOM' })}
                  className={`selection-row min-h-[56px] ${editingSpecs.pageRangeOption === 'CUSTOM' ? 'selection-row-active' : ''}`}
                >
                  <span className="text-sm font-bold text-[#111111]">Custom Range</span>
                  {editingSpecs.pageRangeOption === 'CUSTOM' && <Check className="w-5 h-5 text-[#111111]" />}
                </div>
              </div>

              {editingSpecs.pageRangeOption === 'CUSTOM' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={editingSpecs.customPageRange}
                    onChange={(e) => setEditingSpecs({ ...editingSpecs, customPageRange: e.target.value })}
                    placeholder="e.g. 1-5, 8, 11-14"
                    className="input-field"
                  />
                  {rangeError && <p className="text-xs font-bold text-rose-600 mt-1">{rangeError}</p>}
                </div>
              )}
            </div>

            {/* Copies */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-[#E2E2E2] flex items-center justify-between">
              <span className="text-base font-bold text-[#111111]">Copies</span>
              <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-[#D8D8D8]">
                <button
                  type="button"
                  onClick={() => setEditingSpecs({ ...editingSpecs, copies: Math.max(1, editingSpecs.copies - 1) })}
                  className="w-10 h-10 rounded-md bg-neutral-100 font-bold text-base flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-6 text-center font-extrabold text-base">{editingSpecs.copies}</span>
                <button
                  type="button"
                  onClick={() => setEditingSpecs({ ...editingSpecs, copies: editingSpecs.copies + 1 })}
                  className="w-10 h-10 rounded-md bg-neutral-100 font-bold text-base flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Preview & Save Action */}
            <div className="pt-4 border-t border-[#E2E2E2] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#6B6B6B] uppercase block">Item Price</span>
                <span className="text-2xl font-extrabold text-[#111111]">
                  {isCalculatingEditPrice ? (
                    <Loader2 className="w-5 h-5 animate-spin inline text-neutral-400" />
                  ) : (
                    `₹${editingPrice?.totalPrice ? editingPrice.totalPrice.toFixed(2) : '0.00'}`
                  )}
                </span>
              </div>

              <button
                type="button"
                disabled={isCalculatingEditPrice || !!rangeError}
                onClick={saveEditChanges}
                className="btn-primary min-w-[160px] h-14 font-bold text-base"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar (Overall Order Total Sum) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E2E2] p-5 z-40 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider block">Order Total ({items.length} files)</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-[#111111]">
                ₹{calculateOrderTotal().toFixed(2)}
              </span>
              {isAnyCalculating && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
            </div>
          </div>

          <button
            type="button"
            disabled={isAnyCalculating}
            onClick={onContinue}
            className="btn-primary min-w-[200px] h-14"
          >
            <span>Review Order · ₹{calculateOrderTotal().toFixed(2)}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
