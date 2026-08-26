const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getSelectedPrinter: () => ipcRenderer.invoke('get-selected-printer'),
  setSelectedPrinter: (printerName) => ipcRenderer.invoke('set-selected-printer', printerName),
  testPrint: (printerName) => ipcRenderer.invoke('test-print', { printerName }),
  printDocument: (payload) => ipcRenderer.invoke('print-document', payload),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  showOrderNotification: (order) => ipcRenderer.send('show-order-notification', { order }),
  sendOrderActionResult: (orderId, action) => ipcRenderer.send('order-action-result', { orderId, action }),
  onOrderActionResult: (callback) => {
    ipcRenderer.on('order-action-result', (event, data) => callback(data));
  },
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getDeviceName: () => ipcRenderer.invoke('get-device-name'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
