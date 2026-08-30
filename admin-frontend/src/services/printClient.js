import { api } from "../api";

class PrintClient {
  constructor() {
    this.mainPrinter = localStorage.getItem("main_printer_name") || null;
    this.colorPrinter = localStorage.getItem("color_printer_name") || null;
    this.activeJobs = new Set();
    this.listeners = new Set();
    this.logs = [];
    this.status = "IDLE"; // "IDLE" | "PRINTING" | "ERROR"

    // Synchronize with Electron on startup if available
    if (window.electronAPI) {
      window.electronAPI.getPrintersConfig().then((config) => {
        let needsUpdate = false;
        if (config.mainPrinter) {
          this.mainPrinter = config.mainPrinter;
        } else if (this.mainPrinter) {
          needsUpdate = true;
        }
        
        if (config.colorPrinter) {
          this.colorPrinter = config.colorPrinter;
        } else if (this.colorPrinter) {
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          window.electronAPI.setPrintersConfig({ mainPrinter: this.mainPrinter, colorPrinter: this.colorPrinter });
        }
        this.notify();
      }).catch(() => {});
    }
  }

  addLog(message, type = "info") {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    this.logs = [logEntry, ...this.logs.slice(0, 49)];
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error("PrintClient listener error:", e);
      }
    }
  }

  getState() {
    return {
      mainPrinter: this.mainPrinter,
      colorPrinter: this.colorPrinter,
      status: this.status,
      activeJobsCount: this.activeJobs.size,
      logs: this.logs,
      isElectron: Boolean(window.electronAPI?.isElectron),
    };
  }

  async setPrintersConfig({ mainPrinter, colorPrinter }) {
    if (mainPrinter !== undefined) {
      this.mainPrinter = mainPrinter;
      if (mainPrinter) localStorage.setItem("main_printer_name", mainPrinter);
      else localStorage.removeItem("main_printer_name");
    }
    
    if (colorPrinter !== undefined) {
      this.colorPrinter = colorPrinter;
      if (colorPrinter) localStorage.setItem("color_printer_name", colorPrinter);
      else localStorage.removeItem("color_printer_name");
    }

    if (window.electronAPI?.setPrintersConfig) {
      await window.electronAPI.setPrintersConfig({ mainPrinter: this.mainPrinter, colorPrinter: this.colorPrinter });
    }
    this.addLog(`Printers updated - Main: ${this.mainPrinter || "None"}, Color: ${this.colorPrinter || "None"}`, "info");
    this.notify();
  }

  async executePrintJob(job) {
    const jobId = job.id || job.jobId; // Allow accepting direct order object
    this.activeJobs.add(jobId);
    this.status = "PRINTING";
    this.notify();

    const orderNum = job.orderNumber || (job.order && job.order.orderNumber) || "Unknown";
    this.addLog(`Executing print job for Order #${orderNum}...`, "info");

    try {
      if (!this.mainPrinter && !this.colorPrinter) {
        throw new Error("No Windows printers configured. Configure in Settings.");
      }

      // Identify documents to print
      const items = job.items && job.items.length > 0
        ? job.items
        : job.order?.items && job.order.items.length > 0
        ? job.order.items
        : [
            {
              document: job.document || job.order?.document,
              printType: job.printType || job.order?.printType || "PRINT",
              colorMode: job.colorMode || job.order?.colorMode || "BW",
              paperSize: job.paperSize || job.order?.paperSize || "A4",
              printSide: job.printSide || job.order?.printSide || "SINGLE",
              copies: job.copies || job.order?.copies || 1,
              pageRange: job.pageRange || job.order?.pageRange || "ALL",
            },
          ];

      // Print each document
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const doc = item.document;
        if (!doc || !doc.id) {
          throw new Error(`Item #${i + 1} has no document reference`);
        }

        this.addLog(
          `Downloading document ${doc.originalFileName || doc.id} (Item ${i + 1}/${items.length})...`,
          "info"
        );

        // Download document through secure authorized backend endpoint
        const docResponse = await api.get(`/print-agent/documents/${doc.id}/download`, {
          responseType: "arraybuffer",
        });

        // Convert arraybuffer to Base64
        const uint8Array = new Uint8Array(docResponse.data);
        let binaryString = "";
        const chunkSize = 8192;
        for (let j = 0; j < uint8Array.length; j += chunkSize) {
          binaryString += String.fromCharCode.apply(
            null,
            uint8Array.subarray(j, j + chunkSize)
          );
        }
        const base64Data = btoa(binaryString);

        // Extract item print settings
        const printSettings = {
          printType: item.printType || "PRINT",
          colorMode: item.colorMode || "BW",
          paperSize: item.paperSize || "A4",
          printSide: item.printSide || "SINGLE",
          copies: item.copies || 1,
          pageRange: item.pageRange || "ALL",
        };

        this.addLog(
          `Sending ${doc.originalFileName} to printer (${printSettings.copies}x, ${printSettings.colorMode}, type: ${printSettings.printType})...`,
          "info"
        );

        if (window.electronAPI?.printDocument) {
          // Real Windows physical print spooling via Electron
          await window.electronAPI.printDocument({
            base64Data,
            originalFileName: doc.originalFileName || "document.pdf",
            contentType: doc.contentType || "application/pdf",
            printSettings
          });
        } else {
          // Browser environment fallback simulation
          console.warn("Electron API not detected. Simulating physical print.");
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      this.addLog(`✓ Successfully printed Order #${orderNum}`, "success");
      return { success: true };
    } catch (err) {
      console.error(`Failed executing print job ${jobId}:`, err);
      this.addLog(`✗ Print Failed for Order #${orderNum}: ${err.message}`, "error");
      
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          "Print Failed",
          `Order #${orderNum} failed: ${err.message}`
        );
      }
      throw err;
    } finally {
      this.activeJobs.delete(jobId);
      this.status = this.activeJobs.size > 0 ? "PRINTING" : "IDLE";
      this.notify();
    }
  }

  async testPrint(printerName) {
    const target = printerName;
    if (!target) {
      throw new Error("No printer selected for test print.");
    }

    this.addLog(`Triggering test print to ${target}...`, "info");

    if (window.electronAPI?.testPrint) {
      const res = await window.electronAPI.testPrint(target);
      this.addLog(`✓ Test print page sent to ${target}`, "success");
      return res;
    } else {
      await new Promise((r) => setTimeout(r, 1000));
      this.addLog(`✓ Simulated test print to ${target}`, "success");
      return { success: true, message: `Simulated test print on ${target}` };
    }
  }
}

export const printClient = new PrintClient();
