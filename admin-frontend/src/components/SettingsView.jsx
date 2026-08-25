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
import { printAgentWorker } from "../services/printAgentWorker";

export const SettingsView = ({ user }) => {
  const [agentState, setAgentState] = useState(printAgentWorker.getState());
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const unsubscribe = printAgentWorker.subscribe((state) => {
      setAgentState(state);
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
        if (list && list.length > 0 && !agentState.selectedPrinter) {
          const defaultPrinter = list.find((p) => p.isDefault) || list[0];
          if (defaultPrinter) {
            printAgentWorker.setPrinter(defaultPrinter.name);
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

  const handleSelectPrinter = (e) => {
    const name = e.target.value;
    printAgentWorker.setPrinter(name);
  };

  const handleToggleAutoPrint = () => {
    printAgentWorker.setAutoPrint(!agentState.autoPrintEnabled);
  };

  const handleTestPrint = async () => {
    if (!agentState.selectedPrinter) {
      setTestResult({ success: false, message: "Please select a printer first." });
      return;
    }
    setTestingPrint(true);
    setTestResult(null);
    try {
      const res = await printAgentWorker.testPrint(agentState.selectedPrinter);
      setTestResult({
        success: true,
        message: res.message || `Test page successfully sent to ${agentState.selectedPrinter}`,
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

      {/* Windows Physical Print Agent Configuration */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] p-8 space-y-6">
        <div className="border-b border-[#E2E2E2] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-[#111111]" />
              <span>Windows Physical Print Agent</span>
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Direct physical printer spooler integration and automatic queue processing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleAutoPrint}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                agentState.autoPrintEnabled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
              }`}
            >
              {agentState.autoPrintEnabled ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto-Print: ACTIVE</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Auto-Print: PAUSED</span>
                </>
              )}
            </button>

            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                agentState.isElectron
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {agentState.isElectron ? (
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
            <div className="space-y-1 flex-1">
              <label className="text-xs font-bold text-[#6B6B6B] uppercase flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#111111]" />
                <span>Target Windows Printer</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={agentState.selectedPrinter || ""}
                  onChange={handleSelectPrinter}
                  disabled={loadingPrinters || printers.length === 0}
                  className="input-field bg-white font-bold text-sm"
                >
                  <option value="" disabled>
                    {loadingPrinters
                      ? "Scanning Windows printers..."
                      : printers.length === 0
                      ? "No printers found"
                      : "-- Select a Windows Printer --"}
                  </option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchPrinters}
                  disabled={loadingPrinters}
                  title="Rescan Windows Printers"
                  className="p-3 bg-white border border-[#E2E2E2] rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-neutral-600 ${
                      loadingPrinters ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={testingPrint || !agentState.selectedPrinter}
                className="px-5 py-3 bg-[#111111] hover:bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>{testingPrint ? "Printing Test Page..." : "Send Test Print"}</span>
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
              <span className="text-[#6B6B6B] block">Agent Status:</span>
              <span className="font-bold text-[#111111] uppercase">
                {agentState.status} {agentState.activeJobsCount > 0 ? `(${agentState.activeJobsCount} in-flight)` : ""}
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
              {agentState.logs.length} entries
            </span>
          </div>

          <div className="bg-[#1e1e1e] text-neutral-200 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 border border-neutral-800 shadow-inner">
            {agentState.logs.length === 0 ? (
              <p className="text-neutral-500 italic">
                No activity recorded yet. Print requests will log here in real time.
              </p>
            ) : (
              agentState.logs.map((log) => (
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
