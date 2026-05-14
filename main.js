const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1680,
    height: 850,
    minWidth: 560,
    minHeight: 600,
    x: 50,
    y: 50,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    frame: false,
    backgroundColor: '#000000'
  });

  mainWindow.loadURL(`file://${path.join(__dirname, 'index.html')}`);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  createWindow();

  // check for updates 3s after launch (gives window time to load)
  if (!process.argv.includes('--dev')) {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ── Auto-updater events ───────────────────────────────────────────────────────

autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'downloading');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'ready');
});

autoUpdater.on('error', (err) => {
  // silently ignore update errors (no internet, etc.)
  console.log('Update error:', err?.message);
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('load-resonators', async () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'resonators.json'), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('save-deck', async (event, { deckName, data }) => {
  try {
    const safeName = deckName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'deck';
    const filePath = path.join(__dirname, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, message: `Deck "${safeName}" salvo com sucesso!`, path: filePath };
  } catch (e) {
    return { success: false, message: `Erro ao salvar deck: ${e.message}` };
  }
});

ipcMain.handle('window-minimize', async () => {
  if (mainWindow) { mainWindow.minimize(); return { success: true }; }
  return { success: false };
});

ipcMain.handle('window-maximize', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.restore();
    else mainWindow.maximize();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('window-close', async () => {
  if (mainWindow) { mainWindow.close(); return { success: true }; }
  return { success: false };
});
