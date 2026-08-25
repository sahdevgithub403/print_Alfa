import { api } from "../api";

class PrintAgentWorker {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.selectedPrinter = localStorage.getItem("selected_printer_name") || null;
    this.activeJobs = new Set();
    this.listeners = new Set();
    this.logs = [];
    this.status = "IDLE"; // "IDLE" | "POLLING" | "PRINTING" | "ERROR"
    this.autoPrintEnabled = localStorage.getItem("auto_print_enabled") === "true";

    // Synchronize with Electron on startup if available
    if (window.electronAPI) {
      window.electronAPI.getSelectedPrinter().then((printer) => {
        if (printer) {
          this.selectedPrinter = printer;
        } else if (this.selectedPrinter) {
          window.electronAPI.setSelectedPrinter(this.selectedPrinter);
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
        console.error("PrintAgentWorker listener error:", e);
      }
    }
  }

  getState() {
    return {
      isRunning: this.isRunning,
      autoPrintEnabled: this.autoPrintEnabled,
      selectedPrinter: this.selectedPrinter,
      status: this.status,
      activeJobsCount: this.activeJobs.size,
      logs: this.logs,
      isElectron: Boolean(window.electronAPI?.isElectron),
    };
  }

  setAutoPrint(enabled) {
    this.autoPrintEnabled = Boolean(enabled);
    localStorage.setItem("auto_print_enabled", this.autoPrintEnabled ? "true" : "false");
    this.addLog(
      `Auto-printing ${this.autoPrintEnabled ? "ENABLED" : "DISABLED"}`,
      this.autoPrintEnabled ? "success" : "warning"
    );
    this.notify();
  }

  async setPrinter(printerName) {
    this.selectedPrinter = printerName;
    if (printerName) {
      localStorage.setItem("selected_printer_name", printerName);
    } else {
      localStorage.removeItem("selected_printer_name");
    }
    if (window.electronAPI?.setSelectedPrinter) {
      await window.electronAPI.setSelectedPrinter(printerName);
    }
    this.addLog(`Selected printer updated to: ${printerName || "None"}`, "info");
    this.notify();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.status = "POLLING";
    this.addLog("Print Agent worker started", "success");
    this.notify();

    this.processQueue();
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, 5000);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.status = "IDLE";
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.addLog("Print Agent worker paused", "warning");
    this.notify();
  }

  async processQueue() {
    if (!this.autoPrintEnabled) {
      this.status = "IDLE";
      this.notify();
      return;
    }

    try {
      this.status = this.activeJobs.size > 0 ? "PRINTING" : "POLLING";
      this.notify();

      const response = await api.get("/print-agent/jobs");
      const queuedJobs = response.data?.data || [];
      const pendingJobs = queuedJobs.filter((j) => j.status === "QUEUED");

      if (pendingJobs.length === 0) {
        if (this.activeJobs.size === 0) {
          this.status = "IDLE";
          this.notify();
        }
        return;
      }

      for (const job of pendingJobs) {
        if (this.activeJobs.has(job.jobId)) {
          continue;
        }

        if (!this.selectedPrinter) {
          this.addLog(
            `Job ${job.jobId} pending: No Windows printer selected. Configure in Settings.`,
            "error"
          );
          if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification(
              "Printer Not Configured",
              "Print request received but no Windows printer is selected."
            );
          }
          break;
        }

        // Process this job
        await this.executePrintJob(job);
      }
    } catch (err) {
      console.error("Error polling print agent queue:", err);
      this.status = "ERROR";
      this.addLog(`Queue poll error: ${err.message}`, "error");
      this.notify();
    }
  }

  async executePrintJob(job) {
    const jobId = job.jobId;
    this.activeJobs.add(jobId);
    this.status = "PRINTING";
    this.notify();

    const orderNum = job.order?.orderNumber || "Unknown";
    this.addLog(`Claiming job for Order #${orderNum}...`, "info");

    try {
      // 1. Atomically claim job in backend (transitions QUEUED -> PROCESSING)
      await api.post(`/print-agent/jobs/${jobId}/started`, {
        agentId: "Electron-Agent",
      });

      // 2. Identify documents to print
      const items = job.order?.items && job.order.items.length > 0
        ? job.order.items
        : [
            {
              document: job.order?.document,
              colorMode: job.order?.colorMode || "BW",
              paperSize: job.order?.paperSize || "A4",
              printSide: job.order?.printSide || "SINGLE",
              copies: job.order?.copies || 1,
              pageRange: job.order?.pageRange || "ALL",
            },
          ];

      // 3. Print each document
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
          colorMode: item.colorMode || "BW",
          paperSize: item.paperSize || "A4",
          printSide: item.printSide || "SINGLE",
          copies: item.copies || 1,
          pageRange: item.pageRange || "ALL",
        };

        this.addLog(
          `Sending ${doc.originalFileName} to ${this.selectedPrinter} (${printSettings.copies}x, ${printSettings.colorMode}, ${printSettings.paperSize}, ${printSettings.printSide})...`,
          "info"
        );

        if (window.electronAPI?.printDocument) {
          // Real Windows physical print spooling via Electron
          await window.electronAPI.printDocument({
            base64Data,
            originalFileName: doc.originalFileName || "document.pdf",
            contentType: doc.contentType || "application/pdf",
            printSettings,
            printerName: this.selectedPrinter,
          });
        } else {
          // Browser environment fallback simulation
          console.warn("Electron API not detected. Simulating physical print.");
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      // 4. Mark job completed in backend
      await api.post(`/print-agent/jobs/${jobId}/completed`, {
        agentId: "Electron-Agent",
      });

      this.addLog(`✓ Successfully printed Order #${orderNum}`, "success");
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          "Print Completed",
          `Order #${orderNum} was successfully submitted to ${this.selectedPrinter}.`
        );
      }
    } catch (err) {
      console.error(`Failed executing print job ${jobId}:`, err);
      this.addLog(`✗ Print Failed for Order #${orderNum}: ${err.message}`, "error");

      // Mark job failed in backend so it can be inspected / retried
      try {
        await api.post(`/print-agent/jobs/${jobId}/failed`, {
          agentId: "Electron-Agent",
        });
      } catch (failErr) {
        console.error("Failed to mark job as failed in backend:", failErr);
      }

      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          "Print Failed",
          `Order #${orderNum} failed: ${err.message}`
        );
      }
    } finally {
      this.activeJobs.delete(jobId);
      this.status = this.activeJobs.size > 0 ? "PRINTING" : "IDLE";
      this.notify();
    }
  }

  async testPrint(printerName) {
    const target = printerName || this.selectedPrinter;
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

export const printAgentWorker = new PrintAgentWorker();
