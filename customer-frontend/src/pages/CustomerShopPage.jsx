import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShopBySlug } from "../api";
import { ShopHeader } from "../components/ShopHeader";
import { FileUploadStep } from "../components/FileUploadStep";
import { PrintOptionsStep } from "../components/PrintOptionsStep";
import { OrderReviewStep } from "../components/OrderReviewStep";
import { JobTypeSelectionStep } from "../components/JobTypeSelectionStep";
import { PassportPhotoStep } from "../components/PassportPhotoStep";
import { Loader2, AlertCircle } from "lucide-react";

export const CustomerShopPage = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(0); // 0 = type selection
  const [printJobType, setPrintJobType] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchShopDetails();
  }, [shopSlug]);

  const fetchShopDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const slug = shopSlug || "";
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
        <div className="mb-8 sm:mb-10 bg-white rounded-xl p-3 border border-[#E2E2E2] flex items-center justify-between text-sm font-bold shadow-sm">
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 1 ? "text-brand-700" : "text-neutral-400"}`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm ${step >= 1 ? "bg-brand-600 text-white" : "bg-neutral-100 border border-neutral-200 text-neutral-500"}`}
            >
              1
            </span>
            <span className="hidden sm:inline">Upload</span>
          </div>
          <div className={`h-1 rounded-full flex-1 mx-2 sm:mx-4 ${step >= 2 ? "bg-brand-600" : "bg-neutral-200"}`} />
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 2 ? "text-brand-700" : "text-neutral-400"}`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm ${step >= 2 ? "bg-brand-600 text-white" : "bg-neutral-100 border border-neutral-200 text-neutral-500"}`}
            >
              2
            </span>
            <span className="hidden sm:inline">Options</span>
          </div>
          <div className={`h-1 rounded-full flex-1 mx-2 sm:mx-4 ${step >= 3 ? "bg-brand-600" : "bg-neutral-200"}`} />
          <div
            className={`flex items-center gap-2 sm:gap-2.5 ${step >= 3 ? "text-brand-700" : "text-neutral-400"}`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm ${step >= 3 ? "bg-brand-600 text-white" : "bg-neutral-100 border border-neutral-200 text-neutral-500"}`}
            >
              3
            </span>
            <span className="hidden sm:inline">Review</span>
          </div>
        </div>

        {step === 0 && (
          <JobTypeSelectionStep
            onSelect={(type) => {
              setPrintJobType(type);
              setStep(1);
            }}
          />
        )}

        {step === 1 && printJobType === "DOCUMENT" && (
          <FileUploadStep
            items={items}
            onItemsChange={setItems}
            onContinue={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}

        {step === 1 && printJobType === "PASSPORT_PHOTO" && (
          <PassportPhotoStep
            shopId={shop.id}
            onComplete={(newItems) => {
              setItems(newItems);
              setStep(3); // Skip options, go straight to review
            }}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && items.length > 0 && printJobType === "DOCUMENT" && (
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
            onBack={() => {
              if (printJobType === "PASSPORT_PHOTO") {
                setStep(1);
              } else {
                setStep(2);
              }
            }}
            onOrderCompleted={handleOrderCompleted}
          />
        )}
      </main>
    </div>
  );
};
