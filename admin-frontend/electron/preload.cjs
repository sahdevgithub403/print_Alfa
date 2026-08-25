const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getSelectedPrinter: () => ipcRenderer.invoke('get-selected-printer'),
  setSelectedPrinter: (printerName) => ipcRenderer.invoke('set-selected-printer', printerName),
  testPrint: (printerName) => ipcRenderer.invoke('test-print', { printerName }),
  printDocument: (payload) => ipcRenderer.invoke('print-document', payload),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body })
});
