import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShopBySlug } from "../api";
import { ShopHeader } from "../components/ShopHeader";
import { FileUploadStep } from "../components/FileUploadStep";
import { PrintOptionsStep } from "../components/PrintOptionsStep";
import { OrderReviewStep } from "../components/OrderReviewStep";
import { Loader2, AlertCircle } from "lucide-react";

export const CustomerShopPage = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchShopDetails();
  }, [shopSlug]);

  const fetchShopDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const slug = shopSlug || "quickprint";
      const shopData = await getShopBySlug(slug);
      setShop(shopData);
    } catch (err) {
      setError("Shop not found or link is invalid.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCompleted = (publicToken, orderNumber) => {
    navigate(`/order/${publicToken}`, { state: { orderNumber } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-[#111111] animate-spin mb-3" />
        <span className="text-[#6B6B6B] font-semibold text-base">
          Loading shop counter...
        </span>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#E2E2E2] max-w-sm space-y-4 shadow-2xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#111111]">Shop Not Found</h2>
          <p className="text-sm text-[#6B6B6B]">
            {error || "Please verify the QR code or URL link."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#111111] flex flex-col">
      <ShopHeader shop={shop} />

      {/* Main Editorial Flow */}
      <main className="flex-1 max-w-xl w-full mx-auto px-5 sm:px-6 pt-8 pb-16">
        {/* Step Progression Bar */}
        <div className="mb-8 sm:mb-10 bg-white rounded-xl p-3 border border-[#E2E2E2] flex items-center justify-between text-sm font-bold shadow-2xs">
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 1 ? "text-[#111111]" : "text-neutral-400"}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 1 ? "bg-[#111111] text-white" : "bg-neutral-200 text-neutral-500"}`}
            >
              1
            </span>
            <span className="hidden sm:inline">Upload</span>
          </div>
          <div className="h-px bg-[#E2E2E2] flex-1 mx-2 sm:mx-4" />
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 2 ? "text-[#111111]" : "text-neutral-400"}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 2 ? "bg-[#111111] text-white" : "bg-neutral-200 text-neutral-500"}`}
            >
              2
            </span>
            <span className="hidden sm:inline">Options</span>
          </div>
          <div className="h-px bg-[#E2E2E2] flex-1 mx-2 sm:mx-4" />
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 3 ? "text-[#111111]" : "text-neutral-400"}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 3 ? "bg-[#111111] text-white" : "bg-neutral-200 text-neutral-500"}`}
            >
              3
            </span>
            <span className="hidden sm:inline">Review</span>
          </div>
        </div>

        {step === 1 && (
          <FileUploadStep
            items={items}
            onItemsChange={setItems}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && items.length > 0 && (
          <PrintOptionsStep
            shopId={shop.id}
            items={items}
            onItemsChange={setItems}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && items.length > 0 && (
          <OrderReviewStep
            shopId={shop.id}
            items={items}
            onBack={() => setStep(2)}
            onOrderCompleted={handleOrderCompleted}
          />
        )}
      </main>
    </div>
  );
};
