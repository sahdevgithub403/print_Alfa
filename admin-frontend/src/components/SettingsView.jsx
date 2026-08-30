import React, { useState, useEffect } from "react";
import {
  Cpu,
  Store,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  Play,
  Pause,
  FileText,
  Terminal,
} from "lucide-react";
import { printClient } from "../services/printClient";

export const SettingsView = ({ user }) => {
  const [clientState, setClientState] = useState(printClient.getState());
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const unsubscribe = printClient.subscribe((state) => {
      setClientState(state);
    });

    fetchPrinters();
    return () => unsubscribe();
  }, []);

  const fetchPrinters = async () => {
    setLoadingPrinters(true);
    try {
      if (window.electronAPI?.getPrinters) {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list || []);
        if (list && list.length > 0) {
          const defaultPrinter = list.find((p) => p.isDefault) || list[0];
          if (defaultPrinter) {
            let updates = {};
            if (!clientState.mainPrinter) updates.mainPrinter = defaultPrinter.name;
            if (!clientState.colorPrinter) updates.colorPrinter = defaultPrinter.name;
            if (Object.keys(updates).length > 0) {
              printClient.setPrintersConfig(updates);
            }
          }
        }
      } else {
        // Fallback for browser preview
        setPrinters([
          { name: "HP LaserJet Pro M404n", isDefault: true, displayName: "HP LaserJet Pro M404n (Network)" },
          { name: "Canon imageRUNNER 2206", isDefault: false, displayName: "Canon imageRUNNER 2206" },
          { name: "Microsoft Print to PDF", isDefault: false, displayName: "Microsoft Print to PDF" },
        ]);
      }
    } catch (err) {
      console.error("Failed to load printers:", err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleSelectMainPrinter = (e) => {
    printClient.setPrintersConfig({ mainPrinter: e.target.value });
  };

  const handleSelectColorPrinter = (e) => {
    printClient.setPrintersConfig({ colorPrinter: e.target.value });
  };

  const handleTestPrint = async (printerType) => {
    const printerName = printerType === 'main' ? clientState.mainPrinter : clientState.colorPrinter;
    if (!printerName) {
      setTestResult({ success: false, message: "Please select a printer first." });
      return;
    }
    setTestingPrint(true);
    setTestResult(null);
    try {
      const res = await printClient.testPrint(printerName);
      const isVirtual = printerName.toLowerCase().includes("pdf") || printerName.toLowerCase().includes("onenote") || printerName.toLowerCase().includes("xps");
      const warningMsg = isVirtual ? " (WARNING: This is a virtual Windows printer. Select a physical printer for physical printing.)" : "";
      
      setTestResult({
        success: true,
        message: (res.message || `Test page successfully sent to ${printerName}`) + warningMsg,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || "Failed to communicate with printer.",
      });
    } finally {
      setTestingPrint(false);
    }
  };

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
              value={user?.shopName || ""}
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
              value={user?.shopSlug || ""}
              className="input-field bg-neutral-50 cursor-not-allowed text-base font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Admin Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value={user?.email || ""}
                className="input-field input-with-icon bg-neutral-50 cursor-not-allowed font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#6B6B6B] font-semibold block text-xs uppercase">
              Account Role
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value={user?.role || "SHOP_ADMIN"}
                className="input-field input-with-icon bg-neutral-50 cursor-not-allowed font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Windows Physical Print Client Configuration */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-6">
        <div className="border-b border-[#E2E2E2] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-[#111111]" />
              <span>PrintAlfa Print Client</span>
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Direct physical printer spooler integration and automatic queue processing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                clientState.isElectron
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {clientState.isElectron ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Native Spooler Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Web Simulation Mode</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Printer Selection & Test Print */}
        <div className="bg-neutral-50 p-6 rounded-xl border border-[#E2E2E2] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-[#6B6B6B] uppercase flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#111111]" />
                    <span>Main All-Print Printer (B/W, Xerox, Documents)</span>
                  </label>
                  <select
                    value={clientState.mainPrinter || ""}
                    onChange={handleSelectMainPrinter}
                    disabled={loadingPrinters || printers.length === 0}
                    className="input-field bg-white font-bold text-sm w-full"
                  >
                    <option value="" disabled>
                      {loadingPrinters ? "Scanning..." : printers.length === 0 ? "No printers found" : "-- Select Main Printer --"}
                    </option>
                    {printers.map((p) => {
                      const isVirtual = p.name.toLowerCase().includes("pdf") || p.name.toLowerCase().includes("onenote") || p.name.toLowerCase().includes("xps");
                      return (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? "(Default)" : ""} {isVirtual ? "[Virtual Printer]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPrint('main')}
                  disabled={testingPrint || !clientState.mainPrinter}
                  className="px-4 py-2.5 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap h-fit"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Test Main</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-[#6B6B6B] uppercase flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>Color & Photo Printer (Color, Passports)</span>
                  </label>
                  <select
                    value={clientState.colorPrinter || ""}
                    onChange={handleSelectColorPrinter}
                    disabled={loadingPrinters || printers.length === 0}
                    className="input-field bg-white font-bold text-sm w-full"
                  >
                    <option value="" disabled>
                      {loadingPrinters ? "Scanning..." : printers.length === 0 ? "No printers found" : "-- Select Color Printer --"}
                    </option>
                    {printers.map((p) => {
                      const isVirtual = p.name.toLowerCase().includes("pdf") || p.name.toLowerCase().includes("onenote") || p.name.toLowerCase().includes("xps");
                      return (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? "(Default)" : ""} {isVirtual ? "[Virtual Printer]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestPrint('color')}
                  disabled={testingPrint || !clientState.colorPrinter}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap h-fit"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Test Color</span>
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <button
                type="button"
                onClick={fetchPrinters}
                disabled={loadingPrinters}
                title="Rescan Windows Printers"
                className="p-3 bg-white border border-[#E2E2E2] rounded-xl hover:bg-neutral-100 transition-colors h-fit mt-5"
              >
                <RefreshCw className={`w-4 h-4 text-neutral-600 ${loadingPrinters ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-200 text-xs">
            <div>
              <span className="text-[#6B6B6B] block">Client Status:</span>
              <span className="font-bold text-[#111111] uppercase">
                {clientState.status} {clientState.activeJobsCount > 0 ? `(${clientState.activeJobsCount} in-flight)` : ""}
              </span>
            </div>
            <div>
              <span className="text-[#6B6B6B] block">Queue Endpoint:</span>
              <span className="font-mono font-bold text-[#111111]">
                /api/print-agent/jobs
              </span>
            </div>
            <div>
              <span className="text-[#6B6B6B] block">Supported Formats:</span>
              <span className="font-bold text-[#111111]">
                PDF, JPG, PNG, DOCX
              </span>
            </div>
          </div>
        </div>

        {/* Live Spooling Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#6B6B6B] uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Real-Time Spooler & Queue Activity Log</span>
            </h3>
            <span className="text-xs text-[#888888]">
              {clientState.logs.length} entries
            </span>
          </div>

          <div className="bg-[#1e1e1e] text-neutral-200 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 border border-neutral-800 shadow-inner">
            {clientState.logs.length === 0 ? (
              <p className="text-neutral-500 italic">
                No activity recorded yet. Print requests will log here in real time.
              </p>
            ) : (
              clientState.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-neutral-500 shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span
                    className={
                      log.type === "error"
                        ? "text-rose-400 font-semibold"
                        : log.type === "success"
                        ? "text-emerald-400 font-semibold"
                        : log.type === "warning"
                        ? "text-amber-400"
                        : "text-neutral-200"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-[#6B6B6B] leading-relaxed">
          When automatic printing is active, incoming print requests marked as
          "Print Now" are securely claimed, downloaded over authenticated channels,
          and automatically routed to your selected Windows printer spooler with the
          exact customer print settings (Color/B&amp;W, Double-sided, Copies, Page Range).
        </p>
      </div>
    </div>
  );
};
