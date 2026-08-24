const { app, BrowserWindow, ipcMain, Tray, Menu, Notification } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
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
  tray = new Tray(path.join(__dirname, 'icon.png')); // Ensure you have an icon.png
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

ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({ title, body, icon: path.join(__dirname, 'icon.png') }).show();
});
