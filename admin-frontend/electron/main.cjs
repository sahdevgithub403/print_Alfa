const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

// Generate or retrieve persistent Device ID
const deviceIdPath = path.join(app.getPath("userData"), "device_id.json");
let deviceId = "";

try {
  if (fs.existsSync(deviceIdPath)) {
    const data = JSON.parse(fs.readFileSync(deviceIdPath, "utf8"));
    deviceId = data.deviceId;
  } else {
    deviceId = crypto.randomUUID();
    fs.writeFileSync(deviceIdPath, JSON.stringify({ deviceId }));
  }
} catch (e) {
  console.error("Error managing device ID:", e);
  deviceId = crypto.randomUUID();
}

let mainWindow;
let tray;
let mainPrinterName = null;
let colorPrinterName = null;

// Initialize secure spool directory
const spoolDir = path.join(app.getPath("temp"), "printalfa_spool");
try {
  if (!fs.existsSync(spoolDir)) {
    fs.mkdirSync(spoolDir, { recursive: true });
  }
} catch (e) {
  console.error("Could not create spool directory:", e);
}

function parsePageRanges(pageRangeStr) {
  if (
    !pageRangeStr ||
    typeof pageRangeStr !== "string" ||
    pageRangeStr.toUpperCase() === "ALL"
  ) {
    return undefined;
  }
  const ranges = [];
  const parts = pageRangeStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        ranges.push({ from: start - 1, to: end - 1 });
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page > 0) {
        ranges.push({ from: page - 1, to: page - 1 });
      }
    }
  }
  return ranges.length > 0 ? ranges : undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, "printalfa.ico"),
  });

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("close", function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        mainWindow.show();
      },
    },
    { type: "separator" },
    { label: "Client Status: Connected", enabled: false },
    { label: "Printer Status: Ready", enabled: false },
    { type: "separator" },
    {
      label: "Exit PrintAlfa",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("PrintAlfa Admin Client");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  const { session } = require("electron");
  const isDev = process.env.NODE_ENV === "development";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    let csp =
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: file: https://api.qrserver.com; " +
      "connect-src 'self' https://printalfa-production.up.railway.app wss://printalfa-production.up.railway.app;";
    if (isDev) {
      csp =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' http://localhost:5174; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:5174; " +
        "font-src 'self' https://fonts.gstatic.com http://localhost:5174; " +
        "img-src 'self' data: blob: file: https://api.qrserver.com http://localhost:5174; " +
        "connect-src 'self' http://localhost:8085 ws://localhost:8085 http://localhost:5174 ws://localhost:5174;";
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  createWindow();
  try {
    createTray();
  } catch (e) {
    console.error("Tray icon failed to load, missing icon?", e);
  }

  // Set App User Model ID for Windows Notifications
  app.setAppUserModelId(process.execPath);

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Configure Auto Start
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath("exe"),
});

// ==================== DEVICE APIs ====================
ipcMain.handle("get-device-id", () => deviceId);
ipcMain.handle("get-device-name", () => os.hostname());
ipcMain.handle("get-app-version", () => app.getVersion());

// ==================== IPC HANDLERS FOR PRINTING ====================

// 1. Get list of installed Windows printers
ipcMain.handle("get-printers", async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map((p) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description || "",
        status: p.status,
        isDefault: p.isDefault,
      }));
    }
    return [];
  } catch (err) {
    console.error("Failed to query printers:", err);
    return [];
  }
});

// 2. Selected printers persistence
ipcMain.handle("get-printers-config", async () => {
  return { mainPrinter: mainPrinterName, colorPrinter: colorPrinterName };
});

ipcMain.handle(
  "set-printers-config",
  async (event, { mainPrinter, colorPrinter }) => {
    if (mainPrinter !== undefined) mainPrinterName = mainPrinter;
    if (colorPrinter !== undefined) colorPrinterName = colorPrinter;
    return {
      success: true,
      mainPrinter: mainPrinterName,
      colorPrinter: colorPrinterName,
    };
  },
);

// 3. Test Print
ipcMain.handle("test-print", async (event, { printerName }) => {
  const targetPrinter = printerName;
  if (!targetPrinter) {
    throw new Error(
      "No printer selected. Please select a Windows printer in Settings.",
    );
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const testHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PrintAlfa Test Page</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
        .header { border-bottom: 3px solid #111; padding-bottom: 15px; margin-bottom: 25px; }
        h1 { margin: 0; font-size: 26px; font-weight: bold; }
        .details { font-size: 14px; margin-bottom: 20px; }
        .box { border: 2px dashed #444; padding: 20px; background: #f4f4f4; border-radius: 8px; }
        .success-badge { display: inline-block; padding: 6px 12px; background: #10b981; color: #fff; font-weight: bold; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PrintAlfa — Windows Print Client Test Page</h1>
        <p>Real Physical Printing Verification</p>
      </div>
      <div class="details">
        <p><strong>Target Printer:</strong> ${targetPrinter}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Hostname:</strong> ${os.hostname()}</p>
        <p><strong>Operating System:</strong> ${os.type()} ${os.release()} (${process.arch})</p>
      </div>
      <div class="box">
        <span class="success-badge">PASSED</span>
        <p>✓ The PrintAlfa Windows Print Client successfully routed this test document through the local Windows Print Spooler to your physical printer.</p>
      </div>
    </body>
    </html>
  `;

  try {
    return await new Promise((resolve, reject) => {
      printWindow.webContents.on("did-finish-load", () => {
        setTimeout(() => {
          if (printWindow.isDestroyed()) return;
          printWindow.webContents.print(
            {
              silent: true,
              deviceName: targetPrinter,
              printBackground: true,
            },
            (success, errorType) => {
              if (!printWindow.isDestroyed()) printWindow.destroy();
              if (!success) {
                reject(
                  new Error(
                    `Print job cancelled or failed by Windows spooler. Reason: ${errorType || "Unknown error"}`,
                  ),
                );
              } else {
                resolve({
                  success: true,
                  message: `Test page sent to ${targetPrinter}`,
                });
              }
            },
          );
        }, 500);
      });

      printWindow
        .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`)
        .catch((err) => {
          if (!printWindow.isDestroyed()) printWindow.destroy();
          reject(err);
        });
    });
  } catch (err) {
    if (!printWindow.isDestroyed()) printWindow.destroy();
    throw err;
  }
});

// 4. Print actual customer document
ipcMain.handle(
  "print-document",
  async (
    event,
    { base64Data, originalFileName, contentType, printSettings },
  ) => {
    const isColorOrPhoto =
      printSettings?.colorMode === "COLOR" ||
      printSettings?.printType === "PASSPORT_PHOTO" ||
      printSettings?.printType === "PHOTO";
    const targetPrinter = isColorOrPhoto ? colorPrinterName : mainPrinterName;

    if (!targetPrinter) {
      throw new Error(
        isColorOrPhoto
          ? "Color/Photo printer unavailable."
          : "Main printer unavailable.",
      );
    }

    if (!base64Data) {
      throw new Error("Document data is missing or empty.");
    }

    const ext =
      path.extname(originalFileName || "").toLowerCase() ||
      (contentType === "application/pdf" ? ".pdf" : ".dat");
    const tempFileName = `spool_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const tempFilePath = path.join(spoolDir, tempFileName);

    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(tempFilePath, buffer);

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    const copies = Math.max(1, parseInt(printSettings?.copies || 1, 10));
    const isColor = printSettings?.colorMode === "COLOR";
    const isDoubleSided = printSettings?.printSide === "DOUBLE";
    const duplexMode = isDoubleSided ? "longEdge" : "simplex";
    const pageSize =
      (printSettings?.paperSize || "A4").toUpperCase() === "A3" ? "A3" : "A4";
    const pageRanges = parsePageRanges(printSettings?.pageRange);

    const printOptions = {
      silent: true,
      deviceName: targetPrinter,
      copies: copies,
      color: isColor,
      duplexMode: duplexMode,
      pageSize: pageSize,
      printBackground: true,
    };

    if (pageRanges && pageRanges.length > 0) {
      printOptions.pageRanges = pageRanges;
    }

    try {
      return await new Promise((resolve, reject) => {
        printWindow.webContents.on("did-finish-load", () => {
          setTimeout(() => {
            if (printWindow.isDestroyed()) return;
            printWindow.webContents.print(
              printOptions,
              (success, errorType) => {
                try {
                  if (!printWindow.isDestroyed()) printWindow.destroy();
                  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                } catch (e) {
                  console.warn("Spool cleanup warning:", e);
                }

                if (!success) {
                  reject(
                    new Error(
                      `Print job cancelled by Windows spooler. Reason: ${errorType || "Unknown error"}`,
                    ),
                  );
                } else {
                  resolve({
                    success: true,
                    message: `Document printed to ${targetPrinter}`,
                  });
                }
              },
            );
          }, 800);
        });

        let loadPromise;
        if (contentType === "application/pdf" || ext === ".pdf") {
          loadPromise = printWindow.loadURL(
            `file://${tempFilePath.replace(/\\/g, "/")}`,
          );
        } else if (contentType && contentType.startsWith("image/")) {
          const imgHtml = `
          <!DOCTYPE html>
          <html>
          <head><style>body { margin: 0; display: flex; justify-content: center; align-items: center; } img { max-width: 100%; height: auto; }</style></head>
          <body><img src="file://${tempFilePath.replace(/\\/g, "/")}" /></body>
          </html>
        `;
          loadPromise = printWindow.loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(imgHtml)}`,
          );
        } else {
          loadPromise = printWindow.loadURL(
            `file://${tempFilePath.replace(/\\/g, "/")}`,
          );
        }

        loadPromise.catch((err) => {
          try {
            if (!printWindow.isDestroyed()) printWindow.destroy();
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch (e) {}
          reject(err);
        });
      });
    } catch (err) {
      try {
        if (!printWindow.isDestroyed()) printWindow.destroy();
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (e) {}
      throw err;
    }
  },
);

// Notifications
let notificationWindow = null;

ipcMain.on("show-notification", (event, { title, body }) => {
  new Notification({
    title,
    body,
    icon: path.join(__dirname, "icon.png"),
  }).show();
});

ipcMain.on("show-order-notification", (event, { order }) => {
  if (notificationWindow) {
    notificationWindow.destroy();
  }

  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const popupWidth = 360;
  const popupHeight = 320;

  notificationWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: width - popupWidth - 20,
    y: height - popupHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development";
  const url = isDev
    ? `http://localhost:5174/#/notification?order=\${encodeURIComponent(JSON.stringify(order))}`
    : `file://\${path.join(__dirname, '../dist/index.html')}#/notification?order=\${encodeURIComponent(JSON.stringify(order))}`;

  notificationWindow.loadURL(url);

  notificationWindow.on("closed", () => {
    notificationWindow = null;
  });
});

ipcMain.on("order-action-result", (event, { orderId, action }) => {
  if (notificationWindow) {
    notificationWindow.destroy();
    notificationWindow = null;
  }
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("order-action-result", { orderId, action });
  }
});
