const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let tray;
let selectedPrinterName = null;

// Initialize secure spool directory
const spoolDir = path.join(app.getPath('temp'), 'printalfa_spool');
try {
  if (!fs.existsSync(spoolDir)) {
    fs.mkdirSync(spoolDir, { recursive: true });
  }
} catch (e) {
  console.error("Could not create spool directory:", e);
}

function parsePageRanges(pageRangeStr) {
  if (!pageRangeStr || typeof pageRangeStr !== 'string' || pageRangeStr.toUpperCase() === 'ALL') {
    return undefined;
  }
  const ranges = [];
  const parts = pageRangeStr.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
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
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Admin', click: () => { mainWindow.show(); } },
    { label: 'Exit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('XeroxShop Admin');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  try {
    createTray();
  } catch (e) {
    console.error("Tray icon failed to load, missing icon?", e);
  }

  // Set App User Model ID for Windows Notifications
  app.setAppUserModelId(process.execPath);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Configure Auto Start
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe')
});

// ==================== IPC HANDLERS FOR PRINTING ====================

// 1. Get list of installed Windows printers
ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description || '',
        status: p.status,
        isDefault: p.isDefault
      }));
    }
    return [];
  } catch (err) {
    console.error("Failed to query printers:", err);
    return [];
  }
});

// 2. Selected printer persistence
ipcMain.handle('get-selected-printer', async () => {
  return selectedPrinterName;
});

ipcMain.handle('set-selected-printer', async (event, printerName) => {
  selectedPrinterName = printerName;
  return { success: true, printerName: selectedPrinterName };
});

// 3. Test Print
ipcMain.handle('test-print', async (event, { printerName }) => {
  const targetPrinter = printerName || selectedPrinterName;
  if (!targetPrinter) {
    throw new Error("No printer selected. Please select a Windows printer in Settings.");
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
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
        <h1>PrintAlfa — Windows Print Agent Test Page</h1>
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
        <p>✓ The PrintAlfa Windows Print Agent successfully routed this test document through the local Windows Print Spooler to your physical printer.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`);
    
    return await new Promise((resolve, reject) => {
      printWindow.webContents.print({
        silent: true,
        deviceName: targetPrinter,
        printBackground: true
      }, (success, errorType) => {
        if (!printWindow.isDestroyed()) printWindow.destroy();
        if (!success) {
          reject(new Error(`Printing failed: ${errorType || 'Windows print spooler error'}`));
        } else {
          resolve({ success: true, message: `Test page sent to ${targetPrinter}` });
        }
      });
    });
  } catch (err) {
    if (!printWindow.isDestroyed()) printWindow.destroy();
    throw err;
  }
});

// 4. Print actual customer document
ipcMain.handle('print-document', async (event, { base64Data, originalFileName, contentType, printSettings, printerName }) => {
  const targetPrinter = printerName || selectedPrinterName;
  if (!targetPrinter) {
    throw new Error("No printer selected. Please configure a Windows printer in Settings.");
  }

  if (!base64Data) {
    throw new Error("Document data is missing or empty.");
  }

  const ext = path.extname(originalFileName || '').toLowerCase() || (contentType === 'application/pdf' ? '.pdf' : '.dat');
  const tempFileName = `spool_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const tempFilePath = path.join(spoolDir, tempFileName);

  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(tempFilePath, buffer);

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const copies = Math.max(1, parseInt(printSettings?.copies || 1, 10));
  const isColor = printSettings?.colorMode === 'COLOR';
  const isDoubleSided = printSettings?.printSide === 'DOUBLE';
  const duplexMode = isDoubleSided ? 'longEdge' : 'simplex';
  const pageSize = (printSettings?.paperSize || 'A4').toUpperCase() === 'A3' ? 'A3' : 'A4';
  const pageRanges = parsePageRanges(printSettings?.pageRange);

  const printOptions = {
    silent: true,
    deviceName: targetPrinter,
    copies: copies,
    color: isColor,
    duplexMode: duplexMode,
    pageSize: pageSize,
    printBackground: true
  };

  if (pageRanges && pageRanges.length > 0) {
    printOptions.pageRanges = pageRanges;
  }

  try {
    if (contentType === 'application/pdf' || ext === '.pdf') {
      await printWindow.loadURL(`file://${tempFilePath.replace(/\\/g, '/')}`);
    } else if (contentType && contentType.startsWith('image/')) {
      const imgHtml = `
        <!DOCTYPE html>
        <html>
        <head><style>body { margin: 0; display: flex; justify-content: center; align-items: center; } img { max-width: 100%; height: auto; }</style></head>
        <body><img src="file://${tempFilePath.replace(/\\/g, '/')}" /></body>
        </html>
      `;
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(imgHtml)}`);
    } else {
      await printWindow.loadURL(`file://${tempFilePath.replace(/\\/g, '/')}`);
    }

    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        printWindow.webContents.print(printOptions, (success, errorType) => {
          try {
            if (!printWindow.isDestroyed()) printWindow.destroy();
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.warn("Spool cleanup warning:", e);
          }

          if (!success) {
            reject(new Error(`Windows Print Spooler error: ${errorType || 'Failed to submit document to printer'}`));
          } else {
            resolve({ success: true, message: `Document printed to ${targetPrinter}` });
          }
        });
      }, 800);
    });
  } catch (err) {
    try {
      if (!printWindow.isDestroyed()) printWindow.destroy();
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    } catch (e) {}
    throw err;
  }
});

// Notifications
ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({ title, body, icon: path.join(__dirname, 'icon.png') }).show();
});
