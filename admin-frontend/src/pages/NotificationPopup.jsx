import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Printer } from "lucide-react";

export const NotificationPopup = () => {
  const [order, setOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    try {
      const hash = window.location.hash;
      console.log("[PrintAlfa Popup] hash:", hash);
      const paramIndex = hash.indexOf("?order=");

      if (paramIndex !== -1) {
        const paramStr = hash.substring(paramIndex + "?order=".length);
        const decoded = decodeURIComponent(paramStr);
        const parsedOrder = JSON.parse(decoded);
        console.log("[PrintAlfa Popup] parsed order:", parsedOrder);

        setOrder(parsedOrder);
      } else {
        console.warn("[PrintAlfa Popup] No ?order= found in hash:", hash);
      }
    } catch (error) {
      console.error("[PrintAlfa Popup] Failed to parse order from notification URL:", error);
    }
  }, []);

  const handleAction = (action) => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (order && window.electronAPI) {
      window.electronAPI.sendOrderActionResult(order.id, action);
    }
  };

  if (!order) return <div className="p-4 text-white bg-slate-800 h-screen">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden border border-slate-700 shadow-2xl" style={{ WebkitAppRegion: 'drag' }}>
      <div className="bg-indigo-600 px-4 py-3 flex items-center gap-2">
        <Printer className="w-5 h-5 text-white" />
        <h3 className="font-semibold text-white tracking-wide">NEW PRINT ORDER</h3>
      </div>
      
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-sm">Customer</span>
          <span className="font-medium">{order.customerName || 'Walk-in'}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-sm">File</span>
          <span className="font-mono font-medium truncate max-w-[150px]" title={order.document?.originalFileName || order.items?.[0]?.document?.originalFileName || 'Document'}>
            {order.document?.originalFileName || order.items?.[0]?.document?.originalFileName || 'Document'}
          </span>
        </div>
        
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-sm">Print type</span>
          <span className="font-medium text-amber-400">
            {order.printType || order.items?.[0]?.printType || order.colorMode || 'PRINT'}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-sm">Pages</span>
          <span className="font-medium">{order.pages || order.items?.[0]?.document?.pageCount || 1}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
          <span className="text-slate-400 text-sm">Amount</span>
          <span className="font-bold text-green-400">₹{order.totalAmount || order.totalPrice || '0'}</span>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-3 bg-slate-800" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          onClick={() => handleAction('DECLINE')}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded font-medium bg-slate-700 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-slate-600 hover:border-red-500/50"
        >
          <XCircle className="w-4 h-4" />
          DECLINE
        </button>
        <button 
          onClick={() => handleAction('ACCEPT_AND_PRINT')}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded font-medium bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50"
        >
          <CheckCircle className="w-4 h-4" />
          ACCEPT & PRINT
        </button>
      </div>
    </div>
  );
};
