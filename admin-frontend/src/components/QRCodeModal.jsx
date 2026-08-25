import React, { useState } from "react";
import { X, Printer, ExternalLink, Copy, Check } from "lucide-react";

export const getCustomerAppBaseUrl = () => {
  if (import.meta.env.VITE_CUSTOMER_APP_URL) {
    return import.meta.env.VITE_CUSTOMER_APP_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;
    if (protocol === "http:" || protocol === "https:") {
      if (port === "5174") {
        return `${protocol}//${hostname}:5173`;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    }
  }
  return "http://localhost:5173";
};

export const QRCodeModal = ({ shopName, shopSlug, onClose }) => {
  const [copied, setCopied] = useState(false);
  const customerBaseUrl = getCustomerAppBaseUrl();
  const shopUrl = `${customerBaseUrl}/shop/${shopSlug}`;

  const handlePrintPoster = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 w-full max-w-md space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Counter Poster Card */}
        <div
          id="printable-qr-poster"
          className="border-2 border-[#111111] rounded-2xl p-6 text-center space-y-4 bg-white"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-white flex items-center justify-center mx-auto mb-2">
              <Printer className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-[#111111] uppercase tracking-tight">
              {shopName}
            </h2>
            <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider bg-neutral-100 py-1 px-3 rounded-lg inline-block border border-neutral-200">
              Scan & Print Instant Documents
            </p>
          </div>

          {/* SVG QR Code Frame */}
          <div className="bg-white p-4 rounded-xl border border-[#E2E2E2] inline-block mx-auto">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shopUrl)}`}
              alt="Shop QR Code"
              className="w-52 h-52 mx-auto"
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-[#111111]">
              SCAN WITH YOUR PHONE
            </p>
            <p className="text-xs text-[#6B6B6B]">
              Upload PDF / Docs · Pay Online or Counter
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handlePrintPoster}
            className="btn-primary w-full min-h-[52px]"
          >
            <Printer className="w-5 h-5" />
            <span>Print Counter Poster</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-secondary min-h-[48px] text-sm"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>

            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary min-h-[48px] text-sm"
            >
              <span>Preview Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
